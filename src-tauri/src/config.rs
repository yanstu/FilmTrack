use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::sync::RwLock;
use tauri::{AppHandle, Manager};
use std::fs;
use std::path::PathBuf;
use chrono::{DateTime, Utc};

/// 应用配置结构体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// 数据库配置
    pub database: DatabaseConfig,
    
    /// 缓存配置
    pub cache: CacheConfig,
    
    /// 爬虫配置
    pub scraper: ScraperConfig,
    
    /// 应用信息
    pub app: AppInfo,
    
    /// 更新配置
    pub update: UpdateConfig,
}

/// 数据库配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    /// 数据库名称
    pub name: String,
    
    /// 数据库版本
    pub version: u32,
}

/// 缓存配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    /// 缓存目录名称
    pub dir_name: String,
    
    /// 缓存过期时间（小时）
    pub expiration_hours: u32,
    
    /// 最大缓存大小（MB）
    pub max_size_mb: u32,
}

/// 爬虫配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScraperConfig {
    /// 请求间隔（毫秒）
    pub request_interval_ms: u64,
    
    /// 请求超时（毫秒）
    pub request_timeout_ms: u64,
    
    /// 最大重试次数
    pub max_retries: u32,
    
    /// 用户代理
    pub user_agent: String,
}

/// 应用信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    /// 应用名称
    pub name: String,
    
    /// 应用版本
    pub version: String,
    
    /// 作者
    pub author: String,
}

/// 更新配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateConfig {
    /// 启动时检查更新
    #[serde(default = "default_check_on_startup")]
    pub check_on_startup: bool,
    
    /// 更新信息地址
    pub update_url: String,
    
    /// 最后检查时间
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_check_time: Option<DateTime<Utc>>,
    
    /// 忽略的版本
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ignored_version: Option<String>,
}

fn default_check_on_startup() -> bool {
    true
}

// 默认配置
impl Default for AppConfig {
    fn default() -> Self {
        Self {
            database: DatabaseConfig {
                name: "filmtrack.db".to_string(),
                version: 1,
            },
            cache: CacheConfig {
                dir_name: "cache".to_string(),
                expiration_hours: 24 * 7, // 一周
                max_size_mb: 500,
            },
            scraper: ScraperConfig {
                request_interval_ms: 1500,
                request_timeout_ms: 10000,
                max_retries: 3,
                user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36".to_string(),
            },
            app: AppInfo {
                name: env!("CARGO_PKG_NAME").to_string(),
                version: env!("CARGO_PKG_VERSION").to_string(),
                author: env!("CARGO_PKG_AUTHORS").to_string(),
            },
            update: UpdateConfig {
                check_on_startup: true,
                update_url: "https://gitee.com/faithsx/faithsx/raw/master/filmtrack_update.json".to_string(),
                last_check_time: None,
                ignored_version: None,
            },
        }
    }
}

// 全局配置实例
lazy_static! {
    static ref CONFIG: RwLock<AppConfig> = RwLock::new(AppConfig::default());
}

/// 配置管理器
pub struct ConfigManager;

impl ConfigManager {
    /// 加载配置
    pub fn load(app_handle: &AppHandle) -> Result<(), String> {
        // 使用默认配置作为后备
        let default_config = AppConfig::default();

        let config_path = match Self::get_config_path(app_handle) {
            Ok(path) => path,
            Err(e) => {
                eprintln!("获取配置路径失败，使用默认配置: {}", e);
                // 使用默认配置
                let mut config = CONFIG.write().map_err(|e| format!("配置锁定失败: {}", e))?;
                *config = default_config;
                return Ok(());
            }
        };

        // 如果配置文件存在，则加载
        if config_path.exists() {
            match fs::read_to_string(&config_path) {
                Ok(content) => {
                    // 尝试解析配置
                    let result = serde_json::from_str::<AppConfig>(&content);
                    // 添加兼容性处理，处理旧版本的配置文件
                    match result {
                        Ok(loaded_config) => {
                            let mut config = CONFIG.write().map_err(|e| format!("配置锁定失败: {}", e))?;
                            *config = loaded_config;
                            Ok(())
                        },
                        Err(e) => {
                            eprintln!("解析配置文件失败，使用默认配置: {}", e);
                            // 使用默认配置
                            let mut config = CONFIG.write().map_err(|e| format!("配置锁定失败: {}", e))?;
                            *config = default_config;
                            Ok(())
                        },
                    }
                },
                Err(e) => {
                    eprintln!("读取配置文件失败，使用默认配置: {}", e);
                    // 使用默认配置
                    let mut config = CONFIG.write().map_err(|e| format!("配置锁定失败: {}", e))?;
                    *config = default_config;
                    Ok(())
                },
            }
        } else {
            // 如果配置文件不存在，使用默认配置
            let mut config = CONFIG.write().map_err(|e| format!("配置锁定失败: {}", e))?;
            *config = default_config;

            // 尝试保存默认配置，但不阻塞启动
            if let Err(e) = Self::save(app_handle) {
                eprintln!("保存默认配置失败: {}", e);
            }

            Ok(())
        }
    }
    
    /// 保存配置
    pub fn save(app_handle: &AppHandle) -> Result<(), String> {
        let config_path = Self::get_config_path(app_handle)?;
        
        // 确保目录存在
        if let Some(parent) = config_path.parent() {
            if !parent.exists() {
                if let Err(e) = fs::create_dir_all(parent) {
                    return Err(format!("创建配置目录失败: {}", e));
                }
            }
        }
        
        // 序列化配置
        let config = CONFIG.read().unwrap();
        match serde_json::to_string_pretty(&*config) {
            Ok(json) => {
                // 写入文件
                match fs::write(&config_path, json) {
                    Ok(_) => Ok(()),
                    Err(e) => Err(format!("写入配置文件失败: {}", e)),
                }
            },
            Err(e) => Err(format!("序列化配置失败: {}", e)),
        }
    }
    
    /// 获取配置路径
    fn get_config_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
        let path_resolver = app_handle.path();
        match path_resolver.app_config_dir() {
            Ok(mut path) => {
                path.push("config.json");
                Ok(path)
            },
            Err(e) => Err(format!("无法获取配置目录: {}", e)),
        }
    }
    
    /// 获取配置
    pub fn get() -> AppConfig {
        CONFIG.read().unwrap().clone()
    }
    
    /// 更新配置
    pub fn update(new_config: AppConfig, app_handle: &AppHandle) -> Result<(), String> {
        {
            let mut config = CONFIG.write().unwrap();
            *config = new_config;
        }
        Self::save(app_handle)
    }
    
    /// 更新最后检查时间
    pub fn update_last_check_time(time: DateTime<Utc>) -> Result<(), String> {
        let mut config = CONFIG.write().unwrap();
        config.update.last_check_time = Some(time);
        Ok(())
    }
    
    /// 更新忽略的版本
    pub fn update_ignored_version(version: String) -> Result<(), String> {
        let mut config = CONFIG.write().unwrap();
        config.update.ignored_version = Some(version);
        Ok(())
    }
    
    /// 获取数据库名称
    pub fn get_database_name() -> String {
        CONFIG.read().unwrap().database.name.clone()
    }
    
    /// 获取缓存目录名称
    pub fn get_cache_dir_name() -> String {
        CONFIG.read().unwrap().cache.dir_name.clone()
    }
    
    /// 获取请求间隔
    pub fn get_request_interval() -> u64 {
        CONFIG.read().unwrap().scraper.request_interval_ms
    }
}

