use crate::models;
use crate::modules;
use tauri::AppHandle;

async fn refresh_account_quota_after_login(account: models::Account) -> models::Account {
    let mut refreshing_account = account;
    let account_id = refreshing_account.id.clone();

    match modules::fetch_quota_with_fresh_token(&mut refreshing_account, true).await {
        Ok(quota) => {
            if let Err(e) = modules::update_account_quota(&account_id, quota) {
                modules::logger::log_warn(&format!(
                    "Không thể lưu hạn mức sau khi tự làm mới lúc đăng nhập OAuth: account_id={}, error={}",
                    account_id, e
                ));
                return refreshing_account;
            }

            match modules::load_account(&account_id) {
                Ok(updated) => updated,
                Err(e) => {
                    modules::logger::log_warn(&format!(
                        "Không thể đọc tài khoản sau khi tự làm mới hạn mức lúc đăng nhập OAuth: account_id={}, error={}",
                        account_id, e
                    ));
                    refreshing_account
                }
            }
        }
        Err(e) => {
            modules::logger::log_warn(&format!(
                "Không thể tự làm mới hạn mức sau khi đăng nhập OAuth: account_id={}, error={}",
                account_id, e
            ));
            refreshing_account
        }
    }
}

#[tauri::command]
pub async fn start_oauth_login(
    app_handle: AppHandle,
    note: Option<String>,
    two_factor_secret: Option<String>,
    account_password: Option<String>,
    phone_number: Option<String>,
    mail_url: Option<String>,
    aux_email: Option<String>,
) -> Result<models::Account, String> {
    modules::logger::log_info("Bắt đầu xác thực OAuth...");

    let token_res = modules::oauth_server::start_oauth_flow(app_handle.clone())
        .await
        .map_err(|e| {
            modules::logger::log_error(&format!("Quá trình OAuth thất bại: {}", e));
            e
        })?;

    modules::logger::log_info("Xác thực OAuth thành công, đang kiểm tra refresh_token...");

    let refresh_token = token_res.refresh_token.ok_or_else(|| {
        let msg = "Không nhận được Refresh Token.\n\n\
         Nguyên nhân có thể: bạn đã cấp quyền cho ứng dụng này trước đây\n\n\
         Cách khắc phục:\n\
         1. Truy cập https://myaccount.google.com/permissions\n\
         2. Thu hồi quyền truy cập của 'Antigravity Tools'\n\
         3. Thực hiện xác thực OAuth lại"
            .to_string();
        modules::logger::log_error(&msg);
        msg
    })?;

    modules::logger::log_info("Đang lấy thông tin người dùng...");
    let user_info = modules::oauth::get_user_info(&token_res.access_token)
        .await
        .map_err(|e| {
            modules::logger::log_error(&format!("Không thể lấy thông tin người dùng: {}", e));
            e
        })?;

    modules::logger::log_info(&format!(
        "Người dùng: {} ({})",
        user_info.email,
        user_info.name.as_deref().unwrap_or("Chưa có tên")
    ));

    let token_data = models::TokenData::new(
        token_res.access_token,
        refresh_token,
        token_res.expires_in,
        Some(user_info.email.clone()),
        None,
        user_info.id.clone(),
    )
    .with_oauth_metadata(token_res.oauth_client_key, token_res.id_token);

    let mut account = modules::upsert_account(
        user_info.email.clone(),
        user_info.get_display_name(),
        token_data,
    )
    .map_err(|e| {
        modules::logger::log_error(&format!("Không thể lưu tài khoản: {}", e));
        e
    })?;

    modules::account::apply_account_note_after_oauth(
        &mut account,
        modules::account::AccountNoteUpdate {
            note,
            two_factor_secret,
            account_password,
            phone_number,
            mail_url,
            aux_email,
        },
    )?;
    let account = refresh_account_quota_after_login(account).await;

    modules::logger::log_info(&format!("Đã thêm tài khoản: {}", account.email));

    // 广播数据变更通知
    modules::websocket::broadcast_data_changed("oauth_login");

    Ok(account)
}

#[tauri::command]
pub async fn complete_oauth_login(
    app_handle: AppHandle,
    note: Option<String>,
    two_factor_secret: Option<String>,
    account_password: Option<String>,
    phone_number: Option<String>,
    mail_url: Option<String>,
    aux_email: Option<String>,
) -> Result<models::Account, String> {
    modules::logger::log_info("Đã hoàn tất xác thực OAuth...");

    let token_res = modules::oauth_server::complete_oauth_flow(app_handle.clone())
        .await
        .map_err(|e| {
            modules::logger::log_error(&format!("Quá trình OAuth thất bại: {}", e));
            e
        })?;

    modules::logger::log_info("Xác thực OAuth thành công, đang kiểm tra refresh_token...");

    let refresh_token = token_res.refresh_token.ok_or_else(|| {
        let msg = "Không nhận được Refresh Token.\n\n\
         Nguyên nhân có thể: bạn đã cấp quyền cho ứng dụng này trước đây\n\n\
         Cách khắc phục:\n\
         1. Truy cập https://myaccount.google.com/permissions\n\
         2. Thu hồi quyền truy cập của 'Antigravity Tools'\n\
         3. Thực hiện xác thực OAuth lại"
            .to_string();
        modules::logger::log_error(&msg);
        msg
    })?;

    modules::logger::log_info("Đang lấy thông tin người dùng...");
    let user_info = modules::oauth::get_user_info(&token_res.access_token)
        .await
        .map_err(|e| {
            modules::logger::log_error(&format!("Không thể lấy thông tin người dùng: {}", e));
            e
        })?;

    modules::logger::log_info(&format!(
        "Người dùng: {} ({})",
        user_info.email,
        user_info.name.as_deref().unwrap_or("Chưa có tên")
    ));

    let token_data = models::TokenData::new(
        token_res.access_token,
        refresh_token,
        token_res.expires_in,
        Some(user_info.email.clone()),
        None,
        user_info.id.clone(),
    )
    .with_oauth_metadata(token_res.oauth_client_key, token_res.id_token);

    let mut account = modules::upsert_account(
        user_info.email.clone(),
        user_info.get_display_name(),
        token_data,
    )
    .map_err(|e| {
        modules::logger::log_error(&format!("Không thể lưu tài khoản: {}", e));
        e
    })?;

    modules::account::apply_account_note_after_oauth(
        &mut account,
        modules::account::AccountNoteUpdate {
            note,
            two_factor_secret,
            account_password,
            phone_number,
            mail_url,
            aux_email,
        },
    )?;
    let account = refresh_account_quota_after_login(account).await;

    modules::logger::log_info(&format!("Đã thêm tài khoản: {}", account.email));
    modules::websocket::broadcast_data_changed("oauth_login");

    Ok(account)
}

#[tauri::command]
pub async fn prepare_oauth_url(app_handle: AppHandle) -> Result<String, String> {
    modules::oauth_server::prepare_oauth_url(app_handle).await
}

#[tauri::command]
pub async fn submit_oauth_callback_url(
    app_handle: AppHandle,
    callback_url: String,
) -> Result<(), String> {
    modules::oauth_server::submit_oauth_callback_url(app_handle, callback_url.as_str()).await
}

#[tauri::command]
pub async fn cancel_oauth_login() -> Result<(), String> {
    modules::oauth_server::cancel_oauth_flow();
    Ok(())
}
