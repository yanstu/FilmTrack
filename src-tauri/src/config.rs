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
    
    /// 窗口配置
    pub window: WindowConfig,
}

/// 数据库配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    /// 数据库名称
    pub name: String,
}

/// 缓存配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    /// 缓存目录名称
    pub dir_name: String,
}

/// 爬虫配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScraperConfig {
    /// 请求间隔（毫秒）
    pub request_interval_ms: u64,
    
    /// 用户代理
    pub user_agent: String,
}

/// 应用信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    /// 应用版本
    pub version: String,
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

/// 窗口配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowConfig {
    /// 窗口宽度
    pub width: u32,
    
    /// 窗口高度
    pub height: u32,
    
    /// 窗口X坐标位置
    #[serde(default)]
    pub x: Option<i32>,
    
    /// 窗口Y坐标位置
    #[serde(default)]
    pub y: Option<i32>,
    
    /// 最小窗口宽度
    pub min_width: u32,
    
    /// 最小窗口高度
    pub min_height: u32,
    
    /// 最大窗口宽度（None表示无限制，即全屏）
    pub max_width: Option<u32>,
    
    /// 最大窗口高度（None表示无限制，即全屏）
    pub max_height: Option<u32>,
    
    /// 是否可调整大小
    #[serde(default = "default_resizable")]
    pub resizable: bool,
}

fn default_resizable() -> bool {
    true
}

fn default_check_on_startup() -> bool {
    true
}

// 默认配置
impl Default for AppConfig {
    fn default() -> Self {
        Self {
            database: DatabaseConfig {
                name: "filmtrack.db".to_string()
            },
            cache: CacheConfig {
                dir_name: "cache".to_string(),
            },
            scraper: ScraperConfig {
                request_interval_ms: 1500,
                user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36".to_string(),
            },
            app: AppInfo {
                version: env!("CARGO_PKG_VERSION").to_string(),
            },
            update: UpdateConfig {
                check_on_startup: true,
                update_url: "https://gitee.com/faithsx/faithsx/raw/master/filmtrack_update.json".to_string(),
                last_check_time: None,
                ignored_version: None,
            },
            window: WindowConfig {
                width: 1600,
                height: 900,
                x: None, // 首次启动时居中显示
                y: None, // 首次启动时居中显示
                min_width: 800,
                min_height: 600,
                max_width: None, // 无限制，支持全屏
                max_height: None, // 无限制，支持全屏
                resizable: true,
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
    /// 智能合并配置 - 保留用户设置，添加新配置项，移除废弃配置项
    fn merge_config(loaded_config: serde_json::Value, default_config: &AppConfig) -> AppConfig {
        let default_value = serde_json::to_value(default_config).unwrap();
        let merged_value = Self::merge_json_values(loaded_config, default_value);
        
        // 尝试反序列化合并后的配置
        match serde_json::from_value::<AppConfig>(merged_value) {
            Ok(mut config) => {
                // 确保应用版本始终使用当前编译时的版本
                config.app.version = env!("CARGO_PKG_VERSION").to_string();
                config
            },
            Err(_) => {
                // 如果合并失败，使用默认配置
                let mut config = default_config.clone();
                config.app.version = env!("CARGO_PKG_VERSION").to_string();
                config
            }
        }
    }
    
    /// 递归合并JSON值 - 以默认配置为基础，用加载的配置覆盖相同字段
    fn merge_json_values(loaded: serde_json::Value, default: serde_json::Value) -> serde_json::Value {
        match (loaded, default) {
            (serde_json::Value::Object(loaded_map), serde_json::Value::Object(mut default_map)) => {
                // 遍历加载的配置，覆盖默认配置中的相同字段
                for (key, loaded_value) in loaded_map {
                    if let Some(default_value) = default_map.get(&key) {
                        // 如果默认配置中存在该字段，递归合并
                        default_map.insert(key, Self::merge_json_values(loaded_value, default_value.clone()));
                    }
                    // 如果默认配置中不存在该字段，则忽略（移除废弃配置项）
                }
                serde_json::Value::Object(default_map)
            },
            (loaded, _) => {
                // 对于非对象类型，直接使用加载的值
                loaded
            }
        }
    }

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

        // 如果配置文件存在，则加载并合并
        if config_path.exists() {
            match fs::read_to_string(&config_path) {
                Ok(content) => {
                    // 尝试解析为JSON值（更宽松的解析）
                    match serde_json::from_str::<serde_json::Value>(&content) {
                        Ok(loaded_value) => {
                            // 智能合并配置
                            let merged_config = Self::merge_config(loaded_value, &default_config);
                            
                            let mut config = CONFIG.write().map_err(|e| format!("配置锁定失败: {}", e))?;
                            *config = merged_config;
                            
                            // 保存合并后的配置，确保配置文件是最新格式
                            let app_handle_clone = app_handle.clone();
                            std::thread::spawn(move || {
                                std::thread::sleep(std::time::Duration::from_millis(100));
                                if let Err(e) = Self::save(&app_handle_clone) {
                                    eprintln!("保存合并后的配置失败: {}", e);
                                }
                            });
                            
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
            *config = default_config.clone();

            // 尝试保存默认配置，但不阻塞启动
            // 使用异步方式保存，避免阻塞主线程
            let app_handle_clone = app_handle.clone();
            std::thread::spawn(move || {
                // 等待一小段时间确保应用完全启动
                std::thread::sleep(std::time::Duration::from_millis(500));
                
                if let Err(e) = Self::save(&app_handle_clone) {
                    eprintln!("保存默认配置失败: {}", e);
                    // 尝试创建配置目录
                    if let Ok(config_path) = Self::get_config_path(&app_handle_clone) {
                        if let Some(parent) = config_path.parent() {
                            if let Err(dir_err) = std::fs::create_dir_all(parent) {
                                eprintln!("创建配置目录失败: {}", dir_err);
                            } else {
                                // 目录创建成功，再次尝试保存
                                if let Err(save_err) = Self::save(&app_handle_clone) {
                                    eprintln!("再次保存配置失败: {}", save_err);
                                } else {
                                    println!("配置文件已成功创建");
                                }
                            }
                        }
                    }
                } else {
                    println!("默认配置文件已创建");
                }
            });

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
    
    /// 获取窗口配置
    pub fn get_window_config() -> WindowConfig {
        CONFIG.read().unwrap().window.clone()
    }
    
    /// 更新窗口配置
    pub fn update_window_config(window_config: WindowConfig, app_handle: &AppHandle) -> Result<(), String> {
        {
            let mut config = CONFIG.write().unwrap();
            config.window = window_config;
        }
        Self::save(app_handle)
    }
}

