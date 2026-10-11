use std::collections::HashSet;
use std::fs;
use std::path::Path;

use crate::models::InstanceStore;

#[derive(Debug, Clone)]
pub struct CreateInstanceParams {
    pub name: String,
    pub user_data_dir: String,
    pub working_dir: Option<String>,
    pub extra_args: String,
    pub bind_account_id: Option<String>,
    pub copy_source_instance_id: Option<String>,
    pub init_mode: Option<String>,
}

#[derive(Debug, Clone)]
pub struct UpdateInstanceParams {
    pub instance_id: String,
    pub name: Option<String>,
    pub working_dir: Option<String>,
    pub extra_args: Option<String>,
    pub bind_account_id: Option<Option<String>>,
}

pub fn load_instance_store(path: &Path, file_name: &str) -> Result<InstanceStore, String> {
    if !path.exists() {
        return Ok(InstanceStore::new());
    }

    let content = fs::read_to_string(path).map_err(|e| format!("Không thể đọc cấu hình phiên: {}", e))?;
    if content.trim().is_empty() {
        return Ok(InstanceStore::new());
    }

    match serde_json::from_str(&content) {
        Ok(store) => Ok(store),
        Err(error) => {
            match crate::modules::atomic_write::quarantine_file(path, "invalid-json") {
                Ok(Some(backup_path)) => crate::modules::logger::log_warn(&format!(
                    "Không thể phân tích cấu hình phiên; đã cách ly tệp và sử dụng danh sách phiên trống: file={}, path={}, backup={}, error={}",
                    file_name,
                    path.display(),
                    backup_path.display(),
                    error
                )),
                Ok(None) => crate::modules::logger::log_warn(&format!(
                    "Không thể phân tích cấu hình phiên; tệp không còn tồn tại, dùng danh sách phiên trống: file={}, path={}, error={}",
                    file_name,
                    path.display(),
                    error
                )),
                Err(backup_error) => crate::modules::logger::log_warn(&format!(
                    "Không thể phân tích hoặc cách ly cấu hình phiên; dùng danh sách phiên trống: file={}, path={}, parse_error={}, backup_error={}",
                    file_name,
                    path.display(),
                    error,
                    backup_error
                )),
            }
            Ok(InstanceStore::new())
        }
    }
}

pub fn save_instance_store(
    path: &Path,
    _file_name: &str,
    store: &InstanceStore,
) -> Result<(), String> {
    let _creation_guard = crate::modules::instance_storage_cleanup::protect_instance_creation()?;
    let data_dir = path.parent().ok_or("Không thể xác định thư mục cấu hình phiên")?;
    fs::create_dir_all(data_dir).map_err(|e| format!("Không thể tạo thư mục cấu hình phiên: {}", e))?;
    let content =
        serde_json::to_string_pretty(store).map_err(|e| format!("Không thể tuần tự hóa cấu hình phiên: {}", e))?;
    crate::modules::atomic_write::write_string_atomic(path, &content)
        .map_err(|e| format!("Không thể lưu cấu hình phiên: {}", e))
}

pub fn normalize_name(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Tên phiên không được để trống".to_string());
    }
    Ok(trimmed.to_string())
}

pub fn display_path(path: &Path) -> String {
    if path.is_absolute() {
        return path.to_string_lossy().to_string();
    }
    match std::env::current_dir() {
        Ok(cwd) => cwd.join(path).to_string_lossy().to_string(),
        Err(_) => path.to_string_lossy().to_string(),
    }
}

pub fn ensure_unique(
    store: &InstanceStore,
    name: &str,
    user_data_dir: &str,
    current_id: Option<&str>,
) -> Result<(), String> {
    let mut names = HashSet::new();
    let mut dirs = HashSet::new();
    for instance in &store.instances {
        if let Some(id) = current_id {
            if instance.id == id {
                continue;
            }
        }
        names.insert(instance.name.to_lowercase());
        dirs.insert(instance.user_data_dir.to_lowercase());
    }
    if names.contains(&name.to_lowercase()) {
        return Err("Tên phiên đã tồn tại".to_string());
    }
    if dirs.contains(&user_data_dir.to_lowercase()) {
        return Err("Thư mục phiên đã tồn tại".to_string());
    }
    Ok(())
}

pub fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    if !src.exists() {
        return Err(format!("Thư mục nguồn không tồn tại: {}", src.to_string_lossy()));
    }

    if dst.exists() {
        let mut has_entries = false;
        if let Ok(mut iter) = fs::read_dir(dst) {
            if iter.next().is_some() {
                has_entries = true;
            }
        }
        if has_entries {
            return Err("Thư mục đích đã tồn tại và không trống".to_string());
        }
    }

    fs::create_dir_all(dst).map_err(|e| format!("Không thể tạo thư mục đích: {}", e))?;

    for entry in fs::read_dir(src).map_err(|e| format!("Không thể đọc thư mục nguồn: {}", e))? {
        let entry = entry.map_err(|e| format!("Không thể đọc mục thư mục: {}", e))?;
        let path = entry.path();
        let target = dst.join(entry.file_name());

        let file_type = entry
            .file_type()
            .map_err(|e| format!("Không thể xác định loại tệp: {}", e))?;

        if file_type.is_dir() {
            copy_dir_recursive(&path, &target)?;
        } else if file_type.is_file() {
            fs::copy(&path, &target).map_err(|e| format!("Không thể sao chép tệp: {}", e))?;
        }
    }

    Ok(())
}
