# Quy tắc Việt hóa và bảo toàn định danh kỹ thuật

## Văn bản cần dịch

- Tiêu đề, nút bấm, nhãn nhập liệu, placeholder, tooltip, thông báo xác nhận, trạng thái và lỗi được hiển thị.
- Lời dự phòng tại `t('translation.key', '...')` hoặc `defaultValue` khi chưa có bản dịch.
- Thông báo Rust gửi trực tiếp tới giao diện, sau khi xác minh nơi hiển thị và cách gọi.

## Tuyệt đối không dịch tự động

- Tên biến, khóa JSON/i18n, schema SQLite, mã lỗi, tên bảng, tên file, đường dẫn, URL hoặc tham số dòng lệnh.
- Giá trị dùng trong so sánh logic: `includes`, `startsWith`, biểu thức chính quy hoặc `match`.
- Chuỗi định danh OAuth, access/refresh token, tên trường HTTP, tên dịch vụ, protocol ID và hằng số giao tiếp với hệ thống bên ngoài.
- Snapshot kỹ thuật, test fixture, tên thương hiệu và nội dung lưu từ người dùng.

## Quy trình

1. Quét bằng `node scripts/vietnamize_source.cjs --check`.
2. Chỉ thay fallback nếu có cùng khóa tại `src/locales/vi.json` và cùng biến nội suy `{{...}}`.
3. Các chuỗi không có khóa hoặc so khớp lỗi được duyệt và dịch riêng; không áp dụng tìm-thay toàn repository.
4. Sau thay đổi, chạy kiểm tra bản dịch, typecheck, bộ test và kiểm thử Rust; giữ PR ở trạng thái Draft nếu còn lỗi.
5. Kiểm tra lại nội dung hiển thị khi chạy ứng dụng. Báo cáo tĩnh không chứng minh toàn bộ giao diện đã được Việt hóa.

**Lưu ý:** Không xóa bừa chuỗi tiếng Trung trong mã phụ thuộc bên thứ ba hoặc dữ liệu kiểm thử. Nếu loại bỏ tính năng không cần dùng, thực hiện thành PR độc lập có kiểm thử hồi quy.
