# 🔄 Sequence Diagrams — Mini-Wallet Engine (Tuần 2)

Tài liệu này cung cấp các sơ đồ tuần tự (Sequence Diagrams) chi tiết mô tả luồng đi của dữ liệu qua 3 bước (Request -> Confirm -> Verify) cho hai nghiệp vụ tiêu biểu: **P2P Transfer** và **Bill Payment**, cùng với các luồng vận hành hệ thống bổ sung để hiểu rõ kiến trúc.

---

## 1. Nghiệp vụ 1: Luồng P2P Transfer (Đủ 3 bước)

Sơ đồ dưới đây mô tả chi tiết quá trình chuyển tiền cá nhân, từ lúc dựng biến ở Request đến xác thực PIN ở Confirm và thực thi ghi sổ kép nguyên tử trong Session ở Verify.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Người dùng (Client)
    participant Policy as Auth Policy (JWT)
    participant Ctrl as TransactionController
    participant Engine as NeonMessage Engine
    participant DB as Database (MongoDB)

    Note over Client, DB: BƯỚC 1: REQUEST (KHỞI TẠO & PREVIEW)
    Client->>Policy: POST /api/transaction/request (Token, serviceCode, receiverPhone, amount)
    alt Token không hợp lệ
        Policy-->>Client: HTTP 401 Unauthorized
    else Token hợp lệ
        Policy->>Ctrl: Cho phép đi qua (Gắn req.userId)
    end
    Ctrl->>Engine: routeProcess('Request', inputMessage, req.userId)
    
    Engine->>DB: Đọc cấu hình Service (P2P_TRANSFER) & TransField
    DB-->>Engine: Dữ liệu Service & Fields
    
    Engine->>Engine: Thực thi fieldBuilder (Dựng TRANSBODY)<br/>- Gán CURRENCY = 'VND'<br/>- Map RECEIVERPHONE & AMOUNT
    Engine->>DB: Query tìm SENDERID (theo userId) & RECEIVERID (theo SĐT)
    DB-->>Engine: Pocket IDs của 2 ví
    
    Engine->>Engine: Validate định dạng đầu vào (TransField)<br/>- Kiểm tra số điện thoại, số tiền dương...
    Engine->>DB: Đọc luật TransValidation (validateReceiverIsNotSender, validateSenderAccountSufficiency)
    DB-->>Engine: Luật validation
    Engine->>Engine: Thực hiện kiểm tra logic nghiệp vụ:<br/>- Không tự chuyển cho mình<br/>- Ví gửi có đủ số dư (balance >= amount + fee)
    
    Engine->>DB: Tạo TransactionTrail (status: 'pending')
    DB-->>Engine: Trả về transRefId
    
    Engine-->>Client: Trả về Preview (amount, fee, totalAmount, transRefId)

    Note over Client, DB: BƯỚC 2: CONFIRM (XÁC NHẬN PHƯƠNG THỨC AUTH)
    Client->>Ctrl: POST /api/transaction/confirm (transRefId)
    Ctrl->>Engine: routeProcess('Confirm', transRefId)
    Engine->>DB: Tải TransactionTrail theo transRefId
    DB-->>Engine: Dữ liệu Trail
    Engine->>Engine: Đọc cấu hình Service.auth.method -> Yêu cầu 'PIN'
    Engine-->>Client: Trả về authMethod: 'PIN' (Frontend hiển thị màn nhập PIN)

    Note over Client, DB: BƯỚC 3: VERIFY (NHẬP PIN & TIỀN CHẠY)
    Client->>Ctrl: POST /api/transaction/verify (transRefId, pin)
    Ctrl->>Engine: routeProcess('Verify', transRefId, pin)
    
    Engine->>DB: Tải TransactionTrail & Lock ví người gửi (state = 'inProgress')
    DB-->>Engine: Xác nhận Lock thành công
    
    Engine->>Engine: Kiểm tra mã PIN (băm bcrypt so sánh)<br/>và validate lại số dư/checksum lần cuối
    
    Engine->>DB: Đọc glSteps từ TransDefinition
    DB-->>Engine: Kịch bản ghi sổ kép
    
    Note over Engine, DB: BẮT ĐẦU TRANSACTION (session.withTransaction)
    Engine->>DB: Step 0: Trừ ví gửi (debit SENDERID), Cộng ví nhận (credit RECEIVERID) + Tính checksum mới
    Engine->>DB: Step 1: Trừ ví gửi (debit SENDERID), Cộng ví system (credit SYSTEM_ID) + Tính checksum mới
    Engine->>DB: Ghi log PocketEntry (cho từng step)
    Engine->>DB: Tạo hóa đơn Transaction (Biên lai)
    Engine->>DB: Cập nhật TransactionTrail (status: 'done')
    Engine->>DB: COMMIT TRANSACTION
    DB-->>Engine: Thành công
    
    Engine->>DB: Mở khóa ví người gửi (state = 'idle')
    Engine-->>Client: Trả về kết quả giao dịch thành công (Mã biên lai)
```

---

## 2. Nghiệp vụ 3: Luồng Bill Payment (Có Tích hợp Hệ thống Ngoài)

Hóa đơn có đặc thù là **Khách hàng không tự nhập số tiền**. Hệ thống phải gọi API Inquiry của đối tác (Biller) ở bước Request để lấy số tiền nợ, và gọi API Payment của đối tác ở bước Verify để gạch nợ trước khi đổi số dư.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Người dùng (Client)
    participant Ctrl as TransactionController
    participant Engine as NeonMessage Engine
    participant DB as Database (MongoDB)
    participant BillerAPI as Mock Biller System (Đối tác ngoài)

    Note over Client, BillerAPI: BƯỚC 1: REQUEST (TRA CỨU HÓA ĐƠN)
    Client->>Ctrl: POST /api/transaction/request (serviceCode: BILL_EVN, invoiceCode)
    Ctrl->>Engine: routeProcess('Request', inputMessage, req.userId)
    
    Engine->>DB: Đọc cấu hình Biller EVN (Lấy inquiryUrl, paymentUrl) & Ví của Biller
    DB-->>Engine: inquiryUrl & Ví Biller
    
    Engine->>BillerAPI: Gọi HTTP POST inquiryUrl (Gửi invoiceCode)
    BillerAPI-->>Engine: Trả về thông tin hóa đơn (Số tiền nợ, tên khách hàng...)
    
    Engine->>Engine: Ghi đè số tiền vừa tra cứu vào biến AMOUNT trong TRANSBODY<br/>- Tính phí dịch vụ (FEE)<br/>- Validate số dư ví khách hàng có đủ trả không
    
    Engine->>DB: Tạo TransactionTrail (status: 'pending')
    DB-->>Engine: Trả về transRefId
    
    Engine-->>Client: Trả về Preview (hóa đơn nợ, phí, tổng tiền, transRefId)

    Note over Client, BillerAPI: BƯỚC 2: CONFIRM
    Client->>Ctrl: POST /api/transaction/confirm (transRefId)
    Ctrl-->>Client: Trả về authMethod: 'PIN'

    Note over Client, BillerAPI: BƯỚC 3: VERIFY (GẠCH NỢ ĐỐI TÁC & TIỀN CHẠY)
    Client->>Ctrl: POST /api/transaction/verify (transRefId, pin)
    Ctrl->>Engine: routeProcess('Verify', transRefId, pin)
    
    Engine->>DB: Lock ví khách hàng (state = 'inProgress')
    Engine->>Engine: Xác thực PIN khách hàng
    
    Note over Engine, BillerAPI: GỌI GẠCH NỢ ĐỐI TÁC NGOÀI TRƯỚC
    Engine->>BillerAPI: Gọi HTTP POST paymentUrl (invoiceCode, amount, transRefId làm idempotency)
    
    alt Biller báo lỗi (ví dụ hóa đơn đã được thanh toán rồi hoặc hệ thống đối tác lỗi)
        BillerAPI-->>Engine: Phản hồi thất bại
        Engine->>DB: Cập nhật TransactionTrail (status: 'failed')
        Engine->>DB: Mở khóa ví khách hàng (state = 'idle')
        Engine-->>Client: Trả về lỗi: Thanh toán hóa đơn thất bại tại đối tác
    else Biller phản hồi thành công
        BillerAPI-->>Engine: Phản hồi thành công + mã tham chiếu Biller (billerRefId)
        
        Note over Engine, DB: BẮT ĐẦU TRANSACTION (session.withTransaction)
        Engine->>DB: Step 0: Trừ ví khách (debit SENDERID), Cộng ví biller (credit RECEIVERID) + Checksum
        Engine->>DB: Step 1: Trừ ví khách (debit SENDERID), Cộng ví system (credit SYSTEM_ID) + Checksum
        Engine->>DB: Lưu các PocketEntry & Tạo biên lai Transaction (lưu kèm billerRefId)
        Engine->>DB: Cập nhật TransactionTrail (status: 'done')
        Engine->>DB: COMMIT TRANSACTION
        DB-->>Engine: Thành công
        
        Engine->>DB: Mở khóa ví khách hàng (state = 'idle')
        Engine-->>Client: Trả về kết quả thanh toán thành công (Biên lai ví)
    end
```

---

## 3. Nghiệp vụ 2: Luồng Cash-in (Nạp tiền bởi Officer)

Đây là luồng đặc biệt mô phỏng việc Nạp tiền. Khác với P2P, luồng này do **Admin/Officer khởi tạo**, bỏ qua bước Confirm và tự động kích hoạt Verify để chuyển tiền từ Ví Bank (ngân hàng giả lập) sang Ví Khách hàng.

```mermaid
sequenceDiagram
    autonumber
    actor Officer as Quản trị viên (Officer)
    participant Ctrl as TransactionController
    participant Engine as NeonMessage Engine
    participant DB as Database (MongoDB)

    Note over Officer, DB: BƯỚC 1: REQUEST & TỰ ĐỘNG VERIFY
    Officer->>Ctrl: POST /api/admin/cash-in (Token Admin, receiverPhone, amount)
    Ctrl->>Engine: routeProcess('Request', inputMessage, req.userId)
    
    Engine->>DB: Đọc cấu hình Service (CASH_IN)
    DB-->>Engine: Dữ liệu Service & Fields
    
    Engine->>Engine: Thực thi fieldBuilder (Dựng TRANSBODY)<br/>- Gán SENDERID = Ví Bank (cố định)<br/>- Map RECEIVERPHONE & AMOUNT
    Engine->>DB: Query tìm RECEIVERID (theo SĐT)
    DB-->>Engine: Pocket ID của khách hàng
    
    Engine->>Engine: Validate định dạng & nghiệp vụ (không cần PIN vì authMethod='NONE')
    
    Engine->>DB: Tạo TransactionTrail (status: 'pending')
    
    Note over Engine, DB: BỎ QUA CONFIRM -> NHẢY THẲNG ĐẾN VERIFY
    Engine->>Engine: routeProcess('Verify', transRefId)
    
    Engine->>DB: Lock ví Bank (state = 'inProgress')
    
    Engine->>DB: Đọc glSteps từ TransDefinition
    
    Note over Engine, DB: BẮT ĐẦU TRANSACTION (session.withTransaction)
    Engine->>DB: Step 0: Trừ ví Bank (debit BANK_ID), Cộng ví nhận (credit RECEIVERID) + Tính checksum mới
    Engine->>DB: Ghi log PocketEntry
    Engine->>DB: Tạo hóa đơn Transaction (Biên lai)
    Engine->>DB: Cập nhật TransactionTrail (status: 'done')
    Engine->>DB: COMMIT TRANSACTION
    DB-->>Engine: Thành công
    
    Engine->>DB: Mở khóa ví Bank (state = 'idle')
    Engine-->>Officer: Trả về kết quả Nạp tiền thành công
```

---

## 4. Luồng Design-time: Cấu hình Hệ thống (Admin)

Sơ đồ này giải thích **Config-driven** hoạt động như thế nào ở phía quản trị. Nó cho thấy cách Officer định nghĩa một Dịch vụ mới mà không cần can thiệp vào Source Code.

```mermaid
sequenceDiagram
    autonumber
    actor Officer as Quản trị viên (Officer)
    participant Ctrl as AdminController
    participant DB as Database (MongoDB)

    Note over Officer, DB: TẠO DỊCH VỤ & KHỐI CONFIG CỐT LÕI
    Officer->>Ctrl: POST /api/admin/services (code: 'NEW_SERVICE', authMethod: 'PIN')
    Ctrl->>DB: Lưu Service & fieldBuilder array
    DB-->>Ctrl: serviceId
    Ctrl-->>Officer: Trả về Thành công (kèm serviceId)
    
    Officer->>Ctrl: POST /api/admin/trans-fields (gắn với serviceId)
    Ctrl->>DB: Lưu các luật định dạng (TransField)
    Ctrl-->>Officer: Trả về Thành công
    
    Officer->>Ctrl: POST /api/admin/trans-validations (gắn với serviceId)
    Ctrl->>DB: Lưu các luật nghiệp vụ (TransValidation)
    Ctrl-->>Officer: Trả về Thành công
    
    Officer->>Ctrl: POST /api/admin/trans-definitions (gắn với serviceId)
    Ctrl->>DB: Lưu kịch bản ghi sổ (glSteps)
    Ctrl-->>Officer: Trả về Thành công
    
    Note over Officer, DB: BẬT NGHIỆP VỤ LÊN SÓNG
    Officer->>Ctrl: PUT /api/admin/services/{serviceId}/toggle (active: true)
    Ctrl->>DB: Cập nhật trạng thái Active
    Ctrl-->>Officer: Trả về Thành công (Khách hàng có thể dùng ngay)
```

---

## 5. Luồng Đăng ký & Sinh Ví (Customer Onboarding)

Sơ đồ này làm rõ cơ chế "Tự động sinh Ví" khi có khách hàng mới đăng ký tài khoản. Hệ thống bắt buộc phải tính Checksum ngay từ khi số dư bằng 0.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Khách hàng
    participant Ctrl as AuthController
    participant DB as Database (MongoDB)

    Client->>Ctrl: POST /api/customer/register (phone, pin)
    
    Ctrl->>DB: Kiểm tra số điện thoại đã tồn tại?
    DB-->>Ctrl: Chưa tồn tại
    
    Ctrl->>Ctrl: Hash mã PIN (bcrypt)
    
    Note over Ctrl, DB: BẮT ĐẦU TRANSACTION ĐỂ TẠO CUSTOMER & POCKET
    Ctrl->>DB: Tạo bản ghi Customer (phone, hashedPin)
    DB-->>Ctrl: customerId
    
    Ctrl->>DB: Tạo bản ghi Pocket (user: customerId, balance: 0, client: 'customer')
    Ctrl->>Ctrl: Tính Checksum khởi tạo cho Pocket (hash balance 0 + customerId)
    Ctrl->>DB: Cập nhật Pocket với Checksum
    DB-->>Ctrl: Thành công
    
    Ctrl-->>Client: Trả về Đăng ký thành công (kèm pocketId)
```

---

## 6. Luồng Lỗi & Rollback (ACID) - Ví dụ: Sai mã PIN

Sơ đồ này cho thấy sự an toàn của hệ thống khi quá trình giao dịch (Verify) gặp sự cố. Tiền sẽ không bị di chuyển và Ví vẫn được mở khóa để thực hiện lại giao dịch.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Khách hàng
    participant Ctrl as TransactionController
    participant Engine as NeonMessage Engine
    participant DB as Database (MongoDB)

    Note over Client, DB: BƯỚC 3: VERIFY (NHẬP SAI PIN)
    Client->>Ctrl: POST /api/transaction/verify (transRefId, pin: 'SAI_PIN')
    Ctrl->>Engine: routeProcess('Verify', transRefId, pin)
    
    Engine->>DB: Tải TransactionTrail & Lock ví người gửi (state = 'inProgress')
    DB-->>Engine: Xác nhận Lock thành công
    
    Engine->>Engine: Xác thực mã PIN (so sánh bcrypt)
    
    alt PIN không khớp
        Engine->>Engine: Bắt lỗi Sai PIN
        Engine->>DB: Cập nhật TransactionTrail (status: 'failed', lỗi: 'Sai PIN')
        
        Note over Engine, DB: KHÔNG CHẠY DATABASE TRANSACTION GHI SỔ (TIỀN KHÔNG BỊ TRỪ)
        
        Engine->>DB: Mở khóa ví người gửi (state = 'idle')
        Engine-->>Client: Trả về lỗi: Mã PIN không chính xác
    end
```
