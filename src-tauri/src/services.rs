use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Emitter};
use crate::models::{StorageInfo, FileInfo};
use crate::utils::{get_size, format_size, generate_cache_filename};
use serde::{Serialize, Deserialize};
use chrono::Utc;
use crate::config::ConfigManager;
use std::io::Write;
use futures_util::StreamExt;
use std::sync::atomic::{AtomicBool, Ordering};

// 全局下载取消标志
static DOWNLOAD_CANCELLED: AtomicBool = AtomicBool::new(false);

/// 缓存服务
pub struct CacheService;

impl CacheService {
    /// 获取缓存目录路径
    pub fn get_cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
        // 统一使用 app_data_dir (Roaming) 而不是 app_cache_dir (Local)
        let app_data_dir = app.path().app_data_dir()
            .map_err(|e| format!("无法获取应用数据目录: {}", e))?;

        let cache_dir = app_data_dir.join("cache").join("images");

        // 确保缓存目录存在
        if !cache_dir.exists() {
            fs::create_dir_all(&cache_dir)
                .map_err(|e| format!("创建缓存目录失败: {}", e))?;
        }

        Ok(cache_dir)
    }

    /// 获取缓存文件路径
    pub fn get_cache_path(app: &AppHandle, image_url: &str) -> Result<PathBuf, String> {
        let cache_dir = Self::get_cache_dir(app)?;
        let filename = generate_cache_filename(image_url);
        Ok(cache_dir.join(filename))
    }

    /// 缓存图片
    pub async fn cache_image(app: &AppHandle, image_url: &str) -> Result<String, String> {
        let cache_path = Self::get_cache_path(app, image_url)?;
        
        // 如果图片已经缓存，直接返回路径
        if cache_path.exists() {
            let path_str = cache_path.to_string_lossy().to_string();
            return Ok(path_str);
        }
        
        // 下载图片
        let response = reqwest::get(image_url).await
            .map_err(|e| format!("下载图片失败: {}", e))?;
        
        if !response.status().is_success() {
            return Err(format!("下载图片失败: HTTP {}", response.status()));
        }
        
        let bytes = response.bytes().await
            .map_err(|e| format!("读取图片数据失败: {}", e))?;
        
        // 保存到缓存
        fs::write(&cache_path, bytes)
            .map_err(|e| format!("保存图片失败: {}", e))?;
        
        let path_str = cache_path.to_string_lossy().to_string();
        Ok(path_str)
    }

    /// 获取缓存图片路径
    pub fn get_cached_image_path(app: &AppHandle, image_url: &str) -> Result<Option<String>, String> {
        let cache_path = Self::get_cache_path(app, image_url)?;
        
        if cache_path.exists() {
            let path_str = cache_path.to_string_lossy().to_string();
            Ok(Some(path_str))
        } else {
            Ok(None)
        }
    }

    /// 清空缓存
    pub fn clear_cache(app: &AppHandle) -> Result<(), String> {
        let cache_dir = Self::get_cache_dir(app)?;
        
        if cache_dir.exists() {
            fs::remove_dir_all(&cache_dir)
                .map_err(|e| format!("清空缓存失败: {}", e))?;
            
            // 重新创建缓存目录
            fs::create_dir_all(&cache_dir)
                .map_err(|e| format!("重新创建缓存目录失败: {}", e))?;
        }
        
        Ok(())
    }
}

/// 存储服务
pub struct StorageService;

impl StorageService {
    /// 获取存储信息
    pub fn get_storage_info(app: &AppHandle) -> Result<StorageInfo, String> {
        let app_data_dir = app.path().app_data_dir()
            .map_err(|e| format!("无法获取应用数据目录: {}", e))?;

        // 获取数据库大小
        let db_path = app_data_dir.join("filmtrack.db");
        let db_size_bytes = if db_path.exists() {
            get_size(&db_path).unwrap_or(0)
        } else {
            0
        };

        // 获取缓存大小（图片缓存目录）- 统一使用 app_data_dir
        let cache_path = app_data_dir.join("cache").join("images");

        let cache_size_bytes = if cache_path.exists() {
            get_size(&cache_path).unwrap_or(0)
        } else {
            0
        };

        let storage_info = StorageInfo {
            cache_size: format_size(cache_size_bytes),
            database_size: format_size(db_size_bytes),
            cache_size_bytes,
            database_size_bytes: db_size_bytes,
        };

        Ok(storage_info)
    }

    /// 清空所有数据
    pub fn clear_all_data(app: &AppHandle) -> Result<(), String> {
        let app_data_dir = app.path().app_data_dir()
            .map_err(|e| format!("无法获取应用数据目录: {}", e))?;

        // 删除数据库文件
        let db_path = app_data_dir.join("filmtrack.db");
        if db_path.exists() {
            fs::remove_file(&db_path)
                .map_err(|e| format!("删除数据库失败: {}", e))?;
        }

        // 删除缓存目录 - 统一使用 app_data_dir
        let cache_path = app_data_dir.join("cache");
        if cache_path.exists() {
            fs::remove_dir_all(&cache_path)
                .map_err(|e| format!("清空缓存失败: {}", e))?;
        }

        Ok(())
    }
}

/// 更新信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub version: String,
    #[serde(rename = "downloadUrl")]
    pub download_url: String,
    #[serde(rename = "releaseNotes")]
    pub release_notes: String,
    #[serde(rename = "publishDate")]
    pub publish_date: String,
}

/// 更新检查结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCheckResult {
    pub has_update: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub download_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub release_notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub publish_date: Option<String>,
}

/// 下载进度信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
    pub percentage: f64,
    pub speed: String,
}

/// 更新服务
pub struct UpdateService;

impl UpdateService {
    /// 检查更新
    pub async fn check_for_update() -> Result<UpdateCheckResult, String> {
        // 获取应用配置
        let config = ConfigManager::get();
        let current_version = config.app.version.clone();
        let update_url = config.update.update_url.clone();
        
        // 记录最后检查时间
        let _ = ConfigManager::update_last_check_time(Utc::now());
        
        // 发送HTTP请求获取更新信息
        let client = reqwest::Client::new();
        let response = client.get(&update_url)
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await
            .map_err(|e| format!("请求更新信息失败: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("请求更新信息失败，状态码: {}", response.status()));
        }

        let update_info: UpdateInfo = response.json()
            .await
            .map_err(|e| format!("解析更新信息失败: {}", e))?;
        
        // 比较版本号
        let has_update = Self::compare_versions(&update_info.version, &current_version) > 0;
        
        // 检查是否忽略此版本
        let ignored_version = config.update.ignored_version.unwrap_or_default();
        if has_update && update_info.version == ignored_version {
            return Ok(UpdateCheckResult { 
                has_update: false, 
                version: None,
                download_url: None,
                release_notes: None,
                publish_date: None
            });
        }

        if has_update {
            Ok(UpdateCheckResult {
                has_update: true,
                version: Some(update_info.version),
                download_url: Some(update_info.download_url),
                release_notes: Some(update_info.release_notes),
                publish_date: Some(update_info.publish_date)
            })
        } else {
            Ok(UpdateCheckResult { 
                has_update: false, 
                version: None,
                download_url: None,
                release_notes: None,
                publish_date: None
            })
        }
    }

    /// 忽略版本
    pub fn ignore_version(version: String) -> Result<(), String> {
        ConfigManager::update_ignored_version(version)
    }

    /// 比较版本号
    pub fn compare_versions(version1: &str, version2: &str) -> i32 {
        let v1_parts: Vec<u32> = version1
            .split('.')
            .map(|s| s.parse::<u32>().unwrap_or(0))
            .collect();
        
        let v2_parts: Vec<u32> = version2
            .split('.')
            .map(|s| s.parse::<u32>().unwrap_or(0))
            .collect();
        
        for i in 0..3 {
            let v1 = v1_parts.get(i).unwrap_or(&0);
            let v2 = v2_parts.get(i).unwrap_or(&0);
            
            if v1 > v2 {
                return 1;
            } else if v1 < v2 {
                return -1;
            }
        }
        
        0
    }

    /// 获取下载目录
    pub fn get_download_dir(app: &AppHandle) -> Result<PathBuf, String> {
        // 统一使用 app_data_dir (Roaming) 而不是 app_cache_dir (Local)
        let app_data_dir = app.path().app_data_dir()
            .map_err(|e| format!("无法获取应用数据目录: {}", e))?;

        let download_dir = app_data_dir.join("updates");

        // 确保下载目录存在
        if !download_dir.exists() {
            fs::create_dir_all(&download_dir)
                .map_err(|e| format!("创建下载目录失败: {}", e))?;
        }

        Ok(download_dir)
    }

    /// 获取安装包文件名
    pub fn get_installer_filename(url: &str) -> String {
        // 从URL中提取文件名，如果失败则使用默认名称
        url.split('/').last()
            .unwrap_or("FilmTrack-Setup.exe")
            .to_string()
    }

    /// 检查文件是否已下载
    pub fn is_file_downloaded(app: &AppHandle, url: &str) -> Result<Option<PathBuf>, String> {
        let download_dir = Self::get_download_dir(app)?;
        let filename = Self::get_installer_filename(url);
        let file_path = download_dir.join(filename);

        if file_path.exists() {
            Ok(Some(file_path))
        } else {
            Ok(None)
        }
    }

    /// 获取文件信息
    pub async fn get_file_info(url: &str) -> Result<FileInfo, String> {
        let client = reqwest::Client::new();
        let response = client.head(url)
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await
            .map_err(|e| format!("获取文件信息失败: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("获取文件信息失败，状态码: {}", response.status()));
        }

        let size = response.content_length().unwrap_or(0);

        Ok(FileInfo { size })
    }

    /// 下载更新文件
    pub async fn download_update(app: &AppHandle, url: &str) -> Result<PathBuf, String> {
        // 重置取消标志
        DOWNLOAD_CANCELLED.store(false, Ordering::Relaxed);

        // 检查是否已下载
        if let Some(existing_file) = Self::is_file_downloaded(app, url)? {
            return Ok(existing_file);
        }

        let download_dir = Self::get_download_dir(app)?;
        let filename = Self::get_installer_filename(url);
        let file_path = download_dir.join(&filename);

        // 创建HTTP客户端
        let client = reqwest::Client::new();
        let response = client.get(url)
            .send()
            .await
            .map_err(|e| format!("下载请求失败: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("下载失败，状态码: {}", response.status()));
        }

        let total_size = response.content_length().unwrap_or(0);
        let mut downloaded = 0u64;
        let mut stream = response.bytes_stream();

        // 创建文件
        let mut file = fs::File::create(&file_path)
            .map_err(|e| format!("创建文件失败: {}", e))?;

        let start_time = std::time::Instant::now();

        // 下载文件并发送进度事件
        while let Some(chunk) = stream.next().await {
            // 检查是否被取消
            if DOWNLOAD_CANCELLED.load(Ordering::Relaxed) {
                // 删除部分下载的文件
                let _ = fs::remove_file(&file_path);
                return Err("下载已取消".to_string());
            }

            let chunk = chunk.map_err(|e| format!("下载数据失败: {}", e))?;

            file.write_all(&chunk)
                .map_err(|e| format!("写入文件失败: {}", e))?;

            downloaded += chunk.len() as u64;

            // 计算进度和速度
            let percentage = if total_size > 0 {
                (downloaded as f64 / total_size as f64) * 100.0
            } else {
                0.0
            };

            let elapsed = start_time.elapsed().as_secs_f64();
            let speed = if elapsed > 0.0 {
                let bytes_per_sec = downloaded as f64 / elapsed;
                format_size(bytes_per_sec as u64) + "/s"
            } else {
                "0 B/s".to_string()
            };

            let progress = DownloadProgress {
                downloaded,
                total: total_size,
                percentage,
                speed,
            };

            // 发送进度事件
            let _ = app.emit("download-progress", &progress);
        }

        Ok(file_path)
    }

    /// 打开安装包
    pub fn open_installer(file_path: &PathBuf) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("cmd")
                .args(["/C", "start", "", &file_path.to_string_lossy()])
                .spawn()
                .map_err(|e| format!("打开安装包失败: {}", e))?;
        }

        #[cfg(not(target_os = "windows"))]
        {
            open::that(file_path).map_err(|e| format!("打开安装包失败: {}", e))?;
        }

        Ok(())
    }

    /// 取消下载
    pub fn cancel_download() -> Result<(), String> {
        // 设置取消标志
        DOWNLOAD_CANCELLED.store(true, Ordering::Relaxed);
        Ok(())
    }

    /// 打开浏览器下载更新
    pub fn open_download_url(url: &str) -> Result<(), String> {
        open::that(url).map_err(|e| format!("打开下载链接失败: {}", e))
    }
} 