#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::{command, Manager, menu::{MenuBuilder, MenuItem}, tray::{TrayIconBuilder, TrayIconEvent}};
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(message: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Movie {
    pub id: String,
    pub title: String,
    pub original_title: Option<String>,
    pub overview: Option<String>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub release_date: Option<String>,
    pub year: Option<i32>,
    pub runtime: Option<i32>,
    pub movie_type: String, // movie, tv
    pub tmdb_id: Option<i32>,
    pub tmdb_rating: f64,
    pub personal_rating: f64,
    pub genres: Option<Vec<String>>,
    pub status: String, // watching, completed, planned, paused, dropped
    pub notes: Option<String>,
    pub watch_source: Option<String>,
    pub watched_date: Option<String>,
    pub watch_count: i32,
    pub total_episodes: Option<i32>,
    pub total_seasons: Option<i32>,
    pub current_episode: Option<i32>,
    pub current_season: Option<i32>,
    pub air_status: String, // airing, ended, cancelled, pilot, planned
    pub date_added: String,
    pub date_updated: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WatchHistory {
    pub id: String,
    pub movie_id: String,
    pub watch_date: String,
    pub episode_number: Option<i32>,
    pub season_number: Option<i32>,
    pub duration_minutes: Option<i32>,
    pub progress: f64,
    pub notes: Option<String>,
    pub created_at: String,
    pub watched_date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Statistics {
    pub total_movies: i64,
    pub completed_movies: i64,
    pub total_watch_time: i64,
    pub average_rating: f64,
    pub movies_this_month: i64,
    pub movies_this_year: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
}

// 简单的命令，主要的数据库操作将在前端JavaScript中完成
#[command]
async fn get_app_version() -> Result<ApiResponse<String>, String> {
    Ok(ApiResponse::success("0.1.0".to_string()))
}

#[command]
async fn generate_uuid() -> Result<ApiResponse<String>, String> {
    Ok(ApiResponse::success(Uuid::new_v4().to_string()))
}

#[command]
async fn get_current_timestamp() -> Result<ApiResponse<String>, String> {
    Ok(ApiResponse::success(Utc::now().to_rfc3339()))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 当尝试启动第二个实例时，显示现有窗口
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(
            tauri_plugin_sql::Builder::default()
                .build(),
        )
        .setup(|app| {
            // 创建托盘菜单
            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出应用", true, None::<&str>)?;
            let menu = MenuBuilder::new(app)
                .items(&[&show_item, &quit_item])
                .build()?;

            // 创建系统托盘
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("FilmTrack - 个人影视管理平台")
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                        // 左键点击托盘图标时显示窗口
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // 禁用 webview 的上下文菜单（右键菜单）
            if let Some(_window) = app.get_webview_window("main") {
                #[cfg(debug_assertions)]
                {
                    // 开发模式下允许上下文菜单（用于调试）
                }
                #[cfg(not(debug_assertions))]
                {
                    // 生产模式下禁用上下文菜单
                    let _ = _window.eval("
                        document.addEventListener('contextmenu', function(e) {
                            e.preventDefault();
                            return false;
                        });
                        
                        // 禁用 F12 和其他开发者工具快捷键
                        document.addEventListener('keydown', function(e) {
                            if (e.key === 'F12' || 
                                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                                (e.ctrlKey && e.shiftKey && e.key === 'J') ||
                                (e.ctrlKey && e.key === 'U')) {
                                e.preventDefault();
                                return false;
                            }
                        });
                    ");
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            generate_uuid,
            get_current_timestamp
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

