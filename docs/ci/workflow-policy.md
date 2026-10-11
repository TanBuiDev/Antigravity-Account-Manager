# Chính sách CI: kiểm thử PR nhanh và build thủ công

## Trên pull request

- `🚀 Build Matrix` chỉ chạy 4 bước Preflight: kiểm tra i18n và Rust guard, TypeScript typecheck, regression (bao gồm Go/release), TypeScript trên Windows.
- Sáu job Tauri Build Matrix cố ý **skipped** khi chạy trên PR; đây không phải bằng chứng đã build thành công.
- `CodeQL` vẫn chạy trên PR với JavaScript/TypeScript, Rust và Go, nhưng hủy lượt phân tích cũ khi có commit mới.
- Không nên đẩy nhiều commit nhỏ liên tiếp chỉ để kích hoạt CI; gom lại và kiểm thử tại máy trước.

## Trước khi merge PR quan trọng

1. Kiểm tra tất cả Preflight và CodeQL của **HEAD hiện tại** đều thành công; kiểm tra nội dung chuỗi Trung chưa được phân loại.
2. Vào **Actions → 🚀 Build Matrix → Run workflow**, chọn **nhánh của PR** và kích hoạt một lần. `workflow_dispatch` sẽ chạy đầy đủ sáu bản build Tauri sau Preflight.
3. Đợi **tất cả sáu nền tảng** thành công và xác nhận workflow thủ công dùng đúng HEAD của PR, không phải commit cũ.
4. Chỉ đánh dấu PR Ready và merge sau khi các kiểm tra cần thiết, review OAuth/token và bảo mật đạt yêu cầu.

## Phát hành

`📦 Release` vẫn chỉ chạy khi đẩy tag `v*` hoặc gọi thủ công theo tag; không cần kích hoạt để kiểm thử thường nhật.

## Chi phí

Repo Public dùng GitHub-hosted **standard runners** đủ điều kiện miễn phí theo chính sách GitHub. Không dùng larger runners khi chưa có ngân sách được phê duyệt. Ngân sách Actions $0 là hàng rào chi phí, nhưng không thay thế việc giám sát số lần build.
