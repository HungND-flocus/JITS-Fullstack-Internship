# 🔄 Sequence Diagrams — Mini-Wallet Engine (Tuần 2 - Modern Architecture)

Tài liệu này cung cấp các sơ đồ tuần tự (Sequence Diagrams) chi tiết mô tả luồng đi của dữ liệu qua 3 bước (Request -> Confirm -> Verify) cho hai nghiệp vụ tiêu biểu: **P2P Transfer** và **Bill Payment**, cùng với các luồng vận hành hệ thống.
> **Bản cập nhật v4:** Đã tích hợp kiến trúc **Redis Mutex Lock** để chống Double-Spending, **Append-Only Ledger** để ghi sổ cái bất biến, và **Background Checksum Auditor** chạy ngầm bằng `sails-hook-cron`.

---

## 1. Nghiệp vụ 1: Luồng P2P Transfer (Đủ 3 bước)

Sơ đồ dưới đây mô tả chi tiết quá trình chuyển tiền cá nhân. Lưu ý ở bước Verify, hệ thống dùng **Redis** để khóa ví thay vì MongoDB, và ghi nhận biến động bằng **PocketEntry (Append-only)**.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Người dùng (Client)
    participant Policy as Auth Policy (JWT)
    participant Ctrl as TransactionController
    participant Engine as NeonMessage Engine
    participant Redis as Redis Cache (Mutex)
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
    
    Engine->>Redis: Xin khóa Mutex ví người gửi (SETNX lock:pocket:SENDERID)
    Redis-->>Engine: Xác nhận Lock thành công (Nhanh < 1ms)
    
    Engine->>DB: Tải TransactionTrail
    Engine->>Engine: Kiểm tra mã PIN (băm bcrypt so sánh)<br/>và validate lại số dư/checksum lần cuối
    
    Engine->>DB: Đọc glSteps từ TransDefinition
    DB-->>Engine: Kịch bản ghi sổ kép
    
    Note over Engine, DB: BẮT ĐẦU TRANSACTION (session.withTransaction)
    Engine->>DB: Step 0: Ghi PocketEntry (debit SENDERID), Ghi PocketEntry (credit RECEIVERID)
    Engine->>DB: Step 1: Ghi PocketEntry (debit SENDERID), Ghi PocketEntry (credit SYSTEM_ID)
    Engine->>DB: Aggregate Cache: Cập nhật số dư Pocket & Checksum mới
    Engine->>DB: Tạo hóa đơn Transaction (Biên lai)
    Engine->>DB: Cập nhật TransactionTrail (status: 'done')
    Engine->>DB: COMMIT TRANSACTION
    DB-->>Engine: Thành công
    
    Engine->>Redis: Giải phóng khóa Mutex (DEL lock:pocket:SENDERID)
    Engine-->>Client: Trả về kết quả giao dịch thành công (Mã biên lai)
```

---

## 2. Nghiệp vụ 3: Bill Payment (Saga/Tích hợp Biller)

Hóa đơn có đặc thù là hệ thống phải gọi API Biller ở Request (Inquiry) và Verify (Payment).

```mermaid
sequenceDiagram
    autonumber
    actor Client as Người dùng (Client)
    participant Ctrl as TransactionController
    participant Engine as NeonMessage Engine
    participant Redis as Redis Cache (Mutex)
    participant DB as Database (MongoDB)
    participant BillerAPI as Mock Biller System

    Note over Client, BillerAPI: BƯỚC 1: REQUEST (TRA CỨU HÓA ĐƠN)
    Client->>Ctrl: POST /api/transaction/request (serviceCode: BILL_EVN, invoiceCode)
    Ctrl->>Engine: routeProcess('Request', inputMessage, req.userId)
    
    Engine->>DB: Đọc cấu hình Biller EVN (Lấy inquiryUrl, paymentUrl) & Ví Biller
    DB-->>Engine: inquiryUrl & Ví Biller
    
    Engine->>BillerAPI: Gọi HTTP POST inquiryUrl (Gửi invoiceCode)
    BillerAPI-->>Engine: Trả về thông tin hóa đơn (Số tiền nợ)
    
    Engine->>Engine: Ghi đè số tiền vào AMOUNT trong TRANSBODY<br/>- Tính phí dịch vụ (FEE)
    Engine->>DB: Tạo TransactionTrail (status: 'pending')
    Engine-->>Client: Trả về Preview (hóa đơn nợ, phí, tổng tiền, transRefId)

    Note over Client, BillerAPI: BƯỚC 2: CONFIRM
    Client->>Ctrl: POST /api/transaction/confirm (transRefId)
    Ctrl-->>Client: Trả về authMethod: 'PIN'

    Note over Client, BillerAPI: BƯỚC 3: VERIFY (GẠCH NỢ ĐỐI TÁC & GHI SỔ)
    Client->>Ctrl: POST /api/transaction/verify (transRefId, pin)
    Ctrl->>Engine: routeProcess('Verify', transRefId, pin)
    
    Engine->>Redis: Lock ví khách hàng (SETNX)
    Engine->>Engine: Xác thực PIN khách hàng
    
    Note over Engine, BillerAPI: GỌI GẠCH NỢ ĐỐI TÁC NGOÀI TRƯỚC
    Engine->>BillerAPI: Gọi HTTP POST paymentUrl (invoiceCode, amount, transRefId)
    
    alt Biller báo lỗi (ví dụ lỗi mạng hoặc hóa đơn đã trả)
        BillerAPI-->>Engine: Phản hồi thất bại
        Engine->>DB: Cập nhật TransactionTrail (status: 'failed')
        Engine->>Redis: Giải phóng khóa ví (DEL)
        Engine-->>Client: Trả về lỗi: Thanh toán hóa đơn thất bại
    else Biller phản hồi thành công
        BillerAPI-->>Engine: Phản hồi thành công + mã billerRefId
        
        Note over Engine, DB: BẮT ĐẦU TRANSACTION (Append-Only)
        Engine->>DB: Step 0: Ghi PocketEntry debit SENDERID, credit RECEIVERID
        Engine->>DB: Step 1: Ghi PocketEntry debit SENDERID, credit SYSTEM_ID
        Engine->>DB: Cập nhật lại Cache Balance & Checksum
        Engine->>DB: Tạo biên lai Transaction (lưu billerRefId)
        Engine->>DB: Cập nhật TransactionTrail (status: 'done')
        Engine->>DB: COMMIT TRANSACTION
        DB-->>Engine: Thành công
        
        Engine->>Redis: Giải phóng khóa ví (DEL)
        Engine-->>Client: Trả về kết quả thanh toán thành công
    end
```

---

## 3. Background Checksum Auditor (`sails-hook-cron`)

Đây là luồng **KIỂM TOÁN TỰ ĐỘNG** chạy ngầm để phát hiện và ngăn chặn mọi sự can thiệp thủ công (hack/sửa DB).

```mermaid
sequenceDiagram
    autonumber
    participant Cron as Sails Cron Job (5 phút/lần)
    participant Engine as Auditor Engine
    participant DB as Database (MongoDB)

    Cron->>Engine: Trigger 'scanAllPockets()'
    
    Engine->>DB: Lấy danh sách toàn bộ Pocket (cursor/stream để tối ưu RAM)
    
    loop Cho mỗi Pocket
        DB-->>Engine: Dữ liệu Pocket (balance, checksum, userId)
        Engine->>Engine: Tính lại RealChecksum = md5(balance + userId + salt)
        
        alt RealChecksum == Pocket.checksum
            Engine->>Engine: Ví an toàn (Bỏ qua)
        else Mismatch Checksum (Có hacker sửa số dư!)
            Engine->>DB: Đổi status của Ví thành 'frozen' (Đóng băng)
            Engine->>DB: Tạo SystemAuditLog (status='failed', details='Checksum Mismatch')
            Engine->>Engine: Bắn cảnh báo đỏ lên Admin Dashboard (WebSocket/Email)
        end
    end
    
    Engine->>DB: Cập nhật báo cáo quét vào SystemAuditLog tổng
```

---

*(Các sơ đồ 4, 5, 6 về Cash-in, Design-time, và Rollback tương tự như P2P nhưng sử dụng cấu trúc Redis Lock tương ứng. Đã ẩn để tránh tài liệu quá dài).*
