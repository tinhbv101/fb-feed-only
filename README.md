<p align="center">
  <img src="icons/logo-512.png" width="128" alt="FB Feed Only logo" />
</p>

<h1 align="center">FB Feed Only</h1>

<p align="center">Extension Chrome ẩn Messenger, khung chat và danh bạ trên Facebook — chỉ giữ lại News Feed.</p>

---

## Tính năng

- **Ẩn tin nhắn & chat** (mặc định bật)
  - Nút Messenger trên thanh điều hướng và mọi link tới `/messages` hoặc messenger.com
  - Khung chat nổi ở góc phải dưới và nút "Tin nhắn mới"
  - Cột bên phải (danh bạ, đoạn chat nhóm)
  - Tự chuyển về trang chủ khi mở `facebook.com/messages/...`
- **Ẩn menu bên trái** (mặc định tắt) — chỉ còn News Feed ở giữa
- Bật/tắt ngay trong popup, áp dụng tức thì, không cần tải lại trang
- Hỗ trợ giao diện Facebook tiếng Việt và tiếng Anh
- Popup có chế độ sáng/tối theo hệ điều hành

## Cài đặt

1. Tải hoặc clone repo này về máy
2. Mở `chrome://extensions`
3. Bật **Developer mode** (góc trên bên phải)
4. Bấm **Load unpacked** → chọn thư mục `fb-feed-only`
5. Tải lại tab Facebook

Dùng được trên các trình duyệt nhân Chromium (Chrome, Edge, Brave, Cốc Cốc…).

**Cập nhật** sau khi sửa code: vào `chrome://extensions` → bấm ↻ trên thẻ FB Feed Only → tải lại tab Facebook.

## Sử dụng

Bấm icon extension trên thanh công cụ để mở popup và bật/tắt từng tùy chọn. Nhãn trạng thái **Đang bật / Đang tắt** cho biết có tùy chọn nào đang hoạt động hay không.

## Quyền riêng tư

- Chỉ dùng quyền `storage` để lưu 2 cài đặt bật/tắt (đồng bộ qua tài khoản Chrome)
- Chỉ chạy trên `*.facebook.com`
- Không đọc nội dung tin nhắn, không gửi dữ liệu đi đâu cả

## Cách hoạt động

Facebook dùng tên class CSS ngẫu nhiên và đổi liên tục, nên extension nhận diện phần tử qua những thứ ổn định hơn:

| Phần tử | Cách nhận diện |
| --- | --- |
| Nút Messenger | `aria-label` như "Messenger", "Đoạn chat", "Chats" |
| Link tin nhắn | `href` trỏ tới `/messages`, `/messenger` hoặc messenger.com |
| Khung chat nổi | Ô nhập có `aria-label` "Tin nhắn"/"Message" → ẩn khối `position: fixed` chứa nó |
| Cột danh bạ | `[role="complementary"]` |
| Menu trái | `[role="navigation"]` nằm ngoài thanh trên cùng |

Một `MutationObserver` quét các phần tử mới xuất hiện (Facebook là SPA nên nội dung tải liên tục) và đánh dấu chúng bằng `data-fbfo-hidden`. CSS chỉ ẩn khi `<html>` có class tương ứng, nên tắt tùy chọn là hiện lại ngay.

### Hạn chế

- Facebook thay đổi giao diện thường xuyên — nếu một phần nào đó không còn bị ẩn, có thể nhãn `aria-label` đã đổi. Danh sách nhãn nằm trong [`src/rules.js`](src/rules.js).
- Ẩn cột bên phải cũng ẩn luôn quảng cáo, sinh nhật và các mục khác trong cột đó.
- Chưa hỗ trợ ngôn ngữ giao diện khác ngoài tiếng Việt và tiếng Anh.

## Phát triển

Yêu cầu: Node.js 20+ (chạy test), Python 3 + Pillow (tạo lại icon).

```bash
npm test                          # unit test + coverage (node:test, không cần cài thêm gì)
python3 scripts/generate-icons.py # vẽ lại icon vào thư mục icons/
```

### Cấu trúc thư mục

```
fb-feed-only/
├── manifest.json          # Manifest V3
├── src/
│   ├── rules.js           # Quy tắc nhận diện thuần (dùng chung cho content script, popup và test)
│   ├── content.js         # Quét DOM, đánh dấu phần tử, chuyển hướng khỏi /messages
│   └── content.css        # Quy tắc ẩn theo class trên <html>
├── popup/                 # Giao diện bật/tắt
├── icons/                 # Icon 16/32/48/128 + logo 512
├── scripts/generate-icons.py
└── tests/rules.test.js
```

### Thêm nhãn cho ngôn ngữ khác

Thêm nhãn (viết thường) vào các mảng `MESSAGE_BUTTON_LABELS`, `CHAT_DOCK_LABELS`, `MESSAGE_INPUT_LABELS` trong [`src/rules.js`](src/rules.js), bổ sung test trong [`tests/rules.test.js`](tests/rules.test.js), rồi chạy `npm test`.
