use serde::{Deserialize, Serialize};

/// API响应的通用结构
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

    pub fn error(error: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
        }
    }
}

/// 存储信息数据结构
#[derive(Debug, Serialize, Deserialize)]
pub struct StorageInfo {
    pub cache_size: String,
    pub database_size: String,
    pub cache_size_bytes: u64,
    pub database_size_bytes: u64,
}

/// 文件信息数据结构
#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub size: u64,
}