// 导出爬虫模块
pub mod douban;

// 重新导出常用类型和函数，方便外部使用
pub use douban::{DoubanMovie, DoubanScraper}; 