use serde::de::DeserializeOwned;
use serde::Serialize;
use std::fs;
#[cfg(not(target_os = "windows"))]
use std::fs::OpenOptions;
#[cfg(not(target_os = "windows"))]
use std::io::Write;
use std::path::{Component, Path, PathBuf};
#[cfg(not(target_os = "windows"))]
use uuid::Uuid;

const OAUTH_PENDING_DIR: &str = "oauth_pending";

fn pending_dir_path() -> Result<PathBuf, String> {
    let data_dir = crate::modules::account::get_data_dir()?;
    let dir = data_dir.join(OAUTH_PENDING_DIR);
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Không thể tạo thư mục OAuth pending: {}", e))?;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&dir, fs::Permissions::from_mode(0o700))
            .map_err(|e| format!("Không thể đặt quyền thư mục OAuth pending: {}", e))?;
    }
    Ok(dir)
}

fn write_secure_atomic(path: &Path, content: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        crate::modules::atomic_write::write_string_atomic(path, content)
    }

    #[cfg(not(target_os = "windows"))]
    {
        let parent = path
            .parent()
            .ok_or_else(|| "Thư mục OAuth pending không hợp lệ".to_string())?;
        let temp = parent.join(format!(
            ".{}.{}.tmp",
            path.file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("pending"),
            Uuid::new_v4()
        ));
        let mut options = OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let mut file = options
            .open(&temp)
            .map_err(|error| format!("Không thể tạo tệp tạm OAuth pending: {}", error))?;
        if let Err(error) = file
            .write_all(content.as_bytes())
            .and_then(|_| file.sync_all())
        {
            let _ = fs::remove_file(&temp);
            return Err(format!("Không thể ghi tệp tạm OAuth pending: {}", error));
        }
        drop(file);
        if let Err(error) = fs::rename(&temp, path) {
            let _ = fs::remove_file(&temp);
            return Err(format!("Không thể thay thế nguyên tử tệp OAuth pending: {}", error));
        }
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(path, fs::Permissions::from_mode(0o600))
                .map_err(|error| format!("Không thể đặt quyền tệp OAuth pending: {}", error))?;
        }
        Ok(())
    }
}

fn pending_file_path(file_name: &str) -> Result<PathBuf, String> {
    let normalized = file_name.trim();
    if normalized.is_empty() {
        return Err("Tên tệp OAuth pending không được để trống".to_string());
    }
    let mut components = Path::new(normalized).components();
    let is_single_file =
        matches!(components.next(), Some(Component::Normal(_))) && components.next().is_none();
    if !is_single_file || normalized.contains('/') || normalized.contains('\\') {
        return Err("Tên tệp OAuth pending không hợp lệ".to_string());
    }
    Ok(pending_dir_path()?.join(normalized))
}

pub fn load<T>(file_name: &str) -> Result<Option<T>, String>
where
    T: DeserializeOwned,
{
    let path = pending_file_path(file_name)?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&path)
        .map_err(|e| format!("Không thể đọc tệp OAuth pending ({}): {}", path.display(), e))?;
    if raw.trim().is_empty() {
        return Ok(None);
    }
    match serde_json::from_str::<T>(&raw) {
        Ok(parsed) => Ok(Some(parsed)),
        Err(error) => {
            match crate::modules::atomic_write::quarantine_file(&path, "invalid-json") {
                Ok(Some(backup_path)) => crate::modules::logger::log_warn(&format!(
                    "Không thể phân tích tệp OAuth pending; đã cách ly và bỏ qua: path={}, backup={}, error={}",
                    path.display(),
                    backup_path.display(),
                    error
                )),
                Ok(None) => crate::modules::logger::log_warn(&format!(
                    "Không thể phân tích tệp OAuth pending; tệp không còn tồn tại, bỏ qua: path={}, error={}",
                    path.display(),
                    error
                )),
                Err(backup_error) => crate::modules::logger::log_warn(&format!(
                    "Không thể phân tích hoặc cách ly tệp OAuth pending, bỏ qua: path={}, parse_error={}, backup_error={}",
                    path.display(),
                    error,
                    backup_error
                )),
            }
            Ok(None)
        }
    }
}

pub fn save<T>(file_name: &str, value: &T) -> Result<(), String>
where
    T: Serialize,
{
    let path = pending_file_path(file_name)?;
    let content = serde_json::to_string_pretty(value)
        .map_err(|e| format!("Không thể tuần tự hóa OAuth pending: {}", e))?;
    write_secure_atomic(&path, &content)
        .map_err(|e| format!("Không thể ghi tệp OAuth pending ({}): {}", path.display(), e))
}

pub fn clear(file_name: &str) -> Result<(), String> {
    let path = pending_file_path(file_name)?;
    if !path.exists() {
        return Ok(());
    }
    fs::remove_file(&path)
        .map_err(|e| format!("Không thể xóa tệp OAuth pending ({}): {}", path.display(), e))
}

#[cfg(test)]
mod tests {
    use super::pending_file_path;

    #[test]
    fn pending_file_name_rejects_parent_traversal() {
        assert!(pending_file_path("..").is_err());
        assert!(pending_file_path("../grok.json").is_err());
        assert!(pending_file_path("folder/grok.json").is_err());
    }
}
