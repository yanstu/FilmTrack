use std::{collections::HashMap, sync::Arc};

use axum::{
    body::Body,
    extract::{Path, State},
    http::{
        header::{
            ACCEPT_RANGES, ACCESS_CONTROL_ALLOW_HEADERS, ACCESS_CONTROL_ALLOW_METHODS,
            ACCESS_CONTROL_ALLOW_ORIGIN, ACCESS_CONTROL_EXPOSE_HEADERS, CACHE_CONTROL,
            CONTENT_LENGTH, CONTENT_RANGE, CONTENT_TYPE, ETAG, LAST_MODIFIED, RANGE,
        },
        HeaderMap, Method, Response, StatusCode,
    },
    routing::any,
    Router,
};
use base64::{engine::general_purpose, Engine as _};
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use tauri::State as TauriState;

const DEFAULT_CONTENT_TYPE: &str = "application/octet-stream";
const HLS_CONTENT_TYPE: &str = "application/vnd.apple.mpegurl";

lazy_static! {
    static ref URI_ATTRIBUTE_REGEX: Regex = Regex::new(r#"URI="([^"]+)""#).unwrap();
}

#[derive(Clone)]
pub struct StreamProxyServerState {
    pub base_url: String,
}

#[derive(Clone)]
struct StreamProxyHttpState {
    base_url: String,
    token: String,
    client: reqwest::Client,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct StreamProxyPayload {
    target: String,
    #[serde(default)]
    headers: HashMap<String, String>,
    #[serde(default)]
    content_type: String,
}

#[derive(Debug)]
struct ProxyResponseData {
    status: StatusCode,
    content_type: String,
    content_range: Option<String>,
    accept_ranges: Option<String>,
    cache_control: Option<String>,
    etag: Option<String>,
    last_modified: Option<String>,
    body: Vec<u8>,
}

pub fn start_stream_proxy_server() -> Result<StreamProxyServerState, String> {
    let std_listener = std::net::TcpListener::bind(("127.0.0.1", 0))
        .map_err(|error| format!("启动本地媒体代理失败: {}", error))?;
    std_listener
        .set_nonblocking(true)
        .map_err(|error| format!("配置本地媒体代理失败: {}", error))?;

    let address = std_listener
        .local_addr()
        .map_err(|error| format!("读取本地媒体代理地址失败: {}", error))?;

    // 为本地代理生成随机会话令牌，避免本机其它进程把它当作开放转发（SSRF）滥用。
    let token = uuid::Uuid::new_v4().simple().to_string();
    let base_url = format!("http://127.0.0.1:{}/media/{}", address.port(), token);

    let client = reqwest::Client::builder()
        .user_agent(format!("FilmTrackPro/{}", env!("CARGO_PKG_VERSION")))
        .http1_only()
        .build()
        .map_err(|error| format!("初始化本地媒体代理失败: {}", error))?;

    let http_state = Arc::new(StreamProxyHttpState {
        base_url: base_url.clone(),
        token,
        client,
    });

    tauri::async_runtime::spawn(async move {
        let listener = match tokio::net::TcpListener::from_std(std_listener) {
            Ok(listener) => listener,
            Err(error) => {
                eprintln!("转换本地媒体代理监听器失败: {}", error);
                return;
            }
        };

        let app = Router::new()
            .route("/media/:token/:payload", any(handle_stream_proxy_http))
            .with_state(http_state);

        if let Err(error) = axum::serve(listener, app).await {
            eprintln!("本地媒体代理已停止: {}", error);
        }
    });

    eprintln!("本地媒体代理已启动: {}", base_url);

    Ok(StreamProxyServerState { base_url })
}

#[tauri::command]
pub async fn get_stream_proxy_base_url(
    state: TauriState<'_, StreamProxyServerState>,
) -> Result<String, String> {
    Ok(state.base_url.clone())
}

async fn handle_stream_proxy_http(
    State(state): State<Arc<StreamProxyHttpState>>,
    Path((token, encoded_payload)): Path<(String, String)>,
    method: Method,
    headers: HeaderMap,
) -> Response<Body> {
    if method == Method::OPTIONS {
        return build_cors_preflight_response();
    }

    // 校验会话令牌，拒绝未携带正确令牌的本机请求
    if token != state.token {
        return build_http_error_response(StatusCode::FORBIDDEN, "无效的代理令牌".to_string());
    }

    let range_header = headers
        .get(RANGE)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.to_string());

    match proxy_request(
        &state.client,
        &state.base_url,
        &encoded_payload,
        &method,
        range_header.as_deref(),
    )
    .await
    {
        Ok(response) => response,
        Err((status, message)) => build_http_error_response(status, message),
    }
}

async fn proxy_request(
    client: &reqwest::Client,
    base_url: &str,
    encoded_payload: &str,
    method: &Method,
    range_header: Option<&str>,
) -> Result<Response<Body>, (StatusCode, String)> {
    let payload = decode_payload(encoded_payload)?;
    let target_url = reqwest::Url::parse(payload.target.trim()).map_err(|error| {
        (
            StatusCode::BAD_REQUEST,
            format!("片源地址无效: {}", error),
        )
    })?;

    let request_method = reqwest::Method::from_bytes(method.as_str().as_bytes())
        .unwrap_or(reqwest::Method::GET);
    let mut upstream = client.request(request_method, target_url.clone());

    for (key, value) in &payload.headers {
        if !key.trim().is_empty() && !value.trim().is_empty() {
            upstream = upstream.header(key, value);
        }
    }

    if let Some(value) = range_header {
        upstream = upstream.header(RANGE.as_str(), value);
    }

    let response = upstream.send().await.map_err(|error| {
        (
            StatusCode::BAD_GATEWAY,
            format!("拉取视频失败: {}", error),
        )
    })?;

    let status = StatusCode::from_u16(response.status().as_u16())
        .unwrap_or(StatusCode::BAD_GATEWAY);
    let upstream_headers = response.headers().clone();
    let response_content_type = upstream_headers
        .get("content-type")
        .and_then(|item| item.to_str().ok())
        .unwrap_or("")
        .to_string();
    let is_manifest = is_hls_manifest(target_url.as_str(), &response_content_type, &payload.content_type);

    // HLS 清单需要整体读入后重写其中的分片地址；其余媒体内容采用流式透传，避免整段读入内存
    if is_manifest {
        let body = response.bytes().await.map_err(|error| {
            (
                StatusCode::BAD_GATEWAY,
                format!("读取视频失败: {}", error),
            )
        })?;

        let manifest = String::from_utf8_lossy(&body).into_owned();
        let final_body = rewrite_m3u8_manifest(&manifest, target_url.as_str(), base_url, &payload.headers)
            .into_bytes();

        return Ok(build_http_response(ProxyResponseData {
            status,
            content_type: HLS_CONTENT_TYPE.to_string(),
            content_range: header_to_string(&upstream_headers, "content-range"),
            accept_ranges: header_to_string(&upstream_headers, "accept-ranges")
                .or_else(|| Some("bytes".to_string())),
            cache_control: header_to_string(&upstream_headers, "cache-control")
                .or_else(|| Some("no-store".to_string())),
            etag: header_to_string(&upstream_headers, "etag"),
            last_modified: header_to_string(&upstream_headers, "last-modified"),
            body: final_body,
        }));
    }

    let final_content_type = if !response_content_type.is_empty() {
        response_content_type
    } else if !payload.content_type.trim().is_empty() {
        payload.content_type.trim().to_string()
    } else {
        guess_media_content_type(target_url.as_str()).to_string()
    };

    Ok(build_streaming_response(status, &upstream_headers, final_content_type, response))
}

fn build_streaming_response(
    status: StatusCode,
    upstream_headers: &reqwest::header::HeaderMap,
    content_type: String,
    response: reqwest::Response,
) -> Response<Body> {
    let resolved_content_type = if content_type.is_empty() {
        DEFAULT_CONTENT_TYPE.to_string()
    } else {
        content_type
    };

    let mut builder = Response::builder()
        .status(status)
        .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .header(ACCESS_CONTROL_ALLOW_METHODS, "GET,HEAD,OPTIONS")
        .header(ACCESS_CONTROL_ALLOW_HEADERS, "range,content-type")
        .header(
            ACCESS_CONTROL_EXPOSE_HEADERS,
            "content-length,content-range,accept-ranges,content-type,etag,last-modified",
        )
        .header(CONTENT_TYPE, resolved_content_type)
        .header(
            ACCEPT_RANGES,
            header_to_string(upstream_headers, "accept-ranges").unwrap_or_else(|| "bytes".to_string()),
        )
        .header(
            CACHE_CONTROL,
            header_to_string(upstream_headers, "cache-control").unwrap_or_else(|| "no-store".to_string()),
        );

    if let Some(value) = header_to_string(upstream_headers, "content-length") {
        builder = builder.header(CONTENT_LENGTH, value);
    }
    if let Some(value) = header_to_string(upstream_headers, "content-range") {
        builder = builder.header(CONTENT_RANGE, value);
    }
    if let Some(value) = header_to_string(upstream_headers, "etag") {
        builder = builder.header(ETAG, value);
    }
    if let Some(value) = header_to_string(upstream_headers, "last-modified") {
        builder = builder.header(LAST_MODIFIED, value);
    }

    builder
        .body(Body::from_stream(response.bytes_stream()))
        .unwrap_or_else(|_| {
            build_http_error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "构建流式响应失败".to_string(),
            )
        })
}

fn build_http_response(payload: ProxyResponseData) -> Response<Body> {
    let mut builder = Response::builder()
        .status(payload.status)
        .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .header(ACCESS_CONTROL_ALLOW_METHODS, "GET,HEAD,OPTIONS")
        .header(ACCESS_CONTROL_ALLOW_HEADERS, "range,content-type")
        .header(
            ACCESS_CONTROL_EXPOSE_HEADERS,
            "content-length,content-range,accept-ranges,content-type,etag,last-modified",
        )
        .header(CONTENT_TYPE, payload.content_type)
        .header(CONTENT_LENGTH, payload.body.len().to_string());

    if let Some(value) = payload.content_range {
        builder = builder.header(CONTENT_RANGE, value);
    }
    if let Some(value) = payload.accept_ranges {
        builder = builder.header(ACCEPT_RANGES, value);
    }
    if let Some(value) = payload.cache_control {
        builder = builder.header(CACHE_CONTROL, value);
    }
    if let Some(value) = payload.etag {
        builder = builder.header(ETAG, value);
    }
    if let Some(value) = payload.last_modified {
        builder = builder.header(LAST_MODIFIED, value);
    }

    // 上游可能返回非法 header 值；构建失败时降级为错误响应而非 panic
    builder.body(Body::from(payload.body)).unwrap_or_else(|_| {
        build_http_error_response(StatusCode::BAD_GATEWAY, "构建响应失败".to_string())
    })
}

fn build_http_error_response(status: StatusCode, message: String) -> Response<Body> {
    Response::builder()
        .status(status)
        .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .header(ACCESS_CONTROL_ALLOW_METHODS, "GET,HEAD,OPTIONS")
        .header(ACCESS_CONTROL_ALLOW_HEADERS, "range,content-type")
        .header(CONTENT_TYPE, "text/plain; charset=utf-8")
        .body(Body::from(message))
        .unwrap()
}

fn build_cors_preflight_response() -> Response<Body> {
    Response::builder()
        .status(StatusCode::NO_CONTENT)
        .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .header(ACCESS_CONTROL_ALLOW_METHODS, "GET,HEAD,OPTIONS")
        .header(ACCESS_CONTROL_ALLOW_HEADERS, "range,content-type")
        .body(Body::empty())
        .unwrap()
}

fn header_to_string(headers: &reqwest::header::HeaderMap, name: &str) -> Option<String> {
    headers
        .get(name)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.to_string())
}

fn decode_payload(encoded_payload: &str) -> Result<StreamProxyPayload, (StatusCode, String)> {
    if encoded_payload.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "缺少流地址".to_string()));
    }

    let decoded_payload = general_purpose::URL_SAFE_NO_PAD
        .decode(encoded_payload)
        .map_err(|error| {
            (
                StatusCode::BAD_REQUEST,
                format!("片源参数解析失败: {}", error),
            )
        })?;

    serde_json::from_slice::<StreamProxyPayload>(&decoded_payload).map_err(|error| {
        (
            StatusCode::BAD_REQUEST,
            format!("片源参数无效: {}", error),
        )
    })
}

fn encode_payload(payload: &StreamProxyPayload) -> String {
    let bytes = serde_json::to_vec(payload).unwrap_or_default();
    general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

fn build_local_proxy_url(
    base_url: &str,
    target: &str,
    headers: &HashMap<String, String>,
    content_type: &str,
) -> String {
    let payload = StreamProxyPayload {
        target: target.to_string(),
        headers: headers.clone(),
        content_type: content_type.to_string(),
    };
    format!("{}/{}", base_url.trim_end_matches('/'), encode_payload(&payload))
}

fn rewrite_m3u8_manifest(
    manifest: &str,
    source_url: &str,
    base_url: &str,
    headers: &HashMap<String, String>,
) -> String {
    let base = match reqwest::Url::parse(source_url) {
        Ok(url) => url,
        Err(_) => return manifest.to_string(),
    };

    let manifest_with_uri_attributes = URI_ATTRIBUTE_REGEX
        .replace_all(manifest, |captures: &regex::Captures| {
            let original = captures.get(1).map(|item| item.as_str()).unwrap_or_default();
            match build_manifest_proxy_entry(base.as_str(), original, base_url, headers) {
                Some(url) => format!(r#"URI="{}""#, url),
                None => captures.get(0).map(|item| item.as_str()).unwrap_or_default().to_string(),
            }
        })
        .into_owned();

    manifest_with_uri_attributes
        .lines()
        .map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                return line.to_string();
            }

            build_manifest_proxy_entry(base.as_str(), trimmed, base_url, headers)
                .unwrap_or_else(|| line.to_string())
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn build_manifest_proxy_entry(
    source_url: &str,
    target: &str,
    base_url: &str,
    headers: &HashMap<String, String>,
) -> Option<String> {
    let absolute = reqwest::Url::parse(target)
        .or_else(|_| reqwest::Url::parse(source_url).and_then(|base| base.join(target)))
        .ok()?;
    let absolute_text = absolute.to_string();
    let content_type = guess_media_content_type(&absolute_text);
    Some(build_local_proxy_url(
        base_url,
        &absolute_text,
        headers,
        content_type,
    ))
}

fn guess_media_content_type(target: &str) -> &'static str {
    let lowered = target.to_ascii_lowercase();
    if lowered.contains(".m3u8") {
        return HLS_CONTENT_TYPE;
    }
    if lowered.contains(".mp4") || lowered.contains(".m4v") {
        return "video/mp4";
    }
    if lowered.contains(".webm") {
        return "video/webm";
    }
    if lowered.contains(".mov") {
        return "video/quicktime";
    }
    if lowered.contains(".flv") {
        return "video/x-flv";
    }
    if lowered.contains(".ts") {
        return "video/mp2t";
    }
    DEFAULT_CONTENT_TYPE
}

fn is_hls_manifest(target: &str, response_content_type: &str, fallback_content_type: &str) -> bool {
    let target_lower = target.to_ascii_lowercase();
    let response_lower = response_content_type.to_ascii_lowercase();
    let fallback_lower = fallback_content_type.to_ascii_lowercase();

    target_lower.contains(".m3u8")
        || response_lower.contains("application/vnd.apple.mpegurl")
        || response_lower.contains("application/x-mpegurl")
        || fallback_lower.contains("application/vnd.apple.mpegurl")
        || fallback_lower.contains("application/x-mpegurl")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn payload_round_trips_through_url_safe_base64() {
        let mut headers = HashMap::new();
        headers.insert("referer".to_string(), "https://example.com/".to_string());

        let payload = StreamProxyPayload {
            target: "https://example.com/video.mp4".to_string(),
            headers,
            content_type: "video/mp4".to_string(),
        };

        let encoded = encode_payload(&payload);
        assert!(!encoded.contains('='), "应为 URL-safe NO_PAD");
        assert!(!encoded.contains('+'));
        assert!(!encoded.contains('/'));

        let decoded = decode_payload(&encoded).expect("应能解析回 payload");
        assert_eq!(decoded.target, "https://example.com/video.mp4");
        assert_eq!(decoded.content_type, "video/mp4");
        assert_eq!(
            decoded.headers.get("referer").map(String::as_str),
            Some("https://example.com/")
        );
    }

    #[test]
    fn decode_rejects_empty_payload() {
        assert!(decode_payload("   ").is_err());
    }

    #[test]
    fn guesses_media_content_type() {
        assert_eq!(guess_media_content_type("https://x/a.m3u8"), HLS_CONTENT_TYPE);
        assert_eq!(guess_media_content_type("https://x/a.mp4?token=1"), "video/mp4");
        assert_eq!(guess_media_content_type("https://x/seg.ts"), "video/mp2t");
        assert_eq!(guess_media_content_type("https://x/unknown"), DEFAULT_CONTENT_TYPE);
    }

    #[test]
    fn detects_hls_manifests() {
        assert!(is_hls_manifest("https://x/p.m3u8", "", ""));
        assert!(is_hls_manifest("https://x/p", "application/vnd.apple.mpegurl", ""));
        assert!(is_hls_manifest("https://x/p", "", "application/x-mpegurl"));
        assert!(!is_hls_manifest("https://x/v.mp4", "video/mp4", ""));
    }

    #[test]
    fn rewrites_manifest_segments_through_proxy_with_token() {
        let base_url = "http://127.0.0.1:8080/media/test-token";
        let manifest = concat!(
            "#EXTM3U\n",
            "#EXT-X-KEY:METHOD=AES-128,URI=\"key.key\"\n",
            "#EXTINF:6.0,\n",
            "seg-0.ts\n",
            "https://cdn.example.com/seg-1.ts\n"
        );

        let out = rewrite_m3u8_manifest(
            manifest,
            "https://example.com/live/index.m3u8",
            base_url,
            &HashMap::new(),
        );

        // 注释行保持不变
        assert!(out.contains("#EXTM3U"));
        assert!(out.contains("#EXTINF:6.0,"));

        // 分片地址被改写为带令牌的本地代理地址
        for line in out.lines() {
            if line.starts_with('#') || line.trim().is_empty() {
                continue;
            }
            assert!(
                line.starts_with(base_url),
                "分片行应被代理改写: {}",
                line
            );
        }

        // #EXT-X-KEY 的 URI 也应被改写为带令牌的代理地址
        assert!(out.contains("URI=\"http://127.0.0.1:8080/media/test-token/"));
    }
}
