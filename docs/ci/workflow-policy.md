# Windows 10/11 x64: chính sách CI và phát hành

## Mục tiêu

- Ứng dụng được **hỗ trợ và kiểm thử phát hành cho Windows x64**. Không có cam kết build hoặc phát hành macOS/Linux.
- Giữ kiểm thử TypeScript, Go, Rust và bảo mật CodeQL. Các runner Linux phục vụ *kiểm tra mã nguồn*, **không** đóng gói ứng dụng Linux.
- Trên mỗi PR chỉ có **một** job build Tauri: `🏗️ Build: Windows x64`, chạy sau khi bốn Preflight thành công. Workflow có `concurrency.cancel-in-progress` để hủy lượt kiểm tra cũ.
- Build PR dùng cấu hình unsigned `src-tauri/tauri.ci.conf.json`; không đưa signing private key vào PR hoặc third-party action.
- Tác vụ `CodeQL` phân tích JavaScript/TypeScript, Rust, Go và hủy lượt PR cũ để tránh chạy lặp.

## Điều kiện merge PR #1

1. Bốn Preflight (`check locales`, typecheck, regression gồm Go/release, TypeScript trên Windows) **xanh trên HEAD mới nhất**.
2. **Windows x64 Tauri build** (và Rust tests chạy trong job) thành công, không được thay bằng job skipped.
3. CodeQL kiểm tra JavaScript/TypeScript, Rust, Go thành công; xem xét các vấn đề bảo mật nếu có.
4. Rà soát tiếng Trung còn lại: hiển thị phải Việt hóa, riêng khóa/chuỗi đầu vào kỹ thuật phải có lý do tương thích.
5. Không thay đổi cấu trúc lưu token, dữ liệu tài khoản, OAuth hay refresh_token một cách nguy hiểm. Chỉ khi đó mới đánh dấu Ready/merge.

## Phát hành Windows

- Workflow `📦 Release` chạy qua tag `v*` hoặc thủ công theo tag, chỉ xây dựng Windows x64.
- Phát hành Windows tạo MSI, NSIS, portable archive, hai target updater manifest Windows và `latest.json` chỉ có 3 mục Windows (`windows-x86_64`, `windows-x86_64-msi`, `windows-x86_64-nsis`).
- Không yêu cầu DMG, AppImage, DEB, RPM; không cập nhật Homebrew Cask.
- Trình tạo `build_merged_latest_json.cjs` có `--windows-only`; chế độ full-platform mặc định vẫn giữ vì tương thích với các tiện ích/kiểm thử cũ. Chạy `npm run test:release` để kiểm tra thêm chế độ này.

## Hạn chế tài nguyên

- Repository Public dùng standard GitHub-hosted runners miễn phí theo chính sách GitHub; không dùng larger runners.
- Gom các thay đổi trước khi push để không kích hoạt liên tục các bước tốn thời gian.
- Ngân sách GitHub Actions $0 ngăn mức sử dụng tính phí nhưng không thay thế việc kiểm tra Usage.
