use std::fs;
use std::path::Path;
use sha2::{Digest, Sha256};

/// 获取文件或目录大小（字节）
pub fn get_size(path: &Path) -> std::io::Result<u64> {
    let metadata = fs::metadata(path)?;
    if metadata.is_file() {
        Ok(metadata.len())
    } else if metadata.is_dir() {
        let mut total_size = 0;
        for entry in fs::read_dir(path)? {
            let entry = entry?;
            let path = entry.path();
            total_size += get_size(&path)?;
        }
        Ok(total_size)
    } else {
        Ok(0)
    }
}

/// 格式化文件大小为人类可读的字符串
pub fn format_size(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    const THRESHOLD: u64 = 1024;

    if bytes == 0 {
        return "0 B".to_string();
    }

    let mut size = bytes as f64;
    let mut unit_index = 0;

    while size >= THRESHOLD as f64 && unit_index < UNITS.len() - 1 {
        size /= THRESHOLD as f64;
        unit_index += 1;
    }

    if unit_index == 0 {
        format!("{} {}", size as u64, UNITS[unit_index])
    } else {
        format!("{:.1} {}", size, UNITS[unit_index])
    }
}

/// 从URL生成缓存文件名
///
/// 使用 SHA-256 生成稳定、低碰撞的文件名，并从 URL 路径（忽略查询串/锚点）中
/// 提取受白名单约束的图片扩展名。
pub fn generate_cache_filename(url: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(url.as_bytes());
    let hash = hasher
        .finalize()
        .iter()
        .map(|byte| format!("{:02x}", byte))
        .collect::<String>();

    let extension = extract_image_extension(url);
    format!("{}.{}", hash, extension)
}

/// 从 URL 中提取图片扩展名（忽略查询串与锚点，限定常见图片类型）
fn extract_image_extension(url: &str) -> String {
    let path = url
        .split(|c| c == '?' || c == '#')
        .next()
        .unwrap_or(url);

    let extension = match path.rsplit_once('.') {
        Some((_, ext)) => ext.to_ascii_lowercase(),
        None => String::new(),
    };

    match extension.as_str() {
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "bmp" | "avif" | "svg" => extension,
        _ => "jpg".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cache_filename_is_stable_and_uses_sha256() {
        let first = generate_cache_filename("https://image.tmdb.org/t/p/w500/abc.jpg");
        let second = generate_cache_filename("https://image.tmdb.org/t/p/w500/abc.jpg");
        assert_eq!(first, second, "相同 URL 应生成稳定文件名");

        let (hash, ext) = first.rsplit_once('.').expect("文件名应包含扩展名");
        assert_eq!(hash.len(), 64, "SHA-256 十六进制长度应为 64");
        assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
        assert_eq!(ext, "jpg");
    }

    #[test]
    fn cache_filename_differs_for_different_urls() {
        let a = generate_cache_filename("https://example.com/a.png");
        let b = generate_cache_filename("https://example.com/b.png");
        assert_ne!(a, b, "不同 URL 应生成不同文件名");
    }

    #[test]
    fn extension_ignores_query_and_fragment() {
        assert!(generate_cache_filename("https://x/poster.webp?size=large#frag").ends_with(".webp"));
        assert!(generate_cache_filename("https://x/poster.PNG?v=2").ends_with(".png"));
    }

    #[test]
    fn extension_falls_back_to_jpg_for_unknown() {
        assert!(generate_cache_filename("https://x/image").ends_with(".jpg"));
        assert!(generate_cache_filename("https://x/file.bin").ends_with(".jpg"));
    }
}
