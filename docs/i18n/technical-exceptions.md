# Phân loại chuỗi chữ Hán cần giữ nguyên vì tương thích kỹ thuật

Tài liệu này được tạo trong đợt rà soát PR #1. Không đánh đồng *mọi* ký tự Hán với tiếng Trung cần dịch: có các chuỗi đầu vào của dịch vụ, khóa tương thích, dữ liệu thử nghiệm và tên riêng. **Một chuỗi chỉ được giữ lại nếu có lý do kỹ thuật cụ thể; không sử dụng tài liệu này làm ngoại lệ tổng quát cho các thông báo Rust hoặc giao diện chưa dịch.**

## Ngoại lệ có bằng chứng trong mã nguồn

| Nhóm | Ví dụ trong mã | Lý do bắt buộc giữ nguyên | Hướng kiểm thử |
| --- | --- | --- | --- |
| Phản hồi OAuth/token từ phiên bản cũ hoặc máy chủ | `src/pages/useCodexAccountsAccessController.tsx`: các `raw.includes("Codex 登录授权已过期")`, `raw.includes("缺少 refresh_token")`; `src/pages/useCodexAccountsLocalAccessController.tsx`: `rawMessage.includes("token 已过期且无 refresh_token")` | Đây là **đầu vào cần so khớp**, không phải lời hiển thị. Đổi chữ sẽ khiến việc nhận diện token hết hạn hoặc bị thu hồi không còn hoạt động | Kiểm thử nhận diện cả lỗi tiếng Anh và thông báo gốc |
| Tương thích phản hồi nền tảng cũ | `src/pages/GrokAccountsPage.tsx`: `normalized.includes("refresh_token 为空")` | Nhận diện thông báo của backend; không được dịch vế điều kiện | Thử thông báo gốc trong fixture |
| Nhận diện trạng thái điểm danh | `src/components/codebuddy-suite/CodebuddySuiteCheckinModal.tsx`: `/已签到|already\\s*check|already\\s*claim/i` | Regex nhận dữ liệu lỗi gửi tới từ nhà cung cấp; **không hiển thị như nhãn UI** | Kiểm thử khớp đầu vào Trung/Anh |
| Nhận diện lỗi OAuth hết giờ | `src/hooks/useProviderAccountsPage.ts`: `/超时|过期|expired|timeout/i` | Regex xử lý đầu vào, cần nhận diện dữ liệu cũ | Test mẫu thông báo đã hết hạn |
| Phân loại tên gói upstream | `src/utils/codebuddy-suite/quota-model.ts`: `name.includes('赠')` | Một ký tự trong tên gói nhận từ phía dịch vụ quyết định cách phân loại; bản dịch ở **nhãn hiển thị** được Việt hóa riêng | Test phân loại gói tặng |
| Ánh xạ tên riêng sang slug ASCII | `src/components/codex/CodexModelRoutingFields.tsx`: từ điển ký tự như `卫: "wei"`, `龙: "long"` | Đây là dữ liệu phiên âm để tạo định danh/slug; đổi sang tiếng Việt sẽ thay đổi đầu ra | Kiểm thử slug trước/sau |
| Tiêu đề changelog lịch sử | `src-tauri/src/modules/update_checker.rs`: `"新增"`, `"变更"`, `"修复"`, `"移除"` | Bộ đọc còn chấp nhận changelog lịch sử; không được bỏ qua file cũ/định dạng cũ | Các bài thử parser trong cùng mô-đun |
| Khóa dữ liệu và cấu hình lưu từ trước | `release_notes_zh`, `zh-cn`, `zh-tw`, `refresh_token`, `state.vscdb`, `INSTANCE_NOT_INITIALIZED` | Khóa serialize, ngôn ngữ cũ dùng cho migration, tên file và mã lỗi; không phải văn bản UI | Test schema và migration, giữ tên khóa |
| Tên ngôn ngữ và thương hiệu | `日本語`, tên riêng của nhà cung cấp, tên tài khoản do người dùng nhập | Tên ngôn ngữ Nhật không phải chuỗi UI tiếng Trung; tên riêng/dữ liệu người dùng không được tự động thay đổi | Kiểm tra giao diện và dữ liệu người dùng |

## Không phải ngoại lệ kỹ thuật

- Văn bản trong `t('key','...')`, `defaultValue`, `title`, `placeholder`, `aria-label`, JSX và thông báo lỗi hiển thị: **phải Việt hóa**.
- Thông báo `console.*`, `logger::*`, lỗi Rust đưa về UI: cần phân loại đầu ra và dịch nếu không làm thay đổi hợp đồng lỗi.
- Chú thích mã nguồn bằng tiếng Trung: không ảnh hưởng ngôn ngữ ứng dụng lúc chạy, nhưng vẫn cần dịch nếu mục tiêu là làm sạch toàn bộ mã nguồn.
- Các nguồn kế thừa ngoài phạm vi Antigravity chưa được rà soát không được đánh dấu là "kỹ thuật" chỉ vì chúng nằm trong Rust.
- Dữ liệu trong `vendor/`, fixture hoặc snapshot: phải ghi rõ nguồn gốc và mục đích trước khi loại trừ.

## Điều kiện merge

1. `node scripts/vietnamize_source.cjs --check` phải có **0 fallback chưa xử lý**, và `files=0`.
2. Chạy locale checks, TypeScript typecheck, regression (Linux + Windows), release tests, Go tests và các bước Rust/Tauri build cho commit **HEAD cuối cùng**, không sử dụng CI của commit cũ.
3. Nếu còn literal/chú thích tiếng Trung chưa phải ngoại lệ được phân loại và người dùng vẫn yêu cầu **loại bỏ hoàn toàn tiếng Trung trong repository**, giữ PR ở trạng thái Draft. Không suy luận rằng toàn bộ 11.000+ vị trí từ snapshot đều là định danh kỹ thuật.
4. Không merge khi một kiểm thử thất bại, bị hủy hoặc chưa chạy; không ghi đè `main`, không đổi token hay session trong đợt Việt hóa.
