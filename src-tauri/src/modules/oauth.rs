use serde::{Deserialize, Serialize};

const CLIENT_ID: &str = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
const CLIENT_SECRET: &str = "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";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const USERINFO_URL: &str = "https://www.googleapis.com/oauth2/v2/userinfo";
const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const DEFAULT_OAUTH_CLIENT_KEY: &str = "antigravity_enterprise";

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub expires_in: i64,
    #[serde(default)]
    pub token_type: String,
    #[serde(default)]
    pub refresh_token: Option<String>,
    #[serde(default)]
    pub id_token: Option<String>,
    #[serde(skip)]
    pub oauth_client_key: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserInfo {
    #[serde(default)]
    pub id: Option<String>,
    pub email: String,
    pub name: Option<String>,
    pub given_name: Option<String>,
    pub family_name: Option<String>,
    pub picture: Option<String>,
}

impl UserInfo {
    pub fn get_display_name(&self) -> Option<String> {
        if let Some(name) = &self.name {
            if !name.trim().is_empty() {
                return Some(name.clone());
            }
        }

        match (&self.given_name, &self.family_name) {
            (Some(given), Some(family)) => Some(format!("{} {}", given, family)),
            (Some(given), None) => Some(given.clone()),
            (None, Some(family)) => Some(family.clone()),
            (None, None) => None,
        }
    }
}

fn normalize_oauth_client_key(value: &str) -> String {
    value.trim().to_ascii_lowercase()
}

fn resolve_oauth_client_key(preferred: Option<&str>) -> Result<String, String> {
    match preferred.map(normalize_oauth_client_key) {
        Some(key) if key == DEFAULT_OAUTH_CLIENT_KEY => Ok(key),
        Some(key) if key.is_empty() => Ok(DEFAULT_OAUTH_CLIENT_KEY.to_string()),
        Some(key) => Err(format!(
            "OAuth client không xác định: {}，phiên bản hiện tại chỉ hỗ trợ {}",
            key, DEFAULT_OAUTH_CLIENT_KEY
        )),
        None => Ok(DEFAULT_OAUTH_CLIENT_KEY.to_string()),
    }
}

fn oauth_client_config(
    preferred: Option<&str>,
) -> Result<(&'static str, &'static str, String), String> {
    let key = resolve_oauth_client_key(preferred)?;
    Ok((CLIENT_ID, CLIENT_SECRET, key))
}

/// 生成 OAuth 授权 URL
pub fn get_auth_url(redirect_uri: &str, state: Option<&str>) -> String {
    let (client_id, _, _) = oauth_client_config(None).expect("Cấu hình OAuth client mặc định không hợp lệ");
    let scopes = vec![
        "openid",
        "https://www.googleapis.com/auth/cloud-platform",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/cclog",
        "https://www.googleapis.com/auth/experimentsandconfigs",
        "https://www.googleapis.com/auth/aicode",
    ]
    .join(" ");

    let mut params = vec![
        ("client_id", client_id),
        ("redirect_uri", redirect_uri),
        ("response_type", "code"),
        ("scope", &scopes),
        ("access_type", "offline"),
        ("prompt", "consent"),
    ];

    if let Some(state) = state.filter(|value| !value.trim().is_empty()) {
        params.push(("state", state));
    }

    let url = url::Url::parse_with_params(AUTH_URL, &params).expect("URL xác thực không hợp lệ");
    url.to_string()
}

/// 使用 Authorization Code 交换 Token
pub async fn exchange_code(code: &str, redirect_uri: &str) -> Result<TokenResponse, String> {
    crate::modules::logger::log_info(&format!("Bắt đầu trao đổi token, redirect_uri: {}", redirect_uri));
    let client = crate::utils::http::create_client(15);
    let (client_id, client_secret, client_key) = oauth_client_config(None)?;

    let params = [
        ("client_id", client_id),
        ("client_secret", client_secret),
        ("code", code),
        ("redirect_uri", redirect_uri),
        ("grant_type", "authorization_code"),
    ];

    let response = client
        .post(TOKEN_URL)
        .form(&params)
        .send()
        .await
        .map_err(|e| {
            let msg = format!("Yêu cầu trao đổi token thất bại: {}", e);
            crate::modules::logger::log_error(&msg);
            msg
        })?;

    let status = response.status();
    crate::modules::logger::log_info(&format!("Trạng thái phản hồi trao đổi token: {}", status));

    if status.is_success() {
        let mut token_res = response.json::<TokenResponse>().await.map_err(|e| {
            let msg = format!("Không thể phân tích token: {}", e);
            crate::modules::logger::log_error(&msg);
            msg
        })?;
        token_res.oauth_client_key = Some(client_key);

        if token_res.refresh_token.is_some() {
            crate::modules::logger::log_info("Trao đổi token thành công, đã nhận refresh_token");
        } else {
            crate::modules::logger::log_warn(
                "Cảnh báo: Google không trả về refresh_token; có thể bạn đã cấp quyền cho ứng dụng này trước đó",
            );
        }

        Ok(token_res)
    } else {
        let error_text = response.text().await.unwrap_or_default();
        let msg = format!("Trao đổi token thất bại ({})，body_len={}", status, error_text.len());
        crate::modules::logger::log_error(&msg);
        Err(msg)
    }
}

/// 使用 refresh_token 刷新 access_token
pub async fn refresh_access_token(refresh_token: &str) -> Result<TokenResponse, String> {
    refresh_access_token_with_client(refresh_token, None).await
}

/// 使用指定 OAuth client 刷新 access_token。
pub async fn refresh_access_token_with_client(
    refresh_token: &str,
    oauth_client_key: Option<&str>,
) -> Result<TokenResponse, String> {
    let client = crate::utils::http::create_client(15);
    let (client_id, client_secret, client_key) = oauth_client_config(oauth_client_key)?;

    let params = [
        ("client_id", client_id),
        ("client_secret", client_secret),
        ("refresh_token", refresh_token),
        ("grant_type", "refresh_token"),
    ];

    let response = client
        .post(TOKEN_URL)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Yêu cầu làm mới thất bại: {}", e))?;

    if response.status().is_success() {
        let mut token_data = response
            .json::<TokenResponse>()
            .await
            .map_err(|e| format!("Không thể phân tích dữ liệu làm mới: {}", e))?;
        token_data.oauth_client_key = Some(client_key);

        Ok(token_data)
    } else {
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("Làm mới thất bại: {}", error_text))
    }
}

/// 获取用户信息
pub async fn get_user_info(access_token: &str) -> Result<UserInfo, String> {
    let client = crate::utils::http::create_client(15);

    let response = client
        .get(USERINFO_URL)
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Yêu cầu thông tin người dùng thất bại: {}", e))?;

    if response.status().is_success() {
        response
            .json::<UserInfo>()
            .await
            .map_err(|e| format!("Không thể phân tích thông tin người dùng: {}", e))
    } else {
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("Không thể lấy thông tin người dùng: {}", error_text))
    }
}

/// 检查并在需要时刷新 Token
pub async fn ensure_fresh_token(
    current_token: &crate::models::TokenData,
) -> Result<crate::models::TokenData, String> {
    let now = chrono::Local::now().timestamp();

    if current_token.expiry_timestamp > now + 300 {
        return Ok(current_token.clone());
    }

    crate::modules::logger::log_info("Token sắp hết hạn, đang làm mới...");
    let response = refresh_access_token_with_client(
        &current_token.refresh_token,
        current_token.oauth_client_key.as_deref(),
    )
    .await?;

    let mut token = crate::models::TokenData::new(
        response.access_token,
        current_token.refresh_token.clone(),
        response.expires_in,
        current_token.email.clone(),
        current_token.project_id.clone(),
        current_token.session_id.clone(),
    )
    .with_oauth_metadata(
        response.oauth_client_key,
        response.id_token.or_else(|| current_token.id_token.clone()),
    );
    token.is_gcp_tos = current_token.is_gcp_tos;
    Ok(token)
}
