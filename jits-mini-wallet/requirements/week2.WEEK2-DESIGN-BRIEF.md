# Mini-Wallet — Design Brief cho Tuần 2 (tham chiếu kỹ thuật, mức cốt lõi)

> **Tài liệu này là gì?** Bộ tham chiếu kỹ thuật mentor cấp đầu Tuần 2 (tuần thiết kế). Nó bổ sung cho `MINIWALLET.md` (nghiệp vụ) phần "engine chạy theo trình tự nào". Mục tiêu: bạn nắm **đúng 3 runtime cốt lõi** rồi tự thiết kế chi tiết — **không cần đi sâu hơn mức ở đây**.
>
> **Mức ràng buộc — ĐỊNH HƯỚNG MỀM.** Tên hàm/model dưới đây bám engine thật của dự án để khi vào dự án thật bạn hiểu ngay; bạn được đổi tên trường miễn giữ đúng vai trò.
>
> **Phạm vi mini-wallet:** giữ **đủ 3 bước** `requestTransaction` → `confirmTransaction` → `verifyTransaction`; một tầng sổ Pocket (bỏ GL); phí + xác thực gắn thẳng trên `Service` (bỏ Distribution/Discount/Offer/ServiceConfig); 3 nghiệp vụ (P2P, Cash-in, Bill Payment); xác thực PIN hoặc NONE.

---

## 1. Hai file cốt lõi của engine

| File | Vai trò |
|------|---------|
| **`Transaction.js`** | Ba hàm "vỏ bọc" entry: `engineRequestTransaction`, `engineConfirmTransaction`, `engineVerifyTransaction`. Mỗi hàm chuẩn hoá input, **đóng dấu `TRANSTEP`** (1/2/3) ở phía server, gắn `dataObject.user`, gọi `NeonMessage.routeProcess`, rồi trả envelope `{ err, message, ...data }`. |
| **`NeonMessage.js`** | Bộ định tuyến: `routeProcess(transInput)` switch theo `TRANSTEP` → gọi `processRequestStep` / `processConfirmStep` / `processVerifyStep`. Đây là **thân của 3 runtime**. |

```
Controller → Transaction.engine{Request|Confirm|Verify}Transaction  (đóng dấu TRANSTEP)
           → NeonMessage.routeProcess  → switch TRANSTEP
                1 → processRequestStep   2 → processConfirmStep   3 → processVerifyStep
```

- **Một giao dịch = ba lần gọi API**, dùng chung một hồ sơ **`TransactionTrail`** nhận diện bằng **`transRefId`** (= `trail.id`). Request tạo hồ sơ; Confirm và Verify nạp lại đúng hồ sơ đó theo `transRefId`.
- Đầu mỗi bước gọi `NeonMessage.BuildMessage`: bước 1 → `TransactionTrail.init` (tạo hồ sơ); bước 2/3 → nạp lại `findOne({ id: TRANSREFID, status: 'pending' })`.
- **Bất biến:** Request không trừ đồng nào (kết thúc ở `status='pending'`); **tiền chỉ chạy ở Verify**, trong `TransDefinition.ExecuteTransaction` (một `session.withTransaction`).

---

## 2. Runtime `requestTransaction`

Thân: `processRequestStep(transInput)`.

| # | Hàm | Làm gì |
|---|-----|--------|
| 1 | `Service.buildTransactionFields` | Đọc `service.fieldBuilder` (input building) → biến body request thành **danh sách biến phẳng** (`fixed`/`mapping`/`query`). Kết quả chính là **`transInput`**. |
| 2 | `TransactionTrail.init(transInput)` | Dựa trên `TransField` config → đưa biến vào **TRANSBODY**; dựng **`inputMessage`** + **`outputMessage`**; tạo `TransactionTrail` ở **`status='init'`**. **Lưu ý:** sau khi tạo, gán `outputMessage.TRANSBODY.TRANSREFID = trail.id`. |
| 3 | `TransField.validateFields` | Validate **định dạng** TRANSBODY theo `TransField` config (kiểu/độ dài/regex). |
| 3.1 | *(chỉ service cần enquiry)* | Gọi ra ngoài (biller `inquiryUrl`) để tra hoá đơn → **ghi đè lại `AMOUNT`**. |
| 4 | tính **phí** | Theo cấu hình phí trên `Service`; chốt `TOTALAMOUNT = AMOUNT + DEBITFEE`. |
| 5 | `TransValidation.validateTransaction` | Theo config, truyền biến vào các hàm validator tương ứng để kiểm **luật nghiệp vụ**. |
| 6 | update Trail | Đổi `status` sang **`pending`**; trả **preview** (amount, fee, total, `transRefId`). |

---

## 3. Runtime `confirmTransaction`

Thân: `processConfirmStep(transInput)`. Nạp lại Trail theo `transRefId`, đọc phương thức xác thực, **trả về cho frontend `authMethod`** (`PIN` hoặc `NONE`).

```
return { errorCode: 0, authMethod, transRefId }
```

Frontend dựa vào `authMethod` để gọi `verifyTransaction` cho đúng: `PIN` → gửi kèm PIN; `NONE` → gọi thẳng không cần PIN. *(Cash-in do Officer: `authMethod = NONE` nên server có thể gọi `request` rồi `verify` thẳng, bỏ qua confirm.)*

---

## 4. Runtime `verifyTransaction`

Thân: `processVerifyStep(transInput)`. Nạp lại Trail từ `transRefId`.

| # | Hàm | Làm gì |
|---|-----|--------|
| 1 | `validateStateAndLock(SENDERPHONE)` | Kiểm trạng thái người gửi + **khoá** (set `state='inProgress'` trên bản ghi sender) — chống 2 giao dịch song song. |
| 2 | xác thực PIN | Nếu `authMethod='PIN'` → `Auth.VerifyPINAsync`. Nếu `NONE` → cho qua. |
| 3 | `TransField.validateFields` | Validate lại định dạng TRANSBODY. |
| 4 | tính **phí** | Tính lại từ đầu (không tin số cũ từ Request). |
| 5 | `TransValidation.validateTransaction` | Kiểm lại luật nghiệp vụ (số dư có thể đã đổi). |
| 5.1 | *(chỉ Bill Payment)* | Gọi `paymentUrl` của biller; biller thất bại → Trail `failed`, **không ghi sổ**. |
| 6 | `TransDefinition.ExecuteTransaction` | Đọc `glSteps`, **chuyển tiền từng step**, tạo `Transaction` — **toàn bộ trong một `session.withTransaction`** (ACID). |
| 7 | `releaseAccount(SENDERPHONE)` | **Mở khoá** người gửi (ở mọi lối ra). |

> Mọi lối ra của Verify đều phải **mở khoá** tài khoản đã khoá ở bước 1 (trừ khi chính việc khoá thất bại). Đây là lỗi hay quên nhất khi tự viết engine.

---

## 5. Năm khối config + schema tối thiểu

> Khoá ngoại của config (`TransField.service`, `TransValidation.service`, `TransDefinition.code`) = **chuỗi `String(service._id)`**.

**`Service`** (chứa luôn fieldBuilder + phí + xác thực): `code/name`, `fieldBuilder[]`, `amountFormula`, `action` (`none`/`billerTrans`), `actionParams` (`{billerId}`), `fee`, `auth` (`{ method: 'PIN'|'NONE' }`), `status`.

**`fieldBuilder[]`** — một luật dựng biến: `{ order, name, rule, source, variable, query, datatype, errorCode }`. Ba `rule`:
- `fixed` — hằng số: `CURRENCY = "MMK"`.
- `mapping` — lấy từ body: `RECEIVERPHONE = parameters.receiverPhone`.
- `query` — tra DB rồi rút field: `SENDERID = queryPocketByUserId(USERID).id`.

**`TransField`**: `{ service, fieldName, fieldFormat, minLength, maxLength, regex, isRequired, needSecured, order, errorCode, status }`.

**`TransValidation`**: `{ service, validateFunc, validateFields (cách nhau bằng ':'), order, errorCode, status }`. Validator liên quan mini-wallet: `validateReceiverIsNotSender`, `validateSenderAccountSufficiency` (đủ tiền = balance ≥ AMOUNT + DEBITFEE), kiểm checksum/số dư ví gửi & nhận.

**Phí (trên `Service`)**: `{ type: 'fixed', value: 100 }` hoặc `{ type: 'percent', value: 0.5, max: 5000 }`. Phí về **ví System**.

**`TransDefinition.glSteps[]`** — mỗi step: `{ order, amount, debit, credit }`; `debit`/`credit` = `{ level, target }`. `level`: `productLevel` (target động `SENDERID`/`RECEIVERID`) hoặc `wallet` (target ví cố định System/Bank). **Bỏ step `amount == 0`.** Tổng debit = tổng credit.

---

## 6. Sổ sách + ExecuteTransaction

- **`Pocket`**: `{ user, client (customer/biller/system/bank), currency, balance, checksum, status }`. `debit`/`credit` = native `$inc` + tính lại `checksum` (md5 từ balance + chủ ví… — chống sửa tay).
- **`PocketEntry`**: dấu vết từng bút toán `{ transRefId, stepOrder, debit (pocketId), credit (pocketId), amount, status:'settled' }`.
- **`Transaction`** (biên lai): `{ code, transRefId, service, sender, receiver, amount, totalAmount, fee, status: 'done'|'failed' }`.

`ExecuteTransaction` trong **một** `session.withTransaction`: với mỗi glStep → `Pocket.debit`/`Pocket.credit` ($inc + checksum) → ghi `PocketEntry` → tạo `Transaction` → lật Trail `pending → done`. Lỗi bất kỳ → rollback tất cả, số dư về như cũ.

---

## 7. Ví dụ config P2P (worked example, gọn)

Khách nhập SĐT người nhận + số tiền, phí cố định 100.

**fieldBuilder:** `CURRENCY=fixed "MMK"` · `RECEIVERPHONE=mapping parameters.receiverPhone` · `AMOUNT=mapping parameters.amount` · `SENDERID=query queryPocketByUserId(USERID).id` · `RECEIVERID=query queryPocketByPhone(RECEIVERPHONE).id`.

**TransField:** `SERVICEID` (bắt buộc) · `RECEIVERPHONE` (string, regex số) · `AMOUNT` (number).

**TransValidation:** `validateReceiverIsNotSender(SENDERID:RECEIVERID)` · `validateSenderAccountSufficiency(SENDERID:AMOUNT:DEBITFEE)`.

**Phí/auth (trên Service):** `fee: {type:'fixed', value:100}` · `auth: {method:'PIN'}`.

**glSteps:**

| order | amount | debit | credit |
|:-----:|--------|-------|--------|
| 0 | `AMOUNT` | productLevel `SENDERID` | productLevel `RECEIVERID` |
| 1 | `DEBITFEE` | productLevel `SENDERID` | wallet `<SYSTEM_POCKET_ID>` |

Gửi 10.000, phí 100 → ví gửi −10.100 · ví nhận +10.000 · ví System +100 (cân bằng). Phí 0 → bỏ step 1.

---

## 8. Cash-in và Bill Payment khác P2P ở đâu

- **Cash-in (Officer trigger):** server tự chạy `request` → `verify` (confirm trả `NONE`). fieldBuilder: `SENDERID` = ví Bank (`wallet` cố định), `RECEIVERID` = tra ví khách theo SĐT, `AMOUNT` = officer nhập. `auth: {method:'NONE'}`. Phí 0. glSteps một dòng `Bank → Customer`.
- **Bill Payment:** fieldBuilder tra biller + ví biller từ `billerId`; `RECEIVERID` = ví biller; khách nhập **mã hoá đơn**, không nhập số tiền. **@Request bước 3.1:** gọi `inquiryUrl` → ghi đè `AMOUNT`. **@Verify bước 5.1:** gọi `paymentUrl`; biller fail → `failed`, không ghi sổ. glSteps như P2P (credit gốc về ví biller). Gửi kèm `transRefId` làm mã tham chiếu để **idempotent**.

---

## 9. Hai cạm bẫy bắt buộc tránh

1. **Luôn có dòng `TransField` cho `SERVICEID`** — TRANSBODY chỉ dựng từ các `fieldName` khai trong `TransField`; thiếu nó engine không tra được `TransDefinition`.
2. **Khoá ngoại config = `String(service._id)`**, không phải `service.code` (comment trong code core gây hiểu nhầm).

---

## 10. Output Tuần 2 + Definition of Done + Review gate

Tuần 2 **không code**. Phải nộp một gói thiết kế đủ để Tuần 3–4 implement:
1. **ERD** + data dictionary (các model mục 5–6, bám brief).
2. **Đặc tả API (high-level):** liệt kê API + mục đích cho xác thực, ví, 3 bước giao dịch (request/confirm/verify), quản trị.
3. **Thiết kế config 3 nghiệp vụ** (P2P có khuôn ở mục 7; tự hoàn thiện Cash-in & Bill theo mục 8).
4. **Sequence diagram:** một P2P (request→confirm→verify) và một Bill Payment (có enquiry/payment).
5. **Wireframe Admin Portal** (7 màn — xem MINIWALLET).
6. **Thiết kế seed:** currency, ví System, ví Bank, Biller + hoá đơn mẫu, Officer.
7. **Backlog** chia nhỏ, ước lượng, gắn MUST/NICE.

**Definition of Done (thiết kế):** mỗi artifact đủ mục, bám brief (hoặc nêu lý do lệch), tự nhất quán (ERD ↔ API ↔ config ↔ seed), **mentor duyệt**.

**Design review gate (cuối Tuần 2):**
- [ ] Mô tả đúng 3 runtime (request 6 bước, confirm trả authMethod, verify 7 bước).
- [ ] Config 3 nghiệp vụ hợp lệ: có `TransField` `SERVICEID`; glSteps cân bằng; phí về System.
- [ ] Cash-in auth NONE; Bill có enquiry@Request + payment@Verify + idempotency.
- [ ] Tiền chỉ chạy ở Verify, trong `session.withTransaction`; có khoá/mở khoá sender.
- [ ] Backlog ước lượng được. **Qua gate mới sang Tuần 3.**
