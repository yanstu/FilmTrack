use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use crate::models::StorageInfo;
use crate::utils::{get_size, format_size, generate_cache_filename};

/// 缓存服务
pub struct CacheService;

impl CacheService {
    /// 获取缓存目录路径
    pub fn get_cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
        let app_cache_dir = app.path().app_cache_dir()
            .map_err(|e| format!("无法获取应用缓存目录: {}", e))?;
        
        let cache_dir = app_cache_dir.join("filmtrack").join("images");
        
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
        let app_cache_dir = app.path().app_cache_dir()
            .map_err(|e| format!("无法获取应用缓存目录: {}", e))?;
        
        // 获取数据库大小
        let db_path = app_data_dir.join("filmtrack.db");
        let db_size_bytes = if db_path.exists() {
            get_size(&db_path).unwrap_or(0)
        } else {
            0
        };

        // 获取缓存大小（图片缓存目录）
        let cache_path = app_cache_dir.join("filmtrack").join("images");
        
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
        let app_cache_dir = app.path().app_cache_dir()
            .map_err(|e| format!("无法获取应用缓存目录: {}", e))?;
        
        // 删除数据库文件
        let db_path = app_data_dir.join("filmtrack.db");
        if db_path.exists() {
            fs::remove_file(&db_path)
                .map_err(|e| format!("删除数据库失败: {}", e))?;
        }

        // 删除缓存目录
        let cache_path = app_cache_dir.join("filmtrack");
        if cache_path.exists() {
            fs::remove_dir_all(&cache_path)
                .map_err(|e| format!("清空缓存失败: {}", e))?;
        }
        
        Ok(())
    }
} 