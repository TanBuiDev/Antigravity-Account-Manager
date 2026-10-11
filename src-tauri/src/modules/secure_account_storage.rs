//! AES-256-GCM envelopes for provider account detail files (#1104).
//!
//! Index/summary files stay plaintext; only per-account detail JSON is encrypted
//! at rest. Legacy plaintext files still load and are rewritten encrypted on the
//! next save (or when rotation is due).

use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use base64::{engine::general_purpose, Engine as _};
use rand::RngCore;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const KEY_FILE: &str = "secure-account-storage.key";
const VERSION: u32 = 1;
const ROTATION_SECONDS: i64 = 30 * 24 * 60 * 60;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SecureAccountEnvelope {
    version: u32,
    kind: String,
    algorithm: String,
    key_id: String,
    nonce: String,
    ciphertext: String,
    encrypted_at: i64,
}

fn key_path() -> Result<PathBuf, String> {
    Ok(crate::modules::account::get_data_dir()?.join(KEY_FILE))
}

fn read_or_create_key() -> Result<[u8; 32], String> {
    let path = key_path()?;
    read_or_create_key_at(&path)
}

fn read_key(path: &Path) -> Result<[u8; 32], String> {
    let raw = fs::read_to_string(path).map_err(|e| format!("Không thể đọc khóa mã hóa chi tiết tài khoản: {}", e))?;
    let bytes = general_purpose::STANDARD
        .decode(raw.trim())
        .map_err(|e| format!("Không thể giải mã cấu trúc khóa mã hóa chi tiết tài khoản: {}", e))?;
    bytes
        .try_into()
        .map_err(|_| "Độ dài khóa mã hóa chi tiết tài khoản không hợp lệ".to_string())
}

fn read_or_create_key_at(path: &Path) -> Result<[u8; 32], String> {
    if path.exists() {
        return read_key(path);
    }
    // Account saves and zero-account proxy imports share this key. Serialize
    // first creation across threads/processes without blocking the caller.
    let lock_path = path.with_extension("key.lock");
    if lock_path.is_symlink() {
        return Err("Khóa đồng bộ mã hóa chi tiết tài khoản không hợp lệ".into());
    }
    let lock = fs::OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(lock_path)
        .map_err(|e| format!("Không thể tạo khóa đồng bộ mã hóa chi tiết tài khoản: {}", e))?;
    fs2::FileExt::try_lock_exclusive(&lock)
        .map_err(|_| "Khóa mã hóa chi tiết tài khoản đang được khởi tạo, vui lòng thử lại".to_string())?;
    if path.exists() {
        return read_key(path);
    }

    let mut key = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut key);
    let encoded = general_purpose::STANDARD.encode(key);
    crate::modules::atomic_write::write_secret_string_atomic(path, &encoded)
        .map_err(|e| format!("Không thể ghi khóa mã hóa chi tiết tài khoản: {}", e))?;
    Ok(key)
}

fn cipher() -> Result<Aes256Gcm, String> {
    Aes256Gcm::new_from_slice(&read_or_create_key()?)
        .map_err(|e| format!("Không thể khởi tạo mã hóa chi tiết tài khoản: {}", e))
}

/// Recovery must not create a missing key, rotate credentials or restore a
/// backup over the source file. The caller supplies the key belonging to the
/// account directory, so background work cannot drift to another profile.
pub(crate) fn read_account_file_readonly<T: DeserializeOwned>(
    path: &Path,
    key_path: &Path,
) -> Result<T, String> {
    let content = fs::read_to_string(path).map_err(|e| format!("Không thể đọc chi tiết tài khoản: {}", e))?;
    if let Ok(envelope) = serde_json::from_str::<SecureAccountEnvelope>(&content) {
        let raw =
            fs::read_to_string(key_path).map_err(|e| format!("Không thể đọc khóa mã hóa chi tiết tài khoản: {}", e))?;
        let key = general_purpose::STANDARD
            .decode(raw.trim())
            .map_err(|e| format!("Không thể giải mã cấu trúc khóa mã hóa chi tiết tài khoản: {}", e))?;
        let cipher = Aes256Gcm::new_from_slice(&key)
            .map_err(|e| format!("Không thể khởi tạo mã hóa chi tiết tài khoản: {}", e))?;
        return decrypt_envelope(&envelope, cipher);
    }
    serde_json::from_str(&content).map_err(|e| format!("Không thể phân tích chi tiết tài khoản: {}", e))
}

fn decrypt_envelope<T: DeserializeOwned>(
    envelope: &SecureAccountEnvelope,
    cipher: Aes256Gcm,
) -> Result<T, String> {
    if envelope.version != VERSION || envelope.algorithm != "AES-256-GCM" {
        return Err("Phiên bản mã hóa chi tiết tài khoản không được hỗ trợ".to_string());
    }
    let nonce = general_purpose::STANDARD
        .decode(envelope.nonce.trim())
        .map_err(|e| format!("Không thể phân tích nonce chi tiết tài khoản: {}", e))?;
    if nonce.len() != 12 {
        return Err("Độ dài nonce chi tiết tài khoản không hợp lệ".to_string());
    }
    let ciphertext = general_purpose::STANDARD
        .decode(envelope.ciphertext.trim())
        .map_err(|e| format!("Không thể phân tích dữ liệu mã hóa chi tiết tài khoản: {}", e))?;
    let plaintext = cipher
        .decrypt(Nonce::from_slice(&nonce), ciphertext.as_ref())
        .map_err(|e| format!("Không thể giải mã chi tiết tài khoản: {:?}", e))?;
    serde_json::from_slice(&plaintext).map_err(|e| format!("Không thể phân tích dữ liệu rõ của chi tiết tài khoản: {}", e))
}

pub fn serialize_account_file<T: Serialize>(kind: &str, account: &T) -> Result<String, String> {
    let plaintext =
        serde_json::to_vec(account).map_err(|e| format!("Không thể tuần tự hóa chi tiết tài khoản: {}", e))?;
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let ciphertext = cipher()?
        .encrypt(Nonce::from_slice(&nonce_bytes), plaintext.as_ref())
        .map_err(|e| format!("Không thể mã hóa chi tiết tài khoản: {:?}", e))?;
    let envelope = SecureAccountEnvelope {
        version: VERSION,
        kind: kind.to_string(),
        algorithm: "AES-256-GCM".to_string(),
        key_id: "local-secure-account-storage-v1".to_string(),
        nonce: general_purpose::STANDARD.encode(nonce_bytes),
        ciphertext: general_purpose::STANDARD.encode(ciphertext),
        encrypted_at: chrono::Utc::now().timestamp(),
    };
    serde_json::to_string_pretty(&envelope).map_err(|e| format!("Không thể tuần tự hóa dữ liệu mã hóa chi tiết tài khoản: {}", e))
}

/// Decode an immutable encrypted snapshot without restoring backups, rotating
/// storage, or creating a replacement key when the original key is missing.
pub(crate) fn deserialize_encrypted_snapshot<T: DeserializeOwned>(content: &str) -> Result<T, String> {
    let envelope: SecureAccountEnvelope = serde_json::from_str(content)
        .map_err(|error| format!("Invalid encrypted account snapshot: {error}"))?;
    let cipher = Aes256Gcm::new_from_slice(&read_key(&key_path()?)?)
        .map_err(|error| format!("Cannot initialize snapshot decryption: {error}"))?;
    decrypt_envelope(&envelope, cipher)
}

/// Returns `(account, needs_rewrite)` where `needs_rewrite` is true for legacy
/// plaintext files or envelopes past the rotation window.
pub fn deserialize_account_file<T: DeserializeOwned>(
    path: &Path,
    content: &str,
) -> Result<(T, bool), String> {
    if let Ok(envelope) = serde_json::from_str::<SecureAccountEnvelope>(content) {
        let value = decrypt_envelope(&envelope, cipher()?)?;
        let needs_rotation =
            chrono::Utc::now().timestamp() - envelope.encrypted_at > ROTATION_SECONDS;
        return Ok((value, needs_rotation));
    }

    let value = crate::modules::atomic_write::parse_json_with_auto_restore::<T>(path, content)
        .map_err(|e| format!("Không thể phân tích chi tiết tài khoản: {}", e))?;
    Ok((value, true))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    use std::sync::Mutex;

    static TEST_LOCK: Mutex<()> = Mutex::new(());

    #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
    struct DemoAccount {
        id: String,
        secret: String,
    }

    #[test]
    fn concurrent_first_key_creation_never_replaces_the_winner() {
        let dir = std::env::temp_dir().join(format!("storage-key-race-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join(KEY_FILE);
        let barrier = std::sync::Arc::new(std::sync::Barrier::new(16));
        let threads: Vec<_> = (0..16)
            .map(|_| {
                let path = path.clone();
                let barrier = barrier.clone();
                std::thread::spawn(move || {
                    barrier.wait();
                    read_or_create_key_at(&path)
                })
            })
            .collect();
        let results: Vec<_> = threads.into_iter().map(|t| t.join().unwrap()).collect();
        let key = read_key(&path).unwrap();
        assert!(results.iter().any(Result::is_ok));
        for result in results {
            match result {
                Ok(created) => assert_eq!(created, key),
                Err(error) => assert_eq!(error, "Khóa mã hóa chi tiết tài khoản đang được khởi tạo, vui lòng thử lại"),
            }
        }
        assert_eq!(read_or_create_key_at(&path).unwrap(), key);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn roundtrip_encrypt_decrypt_and_legacy_plaintext() {
        let _guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let _lock = crate::modules::test_support::env_lock()
            .lock()
            .unwrap_or_else(|e| e.into_inner());

        let dir = std::env::temp_dir().join(format!(
            "secure-account-storage-test-{}-{}",
            std::process::id(),
            chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("temp dir");
        std::env::set_var("COCKPIT_TOOLS_TEST_DATA_DIR", &dir);

        let account = DemoAccount {
            id: "a1".into(),
            secret: "tok-secret".into(),
        };
        let path = dir.join("a1.json");
        let enc = serialize_account_file("demo", &account).expect("encrypt");
        assert!(enc.contains("AES-256-GCM"));
        assert!(!enc.contains("tok-secret"));
        fs::write(&path, &enc).expect("write");

        let (decoded, needs_rotation) =
            deserialize_account_file::<DemoAccount>(&path, &enc).expect("decrypt");
        assert_eq!(decoded, account);
        assert!(!needs_rotation);

        let plain = serde_json::to_string_pretty(&account).unwrap();
        let (legacy, needs_migration) =
            deserialize_account_file::<DemoAccount>(&path, &plain).expect("legacy");
        assert_eq!(legacy, account);
        assert!(needs_migration);

        std::env::remove_var("COCKPIT_TOOLS_TEST_DATA_DIR");
        let _ = fs::remove_dir_all(&dir);
    }
}
