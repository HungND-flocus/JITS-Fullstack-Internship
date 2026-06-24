# Hướng dẫn Tiếp cận Cơ sở Dữ liệu (ERD) theo tư duy Top-Down

> **Dành cho ai?** Tài liệu này được thiết kế riêng giúp bạn dễ dàng làm quen với cấu trúc cơ sở dữ liệu của Mini-Wallet mà không bị ngộp bởi hàng chục bảng và trường dữ liệu phức tạp trong file [ERD_DATA_DICTIONARY.md](file:///d:/[JITS%20Summer%20Internship%202026]/JITS-Fullstack-Internship/jits-mini-wallet/documents/ERD_DATA_DICTIONARY.md).

---

## 🗺️ LEVEL 1: Bức Tranh Toàn Cảnh (Hệ thống làm gì?)

Hệ thống Mini-Wallet của chúng ta giải quyết **3 bài toán lớn**:
1. **Ai giao dịch?** (Quản lý Khách hàng, Biller, Admin).
2. **Giao dịch thế nào?** (Cấu hình linh hoạt không cần code lại - **Config-Driven**).
3. **Tiền đi về đâu?** (Chuyển tiền chính xác, ghi chép sổ sách kép và an toàn - **Ledger & Runtime**).

Thay vì nhìn vào 12 bảng cùng lúc, bạn hãy chia hệ thống làm **3 khối lớn** sau đây.

---

## 📦 LEVEL 2: Ba "Tầng" Dữ Liệu (The 3 Layers)

Hệ thống được chia làm 3 nhóm thực thể chính. Mỗi nhóm trả lời cho một câu hỏi cốt lõi:

```
┌────────────────────────────────────────────────────────┐
│               1. TẦNG IDENTITY (AI?)                   │
│      [Customer]      [Biller]      [Officer]           │
└──────────────────────────┬─────────────────────────────┘
                           │ sở hữu ví
                           ▼
┌────────────────────────────────────────────────────────┐
│             2. TẦNG LEDGER & RUNTIME (TIỀN & VẾT?)     │
│   [Pocket] ◄─── ghi sổ ─── [PocketEntry]               │
│      ▲                        ▲                        │
│      │ khóa ví                │ ghi nhận               │
│   [TransactionTrail] ──► [Transaction] (Biên lai)      │
└──────────────────────────▲─────────────────────────────┘
                           │ đọc luật
                           │
┌────────────────────────────────────────────────────────┐
│               3. TẦNG CONFIG (LUẬT CHƠI?)              │
│    [Service]  ──►  [TransField]  ──►  [TransValidation]│
│        └───────►  [TransDefinition] (Kịch bản ghi sổ)  │
└────────────────────────────────────────────────────────┘
```

### 1. Tầng Identity (Ai tham gia?)
*   **`Customer`**: Khách hàng sử dụng ứng dụng.
*   **`Biller`**: Các đối tác dịch vụ (Điện, Nước) cần thu tiền của khách.
*   **`Officer`**: Quản trị viên/Thu ngân (người tạo cấu hình hoặc thực hiện nạp tiền cho khách).
*   **`Currency`**: Loại tiền tệ lưu hành (ở đây mặc định là `VND` hoặc `MMK`).

### 2. Tầng Config (Luật chơi ra sao?)
*Đây là phần "Config-driven" của hệ thống. Thay vì code cứng logic cho P2P hay Bill Payment, ta lưu luật vào database. Khi có giao dịch, engine chỉ cần đọc luật lên để chạy.*
*   **`Service`**: Tên nghiệp vụ (P2P, CASHIN, BILLPAYMENT) và phí dịch vụ, cách xác thực (PIN hay NONE).
*   **`TransField`**: Định nghĩa các ô nhập liệu cần có (nhập số tiền, nhập SĐT...) và kiểm tra định dạng của chúng.
*   **`TransValidation`**: Các luật kiểm tra nghiệp vụ (ví dụ: người gửi phải đủ tiền, không được tự chuyển cho mình).
*   **`TransDefinition`**: Bản kế hoạch ghi sổ kép (**glSteps**). Ví dụ: Chuyển tiền P2P thì trừ ví A, cộng ví B, thu phí của ví A cộng vào ví System.

### 3. Tầng Ledger & Runtime (Giao dịch thực tế thế nào?)
*Đây là nơi lưu vết và tính toán tiền bạc thực tế khi một giao dịch đang chạy.*
*   **`TransactionTrail`**: "Hồ sơ bệnh án" lưu lại toàn bộ quá trình giao dịch đi qua 3 bước (Request -> Confirm -> Verify). Giao dịch dù thành công hay thất bại thì Trail vẫn được lưu.
*   **`Transaction`**: "Biên lai" giao dịch. Chỉ được sinh ra nếu giao dịch đã **Verify thành công**.
*   **`Pocket` (Ví)**: Lưu số dư thực tế của Customer, Biller, System, Bank.
*   **`PocketEntry`**: Dòng tiền chi tiết của từng bút toán kép (ví dụ: dòng tiền -10k từ ví A, dòng tiền +10k vào ví B).

---

## 🔄 LEVEL 3: Luồng Đi Của Dữ Liệu (Khi có giao dịch)

Hãy xem các bảng này phối hợp với nhau như thế nào khi một khách hàng thực hiện giao dịch qua **3 Bước**:

```
[BƯỚC 1: REQUEST]
 Khách hàng gửi Request thô
      │
      ▼
 Đọc [Service] + [TransField] ──► Dựng biến phẳng & Validate định dạng
      │
      ▼
 Chạy [TransValidation] ──► Validate số dư, ví gửi/nhận
      │
      ▼
 Tạo [TransactionTrail] ở trạng thái "pending" ──► Trả Preview (số tiền + phí + transRefId)


[BƯỚC 2: CONFIRM]
 Khách hàng gửi lên mã giao dịch (transRefId)
      │
      ▼
 Đọc [TransactionTrail] ──► Lấy cấu hình xác thực (auth) từ [Service]
      │
      ▼
 Trả về: Yêu cầu nhập PIN hoặc cho qua (NONE)


[BƯỚC 3: VERIFY]
 Khách hàng nhập PIN + gửi kèm transRefId
      │
      ▼
 Khóa ví [Pocket] ──► Kiểm tra PIN của [Customer] ──► Kiểm tra lại số dư
      │
      ▼
 Bắt đầu một Transaction database (ACID)
      │
      ├─► Đọc [TransDefinition] lấy các bước chuyển tiền (glSteps)
      ├─► Cộng / Trừ số dư trên các [Pocket]
      ├─► Tính lại checksum bảo vệ ví [Pocket]
      ├─► Tạo ghi chép chi tiết dòng tiền [PocketEntry]
      └─► Tạo biên lai [Transaction]
      │
      ▼
 Đổi trạng thái [TransactionTrail] sang "done"
      │
      ▼
 Mở khóa ví [Pocket] ──► Trả kết quả Thành công!
```

---

## 📝 LEVEL 4: "Cheat-Sheet" Tra Cứu Nhanh Cho Lập Trình Viên

Khi bắt tay vào viết code, bạn sẽ thường xuyên đặt ra các câu hỏi sau. Hãy dùng bảng dưới đây để tra cứu:

| Câu hỏi khi viết code | Bạn cần tìm ở đâu? | Giải thích ngắn gọn |
|-----------------------|--------------------|---------------------|
| **Làm sao tìm ví của một Khách hàng?** | Bảng `Pocket` | Tìm bản ghi có `user = customer._id` và `client = "customer"`. |
| **Làm sao biết giao dịch này do ai bấm nút?** | Bảng `TransactionTrail` | Đọc 2 trường `initiatorId` và `initiatorType`. |
| **Muốn thay đổi phí của dịch vụ P2P?** | Bảng `Service` | Tìm bản ghi có `code = "P2P"` và cập nhật thông tin trong trường `fee`. |
| **Làm sao để biết giao dịch bị lỗi ở đâu?** | Bảng `TransactionTrail` | Đọc `status` và log lưu trong `outputMessage`. |
| **Tiền đi từ ví nào sang ví nào?** | Bảng `TransDefinition` | Đọc mảng cấu hình `glSteps` (chứa định nghĩa ví debit/credit). |
| **Làm sao biết số dư ví có bị ai sửa trộm trong DB không?** | Bảng `Pocket` | Tính lại mã hash từ số dư rồi so sánh với trường `checksum`. |
| **Làm sao tránh việc khách bấm gửi 2 lần cùng lúc gây mất tiền?** | Bảng `Pocket` | Trước khi verify, đổi `state = "inProgress"`. Giao dịch xong đổi lại `idle`. |

---

*Hy vọng tài liệu này giúp bạn hình dung được kiến trúc hệ thống một cách trực quan và dễ tiếp cận nhất! Hãy kết hợp tài liệu này với sơ đồ chi tiết trong [ERD_DATA_DICTIONARY.md](file:///d:/[JITS%20Summer%20Internship%202026]/JITS-Fullstack-Internship/jits-mini-wallet/documents/ERD_DATA_DICTIONARY.md) khi viết code.*
