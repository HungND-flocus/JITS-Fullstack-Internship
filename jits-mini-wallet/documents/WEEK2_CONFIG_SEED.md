# Thiết kế Config & Seed Data — Mini-Wallet Engine (Tuần 2)

> **Tài liệu này là gì?** Khai báo toàn bộ dữ liệu mẫu (Seed Data) cần thiết để hệ thống khởi động, và bộ cấu hình (Config) cho 3 nghiệp vụ P2P, Cash-in, Bill Payment.
>
> **Liên kết tài liệu:** Bám sát `WEEK2-DESIGN-BRIEF.md` Mục 7 (P2P), Mục 8 (Cash-in, Bill), Mục 10 (Output) và `ERD_DATA_DICTIONARY.md` để đảm bảo FK/Field nhất quán.
>
> **Quy ước ID:** Dùng dạng `"<SERVICE_P2P_ID>"` để ký hiệu ObjectId thật sẽ được MongoDB sinh ra khi insert. Các FK dùng `String(ObjectId)`.

---

## PHẦN 1: SEED DATA CƠ SỞ

> **Seed Data** là dữ liệu "bơm vào" database lần đầu khi khởi tạo hệ thống, trước khi bất kỳ giao dịch nào diễn ra. Nếu không có phần này, Engine sẽ không biết "ví hệ thống" và "ví ngân hàng" là ai.

---

### 1.1. Currency — Loại tiền tệ

> Mini-wallet chỉ hỗ trợ 1 loại tiền tệ trong scope tuần 2.

```json
{
  "_id": "<CURRENCY_VND_ID>",
  "code": "VND",
  "name": "Việt Nam Đồng",
  "symbol": "₫",
  "status": "active"
}
```

---

### 1.2. Officer — Nhân viên hệ thống

> Tạo 2 tài khoản Officer: 1 Admin (quản lý config), 1 Cashier (thực hiện Cash-in).

```json
[
  {
    "_id": "<OFFICER_ADMIN_ID>",
    "username": "admin",
    "hashedPassword": "<bcrypt('Admin@123')>",
    "role": "admin",
    "status": "active"
  },
  {
    "_id": "<OFFICER_CASHIER_ID>",
    "username": "cashier01",
    "hashedPassword": "<bcrypt('Cashier@123')>",
    "role": "cashier",
    "status": "active"
  }
]
```

---

### 1.3. Pocket — Ví đặc biệt của Hệ thống

> ⚠️ **Đây là 2 ví quan trọng nhất:** Ví System (gom phí) và Ví Bank (nguồn tiền Cash-in). Phải tạo **trước** khi cấu hình bất kỳ nghiệp vụ nào, vì `glSteps` sẽ trỏ thẳng vào ID của 2 ví này.

#### 1.3.1. Ví System (thu phí dịch vụ)

```json
{
  "_id": "<POCKET_SYSTEM_ID>",
  "user": null,
  "client": "system",
  "currency": "VND",
  "balance": 0,
  "checksum": "<md5('0' + 'system' + ...)>",
  "state": "idle",
  "status": "active"
}
```

#### 1.3.2. Ví Bank (nguồn tiền nạp)

> Bơm sẵn 1 tỷ VNĐ để thực hiện Cash-in không bao giờ hết.

```json
{
  "_id": "<POCKET_BANK_ID>",
  "user": null,
  "client": "bank",
  "currency": "VND",
  "balance": 1000000000,
  "checksum": "<md5('1000000000' + 'bank' + ...)>",
  "state": "idle",
  "status": "active"
}
```

---

### 1.4. Biller — Nhà cung cấp hoá đơn

> Tạo 2 Biller mẫu. Mỗi Biller khi tạo, hệ thống **tự động** tạo kèm 1 Pocket (Ví Biller) có số dư = 0.

#### 1.4.1. Điện lực TP.HCM (EVN)

```json
{
  "_id": "<BILLER_EVN_ID>",
  "code": "EVN_HCM",
  "name": "Điện lực TP.HCM",
  "inquiryUrl": "http://mock-biller.local/evn/inquiry",
  "paymentUrl": "http://mock-biller.local/evn/payment",
  "status": "active"
}
```
*→ Tự sinh Pocket:*
```json
{
  "_id": "<POCKET_BILLER_EVN_ID>",
  "user": "<BILLER_EVN_ID>",
  "client": "biller",
  "currency": "VND",
  "balance": 0,
  "checksum": "<md5('0' + '<BILLER_EVN_ID>' + ...)>",
  "state": "idle",
  "status": "active"
}
```

#### 1.4.2. Cấp nước TP.HCM (SAWACO)

```json
{
  "_id": "<BILLER_SAWACO_ID>",
  "code": "SAWACO_HCM",
  "name": "Cấp nước TP.HCM",
  "inquiryUrl": "http://mock-biller.local/sawaco/inquiry",
  "paymentUrl": "http://mock-biller.local/sawaco/payment",
  "status": "active"
}
```
*→ Tự sinh Pocket:*
```json
{
  "_id": "<POCKET_BILLER_SAWACO_ID>",
  "user": "<BILLER_SAWACO_ID>",
  "client": "biller",
  "currency": "VND",
  "balance": 0,
  "checksum": "<md5('0' + '<BILLER_SAWACO_ID>' + ...)>",
  "state": "idle",
  "status": "active"
}
```

---

### 1.5. Customer — Khách hàng mẫu

> Tạo 2 khách hàng mẫu để test. Mỗi khách được tự động tạo kèm 1 Pocket.

```json
[
  {
    "_id": "<CUSTOMER_A_ID>",
    "phone": "0901234567",
    "name": "Nguyễn Văn An",
    "hashedPin": "<bcrypt('123456')>",
    "status": "active"
  },
  {
    "_id": "<CUSTOMER_B_ID>",
    "phone": "0907654321",
    "name": "Trần Thị Bình",
    "hashedPin": "<bcrypt('123456')>",
    "status": "active"
  }
]
```

*→ Tự sinh Pocket của An:*
```json
{
  "_id": "<POCKET_CUSTOMER_A_ID>",
  "user": "<CUSTOMER_A_ID>",
  "client": "customer",
  "currency": "VND",
  "balance": 500000,
  "checksum": "<md5('500000' + '<CUSTOMER_A_ID>' + ...)>",
  "state": "idle",
  "status": "active"
}
```

*→ Tự sinh Pocket của Bình:*
```json
{
  "_id": "<POCKET_CUSTOMER_B_ID>",
  "user": "<CUSTOMER_B_ID>",
  "client": "customer",
  "currency": "VND",
  "balance": 100000,
  "checksum": "<md5('100000' + '<CUSTOMER_B_ID>' + ...)>",
  "state": "idle",
  "status": "active"
}
```

---

### 1.6. Bảng hoá đơn mẫu (Mock Biller Data)

> Mock Biller cần giữ một bảng hoá đơn. Đây là dữ liệu insert vào service Mock Biller (không phải Mini-Wallet DB), hoặc có thể lưu trong một collection riêng nếu mock tích hợp cùng server.

```json
[
  {
    "billerId": "<BILLER_EVN_ID>",
    "invoiceCode": "EVN001",
    "customerName": "Nguyễn Văn An",
    "amount": 350000,
    "isPaid": false,
    "description": "Tiền điện tháng 6/2026"
  },
  {
    "billerId": "<BILLER_SAWACO_ID>",
    "invoiceCode": "SAW001",
    "customerName": "Nguyễn Văn An",
    "amount": 120000,
    "isPaid": false,
    "description": "Tiền nước tháng 6/2026"
  }
]
```

---

## PHẦN 2: CONFIG 3 NGHIỆP VỤ

> Phần này khai báo 5 khối config (Service, TransField, TransValidation, TransDefinition và Fee) cho từng nghiệp vụ.
>
> **Nguyên tắc FK:** `TransField.service`, `TransValidation.service`, `TransDefinition.serviceId` đều = `String(service._id)`, **KHÔNG phải** `service.code`.

---

### NGHIỆP VỤ 1: P2P TRANSFER (Chuyển tiền cá nhân)

> Khách nhập SĐT người nhận + số tiền. Yêu cầu PIN. Phí cố định 1.000đ.

#### 2.1.1. Service

```json
{
  "_id": "<SERVICE_P2P_ID>",
  "code": "P2P_TRANSFER",
  "name": "Chuyển tiền P2P",
  "action": "none",
  "actionParams": null,
  "fee": {
    "type": "fixed",
    "value": 1000
  },
  "auth": {
    "method": "PIN"
  },
  "fieldBuilder": [
    {
      "order": 1,
      "name": "CURRENCY",
      "rule": "fixed",
      "variable": "VND",
      "datatype": "string",
      "errorCode": "P2P_FB_001"
    },
    {
      "order": 2,
      "name": "RECEIVERPHONE",
      "rule": "mapping",
      "variable": "parameters.receiverPhone",
      "datatype": "string",
      "errorCode": "P2P_FB_002"
    },
    {
      "order": 3,
      "name": "AMOUNT",
      "rule": "mapping",
      "variable": "parameters.amount",
      "datatype": "number",
      "errorCode": "P2P_FB_003"
    },
    {
      "order": 4,
      "name": "SENDERID",
      "rule": "query",
      "source": "queryPocketByUserId",
      "query": "id",
      "datatype": "string",
      "errorCode": "P2P_FB_004"
    },
    {
      "order": 5,
      "name": "RECEIVERID",
      "rule": "query",
      "source": "queryPocketByPhone",
      "variable": "RECEIVERPHONE",
      "query": "id",
      "datatype": "string",
      "errorCode": "P2P_FB_005"
    }
  ],
  "status": "active"
}
```

> **Giải thích fieldBuilder:**
> - `CURRENCY`: cố định "VND" (fixed) — mọi giao dịch trong mini-wallet đều dùng VND.
> - `RECEIVERPHONE`: lấy số điện thoại từ body request (mapping).
> - `AMOUNT`: lấy số tiền từ body request (mapping).
> - `SENDERID`: query DB tìm Pocket theo userId của người đang đăng nhập → lấy `id` của Pocket.
> - `RECEIVERID`: query DB tìm Pocket theo số điện thoại `RECEIVERPHONE` → lấy `id` của Pocket.

---

#### 2.1.2. TransField (Khai báo định dạng từng biến)

> ⚠️ **Bắt buộc phải có dòng SERVICEID** — engine dùng nó để tra `TransDefinition`.

```json
[
  {
    "_id": "<TF_P2P_SERVICEID>",
    "service": "<SERVICE_P2P_ID>",
    "fieldName": "SERVICEID",
    "fieldFormat": "string",
    "isRequired": true,
    "needSecured": false,
    "order": 1,
    "errorCode": "P2P_TF_001",
    "status": "active"
  },
  {
    "_id": "<TF_P2P_RECEIVERPHONE>",
    "service": "<SERVICE_P2P_ID>",
    "fieldName": "RECEIVERPHONE",
    "fieldFormat": "string",
    "minLength": 10,
    "maxLength": 11,
    "regex": "^(0)[0-9]{9,10}$",
    "isRequired": true,
    "needSecured": false,
    "order": 2,
    "errorCode": "P2P_TF_002",
    "status": "active"
  },
  {
    "_id": "<TF_P2P_AMOUNT>",
    "service": "<SERVICE_P2P_ID>",
    "fieldName": "AMOUNT",
    "fieldFormat": "number",
    "isRequired": true,
    "needSecured": false,
    "order": 3,
    "errorCode": "P2P_TF_003",
    "status": "active"
  },
  {
    "_id": "<TF_P2P_SENDERID>",
    "service": "<SERVICE_P2P_ID>",
    "fieldName": "SENDERID",
    "fieldFormat": "string",
    "isRequired": true,
    "needSecured": false,
    "order": 4,
    "errorCode": "P2P_TF_004",
    "status": "active"
  },
  {
    "_id": "<TF_P2P_RECEIVERID>",
    "service": "<SERVICE_P2P_ID>",
    "fieldName": "RECEIVERID",
    "fieldFormat": "string",
    "isRequired": true,
    "needSecured": false,
    "order": 5,
    "errorCode": "P2P_TF_005",
    "status": "active"
  }
]
```

---

#### 2.1.3. TransValidation (Luật kiểm tra nghiệp vụ)

```json
[
  {
    "_id": "<TV_P2P_NOT_SELF>",
    "service": "<SERVICE_P2P_ID>",
    "validateFunc": "validateReceiverIsNotSender",
    "validateFields": "SENDERID:RECEIVERID",
    "order": 1,
    "errorCode": "P2P_TV_001",
    "status": "active"
  },
  {
    "_id": "<TV_P2P_SENDER_CHECKSUM>",
    "service": "<SERVICE_P2P_ID>",
    "validateFunc": "validateSenderChecksum",
    "validateFields": "SENDERID",
    "order": 2,
    "errorCode": "P2P_TV_002",
    "status": "active"
  },
  {
    "_id": "<TV_P2P_RECEIVER_CHECKSUM>",
    "service": "<SERVICE_P2P_ID>",
    "validateFunc": "validateReceiverChecksum",
    "validateFields": "RECEIVERID",
    "order": 3,
    "errorCode": "P2P_TV_003",
    "status": "active"
  },
  {
    "_id": "<TV_P2P_SUFFICIENCY>",
    "service": "<SERVICE_P2P_ID>",
    "validateFunc": "validateSenderAccountSufficiency",
    "validateFields": "SENDERID:AMOUNT:DEBITFEE",
    "order": 4,
    "errorCode": "P2P_TV_004",
    "status": "active"
  }
]
```

> **Giải thích thứ tự:**
> 1. Kiểm tra không chuyển tiền cho chính mình.
> 2. Kiểm tra checksum ví người gửi (phát hiện DB bị sửa tay).
> 3. Kiểm tra checksum ví người nhận.
> 4. Kiểm tra số dư đủ = `balance ≥ AMOUNT + DEBITFEE`.

---

#### 2.1.4. TransDefinition & glSteps (Kịch bản ghi sổ kép)

```json
{
  "_id": "<TDEF_P2P_ID>",
  "serviceId": "<SERVICE_P2P_ID>",
  "glSteps": [
    {
      "order": 0,
      "amount": "AMOUNT",
      "debit": {
        "level": "productLevel",
        "target": "SENDERID"
      },
      "credit": {
        "level": "productLevel",
        "target": "RECEIVERID"
      }
    },
    {
      "order": 1,
      "amount": "DEBITFEE",
      "debit": {
        "level": "productLevel",
        "target": "SENDERID"
      },
      "credit": {
        "level": "wallet",
        "target": "<POCKET_SYSTEM_ID>"
      }
    }
  ],
  "status": "active"
}
```

> **Kiểm tra cân bằng (Double-Entry):**
> - An chuyển 50.000, phí 1.000:
>   - Step 0: Trừ Ví An 50.000, Cộng Ví Bình 50.000 ✅
>   - Step 1: Trừ Ví An 1.000, Cộng Ví System 1.000 ✅
> - **Tổng Debit = 51.000 = Tổng Credit** ✅ (cân bằng)

---

### NGHIỆP VỤ 2: CASH-IN (Nạp tiền tại quầy)

> Officer trigger, không cần PIN, nguồn tiền từ Ví Bank, miễn phí, 1 bút toán duy nhất.

#### 2.2.1. Service

```json
{
  "_id": "<SERVICE_CASHIN_ID>",
  "code": "CASH_IN",
  "name": "Nạp tiền tại quầy",
  "action": "none",
  "actionParams": null,
  "fee": {
    "type": "none"
  },
  "auth": {
    "method": "NONE"
  },
  "fieldBuilder": [
    {
      "order": 1,
      "name": "CURRENCY",
      "rule": "fixed",
      "variable": "VND",
      "datatype": "string",
      "errorCode": "CASHIN_FB_001"
    },
    {
      "order": 2,
      "name": "RECEIVERPHONE",
      "rule": "mapping",
      "variable": "parameters.receiverPhone",
      "datatype": "string",
      "errorCode": "CASHIN_FB_002"
    },
    {
      "order": 3,
      "name": "AMOUNT",
      "rule": "mapping",
      "variable": "parameters.amount",
      "datatype": "number",
      "errorCode": "CASHIN_FB_003"
    },
    {
      "order": 4,
      "name": "SENDERID",
      "rule": "fixed",
      "variable": "<POCKET_BANK_ID>",
      "datatype": "string",
      "errorCode": "CASHIN_FB_004"
    },
    {
      "order": 5,
      "name": "RECEIVERID",
      "rule": "query",
      "source": "queryPocketByPhone",
      "variable": "RECEIVERPHONE",
      "query": "id",
      "datatype": "string",
      "errorCode": "CASHIN_FB_005"
    }
  ],
  "status": "active"
}
```

> **Điểm khác biệt với P2P ở fieldBuilder:**
> - `SENDERID`: **fixed** (cố định `<POCKET_BANK_ID>`) thay vì query theo người đăng nhập. Officer nạp tiền từ Ví Bank, không phải từ ví của mình.
> - `auth.method = "NONE"`: Không cần PIN — Officer đã xác thực khi đăng nhập portal.

---

#### 2.2.2. TransField

```json
[
  {
    "_id": "<TF_CASHIN_SERVICEID>",
    "service": "<SERVICE_CASHIN_ID>",
    "fieldName": "SERVICEID",
    "fieldFormat": "string",
    "isRequired": true,
    "needSecured": false,
    "order": 1,
    "errorCode": "CASHIN_TF_001",
    "status": "active"
  },
  {
    "_id": "<TF_CASHIN_RECEIVERPHONE>",
    "service": "<SERVICE_CASHIN_ID>",
    "fieldName": "RECEIVERPHONE",
    "fieldFormat": "string",
    "minLength": 10,
    "maxLength": 11,
    "regex": "^(0)[0-9]{9,10}$",
    "isRequired": true,
    "needSecured": false,
    "order": 2,
    "errorCode": "CASHIN_TF_002",
    "status": "active"
  },
  {
    "_id": "<TF_CASHIN_AMOUNT>",
    "service": "<SERVICE_CASHIN_ID>",
    "fieldName": "AMOUNT",
    "fieldFormat": "number",
    "isRequired": true,
    "needSecured": false,
    "order": 3,
    "errorCode": "CASHIN_TF_003",
    "status": "active"
  },
  {
    "_id": "<TF_CASHIN_SENDERID>",
    "service": "<SERVICE_CASHIN_ID>",
    "fieldName": "SENDERID",
    "fieldFormat": "string",
    "isRequired": true,
    "needSecured": false,
    "order": 4,
    "errorCode": "CASHIN_TF_004",
    "status": "active"
  },
  {
    "_id": "<TF_CASHIN_RECEIVERID>",
    "service": "<SERVICE_CASHIN_ID>",
    "fieldName": "RECEIVERID",
    "fieldFormat": "string",
    "isRequired": true,
    "needSecured": false,
    "order": 5,
    "errorCode": "CASHIN_TF_005",
    "status": "active"
  }
]
```

---

#### 2.2.3. TransValidation

> Cash-in không cần kiểm tra "không chuyển cho mình" (Bank khác Customer). Chỉ cần kiểm tra Ví Bank còn đủ tiền và checksum hợp lệ.

```json
[
  {
    "_id": "<TV_CASHIN_SENDER_CHECKSUM>",
    "service": "<SERVICE_CASHIN_ID>",
    "validateFunc": "validateSenderChecksum",
    "validateFields": "SENDERID",
    "order": 1,
    "errorCode": "CASHIN_TV_001",
    "status": "active"
  },
  {
    "_id": "<TV_CASHIN_RECEIVER_CHECKSUM>",
    "service": "<SERVICE_CASHIN_ID>",
    "validateFunc": "validateReceiverChecksum",
    "validateFields": "RECEIVERID",
    "order": 2,
    "errorCode": "CASHIN_TV_002",
    "status": "active"
  },
  {
    "_id": "<TV_CASHIN_SUFFICIENCY>",
    "service": "<SERVICE_CASHIN_ID>",
    "validateFunc": "validateSenderAccountSufficiency",
    "validateFields": "SENDERID:AMOUNT:DEBITFEE",
    "order": 3,
    "errorCode": "CASHIN_TV_003",
    "status": "active"
  }
]
```

---

#### 2.2.4. TransDefinition & glSteps

> Chỉ có 1 bút toán (không có phí). Tiền đi từ Ví Bank → Ví Khách.

```json
{
  "_id": "<TDEF_CASHIN_ID>",
  "serviceId": "<SERVICE_CASHIN_ID>",
  "glSteps": [
    {
      "order": 0,
      "amount": "AMOUNT",
      "debit": {
        "level": "wallet",
        "target": "<POCKET_BANK_ID>"
      },
      "credit": {
        "level": "productLevel",
        "target": "RECEIVERID"
      }
    }
  ],
  "status": "active"
}
```

> **Lưu ý glSteps Cash-in:**
> - Ví Bank dùng `level: "wallet"` (cố định, tra bằng ID cứng), vì đây là ví đặc biệt của hệ thống.
> - Ví khách dùng `level: "productLevel"` (động, tra bằng biến `RECEIVERID` trong TRANSBODY).
> - **Phí = 0** → Không có step 1 (bỏ step có amount = 0).
> - **Kiểm tra cân bằng:** Bank −amount = Customer +amount ✅

---

### NGHIỆP VỤ 3: BILL PAYMENT (Thanh toán hoá đơn)

> Khách chọn Biller + nhập mã hoá đơn (KHÔNG nhập số tiền). Engine gọi `inquiryUrl` để lấy số tiền. Phí 2.000đ cố định. Yêu cầu PIN.

#### 2.3.1. Service (ví dụ cho Biller EVN)

> **Mỗi Biller cần 1 Service riêng** vì `actionParams.billerId` khác nhau.

```json
{
  "_id": "<SERVICE_BILL_EVN_ID>",
  "code": "BILL_PAYMENT_EVN",
  "name": "Thanh toán hoá đơn Điện lực TP.HCM",
  "action": "billerTrans",
  "actionParams": {
    "billerId": "<BILLER_EVN_ID>"
  },
  "fee": {
    "type": "fixed",
    "value": 2000
  },
  "auth": {
    "method": "PIN"
  },
  "fieldBuilder": [
    {
      "order": 1,
      "name": "CURRENCY",
      "rule": "fixed",
      "variable": "VND",
      "datatype": "string",
      "errorCode": "BILLEVN_FB_001"
    },
    {
      "order": 2,
      "name": "INVOICECODE",
      "rule": "mapping",
      "variable": "parameters.invoiceCode",
      "datatype": "string",
      "errorCode": "BILLEVN_FB_002"
    },
    {
      "order": 3,
      "name": "BILLERID",
      "rule": "fixed",
      "variable": "<BILLER_EVN_ID>",
      "datatype": "string",
      "errorCode": "BILLEVN_FB_003"
    },
    {
      "order": 4,
      "name": "SENDERID",
      "rule": "query",
      "source": "queryPocketByUserId",
      "query": "id",
      "datatype": "string",
      "errorCode": "BILLEVN_FB_004"
    },
    {
      "order": 5,
      "name": "RECEIVERID",
      "rule": "query",
      "source": "queryPocketByBillerId",
      "variable": "BILLERID",
      "query": "id",
      "datatype": "string",
      "errorCode": "BILLEVN_FB_005"
    }
  ],
  "status": "active"
}
```

> **Điểm quan trọng Bill Payment trong fieldBuilder:**
> - `AMOUNT` **KHÔNG có** trong fieldBuilder của Bill — số tiền sẽ được Engine **ghi đè sau khi gọi `inquiryUrl`** ở Request Bước 3.1.
> - `BILLERID`: cố định ID của Biller EVN.
> - `RECEIVERID`: query ví của Biller EVN theo `billerId`.

---

#### 2.3.2. TransField

```json
[
  {
    "_id": "<TF_BILLEVN_SERVICEID>",
    "service": "<SERVICE_BILL_EVN_ID>",
    "fieldName": "SERVICEID",
    "fieldFormat": "string",
    "isRequired": true,
    "needSecured": false,
    "order": 1,
    "errorCode": "BILLEVN_TF_001",
    "status": "active"
  },
  {
    "_id": "<TF_BILLEVN_INVOICECODE>",
    "service": "<SERVICE_BILL_EVN_ID>",
    "fieldName": "INVOICECODE",
    "fieldFormat": "string",
    "minLength": 1,
    "maxLength": 50,
    "isRequired": true,
    "needSecured": false,
    "order": 2,
    "errorCode": "BILLEVN_TF_002",
    "status": "active"
  },
  {
    "_id": "<TF_BILLEVN_AMOUNT>",
    "service": "<SERVICE_BILL_EVN_ID>",
    "fieldName": "AMOUNT",
    "fieldFormat": "number",
    "isRequired": true,
    "needSecured": false,
    "order": 3,
    "errorCode": "BILLEVN_TF_003",
    "status": "active"
  },
  {
    "_id": "<TF_BILLEVN_SENDERID>",
    "service": "<SERVICE_BILL_EVN_ID>",
    "fieldName": "SENDERID",
    "fieldFormat": "string",
    "isRequired": true,
    "needSecured": false,
    "order": 4,
    "errorCode": "BILLEVN_TF_004",
    "status": "active"
  },
  {
    "_id": "<TF_BILLEVN_RECEIVERID>",
    "service": "<SERVICE_BILL_EVN_ID>",
    "fieldName": "RECEIVERID",
    "fieldFormat": "string",
    "isRequired": true,
    "needSecured": false,
    "order": 5,
    "errorCode": "BILLEVN_TF_005",
    "status": "active"
  }
]
```

---

#### 2.3.3. TransValidation

```json
[
  {
    "_id": "<TV_BILLEVN_SENDER_CHECKSUM>",
    "service": "<SERVICE_BILL_EVN_ID>",
    "validateFunc": "validateSenderChecksum",
    "validateFields": "SENDERID",
    "order": 1,
    "errorCode": "BILLEVN_TV_001",
    "status": "active"
  },
  {
    "_id": "<TV_BILLEVN_RECEIVER_CHECKSUM>",
    "service": "<SERVICE_BILL_EVN_ID>",
    "validateFunc": "validateReceiverChecksum",
    "validateFields": "RECEIVERID",
    "order": 2,
    "errorCode": "BILLEVN_TV_002",
    "status": "active"
  },
  {
    "_id": "<TV_BILLEVN_SUFFICIENCY>",
    "service": "<SERVICE_BILL_EVN_ID>",
    "validateFunc": "validateSenderAccountSufficiency",
    "validateFields": "SENDERID:AMOUNT:DEBITFEE",
    "order": 3,
    "errorCode": "BILLEVN_TV_003",
    "status": "active"
  }
]
```

---

#### 2.3.4. TransDefinition & glSteps

```json
{
  "_id": "<TDEF_BILLEVN_ID>",
  "serviceId": "<SERVICE_BILL_EVN_ID>",
  "glSteps": [
    {
      "order": 0,
      "amount": "AMOUNT",
      "debit": {
        "level": "productLevel",
        "target": "SENDERID"
      },
      "credit": {
        "level": "productLevel",
        "target": "RECEIVERID"
      }
    },
    {
      "order": 1,
      "amount": "DEBITFEE",
      "debit": {
        "level": "productLevel",
        "target": "SENDERID"
      },
      "credit": {
        "level": "wallet",
        "target": "<POCKET_SYSTEM_ID>"
      }
    }
  ],
  "status": "active"
}
```

> **Kiểm tra cân bằng (ví dụ):**
> - An thanh toán hoá đơn 350.000đ, phí 2.000đ:
>   - Step 0: Trừ Ví An 350.000, Cộng Ví Biller EVN 350.000 ✅
>   - Step 1: Trừ Ví An 2.000, Cộng Ví System 2.000 ✅
> - **Tổng Debit = 352.000 = Tổng Credit** ✅ (cân bằng)

---

## PHẦN 3: TỔNG HỢP & CHECKLIST

### 3.1. Thứ tự insert Seed Data

> **Phải insert theo thứ tự phụ thuộc** (bảng con không thể tham chiếu FK của bảng mẹ nếu bảng mẹ chưa tồn tại):

```
1. Currency         ← Không phụ thuộc ai
2. Officer          ← Không phụ thuộc ai
3. Pocket (System)  ← Không phụ thuộc Customer/Biller
4. Pocket (Bank)    ← Không phụ thuộc Customer/Biller
5. Biller (EVN)     ← Không phụ thuộc Customer
6. Pocket (Biller EVN) ← Phụ thuộc Biller
7. Biller (SAWACO)
8. Pocket (Biller SAWACO)
9. Customer A       ← Không phụ thuộc Biller
10. Pocket (Customer A) ← Phụ thuộc Customer
11. Customer B
12. Pocket (Customer B)
13. Service (P2P)   ← Không phụ thuộc Pocket
14. TransField (P2P) ← Phụ thuộc Service
15. TransValidation (P2P) ← Phụ thuộc Service
16. TransDefinition (P2P) ← Phụ thuộc Service + Pocket System ID
17. (Lặp lại 13-16 cho Cash-in và Bill Payment)
```

---

### 3.2. Checklist Config — Design Review Gate

| Hạng mục | P2P | Cash-in | Bill EVN |
|----------|:---:|:-------:|:--------:|
| Có dòng `SERVICEID` trong `TransField` | ✅ | ✅ | ✅ |
| `glSteps` cân bằng (Σdebit = Σcredit) | ✅ | ✅ | ✅ |
| Phí về Ví System | ✅ | N/A (phí=0) | ✅ |
| `auth.method = PIN` với Customer transaction | ✅ | N/A | ✅ |
| `auth.method = NONE` với Cash-in | N/A | ✅ | N/A |
| `action = billerTrans` với Bill Payment | N/A | N/A | ✅ |
| Có step enquiry ghi đè AMOUNT @Request | N/A | N/A | ✅ |
| Có step payment @Verify trước ghi sổ | N/A | N/A | ✅ |
| FK config = `String(service._id)` | ✅ | ✅ | ✅ |

---

### 3.3. Sơ đồ dòng tiền tổng hợp

```
P2P:
  Ví Customer_A  ──[AMOUNT]──►  Ví Customer_B
  Ví Customer_A  ──[FEE]────►  Ví System

CASH-IN:
  Ví Bank  ──[AMOUNT]──►  Ví Customer_A

BILL PAYMENT (EVN):
  Ví Customer_A  ──[AMOUNT]──►  Ví Biller_EVN
  Ví Customer_A  ──[FEE]────►  Ví System
```

---

*Tài liệu này bám sát `WEEK2-DESIGN-BRIEF.md` Mục 7 (P2P Example), Mục 8 (Cash-in & Bill), Mục 5 (Schema) và nhất quán với `ERD_DATA_DICTIONARY.md` v3.*
