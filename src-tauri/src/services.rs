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

    /// 构建带整体超时的图片下载客户端
    ///
    /// 避免图床无响应时下载请求长时间挂起（与更新 / 媒体代理客户端口径一致）。
    fn create_image_client() -> Result<reqwest::Client, String> {
        reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(20))
            .build()
            .map_err(|e| format!("初始化图片下载失败: {}", e))
    }

    /// 缓存图片
    pub async fn cache_image(app: &AppHandle, image_url: &str) -> Result<String, String> {
        let cache_path = Self::get_cache_path(app, image_url)?;
        
        // 如果图片已经缓存，直接返回路径
        if cache_path.exists() {
            let path_str = cache_path.to_string_lossy().to_string();
            return Ok(path_str);
        }
        
        // 下载图片（带整体超时，避免图床卡住导致该 await 长时间挂起）
        let client = Self::create_image_client()?;
        let response = client.get(image_url).send().await
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

    /// 删除特定图片缓存
    pub fn remove_cached_image(app: &AppHandle, image_url: &str) -> Result<(), String> {
        let cache_path = Self::get_cache_path(app, image_url)?;
        
        if cache_path.exists() {
            fs::remove_file(&cache_path)
                .map_err(|e| format!("删除缓存图片失败: {}", e))?;
        }
        
        Ok(())
    }

    /// 删除多个图片缓存
    pub fn remove_cached_images(app: &AppHandle, image_urls: &[String]) -> Result<(), String> {
        for image_url in image_urls {
            // 忽略单个文件删除失败，继续删除其他文件
            let _ = Self::remove_cached_image(app, image_url);
        }
        Ok(())
    }
}

/// 存储服务
pub struct StorageService;

impl StorageService {
    fn get_database_dir(app: &AppHandle) -> Result<PathBuf, String> {
        app.path().app_config_dir()
            .map_err(|e| format!("无法获取应用配置目录: {}", e))
    }

    /// 获取存储信息
    pub fn get_storage_info(app: &AppHandle) -> Result<StorageInfo, String> {
        let app_data_dir = app.path().app_data_dir()
            .map_err(|e| format!("无法获取应用数据目录: {}", e))?;
        let database_dir = Self::get_database_dir(app)?;

        // 获取数据库大小
        let db_path = database_dir.join("filmtrack.db");
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
        let database_dir = Self::get_database_dir(app)?;

        // 删除数据库文件
        let db_path = database_dir.join("filmtrack.db");
        if db_path.exists() {
            fs::remove_file(&db_path)
                .map_err(|e| format!("删除数据库失败: {}", e))?;
        }

        let backup_path = database_dir.join("backups");
        if backup_path.exists() {
            fs::remove_dir_all(&backup_path)
                .map_err(|e| format!("删除数据库备份失败: {}", e))?;
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
    /// 安装包的 SHA-256（十六进制），用于下载后完整性校验；服务端可选提供
    #[serde(default, alias = "sha256", alias = "sha256sum")]
    pub sha256: Option<String>,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sha256: Option<String>,
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
    fn create_update_client() -> Result<reqwest::Client, String> {
        reqwest::Client::builder()
            .user_agent(format!("FilmTrackPro/{}", env!("CARGO_PKG_VERSION")))
            .http1_only()
            .redirect(reqwest::redirect::Policy::limited(5))
            .build()
            .map_err(|e| format!("初始化更新请求失败: {}", e))
    }

    /// 检查更新
    pub async fn check_for_update() -> Result<UpdateCheckResult, String> {
        // 获取应用配置
        let config = ConfigManager::get();
        let current_version = env!("CARGO_PKG_VERSION").to_string();
        let update_url = config.update.update_url.clone();
        
        // 记录最后检查时间
        let _ = ConfigManager::update_last_check_time(Utc::now());
        
        // 发送HTTP请求获取更新信息
        let client = Self::create_update_client()?;
        let response = client.get(&update_url)
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await
            .map_err(|e| {
                let message = e.to_string();
                if message.contains("unexpected EOF during handshake") {
                    "请求更新信息失败: 更新服务握手异常，请稍后再试".to_string()
                } else {
                    format!("请求更新信息失败: {}", e)
                }
            })?;

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
                publish_date: None,
                sha256: None
            });
        }

        if has_update {
            Ok(UpdateCheckResult {
                has_update: true,
                version: Some(update_info.version),
                download_url: Some(update_info.download_url),
                release_notes: Some(update_info.release_notes),
                publish_date: Some(update_info.publish_date),
                sha256: update_info.sha256
            })
        } else {
            Ok(UpdateCheckResult { 
                has_update: false, 
                version: None,
                download_url: None,
                release_notes: None,
                publish_date: None,
                sha256: None
            })
        }
    }

    /// 忽略版本
    pub fn ignore_version(version: String) -> Result<(), String> {
        ConfigManager::update_ignored_version(version)
    }

    /// 比较版本号
    /// 返回值：1 表示 version1 > version2，-1 表示 version1 < version2，0 表示相等
    pub fn compare_versions(version1: &str, version2: &str) -> i32 {
        let v1_parts: Vec<u32> = version1
            .split('.')
            .map(|s| s.parse::<u32>().unwrap_or(0))
            .collect();

        let v2_parts: Vec<u32> = version2
            .split('.')
            .map(|s| s.parse::<u32>().unwrap_or(0))
            .collect();

        let max_len = v1_parts.len().max(v2_parts.len());
        for i in 0..max_len {
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
        // 优先从 URL 中提取文件名；无法提取时按平台给出合理的默认名
        let candidate = url.split('/').last().map(|s| s.trim()).unwrap_or("");
        if !candidate.is_empty() {
            return candidate.to_string();
        }

        #[cfg(target_os = "windows")]
        { "FilmTrackPro-Setup.exe".to_string() }
        #[cfg(target_os = "macos")]
        { "FilmTrackPro.dmg".to_string() }
        #[cfg(not(any(target_os = "windows", target_os = "macos")))]
        { "FilmTrackPro-update".to_string() }
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

    /// 校验文件 SHA-256
    fn verify_file_sha256(path: &PathBuf, expected: &str) -> Result<(), String> {
        use sha2::{Digest, Sha256};
        use std::io::Read;

        let mut file = fs::File::open(path)
            .map_err(|e| format!("校验更新包失败: {}", e))?;
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 8192];

        loop {
            let read = file.read(&mut buffer)
                .map_err(|e| format!("校验更新包失败: {}", e))?;
            if read == 0 {
                break;
            }
            hasher.update(&buffer[..read]);
        }

        let actual = hasher
            .finalize()
            .iter()
            .map(|byte| format!("{:02x}", byte))
            .collect::<String>();

        if actual.eq_ignore_ascii_case(expected.trim()) {
            Ok(())
        } else {
            Err(format!("更新包完整性校验失败：哈希不匹配（期望 {}）", expected.trim()))
        }
    }

    /// 下载更新文件
    pub async fn download_update(
        app: &AppHandle,
        url: &str,
        expected_sha256: Option<String>,
    ) -> Result<PathBuf, String> {
        // 重置取消标志
        DOWNLOAD_CANCELLED.store(false, Ordering::Relaxed);

        let expected = expected_sha256
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());

        // 检查是否已下载
        if let Some(existing_file) = Self::is_file_downloaded(app, url)? {
            match &expected {
                // 提供了哈希：校验已存在文件，校验失败则删除并重新下载
                Some(hash) => match Self::verify_file_sha256(&existing_file, hash) {
                    Ok(_) => return Ok(existing_file),
                    Err(_) => {
                        let _ = fs::remove_file(&existing_file);
                    }
                },
                None => return Ok(existing_file),
            }
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

        // 确保所有数据落盘后再做完整性校验
        file.flush().map_err(|e| format!("写入文件失败: {}", e))?;
        drop(file);

        // 完整性校验：服务端提供哈希时强制校验，失败则删除下载文件
        if let Some(hash) = &expected {
            if let Err(error) = Self::verify_file_sha256(&file_path, hash) {
                let _ = fs::remove_file(&file_path);
                return Err(error);
            }
        }

        Ok(file_path)
    }

    /// 打开安装包
    ///
    /// 使用 `open` crate（Windows 下走 ShellExecute）启动安装包，
    /// 避免手动拼接 `cmd /C start` 命令字符串带来的注入风险。
    pub fn open_installer(file_path: &PathBuf) -> Result<(), String> {
        if !file_path.exists() {
            return Err("安装包不存在或已被移动".to_string());
        }

        open::that(file_path).map_err(|e| format!("打开安装包失败: {}", e))
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_image_client_builds_with_timeout() {
        // 守护 F1：图片下载客户端应能带超时构建成功，避免回退到无超时的 reqwest::get
        assert!(CacheService::create_image_client().is_ok());
    }

    #[test]
    fn compare_versions_orders_correctly() {
        assert_eq!(UpdateService::compare_versions("1.0.1", "1.0.0"), 1);
        assert_eq!(UpdateService::compare_versions("1.0.0", "1.0.1"), -1);
        assert_eq!(UpdateService::compare_versions("1.2.0", "1.2.0"), 0);
        // 长度不同但语义相等
        assert_eq!(UpdateService::compare_versions("1.2", "1.2.0"), 0);
        // 主版本优先
        assert_eq!(UpdateService::compare_versions("2.0", "1.9.9"), 1);
    }

    #[test]
    fn verify_file_sha256_matches_known_hash() {
        let mut path = std::env::temp_dir();
        path.push(format!("filmtrack_sha_test_{}.bin", std::process::id()));

        {
            let mut file = fs::File::create(&path).expect("创建临时文件");
            file.write_all(b"hello").expect("写入临时文件");
        }

        // 已知：sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
        let expected = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";

        assert!(UpdateService::verify_file_sha256(&path, expected).is_ok());
        // 大小写不敏感
        assert!(UpdateService::verify_file_sha256(&path, &expected.to_uppercase()).is_ok());
        // 哈希不匹配应报错
        assert!(UpdateService::verify_file_sha256(&path, "deadbeef").is_err());

        let _ = fs::remove_file(&path);
    }
}
