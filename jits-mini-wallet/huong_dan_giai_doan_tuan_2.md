# Hướng dẫn Tuần 2: Chuyển mình từ "Thợ Code" sang "Kỹ sư Thiết kế Hệ thống"

Đừng quá hoảng ngợp khi đọc mớ tài liệu dài dằng dặc kia! Tuần 1 bạn làm **mini-mini-wallet** là code "chạy bằng cơm" (nghiệp vụ nào code riêng hàm đó). Nhưng ở Tuần 2, dự án **Mini Wallet** yêu cầu bạn tư duy ở một đẳng cấp hoàn toàn khác: **Config-Driven (Lập trình dựa trên cấu hình)**.

Đặc biệt lưu ý: **Tuần này KHÔNG VIẾT MỘT DÒNG CODE NÀO (NodeJS/Sails)**. Toàn bộ công việc của bạn là viết tài liệu thiết kế (Markdown) nộp cho Mentor.

Dưới đây là tóm tắt bản chất và danh sách việc bạn phải làm để qua được bài Review ngày mai.

---

## 1. Hiểu bản chất yêu cầu Tuần 2 (Config-Driven là gì?)
Tuần 1: Hàm `transfer` cứng ngắc chỉ biết chuyển tiền P2P. Nếu mai sếp đòi làm tính năng "Thanh toán tiền điện", bạn phải tạo thêm hàm `payBill`. Cứ thế code sẽ phình to gấp ngàn lần.

**Tuần 2:** Bạn phải thiết kế ra **MỘT ENGINE DUY NHẤT (gồm đúng 3 hàm API)**:
1. `Request`: Kiểm tra thông tin, tính phí. (Chưa trừ tiền).
2. `Confirm`: Người dùng nhập mã PIN.
3. `Verify`: Trừ tiền và Cộng tiền. (Đường tiền chạy).

Và làm sao để cái Engine 3 bước này biết nó phải làm nghiệp vụ gì? Câu trả lời là: **Nhìn vào Database (Config)**.
Người quản trị (Admin) sẽ vào Database định nghĩa các Config:
- **Nghiệp vụ P2P:** Ví gửi = Ví Khách, Ví nhận = Ví Khách, Phí = 100đ, Xác thực = PIN.
- **Nghiệp vụ Nạp tiền (Cash-in):** Ví gửi = Ví Ngân Hàng, Ví nhận = Ví Khách, Phí = 0, Xác thực = KHÔNG CẦN.

Engine chỉ việc **ĐỌC CONFIG** và **LÀM THEO**. Thêm tính năng mới không cần sửa code, chỉ cần chèn thêm 1 bản ghi config vào Database!

---

## 2. Danh sách việc cần làm (TODO LIST) cho ngày mai
Theo tin nhắn của Mentor, ngày mai bạn phải đẩy lên một thư mục `docs/` chứa file trình bày giải pháp. Trình bày theo dạng Top-Down (Đi từ tổng quát xuống chi tiết).

Bạn cần tạo file `docs/WEEK2_SOLUTION.md` và trình bày theo đúng dàn ý sau:

### Phần 1: Sơ đồ luồng P2P cũ (Mini-Mini-Wallet)
- Bạn copy nguyên cái sơ đồ bằng Mermaid mà tôi đã vẽ cho bạn trong file `DESIGN.md` hồi nãy dán vào đây để Mentor xem quá khứ mình đã làm như thế nào.

### Phần 2: Overview các Model (Mô hình dữ liệu mới)
- Dựa vào phần 5 và 6 của tài liệu `WEEK2-DESIGN-BRIEF.md`, bạn liệt kê ra các bảng (Table/Collection) cần thiết.
- Phân làm 2 nhóm rõ ràng:
  - **Nhóm Config (Admin điền):** `Service`, `TransField`, `TransValidation`, `TransDefinition`.
  - **Nhóm Runtime (Sinh ra lúc user giao dịch):** `TransactionTrail` (hồ sơ 3 bước), `Transaction` (biên lai), `Pocket` (Ví), `PocketEntry` (Lịch sử biến động ví).

### Phần 3: Sơ đồ luồng Engine tổng quát 3 bước
- Bạn phải vẽ một sơ đồ Mermaid thể hiện đúng **Core Engine 3 bước**:
  - Nhận `transInput` -> `routeProcess(transInput)`
  - Rẽ nhánh 1: `processRequestStep` (Tính phí, tra config, validate -> tạo `TransactionTrail` trạng thái pending).
  - Rẽ nhánh 2: `processConfirmStep` (Hỏi phương thức xác thực PIN hay NONE).
  - Rẽ nhánh 3: `processVerifyStep` (Kiểm tra PIN -> Ghi sổ kép Database Transaction -> lật trạng thái done).

### Phần 4: Sơ đồ 3 nghiệp vụ ánh xạ vào Engine 3 bước
Đây là lúc bạn áp dụng Engine tổng quát ở trên vào 3 bài toán cụ thể. Bạn vẽ 3 sơ đồ (hoặc mô tả text ngắn gọn) cho:
1. **P2P:** User A gọi API -> Request -> Confirm (nhập PIN) -> Verify (Trừ ví A, cộng ví B).
2. **Cash-in (Nạp tiền):** Admin gọi API -> Request -> Verify luôn (Bỏ qua Confirm vì Admin không cần PIN). Ví gửi là Ví Bank, Ví nhận là Ví User.
3. **Bill Payment (Thanh toán hoá đơn):** User gọi API (gửi mã hoá đơn) -> Request (Engine phải gọi sang URL của Biller để lấy số tiền) -> Confirm -> Verify (Engine gọi sang URL của Biller để báo thanh toán thành công -> Trừ ví User, cộng ví Biller).

---

## 3. Lời khuyên
Trong tuần này, công cụ duy nhất bạn dùng là **Cú pháp Mermaid** và **Tư duy Logic**. 
Bạn hãy tạo file `docs/WEEK2_SOLUTION.md`, làm nháp từng phần một (VD: bắt đầu bằng việc liệt kê các Models ra trước). Nếu bạn bí ở phần vẽ sơ đồ Mermaid cho Engine tổng quát hay 3 luồng con, cứ gửi tin nhắn nhờ tôi vẽ giúp! 

Bắt tay vào tạo thư mục `docs` và file `WEEK2_SOLUTION.md` thôi nào!
