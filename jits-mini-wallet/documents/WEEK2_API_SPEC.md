# 🗺️ Đặc tả API High-Level — Mini-Wallet Engine (Tuần 2)

Tài liệu này định nghĩa danh sách các API endpoints cần thiết cho hệ thống Mini-Wallet. Đây là "hợp đồng giao tiếp" giữa Frontend và Backend để chuẩn bị cho quá trình code ở Tuần 3 & 4.

---

## 1. Quy ước Chung
*   **Định dạng dữ liệu:** Mọi API Request/Response đều dùng định dạng `application/json`.
*   **Mã phản hồi HTTP:** Hệ thống sử dụng HTTP Status Codes tiêu chuẩn:
    *   `200 OK`: Giao dịch/Yêu cầu xử lý thành công (hoặc trả về lỗi nghiệp vụ có cấu trúc).
    *   `400 Bad Request`: Sai định dạng đầu vào.
    *   `401 Unauthorized`: Chưa đăng nhập hoặc token không hợp lệ.
    *   `403 Forbidden`: Không có quyền truy cập (ví dụ Customer gọi API Admin).
    *   `500 Internal Server Error`: Lỗi hệ thống.
*   **Bảo mật:** Các API yêu cầu đăng nhập sẽ sử dụng Header `Authorization: Bearer <JWT_TOKEN>`.

---

## 2. API Dành Cho Khách Hàng (Customer APIs)

### 2.1. Đăng ký & Đăng nhập

#### 📌 Đăng ký tài khoản mới
*   **Endpoint:** `POST /api/customer/register`
*   **Mô tả:** Đăng ký tài khoản khách hàng bằng SĐT và mã PIN. Hệ thống tự động tạo thực thể `Customer` và **tự động sinh ra 1 Ví (`Pocket`)** có số dư bằng 0 liên kết với khách hàng này.
*   **Request Body:**
    ```json
    {
      "phone": "0987654321",
      "pin": "123456"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Đăng ký tài khoản thành công",
      "data": {
        "customerId": "660000000000000000000001",
        "phone": "0987654321",
        "pocketId": "669999999999999999999999"
      }
    }
    ```

#### 📌 Đăng nhập
*   **Endpoint:** `POST /api/customer/login`
*   **Mô tả:** Xác thực SĐT và mã PIN. Trả về token JWT để gọi các API sau.
*   **Request Body:**
    ```json
    {
      "phone": "0987654321",
      "pin": "123456"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```

---

### 2.2. Quản lý Ví & Lịch sử

#### 📌 Xem số dư ví
*   **Endpoint:** `GET /api/customer/balance`
*   **Headers:** `Authorization: Bearer <Token>`
*   **Mô tả:** Xem số dư ví của khách hàng đăng nhập. **Quan trọng:** Server phải chạy validator kiểm tra `checksum` của ví trước khi trả về số dư để đảm bảo ví không bị sửa tay trực tiếp trong DB.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "pocketId": "669999999999999999999999",
        "currency": "VND",
        "balance": 500000
      }
    }
    ```

#### 📌 Xem lịch sử giao dịch (Biên lai thành công)
*   **Endpoint:** `GET /api/customer/transactions`
*   **Headers:** `Authorization: Bearer <Token>`
*   **Query Params:** `page` (mặc định 1), `limit` (mặc định 10).
*   **Mô tả:** Trả về danh sách các biên lai giao dịch thành công (từ bảng `Transaction`) liên quan đến khách hàng này (hoặc gửi hoặc nhận).
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "page": 1,
      "limit": 10,
      "total": 1,
      "data": [
        {
          "transactionId": "66aaaaa00000000000000001",
          "code": "TX-P2P-1719326400",
          "serviceCode": "P2P_TRANSFER",
          "senderPhone": "0987654321",
          "receiverPhone": "0912345678",
          "amount": 50000,
          "fee": 1000,
          "totalAmount": 51000,
          "createdAt": "2026-06-25T14:40:00Z"
        }
      ]
    }
    ```

#### 📌 Xem chi tiết một biên lai
*   **Endpoint:** `GET /api/customer/transactions/:transactionId`
*   **Headers:** `Authorization: Bearer <Token>`
*   **Mô tả:** Xem chi tiết một giao dịch: số tiền, phí, các bút toán ví (`PocketEntry`) liên quan. Hệ thống kiểm tra khách hàng phải là người gửi hoặc người nhận mới được xem.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "transactionId": "66aaaaa00000000000000001",
        "serviceCode": "P2P_TRANSFER",
        "senderPhone": "0987654321",
        "receiverPhone": "0912345678",
        "amount": 50000,
        "fee": 1000,
        "totalAmount": 51000,
        "createdAt": "2026-06-25T14:40:00Z",
        "entries": [
          { "stepOrder": 0, "debitPocket": "Ví An", "creditPocket": "Ví Bình", "amount": 50000 },
          { "stepOrder": 1, "debitPocket": "Ví An", "creditPocket": "Ví System", "amount": 1000 }
        ]
      }
    }
    ```

---

### 2.4. Tra cứu Dịch vụ & Biller (Public APIs)

#### 📌 Lấy danh sách dịch vụ đang hoạt động
*   **Endpoint:** `GET /api/services`
*   **Headers:** `Authorization: Bearer <Token>`
*   **Mô tả:** Trả về danh sách các dịch vụ đang `active` để Customer biết có thể thực hiện nghiệp vụ gì (P2P, Bill Payment...). Frontend dùng để dựng menu chọn dịch vụ.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": [
        { "serviceCode": "P2P_TRANSFER", "name": "Chuyển tiền P2P", "authMethod": "PIN" },
        { "serviceCode": "BILL_EVN",     "name": "Thanh toán điện EVN", "authMethod": "PIN" }
      ]
    }
    ```

#### 📌 Lấy danh sách Biller (cho luồng Bill Payment)
*   **Endpoint:** `GET /api/billers`
*   **Headers:** `Authorization: Bearer <Token>`
*   **Mô tả:** Customer cần chọn nhà cung cấp trước khi thanh toán hóa đơn. API này trả về danh sách Biller đang `active`.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": [
        { "billerId": "66bbbb0000000000000001", "code": "EVN_HCM", "name": "Điện lực TP.HCM" },
        { "billerId": "66bbbb0000000000000002", "code": "EVN_HN",  "name": "Điện lực Hà Nội" }
      ]
    }
    ```

---

### 2.3. Luồng Giao dịch 3 Bước (Engine APIs)

#### 📌 Bước 1: REQUEST (Khởi tạo giao dịch)
*   **Endpoint:** `POST /api/transaction/request`
*   **Headers:** `Authorization: Bearer <Token>`
*   **Mô tả:** 
    1. Nhận mã nghiệp vụ (`serviceCode`) và các tham số thô (`parameters`).
    2. Chạy `fieldBuilder` để tạo `TRANSBODY`.
    3. Kiểm tra định dạng đầu vào (`TransField`).
    4. Kiểm tra logic nghiệp vụ ban đầu (`TransValidation`).
    5. Tạo một bản ghi `TransactionTrail` ở trạng thái `pending`.
    6. Trả về thông tin xem trước (Preview) bao gồm số tiền gốc, phí, tổng số tiền phải trả và mã tham chiếu `transRefId`.
*   **Request Body (Ví dụ chuyển P2P):**
    ```json
    {
      "serviceCode": "P2P_TRANSFER",
      "parameters": {
        "receiverPhone": "0912345678",
        "amount": 50000
      }
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "transRefId": "66ffffff0000000000000001", // ID của TransactionTrail
        "serviceCode": "P2P_TRANSFER",
        "currency": "VND",
        "amount": 50000,
        "fee": 1000,
        "totalAmount": 51000,
        "message": "Vui lòng xác nhận giao dịch"
      }
    }
    ```

#### 📌 Bước 2: CONFIRM (Xác nhận phương thức)
*   **Endpoint:** `POST /api/transaction/confirm`
*   **Headers:** `Authorization: Bearer <Token>`
*   **Mô tả:** Gửi mã tham chiếu `transRefId` lên để kiểm tra trạng thái và lấy phương thức xác thực yêu cầu của Dịch vụ (`authMethod` là `PIN` hoặc `NONE`).
*   **Request Body:**
    ```json
    {
      "transRefId": "66ffffff0000000000000001"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "transRefId": "66ffffff0000000000000001",
        "authMethod": "PIN" // Yêu cầu nhập mã PIN ở bước sau
      }
    }
    ```

#### 📌 Bước 3: VERIFY (Xác thực PIN & Tiền chạy)
*   **Endpoint:** `POST /api/transaction/verify`
*   **Headers:** `Authorization: Bearer <Token>`
*   **Mô tả:** 
    1. Nhận mã PIN và `transRefId`.
    2. Khóa ví người gửi (`state = "inProgress"`).
    3. Xác thực mã PIN và kiểm tra lại số dư/checksum lần cuối.
    4. Bắt đầu Database Transaction (ACID) thực thi cấu hình `glSteps`: Trừ ví gửi, cộng ví nhận, cộng ví system (phí).
    5. Ghi các bản ghi `PocketEntry`, tạo biên lai `Transaction` và cập nhật `TransactionTrail` thành `done`.
    6. Mở khóa ví người gửi (`state = "idle"`).
*   **Request Body:**
    ```json
    {
      "transRefId": "66ffffff0000000000000001",
      "pin": "123456"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Giao dịch thành công",
      "data": {
        "transactionCode": "TX-P2P-1719326400",
        "status": "done"
      }
    }
    ```

---

## 3. API Dành Cho Quản Trị Viên (Admin APIs)

### 3.1. Xác thực & Vận hành

#### 📌 Đăng nhập quản trị (Officer Login)
*   **Endpoint:** `POST /api/admin/login`
*   **Request Body:**
    ```json
    {
      "username": "admin",
      "password": "Admin@123"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // JWT Token dành cho Officer
    }
    ```

#### 📌 Nạp tiền (Cash-in)
*   **Endpoint:** `POST /api/admin/cash-in`
*   **Headers:** `Authorization: Bearer <Token_Admin>`
*   **Mô tả:** Admin thực hiện nạp tiền cho khách hàng. Hệ thống tự động chạy ngầm Engine luồng 3 bước (Request -> Verify, bỏ qua Confirm vì `authMethod = NONE`). Tiền chạy từ Ví Bank sang Ví khách hàng.
*   **Request Body:**
    ```json
    {
      "receiverPhone": "0987654321",
      "amount": 100000
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Nạp tiền thành công",
      "data": {
        "transactionCode": "TX-CASHIN-1719326450",
        "receiverPhone": "0987654321",
        "amount": 100000
      }
    }
    ```

---

### 3.2. Quản lý Cấu hình Engine (Officer Config APIs)

> Đây là phần cốt lõi cho phép Officer/Admin **thiết lập nghiệp vụ mà không cần sửa code**. Toàn bộ hành vi của Engine (fieldBuilder, validation, GL steps, phí) đều được điều khiển qua các bảng config này.

#### 📌 CRUD Dịch vụ (Service)
*   **Mô tả:** Mỗi `Service` là một nghiệp vụ (P2P, Cash-in, Bill Payment...). Khi tạo Service, Officer khai báo luôn mảng `fieldBuilder` — danh sách các rule để Engine biết cách dựng `TRANSBODY` từ dữ liệu thô của người dùng.
*   `GET /api/admin/services` — Xem danh sách tất cả Dịch vụ.
*   `POST /api/admin/services` — Tạo mới Dịch vụ. **Request Body (ví dụ):**
    ```json
    {
      "code": "P2P_TRANSFER",
      "name": "Chuyển tiền P2P",
      "authMethod": "PIN",
      "active": true,
      "fieldBuilder": [
        { "order": 1, "fieldName": "SENDERID",    "type": "query",   "queryModel": "Pocket", "queryFilter": { "user": "{{userId}}" }, "queryField": "_id" },
        { "order": 2, "fieldName": "RECEIVERID",  "type": "query",   "queryModel": "Customer", "queryFilter": { "phone": "{{receiverPhone}}" }, "subQuery": { "model": "Pocket", "filter": { "user": "{{_id}}" }, "field": "_id" } },
        { "order": 3, "fieldName": "AMOUNT",      "type": "mapping", "source": "amount" },
        { "order": 4, "fieldName": "CURRENCY",    "type": "fixed",   "value": "VND" }
      ]
    }
    ```
*   `PUT /api/admin/services/:id` — Cập nhật Dịch vụ hoặc Bật/Tắt (`active: true/false`).
*   `DELETE /api/admin/services/:id` — Xóa Dịch vụ (chỉ được xóa khi không còn TransField/TransValidation/TransDefinition liên kết).

---

#### 📌 CRUD TransField (Kiểm tra định dạng đầu vào — Bước Request)
*   **Mô tả:** Mỗi bản ghi `TransField` là **một rule kiểm tra 1 field** trong `TRANSBODY`. Engine chạy toàn bộ rule của service trước khi chấp nhận giao dịch.
*   `GET /api/admin/trans-fields?service=<serviceId>` — Xem danh sách TransField theo dịch vụ.
*   `POST /api/admin/trans-fields` — Tạo mới một rule kiểm tra. **Request Body:**
    ```json
    {
      "service": "<serviceId>",
      "fieldName": "AMOUNT",
      "required": true,
      "type": "number",
      "min": 10000,
      "max": 50000000,
      "description": "Số tiền chuyển, tối thiểu 10,000 VND"
    }
    ```
*   `PUT /api/admin/trans-fields/:id` — Cập nhật rule (ví dụ: thay đổi giá trị `min`, `max`).
*   `DELETE /api/admin/trans-fields/:id` — Xóa rule kiểm tra.

---

#### 📌 CRUD TransValidation (Kiểm tra logic nghiệp vụ — Bước Request)
*   **Mô tả:** Mỗi bản ghi `TransValidation` là **một rule kiểm tra logic** (ví dụ: số dư đủ không? Ví có đang bị khóa không?). Engine chạy sau bước kiểm tra TransField.
*   `GET /api/admin/trans-validations?service=<serviceId>` — Xem danh sách Validation theo dịch vụ.
*   `POST /api/admin/trans-validations` — Tạo mới một rule validation. **Request Body:**
    ```json
    {
      "service": "<serviceId>",
      "name": "CHECK_BALANCE",
      "description": "Kiểm tra số dư ví người gửi đủ để thực hiện giao dịch (bao gồm phí)",
      "active": true
    }
    ```
*   `PUT /api/admin/trans-validations/:id` — Cập nhật (Bật/Tắt validation bằng `active: false`).
*   `DELETE /api/admin/trans-validations/:id` — Xóa rule.

---

#### 📌 CRUD TransDefinition (Cấu hình GL Steps — Bước Verify)
*   **Mô tả:** Mỗi bản ghi `TransDefinition` là **một bước hạch toán kế toán** (GL Step). Engine chạy tuần tự các bước này trong một Database Transaction khi người dùng bấm xác nhận. Ví dụ: P2P có 3 bước: Trừ ví Sender → Cộng ví Receiver → Cộng ví System (phí).
*   `GET /api/admin/trans-definitions?service=<serviceId>` — Xem danh sách GL Steps theo dịch vụ.
*   `POST /api/admin/trans-definitions` — Tạo mới một GL Step. **Request Body:**
    ```json
    {
      "serviceId": "<serviceId>",
      "step": 1,
      "description": "Trừ tiền ví người gửi (gốc + phí)",
      "pocketField": "SENDERID",
      "action": "debit",
      "amountField": "TOTALAMOUNT"
    }
    ```
*   `PUT /api/admin/trans-definitions/:id` — Cập nhật một GL Step (thứ tự, action, amountField...).
*   `DELETE /api/admin/trans-definitions/:id` — Xóa một GL Step.

---

#### 📌 CRUD Fee (Cấu hình Phí dịch vụ)
*   **Mô tả:** Mỗi bản ghi `Fee` xác định cách tính phí cho một dịch vụ. Hỗ trợ 2 loại: `flat` (phí cố định) và `percent` (phí theo % số tiền giao dịch).
*   `GET /api/admin/fees?service=<serviceId>` — Xem cấu hình phí của dịch vụ.
*   `POST /api/admin/fees` — Tạo mới cấu hình phí. **Request Body:**
    ```json
    {
      "service": "<serviceId>",
      "feeType": "flat",
      "feeValue": 1000,
      "description": "Phí cố định 1,000 VND mỗi giao dịch P2P"
    }
    ```
    hoặc với phí theo phần trăm:
    ```json
    {
      "service": "<serviceId>",
      "feeType": "percent",
      "feeValue": 0.5,
      "description": "Phí 0.5% số tiền giao dịch"
    }
    ```
*   `PUT /api/admin/fees/:id` — Cập nhật cấu hình phí.
*   `DELETE /api/admin/fees/:id` — Xóa cấu hình phí.

---

### 3.3. Quản lý Danh mục (Master Data)

#### 📌 CRUD Dịch vụ — Bật/Tắt nhanh
*   `PATCH /api/admin/services/:id/toggle` — Bật hoặc tắt nhanh một dịch vụ mà không cần gửi toàn bộ body.

#### 📌 Quản lý Biller (Nhà cung cấp hóa đơn)
*   `POST /api/admin/billers` — Thêm nhà cung cấp mới.
    *   *Logic nghiệp vụ:* Khi tạo thành công Biller mới, Server phải **tự động sinh ra 1 Ví Biller (`Pocket`)** tương ứng để nhận tiền dịch vụ.
*   `GET /api/admin/billers` — Lấy danh sách các Biller hiện có kèm `inquiryUrl` và `paymentUrl`.
*   `PUT /api/admin/billers/:id` — Cập nhật thông tin Biller (URL, tên...).

#### 📌 Quản lý Khách hàng (Customer Management)
*   `GET /api/admin/customers` — Xem danh sách tất cả khách hàng, SĐT, và số dư ví tương ứng.
*   `GET /api/admin/customers/:id` — Xem chi tiết một khách hàng và toàn bộ lịch sử giao dịch.
*   `PATCH /api/admin/customers/:id/block` — Khóa/mở khóa tài khoản khách hàng.

---

### 3.3. Quản lý Ví (Pocket Management) — ⭐ Điều kiện tiên quyết

> **Vì sao quan trọng?** Các `glStep` dạng `wallet` trong `TransDefinition` trỏ thẳng vào `Pocket._id` cố định (Ví System, Ví Bank). Nếu không có API để tạo các ví này, Officer **không thể cấu hình được nghiệp vụ nào** — đây là bước số 1 trong workflow Officer (theo requirements Phần 7.1).

#### 📌 Xem danh sách tất cả Ví
*   **Endpoint:** `GET /api/admin/pockets`
*   **Headers:** `Authorization: Bearer <Token_Admin>`
*   **Query Params:** `client` (lọc theo loại: `system`, `bank`, `customer`, `biller`).
*   **Mô tả:** Trả về danh sách ví kèm số dư và trạng thái. Officer dùng để chọn ID ví khi cấu hình `glSteps`.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": [
        { "pocketId": "66sys0000000000000000001", "client": "system", "ownerName": "System",      "balance": 150000,       "state": "idle" },
        { "pocketId": "66bnk0000000000000000001", "client": "bank",   "ownerName": "Bank",        "balance": 999999999,    "state": "idle" }
      ]
    }
    ```

#### 📌 Tạo Ví System hoặc Ví Bank
*   **Endpoint:** `POST /api/admin/pockets`
*   **Headers:** `Authorization: Bearer <Token_Admin>`
*   **Mô tả:** Tạo ví đặc biệt (`system` hoặc `bank`). Ví Customer/Biller tự sinh khi tạo tài khoản — không tạo qua API này.
*   **Request Body:**
    ```json
    {
      "client": "bank",
      "ownerName": "Ngân hàng nguồn (Giả lập)",
      "initialBalance": 999999999,
      "currency": "VND"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": { "pocketId": "66bnk0000000000000000001", "client": "bank", "balance": 999999999 }
    }
    ```

#### 📌 Nạp thêm số dư vào Ví Bank (Tái nạp)
*   **Endpoint:** `PATCH /api/admin/pockets/:id/topup`
*   **Headers:** `Authorization: Bearer <Token_Admin>`
*   **Mô tả:** Nạp thêm tiền vào Ví Bank (giả lập tiền thật từ ngân hàng vào hệ thống). Chỉ dùng cho ví loại `bank`.
*   **Request Body:**
    ```json
    { "amount": 500000000 }
    ```

---

### 3.4. Giám sát & Đối soát (Audit Trails)

#### 📌 Tra cứu Transaction Trails (Để gỡ lỗi)
*   **Endpoint:** `GET /api/admin/trails`
*   **Headers:** `Authorization: Bearer <Token_Admin>`
*   **Query Params:** `serviceCode` (lọc theo nghiệp vụ), `status` (lọc theo trạng thái `init/pending/done/failed`), `page`, `limit`.
*   **Mô tả:** Trả về toàn bộ nhật ký giao dịch (bảng `TransactionTrail`) bao gồm cả các giao dịch thất bại hoặc đang treo, kèm theo `transStepLog` để admin có thể biết lỗi xảy ra ở bước nào.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "transRefId": "66ffffff0000000000000001",
          "serviceCode": "P2P_TRANSFER",
          "status": "failed",
          "inputMessage": { "...": "..." },
          "outputMessage": { "...": "..." },
          "transStepLog": [
            { "step": "Request", "timestamp": "2026-06-25T14:40:00Z", "status": "success" },
            { "step": "Verify",  "timestamp": "2026-06-25T14:41:00Z", "status": "failed", "error": "INSUFFICIENT_BALANCE" }
          ]
        }
      ]
    }
    ```

#### 📌 Xem chi tiết một Trail
*   **Endpoint:** `GET /api/admin/trails/:transRefId`
*   **Headers:** `Authorization: Bearer <Token_Admin>`
*   **Mô tả:** Xem toàn bộ `inputMessage`, `outputMessage`, `TRANSBODY` và từng bước `transStepLog` của một giao dịch cụ thể. Dùng để debug khi có sự cố.

#### 📌 Tra cứu Biên lai thành công (Transaction History)
*   **Endpoint:** `GET /api/admin/transactions`
*   **Headers:** `Authorization: Bearer <Token_Admin>`
*   **Query Params:** `serviceCode`, `fromDate`, `toDate`, `page`, `limit`.
*   **Mô tả:** Tra cứu danh sách toàn bộ các giao dịch đã thực hiện thành công để phục vụ đối soát tài chính toàn hệ thống.

#### 📌 Xem chi tiết một Biên lai
*   **Endpoint:** `GET /api/admin/transactions/:transactionId`
*   **Headers:** `Authorization: Bearer <Token_Admin>`
*   **Mô tả:** Xem toàn bộ chi tiết biên lai kèm danh sách `PocketEntry` (các bút toán ví đã thực thi), dùng để đối soát từng dòng tiền.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "transactionId": "66aaaaa00000000000000001",
        "transRefId": "66ffffff0000000000000001",
        "serviceCode": "P2P_TRANSFER",
        "amount": 50000, "fee": 1000, "totalAmount": 51000,
        "entries": [
          { "stepOrder": 0, "debitPocketId": "...", "creditPocketId": "...", "amount": 50000 },
          { "stepOrder": 1, "debitPocketId": "...", "creditPocketId": "...", "amount": 1000 }
        ]
      }
    }
    ```

---

## 4. Tổng hợp Endpoints

| # | Method | Endpoint | Ai dùng | Mô tả ngắn |
|---|--------|----------|---------|------------|
| 1 | POST | `/api/customer/register` | Customer | Đăng ký tài khoản |
| 2 | POST | `/api/customer/login` | Customer | Đăng nhập, nhận JWT |
| 3 | GET | `/api/customer/balance` | Customer | Xem số dư ví |
| 4 | GET | `/api/customer/transactions` | Customer | Lịch sử giao dịch |
| 5 | GET | `/api/customer/transactions/:id` | Customer | Chi tiết một biên lai |
| 6 | GET | `/api/services` | Customer | Danh sách dịch vụ đang hoạt động |
| 7 | GET | `/api/billers` | Customer | Danh sách Biller (Bill Payment) |
| 8 | POST | `/api/transaction/request` | Customer | Bước 1: Khởi tạo giao dịch |
| 9 | POST | `/api/transaction/confirm` | Customer | Bước 2: Xác nhận phương thức |
| 10 | POST | `/api/transaction/verify` | Customer | Bước 3: Xác thực PIN & tiền chạy |
| 11 | POST | `/api/admin/login` | Officer | Đăng nhập Admin |
| 12 | POST | `/api/admin/cash-in` | Officer | Nạp tiền cho khách |
| 13 | GET/POST/PUT/DELETE | `/api/admin/services` | Officer | CRUD Dịch vụ + fieldBuilder |
| 14 | GET/POST/PUT/DELETE | `/api/admin/trans-fields` | Officer | CRUD TransField |
| 15 | GET/POST/PUT/DELETE | `/api/admin/trans-validations` | Officer | CRUD TransValidation |
| 16 | GET/POST/PUT/DELETE | `/api/admin/trans-definitions` | Officer | CRUD TransDefinition (GL Steps) |
| 17 | GET/POST/PUT/DELETE | `/api/admin/fees` | Officer | CRUD Fee |
| 18 | GET/POST | `/api/admin/pockets` | Officer | **Quản lý Ví System/Bank** |
| 19 | PATCH | `/api/admin/pockets/:id/topup` | Officer | **Tái nạp Ví Bank** |
| 20 | GET/POST/PUT | `/api/admin/billers` | Officer | Quản lý Biller |
| 21 | GET | `/api/admin/customers` | Officer | Danh sách khách hàng |
| 22 | GET | `/api/admin/customers/:id` | Officer | Chi tiết một khách hàng |
| 23 | PATCH | `/api/admin/customers/:id/block` | Officer | Khóa/mở khóa tài khoản |
| 24 | GET | `/api/admin/trails` | Officer | Danh sách Trail (debug) |
| 25 | GET | `/api/admin/trails/:id` | Officer | Chi tiết một Trail |
| 26 | GET | `/api/admin/transactions` | Officer | Danh sách biên lai (đối soát) |
| 27 | GET | `/api/admin/transactions/:id` | Officer | Chi tiết một biên lai |

