use crate::modules::oauth;
use std::sync::{Arc, Mutex, OnceLock};
use tauri::Url;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::oneshot;
use tokio::sync::watch;
use tokio::time::{timeout, Duration};

struct OAuthFlowState {
    auth_url: String,
    redirect_uri: String,
    expected_state: String,
    cancel_tx: watch::Sender<bool>,
    code_tx: Arc<tokio::sync::Mutex<Option<oneshot::Sender<Result<String, String>>>>>,
    code_rx: Option<oneshot::Receiver<Result<String, String>>>,
}

static OAUTH_FLOW_STATE: OnceLock<Mutex<Option<OAuthFlowState>>> = OnceLock::new();
// Errors are reused for callback routing; keep detection independent of the UI language.
const OAUTH_MISSING_CODE: &str = "Không nhận được Authorization Code trong callback";
const OAUTH_MISSING_STATE: &str = "Không nhận được OAuth state trong callback";
const OAUTH_CALLBACK_PATH: &str = "/oauth-callback";
const MAX_HTTP_REQUEST_BYTES: usize = 32 * 1024;
const REQUEST_READ_TIMEOUT: Duration = Duration::from_secs(5);
const OAUTH_FLOW_WAIT_TIMEOUT: Duration = Duration::from_secs(10 * 60);

fn get_oauth_flow_state() -> &'static Mutex<Option<OAuthFlowState>> {
    OAUTH_FLOW_STATE.get_or_init(|| Mutex::new(None))
}

fn oauth_success_html() -> &'static str {
    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n\r\n\
    <html>\
    <body style='font-family: sans-serif; text-align: center; padding: 50px; background: #0d1117; color: #fff;'>\
        <h1 style='color: #4ade80;'>✅ Ủy quyền thành công!</h1>\
        <p>Bạn có thể đóng cửa sổ này để quay lại ứng dụng.</p>\
        <script>setTimeout(function() { window.close(); }, 2000);</script>\
    </body>\
    </html>"
}

fn oauth_fail_html(message: &str) -> String {
    format!(
        "HTTP/1.1 400 Bad Request\r\nContent-Type: text/html; charset=utf-8\r\n\r\n\
    <html>\
    <body style='font-family: sans-serif; text-align: center; padding: 50px; background: #0d1117; color: #fff;'>\
        <h1 style='color: #f87171;'>❌ Ủy quyền thất bại</h1>\
        <p>{}</p>\
    </body>\
    </html>",
        message
    )
}

fn oauth_not_found_response() -> &'static str {
    "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nNot Found"
}

fn oauth_options_response() -> &'static str {
    "HTTP/1.1 200 OK\r\n\
    Access-Control-Allow-Origin: *\r\n\
    Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n\
    Access-Control-Allow-Headers: Content-Type\r\n\
    Content-Length: 0\r\n\r\n"
}

fn clear_oauth_flow_state() {
    if let Ok(mut lock) = get_oauth_flow_state().lock() {
        *lock = None;
    }
}

fn extract_code_from_callback_url(
    callback_url: &Url,
    expected_state: &str,
) -> Result<String, String> {
    let mut code = None;
    let mut state = None;
    for (key, value) in callback_url.query_pairs() {
        match key.as_ref() {
            "code" if code.is_none() => code = Some(value.into_owned()),
            "state" if state.is_none() => state = Some(value.into_owned()),
            _ => {}
        }
    }

    let Some(code) = code.filter(|value| !value.trim().is_empty()) else {
        return Err(OAUTH_MISSING_CODE.to_string());
    };

    let Some(state) = state.filter(|value| !value.trim().is_empty()) else {
        return Err(OAUTH_MISSING_STATE.to_string());
    };

    if state != expected_state {
        return Err("Xác minh OAuth state thất bại".to_string());
    }

    Ok(code)
}

fn parse_manual_callback_url(raw_callback_url: &str, redirect_uri: &str) -> Result<Url, String> {
    let trimmed = raw_callback_url.trim();
    if trimmed.is_empty() {
        return Err("Liên kết callback không được để trống".to_string());
    }

    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return Url::parse(trimmed).map_err(|e| format!("Không thể phân tích URL callback OAuth: {}", e));
    }

    let redirect =
        Url::parse(redirect_uri).map_err(|e| format!("OAuth redirect_uri không hợp lệ: {}", e))?;
    let host = redirect
        .host_str()
        .ok_or_else(|| "OAuth redirect_uri thiếu host".to_string())?;
    let origin = match redirect.port() {
        Some(port) => format!("{}://{}:{}", redirect.scheme(), host, port),
        None => format!("{}://{}", redirect.scheme(), host),
    };

    if trimmed.starts_with('/') {
        return Url::parse(format!("{}{}", origin, trimmed).as_str())
            .map_err(|e| format!("Không thể phân tích URL callback OAuth: {}", e));
    }

    Url::parse(
        format!(
            "{}{}?{}",
            origin,
            OAUTH_CALLBACK_PATH,
            trimmed.trim_start_matches('?')
        )
        .as_str(),
    )
    .map_err(|e| format!("Không thể phân tích URL callback OAuth: {}", e))
}

async fn read_http_request(stream: &mut tokio::net::TcpStream) -> Result<String, String> {
    let mut buffer = Vec::with_capacity(4096);
    let mut chunk = [0u8; 2048];

    loop {
        let bytes_read = timeout(REQUEST_READ_TIMEOUT, stream.read(&mut chunk))
            .await
            .map_err(|_| "Đọc yêu cầu callback OAuth quá thời gian chờ".to_string())?
            .map_err(|e| format!("Không thể đọc yêu cầu callback OAuth: {}", e))?;

        if bytes_read == 0 {
            break;
        }

        buffer.extend_from_slice(&chunk[..bytes_read]);
        if buffer.windows(4).any(|window| window == b"\r\n\r\n")
            || buffer.len() >= MAX_HTTP_REQUEST_BYTES
        {
            break;
        }
    }

    if buffer.is_empty() {
        return Err("Yêu cầu callback OAuth trống".to_string());
    }

    Ok(String::from_utf8_lossy(&buffer).into_owned())
}

fn parse_request_target(request: &str) -> Result<(String, String), String> {
    let request_line = request
        .lines()
        .next()
        .ok_or_else(|| "Dòng yêu cầu callback OAuth trống".to_string())?;
    let mut parts = request_line.split_whitespace();
    let method = parts
        .next()
        .ok_or_else(|| "Yêu cầu callback OAuth thiếu method".to_string())?;
    let target = parts
        .next()
        .ok_or_else(|| "Yêu cầu callback OAuth thiếu target".to_string())?;

    Ok((method.to_string(), target.to_string()))
}

async fn process_callback_request(
    stream: &mut tokio::net::TcpStream,
    port: u16,
    expected_state: &str,
) -> Option<Result<String, String>> {
    let request = match read_http_request(stream).await {
        Ok(request) => request,
        Err(err) => {
            let response = oauth_fail_html("Không thể đọc yêu cầu callback. Hãy quay lại ứng dụng và thử lại.");
            let _ = stream.write_all(response.as_bytes()).await;
            let _ = stream.flush().await;
            return Some(Err(err));
        }
    };

    let (method, target) = match parse_request_target(&request) {
        Ok(parsed) => parsed,
        Err(err) => {
            let response = oauth_fail_html("Định dạng yêu cầu callback không hợp lệ. Hãy quay lại ứng dụng và thử lại.");
            let _ = stream.write_all(response.as_bytes()).await;
            let _ = stream.flush().await;
            return Some(Err(err));
        }
    };

    if method.eq_ignore_ascii_case("OPTIONS") {
        let _ = stream.write_all(oauth_options_response().as_bytes()).await;
        let _ = stream.flush().await;
        return None;
    }

    let callback_url = match if target.starts_with("http://") || target.starts_with("https://") {
        Url::parse(&target)
    } else {
        Url::parse(&format!("http://localhost:{}{}", port, target))
    } {
        Ok(url) => url,
        Err(_) => {
            let response = oauth_fail_html("Không thể phân tích URL callback. Hãy quay lại ứng dụng và thử lại.");
            let _ = stream.write_all(response.as_bytes()).await;
            let _ = stream.flush().await;
            return Some(Err("Không thể phân tích URL callback OAuth".to_string()));
        }
    };

    if callback_url.path() != OAUTH_CALLBACK_PATH {
        let _ = stream
            .write_all(oauth_not_found_response().as_bytes())
            .await;
        let _ = stream.flush().await;
        return None;
    }

    let code = match extract_code_from_callback_url(&callback_url, expected_state) {
        Ok(code) => code,
        Err(err) if err == OAUTH_MISSING_CODE => {
            let response = oauth_fail_html("Không nhận được mã ủy quyền. Hãy quay lại ứng dụng và thử lại.");
            let _ = stream.write_all(response.as_bytes()).await;
            let _ = stream.flush().await;
            return Some(Err(err));
        }
        Err(err) if err == OAUTH_MISSING_STATE => {
            let response = oauth_fail_html("Không nhận được trạng thái ủy quyền. Hãy quay lại ứng dụng và thử lại.");
            let _ = stream.write_all(response.as_bytes()).await;
            let _ = stream.flush().await;
            return Some(Err(err));
        }
        Err(err) => {
            let response = oauth_fail_html("Xác minh trạng thái ủy quyền thất bại. Hãy quay lại ứng dụng để bắt đầu ủy quyền lại.");
            let _ = stream.write_all(response.as_bytes()).await;
            let _ = stream.flush().await;
            return Some(Err(err));
        }
    };

    let _ = stream.write_all(oauth_success_html().as_bytes()).await;
    let _ = stream.flush().await;

    Some(Ok(code))
}

async fn ensure_oauth_flow_prepared(app_handle: &tauri::AppHandle) -> Result<String, String> {
    use tauri::Emitter;

    if let Ok(state) = get_oauth_flow_state().lock() {
        if let Some(s) = state.as_ref() {
            return Ok(s.auth_url.clone());
        }
    }

    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("Không thể mở cổng cục bộ: {}", e))?;

    let port = listener
        .local_addr()
        .map_err(|e| format!("Không thể xác định cổng cục bộ: {}", e))?
        .port();

    let redirect_uri = format!("http://localhost:{}/oauth-callback", port);
    let state_token = uuid::Uuid::new_v4().to_string();
    let auth_url = oauth::get_auth_url(&redirect_uri, Some(&state_token));

    let (cancel_tx, cancel_rx) = watch::channel(false);
    let (code_tx, code_rx) = oneshot::channel::<Result<String, String>>();

    let code_tx = std::sync::Arc::new(tokio::sync::Mutex::new(Some(code_tx)));
    let app_handle_clone = app_handle.clone();

    let tx = code_tx.clone();
    let mut rx = cancel_rx;
    let expected_state = state_token.clone();
    tokio::spawn(async move {
        loop {
            let accept_result = tokio::select! {
                res = listener.accept() => Some(res),
                _ = rx.changed() => None,
            };

            let Some(accept_result) = accept_result else {
                break;
            };

            let Ok((mut stream, _)) = accept_result else {
                continue;
            };

            let result = process_callback_request(&mut stream, port, &expected_state).await;
            if let Some(result) = result {
                if let Some(sender) = tx.lock().await.take() {
                    let _ = app_handle_clone.emit("oauth-callback-received", ());
                    let _ = sender.send(result);
                }
                break;
            }
        }
    });

    if let Ok(mut state) = get_oauth_flow_state().lock() {
        *state = Some(OAuthFlowState {
            auth_url: auth_url.clone(),
            redirect_uri,
            expected_state: state_token.clone(),
            cancel_tx,
            code_tx: code_tx.clone(),
            code_rx: Some(code_rx),
        });
    }

    let _ = app_handle.emit("oauth-url-generated", &auth_url);

    Ok(auth_url)
}

/// Tạo trước URL OAuth
pub async fn prepare_oauth_url(app_handle: tauri::AppHandle) -> Result<String, String> {
    ensure_oauth_flow_prepared(&app_handle).await
}

/// Hủy quy trình OAuth hiện tại
pub fn cancel_oauth_flow() {
    if let Ok(mut state) = get_oauth_flow_state().lock() {
        if let Some(s) = state.take() {
            let _ = s.cancel_tx.send(true);
        }
    }
}

pub async fn submit_oauth_callback_url(
    app_handle: tauri::AppHandle,
    callback_url: &str,
) -> Result<(), String> {
    use tauri::Emitter;

    let (redirect_uri, expected_state, code_tx) = {
        let lock = get_oauth_flow_state()
            .lock()
            .map_err(|_| "Khóa trạng thái OAuth đã bị lỗi".to_string())?;
        let state = lock
            .as_ref()
            .ok_or_else(|| "Không tìm thấy trạng thái OAuth. Hãy bắt đầu ủy quyền trước.".to_string())?;
        (
            state.redirect_uri.clone(),
            state.expected_state.clone(),
            state.code_tx.clone(),
        )
    };

    let parsed = parse_manual_callback_url(callback_url, &redirect_uri)?;
    if parsed.path() != OAUTH_CALLBACK_PATH {
        return Err(format!("Đường dẫn callback không hợp lệ, phải là {}", OAUTH_CALLBACK_PATH));
    }

    let code = extract_code_from_callback_url(&parsed, expected_state.as_str())?;

    let mut tx = code_tx.lock().await;
    let sender = tx
        .take()
        .ok_or_else(|| "Callback OAuth đã được xử lý, không gửi lại".to_string())?;
    sender
        .send(Ok(code))
        .map_err(|_| "Không thể gửi callback OAuth, hãy bắt đầu ủy quyền lại".to_string())?;
    let _ = app_handle.emit("oauth-callback-received", ());
    Ok(())
}

/// Bắt đầu quy trình OAuth và đợi callback
pub async fn start_oauth_flow(
    app_handle: tauri::AppHandle,
) -> Result<oauth::TokenResponse, String> {
    let auth_url = ensure_oauth_flow_prepared(&app_handle).await?;

    use tauri_plugin_opener::OpenerExt;
    app_handle
        .opener()
        .open_url(&auth_url, None::<String>)
        .map_err(|e| {
            cancel_oauth_flow();
            format!("Không thể mở trình duyệt: {}", e)
        })?;

    let (code_rx, redirect_uri) = {
        let mut lock = get_oauth_flow_state()
            .lock()
            .map_err(|_| "Khóa trạng thái OAuth đã bị lỗi".to_string())?;
        let Some(state) = lock.as_mut() else {
            return Err("Không tìm thấy trạng thái OAuth".to_string());
        };
        let rx = state
            .code_rx
            .take()
            .ok_or_else(|| "Quá trình ủy quyền OAuth đang diễn ra".to_string())?;
        (rx, state.redirect_uri.clone())
    };

    let callback_result = timeout(OAUTH_FLOW_WAIT_TIMEOUT, code_rx).await;
    let code = match callback_result {
        Ok(Ok(Ok(code))) => code,
        Ok(Ok(Err(e))) => {
            clear_oauth_flow_state();
            return Err(e);
        }
        Ok(Err(_)) => {
            clear_oauth_flow_state();
            return Err("Không thể đợi callback OAuth".to_string());
        }
        Err(_) => {
            cancel_oauth_flow();
            return Err("Chờ callback OAuth quá thời gian, vui lòng thử lại".to_string());
        }
    };

    clear_oauth_flow_state();

    oauth::exchange_code(&code, &redirect_uri).await
}

/// Hoàn tất quy trình OAuth (không mở trình duyệt)

pub async fn complete_oauth_flow(
    app_handle: tauri::AppHandle,
) -> Result<oauth::TokenResponse, String> {
    let _ = ensure_oauth_flow_prepared(&app_handle).await?;

    let (code_rx, redirect_uri) = {
        let mut lock = get_oauth_flow_state()
            .lock()
            .map_err(|_| "Khóa trạng thái OAuth đã bị lỗi".to_string())?;
        let Some(state) = lock.as_mut() else {
            return Err("Không tìm thấy trạng thái OAuth".to_string());
        };
        let rx = state
            .code_rx
            .take()
            .ok_or_else(|| "Quá trình ủy quyền OAuth đang diễn ra".to_string())?;
        (rx, state.redirect_uri.clone())
    };

    let callback_result = timeout(OAUTH_FLOW_WAIT_TIMEOUT, code_rx).await;
    let code = match callback_result {
        Ok(Ok(Ok(code))) => code,
        Ok(Ok(Err(e))) => {
            clear_oauth_flow_state();
            return Err(e);
        }
        Ok(Err(_)) => {
            clear_oauth_flow_state();
            return Err("Không thể đợi callback OAuth".to_string());
        }
        Err(_) => {
            cancel_oauth_flow();
            return Err("Chờ callback OAuth quá thời gian, vui lòng thử lại".to_string());
        }
    };

    clear_oauth_flow_state();

    oauth::exchange_code(&code, &redirect_uri).await
}

// Regression coverage for user-facing OAuth callback messages and state checks.
#[cfg(test)]
mod localization_regression_tests {
    use super::{
        extract_code_from_callback_url, oauth_fail_html, oauth_success_html,
        parse_manual_callback_url, OAUTH_MISSING_CODE, OAUTH_MISSING_STATE,
    };
    use tauri::Url;

    #[test]
    fn callback_accepts_matching_state_and_rejects_invalid_state() {
        let url = Url::parse("http://127.0.0.1:9999/oauth-callback?code=code123&state=expected")
            .expect("valid callback URL");
        assert_eq!(
            extract_code_from_callback_url(&url, "expected").unwrap(),
            "code123"
        );
        assert_eq!(
            extract_code_from_callback_url(&url, "different").unwrap_err(),
            "Xác minh OAuth state thất bại"
        );
    }

    #[test]
    fn callback_requires_both_code_and_state() {
        let no_code =
            Url::parse("http://127.0.0.1:9999/oauth-callback?state=expected").unwrap();
        assert_eq!(
            extract_code_from_callback_url(&no_code, "expected").unwrap_err(),
            OAUTH_MISSING_CODE
        );
        let no_state =
            Url::parse("http://127.0.0.1:9999/oauth-callback?code=code123").unwrap();
        assert_eq!(
            extract_code_from_callback_url(&no_state, "expected").unwrap_err(),
            OAUTH_MISSING_STATE
        );
    }

    #[test]
    fn manual_callback_parsing_preserves_original_protocol() {
        let url = parse_manual_callback_url(
            "?code=code123&state=expected",
            "http://127.0.0.1:9999/oauth-callback",
        )
        .unwrap();
        assert_eq!(url.path(), "/oauth-callback");
        assert_eq!(url.query(), Some("code=code123&state=expected"));
    }

    #[test]
    fn oauth_browser_messages_are_in_vietnamese() {
        assert!(oauth_success_html().contains("Ủy quyền thành công"));
        assert!(oauth_fail_html("Thử lại").contains("Ủy quyền thất bại"));
        assert!(oauth_fail_html("Thử lại").contains("Thử lại"));
    }
}
