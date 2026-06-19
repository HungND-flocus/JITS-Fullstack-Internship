# Yêu cầu Tuần 1 — Pet project "Mini-Mini-Wallet"

> **Mục đích:** làm quen với Sails, MongoDB và **các quy ước của dự án** qua một bài toán đủ nhỏ.


---

## 1. Mục tiêu

- Tự dựng và chạy được một ứng dụng **Sails kết nối MongoDB**.
- Làm chủ bộ công cụ: Git, Sails/Waterline, MongoDB Compass, Postman, VSCode debug.
- **Hiểu và áp dụng đúng các quy ước của dự án** (mục 4).

---

## 2. Phạm vi

Xây dựng **Mini-Mini-Wallet** — một ví điện tử tối giản với các năng lực sau:

- Người dùng **đăng ký** và **đăng nhập**.
- Mỗi người dùng có **một ví riêng**, được cấp sẵn số dư khởi tạo **1.000.000** khi tạo tài khoản.
- Người dùng có thể **chuyển tiền** cho người dùng khác.
- Người dùng **xem được số dư** ví của mình.
- Người dùng **xem được lịch sử giao dịch** của mình.

Phạm vi cố ý nhỏ để bạn tập trung vào *cách làm* hơn là *làm nhiều*. Bạn được **tự do thiết kế** chi tiết (mô hình dữ liệu, API, luồng), miễn là đáp ứng yêu cầu và tuân thủ quy ước.

---

## 3. Yêu cầu chức năng

Mô tả ở mức nghiệp vụ; cách hiện thực do bạn quyết định.

| Mã | Yêu cầu |
|----|---------|
| F1 | Người dùng đăng ký tài khoản bằng số điện thoại và mật khẩu; số điện thoại là duy nhất. |
| F2 | Mỗi tài khoản được cấp một ví; ví có số dư khởi tạo 1.000.000 ngay khi tạo tài khoản. |
| F3 | Người dùng đăng nhập để sử dụng ví; các thao tác trên ví yêu cầu người dùng đã đăng nhập. |
| F4 | Người dùng chuyển tiền từ ví của mình tới ví của người dùng khác, xác định người nhận qua số điện thoại. |
| F5 | Người dùng xem số dư hiện tại của ví mình. |
| F6 | Người dùng xem lịch sử giao dịch của mình, bao gồm cả giao dịch chuyển đi và nhận về. |

---

## 4. Quy ước dự án phải tuân thủ

Đây là phần quan trọng nhất của tuần 1. Làm đúng chức năng nhưng sai quy ước = **chưa đạt**. 

**Response & mã lỗi**
- **HTTP status luôn là 200**, kể cả khi nghiệp vụ lỗi. Client phân biệt thành/bại bằng trường `err`, **không** bằng HTTP status.
- **Envelope thống nhất:** mọi API trả về dạng `{ err, message, ...data }`. Quy ước: `err === 200` là thành công; `err !== 200` là mã lỗi nghiệp vụ.
- Việc đóng gói response được tập trung ở `api/responses/` (ví dụ `res.ok(data)`, `res.error(...)`, `res.badRequest()`, `res.serverError()`), không tự `res.json` rải rác trong controller. `return` khi gọi response để dừng luồng xử lý.
- **Mã lỗi tập trung** ở một service dùng chung (ví dụ `respCode`), không hard-code chuỗi/số lỗi rải rác.

**Routing**
- **Blueprint tắt** (`actions`, `rest`, `shortcuts` đều `false`) → Sails không tự sinh API; mọi endpoint phải **tự khai** trong `config/routes.js`.
- **Mọi API dùng method `POST`**.

**Policy & xác thực**
- **Deny-by-default:** `config/policies.js` đặt `'*': false`; action nào không được khai báo policy sẽ bị chặn. Chỉ API công khai mới đặt `true`.

---

## 5. Gợi ý mô hình dữ liệu

Bạn **tự thiết kế** thuộc tính từng model. Dưới đây chỉ là **tên gọi thống nhất** để reviewer dễ nắm ngữ cảnh khi đọc code của bạn:

- `Customer` — người dùng.
- `Pocket` — ví (mỗi người dùng một ví, giữ số dư).
- `Transaction` — bản ghi mỗi lần chuyển tiền.

---

## 6. Yêu cầu nghiệp vụ chuyển tiền

Phần này được soi kỹ nhất. Không quy định cách làm — quy định **những gì giao dịch phải đảm bảo**:

- **Toàn vẹn (cân bằng):** số tiền trừ ở ví gửi bằng đúng số tiền cộng ở ví nhận; tổng số dư toàn hệ thống không thay đổi sau mỗi giao dịch.
- **Không âm số dư:** không ví nào được phép có số dư âm.
- **Đủ số dư:** chỉ thực hiện khi ví gửi đủ tiền tại thời điểm chuyển.
- **Hợp lệ:** số tiền là số dương; ví người nhận tồn tại; không cho phép chuyển cho chính mình.
- **Truy vết:** mỗi giao dịch được ghi nhận lại để phục vụ tra cứu lịch sử.

- **Nguyên tử & an toàn đồng thời:** việc trừ và cộng số dư phải nhất quán ngay cả khi nhiều giao dịch xảy ra đồng thời, tránh tranh chấp (*race condition*) dẫn tới chi vượt số dư - NICE TO HAVE
- **Nhất quán khi lỗi:** nếu giao dịch thất bại giữa chừng thì không để lại trạng thái dở dang (chỉ trừ mà không cộng, hoặc ngược lại) — hoặc thay đổi trọn vẹn, hoặc không thay đổi gì - NICE TO HAVE
---

## 7. Công cụ cần cài đặt

- Node.js (LTS) và npm
- Sails CLI
- MongoDB (chạy local) + MongoDB Compass
- Postman
- VSCode
- Git

---

## 8. Kỹ năng cần làm quen

- **Gỡ lỗi:** cấu hình `launch.json` của VSCode để debug ứng dụng Sails; biết đặt breakpoint và theo dõi biến.
- **Kiểm thử API:** dùng Postman để gọi và kiểm thử các API đã viết.
- **Git:** tìm hiểu quy trình làm việc nhóm (clone, branch, commit, push,...).

---

## 9. Tiêu chí nghiệm thu

- Ứng dụng Sails chạy được, kết nối MongoDB (xem được dữ liệu trong Compass).
- Hoàn thành các yêu cầu chức năng F1–F6.
- Tuân thủ đầy đủ các quy ước ở mục 4 (kiểm tra ngẫu nhiên trên code và response).
- Giao dịch chuyển tiền đảm bảo các ràng buộc ở mục 6.
- Demo được luồng end-to-end: đăng ký → đăng nhập → chuyển tiền → xem số dư → xem lịch sử.
- **Giải thích được** các quyết định kỹ thuật và lý do đằng sau các quy ước (buổi review cuối tuần).

---

## 10. Ranh giới

Mini-Mini-Wallet chỉ là bài khởi động để quen framework và quy ước. 
**Mini-Wallet** đầy đủ (engine giao dịch theo cấu hình, 3 bước Request/Confirm/Verify, phí, biller…) là dự án của **tuần 2–5, ở một repo khác**. 
