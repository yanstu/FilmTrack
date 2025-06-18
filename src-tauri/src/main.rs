#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{command, Manager, Emitter, menu::{MenuBuilder, MenuItem, PredefinedMenuItem}, tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState}, AppHandle};
use uuid::Uuid;
use chrono::Utc;
use filmtrack_lib::{models::{ApiResponse, StorageInfo}, services::{CacheService, StorageService}};
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 当尝试运行第二个实例时，聚焦到现有窗口
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
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
            read_file_as_base64
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}

