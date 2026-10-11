# Antigravity Account Manager

Ứng dụng desktop đang phát triển để nghiên cứu và quản lý nhiều tài khoản Google Antigravity IDE trên máy cá nhân. Repository hiện dựa trên cấu trúc Cockpit Tools; **chưa có bản phát hành được kiểm định bảo mật**.

## Mục tiêu

- Giao diện và ngôn ngữ mặc định là **tiếng Việt**.
- Đơn giản hóa việc quản lý và chuyển giữa các tài khoản.
- Bảo vệ lịch sử hội thoại, ngữ cảnh Agent, cấu hình và thông tin xác thực.
- Sao lưu, xác minh phiên bản và khôi phục trước khi can thiệp dữ liệu IDE.

## Công nghệ

- Tauri 2: ứng dụng desktop.
- React + TypeScript: giao diện.
- Rust: xử lý nghiệp vụ và tương tác hệ điều hành.

Repository còn một số mô-đun quản lý IDE khác từ dự án tham khảo; sẽ tinh giản theo từng bước, không xóa tùy tiện khi Việt hóa.

## Chạy trong môi trường phát triển

Cần Node.js, npm, Rust và các phụ thuộc Tauri tương ứng với hệ điều hành.

```powershell
npm ci
npm run typecheck
npm run tauri dev
```

Không sử dụng phiên bản đang phát triển với tài khoản quan trọng khi chưa kiểm chứng các thao tác dữ liệu xác thực.

## Quy ước ngôn ngữ

- Chuỗi tiếng Việt đặt tại `src/locales/vi.json`.
- Tiếng Việt là mặc định và lựa chọn dự phòng đầu tiên; tiếng Anh là dự phòng thứ hai.
- Cấu hình cũ từng chọn tiếng Trung được chuyển về tiếng Việt trong quá trình đọc.
- Giữ nguyên tên API, khóa JSON, đường dẫn, biến, tham số lệnh, giao thức và tên sản phẩm.
- Không thêm mới chuỗi hiển thị tiếng Trung.

## Ghi công và bản quyền

Dự án hiện dựa trên [jlcodes99/cockpit-tools](https://github.com/jlcodes99/cockpit-tools), không phải sản phẩm chính thức của Google. Cần xác minh quyền sử dụng và tái phân phối mã nguồn, thư viện và tài nguyên trước khi công bố bản phát hành. Có thể xem công khai mã nguồn không đồng nghĩa được tự do tái phân phối.

## Tiến độ Việt hóa

Đợt đầu xử lý ngôn ngữ mặc định, gói i18n và tài liệu chính. Những thông báo lỗi viết cứng, chú thích mã nguồn, lịch sử thay đổi và mã bên thứ ba vẫn cần được rà soát; chưa thể coi đây là bản Việt hóa hoàn tất.
