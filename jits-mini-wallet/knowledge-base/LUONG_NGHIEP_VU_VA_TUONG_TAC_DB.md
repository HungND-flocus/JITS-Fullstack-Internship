# CHI TIẾT TƯƠNG TÁC DATABASE & CÁC LUỒNG NGHIỆP VỤ (MINI-WALLET)

Tài liệu này đi sâu vào cách **các bảng (tables/collections) thực sự "nói chuyện" với nhau** trong quá trình vận hành, cũng như **luồng chạy chi tiết của 3 nghiệp vụ cốt lõi** (P2P, Cash-in, Bill Payment) dưới góc nhìn Database.

---

## PHẦN 1: CÁC BẢNG "BẮT TAY" NHAU NHƯ THẾ NÀO?

Hệ thống Mini-Wallet không dùng những đoạn code cứng (`if (type === 'P2P')`) để xử lý logic, mà mọi thứ đều dựa vào **cấu hình (Config)**. Sự tương tác giữa các bảng diễn ra theo 3 chặng:

### 1. Chặng Design-time (Lúc Admin cài đặt hệ thống)
Admin định nghĩa luật chơi. Các bảng Nhóm Config bắt đầu liên kết với nhau:
- Tạo 1 `Service` (Khóa chính: `_id: "S01"`).
- Tạo N `TransField` (Biến định dạng) gắn `service: "S01"`.
- Tạo N `TransValidation` (Luật kiểm tra) gắn `service: "S01"`.
- Tạo 1 `TransDefinition` (Công thức trừ/cộng tiền) gắn `serviceId: "S01"`.
*Nguyên tắc:* Các bảng con luôn dùng `String(service._id)` làm khóa ngoại trỏ về bảng mẹ `Service`.

### 2. Chặng Init/Setup (Lúc User đăng ký tài khoản)
- Tạo `Customer` (hoặc `Biller`).
- Tạo ngay lập tức 1 `Pocket` (Ví). Ví này nhận `user` trỏ về `Customer._id`, `client: "customer"`, và `currency: "VND"`.
*Nguyên tắc:* `Customer` không giữ số dư. Tiền chỉ nằm trong `Pocket`.

### 3. Chặng Runtime (Lúc giao dịch diễn ra)
Đây là lúc cả 3 nhóm (Identity, Config, Ledger) giao tiếp với nhau để sinh ra dòng tiền:
1. `TransactionTrail` (Hồ sơ nháp) được sinh ra, liên kết với `Customer._id` (người tạo) và `Service._id` (dịch vụ). Khóa chính của nó là `_id` (đóng vai trò là `transRefId`).
2. Code nạp Config từ `Service`, `TransField` để biến đổi input của người dùng thành `TRANSBODY`.
3. Khi giao dịch hợp lệ, DB cập nhật `Pocket.balance` (trừ Ví gửi, cộng Ví nhận).
4. DB insert 2 bảng:
   - `PocketEntry` (Sao kê từng bước): Trỏ FK về `Pocket` (debit, credit) và `transRefId`.
   - `Transaction` (Hóa đơn tổng): Trỏ FK về `Pocket` (sender, receiver) và `transRefId`.

---

## PHẦN 2: LUỒNG LÀM VIỆC CHI TIẾT CỦA 3 NGHIỆP VỤ

Mọi giao dịch đều phải đi qua cỗ máy 3 bước của `NeonMessage`: **Request** (Khởi tạo) ➔ **Confirm** (Hỏi xác thực) ➔ **Verify** (Chốt sổ).

### LUỒNG 1: CHUYỂN TIỀN CÁ NHÂN (P2P TRANSFER)
*Bối cảnh:* Khách hàng A (Customer) chuyển tiền cho Khách hàng B (Customer) qua App.

**Bước 1: `requestTransaction` (Server tính toán nháp)**
1. Frontend gửi yêu cầu: `receiverPhone = 09xxx`, `amount = 50000`, mã nghiệp vụ P2P.
2. Hệ thống query DB lấy `Service` P2P.
3. Đọc `Service.fieldBuilder`: 
   - Lấy số tiền từ body.
   - Query DB lấy ID Ví của người gửi (A).
   - Query DB theo số điện thoại lấy ID Ví của người nhận (B).
   - Dựng xong danh sách biến phẳng (`TRANSBODY`).
4. Validate định dạng qua `TransField` (VD: amount phải > 0).
5. Tính **Phí** dựa trên config của `Service.fee`.
6. Validate luật qua `TransValidation` (VD: Gọi hàm kiểm tra Ví A có lớn hơn 50000 + phí không).
7. Ghi DB: Tạo `TransactionTrail` với trạng thái `pending`. **(Tiền chưa bị trừ)**. Trả về `transRefId` cho Frontend.

**Bước 2: `confirmTransaction` (Server yêu cầu PIN)**
1. Frontend gửi lên `transRefId`. Server query lại `TransactionTrail` đó.
2. Đọc `Service.auth`. Thấy P2P cấu hình là `{ method: 'PIN' }`.
3. Trả về cho Frontend: `"Yêu cầu hiện bàn phím nhập PIN"`.

**Bước 3: `verifyTransaction` (Server ghi sổ thực sự)**
1. Frontend gửi lên `transRefId` + mã PIN khách nhập.
2. Server nạp lại `TransactionTrail`.
3. **KHÓA VÍ:** Update `Pocket` của người gửi A, set `state = 'inProgress'`. Từ lúc này, Ví A không thể thực hiện giao dịch nào khác song song.
4. **KIỂM TRA PIN:** Truy xuất `Customer.hashedPin` của A, so sánh với mã PIN vừa nhập. Nếu đúng thì đi tiếp.
5. Kiểm tra lại toàn bộ định dạng và số dư (phòng khi số dư bị thay đổi ở hệ thống khác).
6. **MỞ SỔ CÁI (ACID Transaction):**
   - Đọc `TransDefinition.glSteps` của P2P.
   - Step 1 (Gốc): Trừ `Pocket` Ví A (50k), Cộng `Pocket` Ví B (50k). Insert 1 dòng `PocketEntry`.
   - Step 2 (Phí): Trừ `Pocket` Ví A, Cộng `Pocket` Ví Hệ Thống. Insert 1 dòng `PocketEntry`.
   - Insert hóa đơn tổng quát vào bảng `Transaction`.
   - Update `TransactionTrail` thành `status = 'done'`.
7. **MỞ KHÓA VÍ:** Update `Pocket` của A, set `state = 'idle'`.

---

### LUỒNG 2: NẠP TIỀN TẠI QUẦY (CASH-IN)
*Bối cảnh:* Khách hàng mang tiền mặt ra quầy ngân hàng. Giao dịch viên (Officer) dùng portal nội bộ nạp tiền vào App cho khách.

Luồng Cash-in dùng chung cỗ máy 3 bước, nhưng có điểm khác biệt lớn: **Nó bỏ qua bước nhập PIN và tiền lấy từ Ví Ngân Hàng (Bank Pocket).**

1. **Bước 1 (Request):**
   - Officer nhập số điện thoại khách và số tiền.
   - `fieldBuilder` của Cash-in được cấu hình ép cứng **Ví gửi (Sender) chính là `Bank Pocket`** (Ví tổng của ngân hàng, tra bằng ID cố định `wallet`). Ví nhận là ví của Customer. Phí = 0.
   - Tạo `TransactionTrail` (lưu `initiatorId` = Officer._id, `initiatorType = 'officer'`).
2. **Bước 2 (Confirm):**
   - Server đọc `Service.auth` của Cash-in. Thấy cấu hình `{ method: 'NONE' }`.
   - Server báo lại: `"Không cần mã PIN đâu"`.
3. **Bước 3 (Verify):**
   - Do không cần PIN, Frontend (của Portal) hoặc chính Server sẽ tự động kích hoạt ngay Bước 3.
   - **Khóa Ví Bank**. Không kiểm tra PIN.
   - Trừ Ví Bank, Cộng Ví Khách Hàng. Insert các dòng `PocketEntry`, `Transaction`.
   - Mở khóa Ví Bank. Đổi Trail thành `done`.

---

### LUỒNG 3: THANH TOÁN HÓA ĐƠN (BILL PAYMENT)
*Bối cảnh:* Khách hàng mở App, chọn thanh toán Tiền Điện cho Biller (Công ty Điện lực), nhập Mã Khách Hàng (Mã công tơ điện), **nhưng KHÔNG nhập số tiền**.

Luồng này phức tạp hơn vì Server phải ra ngoài "nói chuyện" với đối tác (Biller) 2 lần: 1 lần để hỏi nợ, 1 lần để báo đã thanh toán.

1. **Bước 1 (Request): Khách nhập Mã Khách Hàng Điện Lực**
   - `fieldBuilder` đọc thấy đây là nghiệp vụ liên kết Biller (`action: 'billerTrans'`). Nó tra cứu bảng `Biller` theo mã dịch vụ (VD: `EVN`).
   - Server lấy `Biller.inquiryUrl` và gửi 1 request API sang hệ thống Công ty Điện lực: *"Khách có mã công tơ này nợ bao nhiêu tiền?"*
   - Điện lực trả về: *"Nợ 500.000 VNĐ"*.
   - Server lấy 500.000 VNĐ này **ghi đè vào biến AMOUNT** trong `TRANSBODY`. Tính phí (VD: phí 2.000).
   - Kiểm tra số dư Ví khách xem có đủ 502.000 không. Đủ thì lưu `TransactionTrail`.
2. **Bước 2 (Confirm):**
   - Giống P2P, báo Frontend yêu cầu hiển thị nhập mã PIN. Kèm theo số tiền nợ (500k) và phí (2k) để khách nhìn thấy rõ.
3. **Bước 3 (Verify): Chốt đơn và báo cáo**
   - Khóa Ví Khách. Kiểm tra PIN chuẩn.
   - **Giao tiếp Biller lần 2:** Server lấy `Biller.paymentUrl` và gửi API sang hệ thống Điện lực: *"Khách đã đồng ý trả 500k, xóa nợ cho khách đi"*. Kèm theo `transRefId` để Điện lực lưu mã tham chiếu chéo (idempotency).
   - **Cực kỳ quan trọng:** Nếu hệ thống Điện lực báo lỗi (mạng sập, hoặc API từ chối), giao dịch này lập tức bị đánh `failed`. Mọi thứ DỪNG LẠI, tiền KHÔNG bị trừ, mở khóa Ví khách.
   - Nếu Điện lực báo OK: Chạy `glSteps` -> Trừ Ví Khách (502k), Cộng Ví Điện Lực (500k), Cộng Ví Hệ thống (2k tiền phí).
   - Lưu `PocketEntry`, `Transaction`, lật Trail sang `done`. Mở khóa Ví Khách.

---

### TÓM LẠI:
* Mọi luồng tiền chỉ được chạy **duy nhất ở Bước 3 (Verify)** trong một **Session ACID của DB** (nghĩa là insert mọi bảng cùng 1 lúc, thất bại 1 bảng thì Undo toàn bộ).
* Tính năng chống Race-Condition bằng `Pocket.state = 'inProgress'` đảm bảo: Bất chấp khách hàng có spam click nút Chuyển tiền 100 lần/giây, thì chỉ có đúng 1 giao dịch được lọt qua cánh cửa, 99 cái còn lại sẽ bị văng ra vì Ví đã bị "Khóa" ở giây đầu tiên.
