#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{command, Manager, Emitter, menu::{MenuBuilder, MenuItem, PredefinedMenuItem}, tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState}, AppHandle};
use uuid::Uuid;
use chrono::Utc;
use filmtrack_lib::{
    models::{ApiResponse, StorageInfo}, 
    services::{CacheService, StorageService, UpdateService, UpdateCheckResult},
    scrapers::{DoubanScraper, DoubanMovie},
    config::{AppConfig, ConfigManager}
};
use base64::{Engine as _, engine::general_purpose};

/// 生成UUID
#[command]
async fn generate_uuid() -> Result<ApiResponse<String>, String> {
    let uuid = Uuid::new_v4().to_string();
    Ok(ApiResponse::success(uuid))
}

/// 获取当前时间戳
#[command]
async fn get_current_timestamp() -> Result<ApiResponse<String>, String> {
    let timestamp = Utc::now().to_rfc3339();
    Ok(ApiResponse::success(timestamp))
}

/// 获取存储信息
#[command]
async fn get_storage_info(app: AppHandle) -> Result<ApiResponse<StorageInfo>, String> {
    match StorageService::get_storage_info(&app) {
        Ok(storage_info) => Ok(ApiResponse::success(storage_info)),
        Err(error) => Err(error),
    }
}

/// 清空图片缓存
#[command]
async fn clear_image_cache(app: AppHandle) -> Result<ApiResponse<String>, String> {
    match CacheService::clear_cache(&app) {
        Ok(_) => Ok(ApiResponse::success("图片缓存已清空".to_string())),
        Err(error) => Err(error),
    }
}

/// 清空所有数据
#[command]
async fn clear_all_data(app: AppHandle) -> Result<ApiResponse<String>, String> {
    match StorageService::clear_all_data(&app) {
        Ok(_) => Ok(ApiResponse::success("所有数据已清空".to_string())),
        Err(error) => Err(error),
    }
}

/// 缓存图片
#[command]
async fn cache_image(app: AppHandle, image_url: String) -> Result<ApiResponse<String>, String> {
    match CacheService::cache_image(&app, &image_url).await {
        Ok(path) => Ok(ApiResponse::success(path)),
        Err(error) => Err(error),
    }
}

/// 获取缓存图片路径
#[command]
async fn get_cached_image_path(app: AppHandle, image_url: String) -> Result<ApiResponse<Option<String>>, String> {
    match CacheService::get_cached_image_path(&app, &image_url) {
        Ok(path) => Ok(ApiResponse::success(path)),
        Err(error) => Err(error),
    }
}

/// 读取文件为base64
#[command]
async fn read_file_as_base64(file_path: String) -> Result<ApiResponse<String>, String> {
    match std::fs::read(&file_path) {
        Ok(bytes) => {
            let base64_string = general_purpose::STANDARD.encode(&bytes);
            Ok(ApiResponse::success(base64_string))
        },
        Err(error) => Err(format!("读取文件失败: {}", error)),
    }
}

// 命令：估算豆瓣电影数量
#[tauri::command]
async fn estimate_douban_movie_count(user_id: String) -> Result<u32, String> {
    let scraper = DoubanScraper::new();
    scraper.estimate_movie_count(&user_id).await
        .map_err(|e| format!("估算豆瓣电影数量失败: {}", e))
}

// 命令：获取豆瓣电影列表
#[tauri::command]
async fn fetch_douban_movies(user_id: String, start: u32) -> Result<Vec<DoubanMovie>, String> {
    let scraper = DoubanScraper::new();
    scraper.fetch_movies(&user_id, start).await
        .map_err(|e| format!("获取豆瓣电影列表失败: {}", e))
}

/// 获取应用配置
#[tauri::command]
async fn get_app_config() -> Result<ApiResponse<AppConfig>, String> {
    Ok(ApiResponse::success(ConfigManager::get()))
}

/// 更新应用配置
#[tauri::command]
async fn update_app_config(app: AppHandle, config: AppConfig) -> Result<ApiResponse<String>, String> {
    match ConfigManager::update(config, &app) {
        Ok(_) => Ok(ApiResponse::success("配置已更新".to_string())),
        Err(error) => Err(error),
    }
}

/// 检查更新
#[tauri::command]
async fn check_for_update() -> Result<ApiResponse<UpdateCheckResult>, String> {
    match UpdateService::check_for_update().await {
        Ok(result) => Ok(ApiResponse::success(result)),
        Err(error) => Err(error),
    }
}

/// 忽略版本
#[tauri::command]
async fn ignore_version(version: String) -> Result<(), String> {
    UpdateService::ignore_version(version)
}

/// 下载更新
#[tauri::command]
async fn download_update(app_handle: AppHandle, url: String) -> Result<String, String> {
    let file_path = UpdateService::download_update(&app_handle, &url).await?;
    Ok(file_path.to_string_lossy().to_string())
}

/// 打开安装包
#[tauri::command]
async fn open_installer(file_path: String) -> Result<(), String> {
    let path = std::path::PathBuf::from(file_path);
    UpdateService::open_installer(&path)
}

/// 检查更新是否已下载
#[tauri::command]
async fn is_update_downloaded(app_handle: AppHandle, url: String) -> Result<Option<String>, String> {
    match UpdateService::is_file_downloaded(&app_handle, &url)? {
        Some(path) => Ok(Some(path.to_string_lossy().to_string())),
        None => Ok(None)
    }
}

/// 打开下载链接
#[tauri::command]
async fn open_download_url(url: String) -> Result<(), String> {
    UpdateService::open_download_url(&url)
}

/// 获取文件信息
#[tauri::command]
async fn get_file_info(url: String) -> Result<filmtrack_lib::models::FileInfo, String> {
    UpdateService::get_file_info(&url).await
}

/// 取消下载
#[tauri::command]
async fn cancel_download() -> Result<(), String> {
    UpdateService::cancel_download()
}

/// 退出应用
#[tauri::command]
async fn exit_app(app_handle: AppHandle) -> Result<(), String> {
    app_handle.exit(0);
    Ok(())
}

/// 写入豆瓣导入日志
#[tauri::command]
async fn write_douban_import_log(app_handle: AppHandle, log_message: String, session_id: Option<String>) -> Result<(), String> {
    use std::fs::OpenOptions;
    use std::io::Write;
    use chrono::Local;

    // 获取应用数据目录
    let app_data_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {}", e))?;

    // 创建豆瓣导入日志目录
    let log_dir = app_data_dir.join("douban_import");
    std::fs::create_dir_all(&log_dir)
        .map_err(|e| format!("创建日志目录失败: {}", e))?;

    // 生成日志文件名（按导入会话分开）
    let now = Local::now();
    let session_id = session_id.unwrap_or_else(|| now.format("%Y%m%d_%H%M%S").to_string());
    let log_filename = format!("douban_import_{}.txt", session_id);
    let log_path = log_dir.join(log_filename);

    // 写入日志
    let timestamp = now.format("%Y-%m-%d %H:%M:%S");
    let log_line = format!("[{}] {}\n", timestamp, log_message);

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| format!("打开日志文件失败: {}", e))?;

    file.write_all(log_line.as_bytes())
        .map_err(|e| format!("写入日志失败: {}", e))?;

    file.flush()
        .map_err(|e| format!("刷新日志文件失败: {}", e))?;

    Ok(())
}



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 当尝试启动第二个实例时，显示并聚焦现有窗口
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // 加载配置
            if let Err(error) = ConfigManager::load(&app.app_handle()) {
                eprintln!("加载配置失败: {}", error);
            }
            
            // 创建系统托盘
            let add_record = MenuItem::with_id(app, "add_record", "添加记录", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "退出程序", true, None::<&str>)?;
            let menu = MenuBuilder::new(app).items(&[&add_record, &separator, &quit]).build()?;
            
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)  // 禁用左键显示菜单
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "add_record" => {
                        // 发送导航到记录页面的事件
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("navigate-to-record", ());
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // 处理窗口关闭事件和更新检查
            if let Some(window) = app.get_webview_window("main") {
                let window_for_update = window.clone();
                let window_for_close_event = window.clone();

                // 监听窗口关闭事件
                window.on_window_event(move |event| {
                    use tauri::WindowEvent;
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        // 阻止默认关闭行为
                        api.prevent_close();

                        // 隐藏窗口到托盘
                        let _ = window_for_close_event.hide();
                    }
                });

                // 延迟2秒后检查更新，只在程序启动时执行一次
                std::thread::spawn(move || {
                    // 等待2秒
                    std::thread::sleep(std::time::Duration::from_secs(2));

                    // 检查应用配置
                    let config = ConfigManager::get();
                    if config.update.check_on_startup {
                        // 在Tokio运行时上执行异步检查
                        let rt = tokio::runtime::Runtime::new().unwrap();
                        rt.block_on(async {
                            match UpdateService::check_for_update().await {
                                Ok(result) => {
                                    if result.has_update {
                                        // 有更新时发送事件通知前端
                                        let _ = window_for_update.emit("update-available", result);
                                    }
                                },
                                Err(error) => {
                                    eprintln!("检查更新失败: {}", error);
                                }
                            }
                        });
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            generate_uuid,
            get_current_timestamp,
            get_storage_info,
            clear_image_cache,
            clear_all_data,
            cache_image,
            get_cached_image_path,
            read_file_as_base64,
            estimate_douban_movie_count,
            fetch_douban_movies,
            get_app_config,
            update_app_config,
            check_for_update,
            ignore_version,
            get_file_info,
            download_update,
            cancel_download,
            open_installer,
            is_update_downloaded,
            open_download_url,
            exit_app,
            write_douban_import_log
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}

