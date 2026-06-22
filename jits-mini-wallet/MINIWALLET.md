<!--
============================================================================
 MINI WALLET — Tài liệu sản phẩm (cho Thực tập sinh)
 - ĐỘC LẬP & TRỌN VẸN: đọc đúng file này là đủ hiểu sản phẩm và bắt tay thiết kế.
 - TRÌNH BÀY: luôn HIGH-LEVEL trước → rồi mới top-down xuống chi tiết.
   Mỗi thuật ngữ đều được giới thiệu TRƯỚC khi dùng (không tham chiếu chéo, không nhảy cóc).
 - PHẠM VI ĐẶC TẢ: dừng ở mức "cần gì & vì sao". KHÔNG đặc tả tới từng field/regex/
   format/response — đó là phần Thực tập sinh (TTS) tự thiết kế.
 - Độ khó nghiệp vụ: BASIC · MEDIUM · HIGH.
============================================================================
-->

# 🪙 MINI WALLET — Tài liệu sản phẩm

> **Cho ai?** Thực tập sinh chưa từng làm ví điện tử, và nghe "code theo cấu hình (config-driven)" thấy còn lạ. Đọc hết tài liệu này, bạn sẽ: (1) hiểu ví điện tử từ con số 0, (2) hiểu vì sao ta *cấu hình ra nghiệp vụ* thay vì *lập trình từng nghiệp vụ*, (3) biết phải xây những gì — **ở mức đủ để bắt tay thiết kế**.
>
> **Tài liệu KHÔNG đặc tả tới từng field.** Tên trường, cú pháp config, định dạng response… là phần **bạn tự chốt** khi thiết kế. Ở đây ta dừng ở "cần cái gì và vì sao".
>
> **Cách đọc:** đọc tuần tự từ Phần 0. Mỗi phần mở đầu bằng 🎯 (mục tiêu), kết bằng ý chốt. Gặp hộp 🛑 **Dừng lại & ngẫm** thì *thật sự dừng* và tự trả lời trước khi đọc tiếp — học chủ động ăn gấp nhiều lần học thụ động. Từ lạ → tra **Phần 10 (Từ điển)**.

## 📑 Mục lục

| # | Phần | Tầng |
|---|------|------|
| **0** | **Toàn cảnh trong 5 phút** (không thuật ngữ chuyên sâu) | 🔭 High-level |
| 1 | Nghiệp vụ nền: ví điện tử hoạt động ra sao | Nền tảng |
| 2 | Ý tưởng lớn: Config-driven (WHAT ≠ HOW) | Nền tảng |
| 3 | Kiến trúc engine 3 bước & sổ sách | Kỹ thuật |
| 4 | Các khối cấu hình của một nghiệp vụ | Kỹ thuật |
| 5 | **Config gặp Runtime — bản đồ một trang** ⭐ | Kỹ thuật |
| 6 | Đi xuyên 3 nghiệp vụ bằng config | Ráp lại |
| 7 | Phía Admin (Officer) — làm được gì & các màn hình | Yêu cầu |
| 8 | Phía Customer — làm được gì | Yêu cầu |
| 9 | Mô hình dữ liệu (Models) | Yêu cầu |
| 10 | Từ điển thuật ngữ | Tra cứu |

---

# PHẦN 0 — Toàn cảnh trong 5 phút

> 🎯 Nắm **bức tranh lớn nhất** trước, bằng ngôn ngữ đời thường — chưa có thuật ngữ chuyên sâu nào. Hết phần này bạn biết: *đang xây cái gì, có những ai, và ý tưởng nào làm nó đặc biệt.* Mọi phần sau chỉ là phóng to từng góc của bức tranh này.

## 0.1 Bạn sắp xây cái gì?

Một **ví điện tử thu nhỏ nhưng chạy thật** (như MoMo/ZaloPay phiên bản mini). Người dùng giữ tiền dạng số, chuyển cho nhau, trả hoá đơn. Điểm đặc biệt: **người vận hành tự "tạo ra" các loại giao dịch bằng cách điền cấu hình — không cần lập trình viên viết thêm code.**

Sản phẩm có đúng **2 người dùng** và **1 bộ máy (engine)** ở giữa:

```
   NGƯỜI VẬN HÀNH (Officer)               NGƯỜI DÙNG CUỐI (Customer)
   ─────────────────────────             ──────────────────────────
   • Tạo "loại giao dịch" mới            • Đăng ký / đăng nhập
     bằng cách ĐIỀN CẤU HÌNH             • Chuyển tiền cho người khác
     (không lập trình)                   • Thanh toán hoá đơn
   • Nạp tiền cho khách                  • Xem số dư + lịch sử giao dịch
   • Theo dõi mọi giao dịch
            │  cấu hình (dữ liệu nằm trên DB)        │  thao tác (gọi API)
            └────────────────────┬───────────────────┘
                                 ▼
            ┌──────────────────────────────────────────────┐
            │   CORE ENGINE  (code viết MỘT LẦN, cố định)   │
            │   Đọc cấu hình → chạy giao dịch theo 3 bước   │
            │   → ghi sổ → đổi số dư                        │
            │   KHÔNG viết code riêng cho từng loại giao dịch│
            └──────────────────────────────────────────────┘
```

## 0.2 Ý tưởng cốt lõi nhất: nghiệp vụ là CẤU HÌNH, không phải CODE

Cách làm thông thường: "chuyển tiền" viết một hàm, "trả hoá đơn" viết một hàm khác… Mỗi loại giao dịch một đoạn code. Hệ thật có *hàng trăm* loại → cách này sụp đổ (xem Phần 2).

Cách của chúng ta: viết **một bộ máy (engine) duy nhất** đủ tổng quát để chạy *bất kỳ* loại giao dịch nào, miễn là có **bản mô tả nghiệp vụ** đi kèm. Bản mô tả đó là **dữ liệu cấu hình** (do người vận hành điền), không phải code.

> 🧠 **Một câu để nhớ:** *Cấu hình là **danh từ** (dữ liệu nằm yên). Bộ máy là **động từ** (đọc dữ liệu đó rồi hành động).* Người vận hành viết danh từ **một lần**; mỗi khách hàng kích hoạt động từ **hàng nghìn lần**.
>
> 🍳 **Ví von xuyên suốt:** Người vận hành = **người soạn công thức** dán lên tường bếp. Khách hàng = **người gọi món**. Engine = **đầu bếp** đọc công thức mà nấu. Công thức **không tự nấu** — nó nằm chờ tới khi có người gọi món. Thêm món mới = **viết thêm công thức**, *không* đào tạo lại đầu bếp.

Hệ quả thần kỳ: **thêm một loại giao dịch mới = thêm vài bản ghi cấu hình, KHÔNG sửa code, KHÔNG deploy.**

## 0.3 Hai người dùng làm được gì (mức tổng quát)

| **CUSTOMER** (người dùng cuối) | **OFFICER / ADMIN** (người vận hành) |
|--------------------------------|--------------------------------------|
| Đăng ký & đăng nhập (số điện thoại + mã PIN) | Đăng nhập trang quản trị |
| Chuyển tiền cho người khác | **Tạo một loại giao dịch mới bằng cách điền cấu hình** (không lập trình) |
| Thanh toán hoá đơn (điện/nước/internet) | Nạp tiền vào tài khoản khách |
| Xem số dư & lịch sử giao dịch | Theo dõi mọi giao dịch (đối soát + gỡ lỗi) · Quản lý khách hàng |

> 📌 Một khác biệt sẽ gặp lại nhiều lần: **nạp tiền là việc của Officer**, không phải khách tự bấm. Vì sao — giải thích ở 1.5.

## 0.4 Lộ trình đọc (high-level → detail)

```
   Phần 1 ───► Phần 2 ───► Phần 3 ───► Phần 4 ───► Phần 5 ───► Phần 6 ──► 7·8·9·10·11
   Nghiệp vụ   Ý tưởng     Engine      Khối        Bản đồ      Ráp lại    Yêu cầu cụ thể
   ví là gì    config-     chạy ra     cấu hình    config ↔    qua 3      (Admin/Customer/
   (không      driven      sao         (5 khối)    runtime     nghiệp vụ  Model/Quy ước/
    code)                                          ⭐                     Ranh giới)
```

Phần 1–3 là **nền** (đọc kỹ, đừng nóng vội code). Phần 4–6 là **trái tim kỹ thuật**. Phần 7 trở đi là **yêu cầu** bạn phải hiện thực hoá.

---

# PHẦN 1 — Nghiệp vụ nền: ví điện tử hoạt động ra sao

> 🎯 Hiểu ví điện tử là gì, "tiền trong ví" thực chất là gì, vì sao chuyển tiền không làm tiền bốc hơi, ai thu phí, vì sao một giao dịch chia nhiều bước. **Chưa cần một dòng code nào.**

## 1.1 Ví điện tử là gì?

Như MoMo / ZaloPay / Apple Pay: một ứng dụng cho bạn **giữ tiền dạng số** và **dùng nó để chuyển cho người khác hoặc trả dịch vụ** — không cần tiền mặt.

> 📌 Ví **không phải ngân hàng**, không tạo ra tiền. Tổng tiền trong mọi ví luôn bằng số tiền thật công ty ví đang giữ hộ ở ngân hàng. Ví chỉ **ghi sổ ai có bao nhiêu** và **dịch chuyển con số đó**.

## 1.2 "Tiền" thực chất là một con số trong cơ sở dữ liệu

Cú sốc đầu tiên: **trong ví không có "tiền"** — chỉ có **số dư `balance`** lưu trong database.

```
   user   | balance
   -------|--------
   An     | 150.000
   Bình   |  30.000
```

"An chuyển 20.000 cho Bình" = hệ thống làm đúng 2 phép tính: `An: 150.000 − 20.000 = 130.000`, `Bình: 30.000 + 20.000 = 50.000`. **Không đồng nào di chuyển vật lý.** Toàn bộ ví điện tử quy về **cộng/trừ số dư một cách chính xác tuyệt đối**.

> 🧠 **Số dư của một chủ thể** được gọi là một **Ví / Pocket**. Mỗi khách hàng có một Pocket. Lát nữa ta sẽ thấy *hệ thống*, *nhà cung cấp hoá đơn*, *ngân hàng nguồn* cũng đều có Pocket riêng. **Nhớ từ "Pocket".**

> 🛑 **Dừng lại & ngẫm:** Nếu chuyển tiền chỉ là cộng/trừ con số, điều gì xảy ra nếu chương trình **crash ngay sau khi trừ tiền An nhưng trước khi cộng tiền Bình**? → 20.000 "bốc hơi"! Giữ câu hỏi này — nó dẫn tới khái niệm **giao dịch nguyên tử (ACID)** ở 1.7.

## 1.3 Quy luật sắt: GHI SỔ KÉP (double-entry)

Tiền không tự sinh ra hay mất đi — nó chỉ **di chuyển**. Vì vậy mọi thay đổi tiền luôn ghi thành **CẶP**: chỗ nào *mất* bao nhiêu thì chỗ khác *nhận* đúng bấy nhiêu. Hai vế luôn bằng nhau → tổng tiền toàn hệ thống không đổi. (Hãy tưởng tượng tiền là **nước**: bạn không làm nước biến mất, chỉ rót từ ly này sang ly khác.)

> ⚠️ **Quy ước thuật ngữ (rất hay nhầm):** ở tầng ví, `debit` một ví = **trừ** số dư ví đó; `credit` một ví = **cộng** số dư ví đó. Nhớ gọn: **debit = ra, credit = vào.**

**Ví dụ — An chuyển 20.000 cho Bình, phí 500 (An chịu)** = hai bút toán:

| # | Bút toán | Debit (trừ) | Credit (cộng) | Số tiền |
|---|----------|-------------|---------------|--------:|
| 1 | Chuyển gốc | Ví An | Ví Bình | 20.000 |
| 2 | Thu phí | Ví An | Ví Hệ thống | 500 |

Kết quả: An −20.500 · Bình +20.000 · Hệ thống +500. Cộng lại = **0** → **cân bằng**. Đây là cách bạn *biết chắc* mình không làm mất hay tạo tiền sai.

> 🧠 **Kiến thức nền quan trọng nhất:** mọi nghiệp vụ — nạp, chuyển, trả hoá đơn — chỉ là **một danh sách bút toán cặp đôi**. "Chạy một giao dịch" = "chạy lần lượt danh sách đó". Hãy khắc câu này.

## 1.4 Các nhân vật & 4 loại ví

Giờ mới đủ nền để gọi tên các chủ thể. **Ai giữ tiền thì có một Pocket.**

| Nhân vật | Vai trò | Loại ví (Pocket) |
|----------|---------|------------------|
| **Customer** | Người dùng cuối: chuyển tiền, trả hoá đơn | **Ví Customer** |
| **Officer / Admin** | Cấu hình nghiệp vụ + quản trị + nạp tiền cho khách | *(không giữ tiền)* |
| **Hệ thống (System)** | "Két" của công ty ví — nơi **gom phí** | **Ví System** |
| **Ngân hàng nguồn (Bank)** | Nguồn tiền để nạp vào ví (giả lập) | **Ví Bank** |
| **Biller** | Nhà cung cấp hoá đơn (điện/nước/internet) | **Ví Biller** |

> 💡 **Vì sao "ngân hàng nguồn" cũng là một ví?** Nhờ vậy **nạp tiền** vẫn tuân đúng ghi sổ kép: nạp = chuyển từ **Ví Bank → Ví Customer**. Không cần cơ chế đặc biệt. (Hệ thật gọi sang ngân hàng thật; mini-wallet giả lập bằng một ví nội bộ cho gọn.)

Bốn loại ví khác nhau ở chỗ **ai sở hữu** và **sinh ra lúc nào**:

| Loại ví | Ai sở hữu | Tạo khi nào |
|---------|-----------|-------------|
| **Ví Customer** | mỗi khách | tự sinh khi khách đăng ký |
| **Ví Biller** | mỗi biller | tự sinh khi Officer tạo biller |
| **Ví System** | hệ thống | Officer tạo tay (1 lần) |
| **Ví Bank** | ngân hàng giả lập | Officer tạo tay + nạp sẵn số dư lớn |

> 🧩 Ví Customer & Biller **tự sinh theo chủ thể**. Ví System & Bank là ví "đặc biệt" Officer tạo tay — sẽ giải thích vì sao điều này quan trọng ở Phần 4 (khi cấu hình kịch bản ghi sổ).

## 1.5 Ba nghiệp vụ

Sản phẩm làm đúng **3 nghiệp vụ**. Chúng **giống hệt nhau ở bản chất** ("trừ vài ví, cộng vài ví, sao cho cân bằng"), chỉ **khác chi tiết** (ai gửi, ai nhận, có gọi ra ngoài không, phí bao nhiêu).

- **① P2P · BASIC** — An gửi tiền cho Bình. `Ví An → Ví Bình` (gốc) + `Ví An → Ví System` (phí).
- **② Cash-in · MEDIUM · do Officer trigger** — Nạp `Ví Bank → Ví An`, thường miễn phí. **Đặc biệt: Officer bấm nạp, không phải khách tự nạp.**
- **③ Bill Payment · HIGH · gọi URL ngoài** — An trả hoá đơn: `Ví An → Ví Biller` (gốc) + `Ví An → Ví System` (phí). Khách **không tự nhập số tiền** — engine **gọi URL tra cứu (Inquiry)** của biller để lấy số tiền, và **gọi URL Payment** khi thanh toán.

> 💡 **Vì sao Cash-in do Officer làm?** Vì nạp tiền nghĩa là "tiền thật đã vào tài khoản công ty ở ngân hàng" — đây là hành động cần người vận hành xác nhận, không để khách tự bấm sinh tiền. Trong mini-wallet ta giả lập: Officer thay mặt "ngân hàng" rót từ Ví Bank sang ví khách.

> 🛑 **Dừng lại & ngẫm:** ba nghiệp vụ "giống bản chất, khác chi tiết". Chính sự giống-mà-khác này là chìa khoá dẫn tới config-driven (Phần 2). Giữ ý này trong đầu.

## 1.6 Phí (đã giản lược)

Người gửi trả phí; **toàn bộ phí về Ví System** (không chia nhiều bên). Mỗi nghiệp vụ có **một mức phí**: hoặc **cố định** (vd luôn 1.000), hoặc **phần trăm** (vd 0,5%, có thể chặn trên). Phí **tính ở Bước 1 (Request)** và "chụp ảnh" (snapshot) lưu kèm giao dịch — sau này nhìn lại biết hôm đó thu bao nhiêu, kể cả khi biểu phí đã đổi.

## 1.7 Vì sao một giao dịch chia 3 bước?

Như rút tiền ở ATM: (1) chọn số tiền → máy kiểm tra & báo phí; (2) nhập PIN; (3) máy nhả tiền & trừ tài khoản.

| Bước | Tên | Làm gì | Tiền chạy? |
|------|-----|--------|:---:|
| **1** | **REQUEST** | Dựng dữ liệu, kiểm định dạng, (hoá đơn → tra số tiền), **tính phí**, chốt tổng, kiểm luật nghiệp vụ, trả **preview** | ❌ |
| **2** | **CONFIRM** | Người dùng xác thực bằng **PIN** *(cash-in do Officer: bỏ qua bước này)* | ❌ |
| **3** | **VERIFY** | Kiểm PIN, validate lại, (hoá đơn → gọi URL payment), **ghi sổ & đổi số dư (ACID)** | ✅ |

> 💡 **Vì sao tách Request và Verify?** Giữa lúc xem preview và lúc đồng ý, người dùng có thể đổi ý, nhập sai PIN, mạng rớt. Ta muốn **chỉ trừ tiền ở giây phút cuối**, sau khi chắc chắn mọi thứ.

**Rủi ro phải phòng & lớp bảo vệ tương ứng** (bạn sẽ phải hiện thực hoá):

| Rủi ro | Lớp bảo vệ |
|--------|------------|
| Dữ liệu vào sai (SĐT 3 số, tiền âm) | Validate **định dạng** từng field |
| Vi phạm nghiệp vụ (chuyển cho mình, thiếu tiền) | Validate **nghiệp vụ** trước khi tiền chạy |
| Crash giữa chừng (trừ rồi chưa cộng) | **ACID:** thành công hết hoặc huỷ hết (rollback) |
| Sửa số dư lén trong DB | **Checksum ví** (dấu vân tay phát hiện sửa tay) |
| Bấm 2 lần / lặp giao dịch | **Khoá ví** + **trạng thái** giao dịch |
| Không truy vết được | **TransactionTrail** ghi lại từng bước |

> ⚠️ **Bất di bất dịch:** số dư **chỉ đổi ở Bước 3 (Verify)** và phải **nguyên tử**. Sai chỗ này = mất tiền của khách. (Trên Sails + MongoDB: dùng native `$inc` + khoá ví + checksum.)

> 🛑 **Dừng lại & ngẫm:** quay lại câu hỏi crash ở 1.2 (trừ An xong, chưa kịp cộng Bình). Lớp nào cứu? → **ACID**: mọi bút toán của một giao dịch nằm trong **một database transaction**; lỗi bất kỳ → DB tự hoàn tác tất cả.

> ✅ **Hết Phần 1.** Bạn đã hiểu *nghiệp vụ*: ví, tiền-là-con-số, ghi sổ kép, 4 loại ví, 3 nghiệp vụ, phí, 3 bước, rủi ro. Phần còn lại là kỹ thuật để hiện thực hoá.

---

# PHẦN 2 — Ý tưởng lớn: Config-driven (WHAT ≠ HOW)

> 🎯 Phần 0.2 đã nêu ý tưởng. Phần này đào sâu *vì sao* và *nghĩa là gì với bạn — người viết code*.

## 2.1 Cách làm ngây thơ và vì sao nó sụp đổ

Người mới nghĩ: mỗi nghiệp vụ một hàm — `chuyenTien()`, `traHoaDon()`, `napTien()`. Nghe hợp lý, nhưng:

- **80% code lặp lại** — hàm nào cũng validate, tính phí, ghi sổ kép, cần ACID.
- Thêm/sửa nghiệp vụ = **sửa code + test + deploy** (chậm, rủi ro).
- Sửa một quy tắc chung (vd cách tính phí) = sửa **hàng trăm chỗ**.
- Người ra nghiệp vụ (kinh doanh/vận hành) **không code được**, phải chờ lập trình viên.

## 2.2 Insight: tách WHAT khỏi HOW

Vì mọi nghiệp vụ **giống bản chất, khác chi tiết** (kết luận 1.5), hãy tách hai phần:

```
   WHAT — "Nghiệp vụ là GÌ?"            HOW — "Chạy NHƯ THẾ NÀO?"
   = DỮ LIỆU cấu hình trên DB           = ENGINE, code cố định
   • Nhận field nào?                     • B1: dựng dữ liệu, validate,
   • Validate luật gì?           đọc ──►   tính phí, chốt tiền
   • Phí bao nhiêu?                      • B2: xác thực (PIN)
   • Ví nào dời sang ví nào?             • B3: ghi sổ kép (ACID), đổi số dư
   (Officer tạo qua UI)                  (Bạn viết MỘT LẦN, không biết
                                          "chuyển tiền" hay "trả điện" là gì)
```

- **WHAT** = các bản ghi cấu hình mô tả một nghiệp vụ. Officer tạo bằng cách điền form.
- **HOW** = engine generic. Nó **không biết** "chuyển tiền" hay "trả điện" — chỉ biết: đọc config, làm theo config.

> 🧠 **Câu thần chú:** *"Nghiệp vụ là DỮ LIỆU, không phải CODE. Đổi dữ liệu → ra nghiệp vụ khác. Engine bất biến."* So sánh: Google Forms (tạo vô số biểu mẫu bằng cấu hình, nền tảng cố định) · đầu bếp & công thức (cùng đầu bếp, đổi công thức ra món khác).

## 2.3 Công việc của BẠN — và bài kiểm tra thành công

Việc của bạn **không phải** viết logic "chuyển tiền". Việc của bạn là viết **một engine đủ generic** để: đọc một bộ cấu hình bất kỳ → dựng dữ liệu → validate → tính phí → ghi sổ kép (ACID) → đổi số dư — và làm đúng vậy cho **mọi** nghiệp vụ.

> 🛑 **Bài kiểm tra:** nếu bạn tạo được nghiệp vụ thứ 4 (vd "chuyển tiền kèm lời nhắn") **chỉ bằng cách thêm config qua màn Transaction Design, không sửa một dòng engine** → bạn đã làm đúng config-driven. Đây cũng là lý do **Admin UI bắt buộc có** còn app Customer chỉ cần API: Admin UI là *bằng chứng sống* rằng nghiệp vụ là dữ liệu.

---

# PHẦN 3 — Kiến trúc engine 3 bước & sổ sách

> 🎯 Nắm bức tranh kỹ thuật: dữ liệu chảy qua engine ra sao, 3 bước làm gì, tiền ghi ở đâu. (Đây là HOW; các *khối cấu hình* mà mỗi bước đọc sẽ học ở Phần 4, rồi ráp thành bản đồ ở Phần 5.)

## 3.1 Bốn "gói dữ liệu" chảy qua engine

Khi một giao dịch chạy, dữ liệu biến hình qua 4 dạng:

```
  ① inputMessage   →   ② outputMessage (TRANSBODY)   →   ③ glSteps      →   ④ Transaction
  (body thô client     (engine chuẩn hoá: tra ví,        (danh sách        (biên lai cuối,
   gửi lên)             tính phí, dựng biến)              bút toán)         bất biến)
```

| Gói | Ai tạo | Bản chất |
|-----|--------|----------|
| **inputMessage** | Client | Dữ liệu thô người dùng nhập |
| **outputMessage** (chứa **TRANSBODY**) | Engine @Request | "Túi dữ liệu" đã chuẩn hoá; mọi bước sau đọc/ghi vào đây |
| **glSteps** | Engine @Verify | Kế hoạch ghi sổ: danh sách bút toán dời ví |
| **Transaction** | Engine cuối Verify | Biên lai bất biến — bằng chứng giao dịch đã xảy ra |

Tất cả gói trong một hồ sơ **TransactionTrail (Trail)**: 1 giao dịch = 1 Trail, giữ `inputMessage`/`outputMessage`, **`transStepLog`** (nhật ký từng bước, để truy vết) và **`status`** (init → pending → done/failed).

## 3.2 Engine 3 bước — chi tiết

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 1 — REQUEST                                          (TIỀN CHƯA CHẠY)     │
│  1. Dựng dữ liệu: từ input thô, tra DB để có đủ thông tin                      │
│     (ví người gửi, ví người nhận, ví/biller, số tiền hoá đơn…)                 │
│  2. Validate ĐỊNH DẠNG từng field (kiểu, độ dài, mẫu)                          │
│  3. (Hoá đơn) ENQUIRY: gọi URL tra cứu → lấy số tiền phải trả                  │
│  4. Tính PHÍ → chốt tổng số tiền                                               │
│  5. Validate NGHIỆP VỤ (đủ tiền? đúng luật?)                                   │
│  6. Lưu Trail (pending) → trả PREVIEW cho user (số tiền + phí + tổng)          │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
┌──────────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 2 — CONFIRM                                          (TIỀN CHƯA CHẠY)     │
│  • Chuẩn bị xác thực (customer: nhận PIN; cash-in do Officer: BỎ QUA)          │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
┌──────────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 3 — VERIFY   ★ ĐƯỜNG TIỀN CHẠY ★                     (TIỀN CHẠY)          │
│  1. KHOÁ ví người gửi (chống bấm 2 lần)                                        │
│  2. Kiểm PIN → validate lại nghiệp vụ lần cuối (số dư có thể đã đổi)           │
│  3. (Hoá đơn) PAYMENT: gọi URL thanh toán của biller                          │
│       (biller báo thất bại → huỷ, KHÔNG ghi sổ, Trail = failed)                │
│  4. ★ GHI SỔ TRONG MỘT DATABASE TRANSACTION (ACID) ★:                          │
│       • Chạy lần lượt glSteps (mỗi bút toán: trừ ví A, cộng ví B + checksum)   │
│       • Ghi PocketEntry (dấu vết từng bút toán)                                │
│       • Tạo Transaction (biên lai) · Trail: pending → done                     │
│       (lỗi bất kỳ → rollback TẤT CẢ, số dư về như cũ)                         │
│  5. MỞ KHOÁ ví. Xong.                                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

> 💡 **Thứ tự với hoá đơn:** gọi biller **TRƯỚC** rồi mới ghi sổ — biller thất bại thì huỷ, không ghi sổ. Đơn giản & an toàn cho người mới.

## 3.3 Sổ sách: Pocket + PocketEntry

Mini-wallet giữ **một tầng sổ** (tầng ví), gồm 2 model:

| Model | Vai trò | Ví von |
|-------|---------|--------|
| **Pocket (Ví)** | Số dư hiện tại của một chủ thể; có `balance` + `checksum` | Cuốn sổ "hiện có bao nhiêu" |
| **PocketEntry** | Dấu vết **từng bút toán** (ví A → ví B, số tiền, thời điểm) | Từng dòng "đã dời tiền lúc nào, đi đâu" |

> 🔒 **Checksum:** mỗi lần đổi ví, tính lại `checksum = hash(balance + chủ ví + …)`. Ai sửa tay `balance` mà không tính lại checksum → lần kiểm sau phát hiện ngay ví đã bị can thiệp. Đây là "niêm phong" chống gian lận.

---

# PHẦN 4 — Các khối cấu hình của một nghiệp vụ

> 🎯 Đây là **trái tim config-driven**. Một nghiệp vụ (Service) được mô tả bởi **một bộ khối cấu hình**, mỗi khối **trả lời một câu hỏi** engine cần. Đây cũng là nội dung màn **Transaction Design**. (Vẫn ở mức "khối làm gì" — *tên trường/cú pháp do bạn thiết kế*.)

```
                      ┌───────────┐
                      │  SERVICE  │  "Nghiệp vụ gì? Dựng dữ liệu sao? Phí? Xác thực?"
                      └─────┬─────┘
        ┌────────────┬──────┼──────┬──────────────────┐
        ▼            ▼      ▼      ▼                  ▼
  fieldBuilder  TransField  Fee  TransValidation  TransDefinition
  "dựng biến    "field nào, "phí  "luật nghiệp vụ  "ví nào dời sang
   gì?"          định dạng?" bao   phải đúng?"      ví nào? (ghi sổ kép)"
                            nhiêu?"
```

| Khối | Trả lời câu hỏi | Cốt lõi (high-level) |
|------|------------------|----------------------|
| **Service** | Nghiệp vụ gì? Phí? Xác thực? | mã/tên/loại nghiệp vụ; cấu hình phí; cách xác thực (PIN/NONE); bật–tắt. Chứa luôn **fieldBuilder** |
| **fieldBuilder** | Dựng biến gì? | luật biến input thô thành dữ liệu đủ dùng (xem dưới) |
| **TransField** | Field nào, định dạng ra sao? | hợp đồng định dạng từng field input (kiểu, bắt buộc, ràng buộc); engine kiểm *cú pháp* trước khi đụng nghiệp vụ |
| **TransValidation** | Luật nghiệp vụ nào phải đúng? | các luật chạy *trước khi tiền chạy* (không chuyển cho mình, đủ số dư, biller hợp lệ…); chọn từ "thư viện validator" bạn xây sẵn |
| **Fee** | Phí bao nhiêu? | một mức/nghiệp vụ: cố định hoặc phần trăm (chặn trên tuỳ chọn); **toàn bộ về Ví System** |
| **TransDefinition** | Ví nào dời sang ví nào? | danh sách **`glSteps`** — mỗi step là một bút toán "trừ ví A, cộng ví B, số tiền X"; là **kịch bản ghi sổ kép** |

## 4.1 `fieldBuilder` — biến input thô thành dữ liệu đủ dùng

Vấn đề: client chỉ gửi **số điện thoại người nhận** + **số tiền**. Nhưng để ghi sổ, engine cần **ID ví (Pocket) của người nhận**. Ai biến "SĐT" → "ví người nhận"? → `fieldBuilder`: một danh sách "luật dựng biến", mỗi luật một kiểu:

| Kiểu luật | Nghĩa | Ví dụ |
|-----------|-------|-------|
| **cố định** | gán một giá trị cứng | `CURRENCY = "VND"` |
| **chép (mapping)** | lấy từ một field input có sẵn | `RECEIVERPHONE = input.receiverPhone` |
| **tra DB (query)** | chạy một hàm tra DB | `SĐT → ví người nhận`; `billerId → biller + ví biller`; `mã hoá đơn → số tiền nợ` |

> 🧠 `fieldBuilder` là cách Officer "dạy" engine cách thu thập đủ nguyên liệu cho một nghiệp vụ — *mà không viết code*. Mỗi nghiệp vụ có fieldBuilder khác nhau → cùng một engine xử lý được cả P2P (tra ví theo SĐT) lẫn Bill (tra biller + tra hoá đơn).

## 4.2 `TransDefinition` / `glSteps` — kịch bản ghi sổ kép

Đây chính là "danh sách bút toán cặp đôi" ở 1.3, nhưng *viết bằng config*. Mỗi `glStep` gồm: `amount` (công thức số tiền), `debit` (ví bị trừ), `credit` (ví được cộng).

**Ví dụ — kịch bản P2P (chuyển 20.000, phí 500):**

| step | mô tả | debit (trừ) | credit (cộng) | amount |
|:--:|------|-------------|----------------|-------:|
| 1 | Chuyển gốc | ví sender | ví receiver | 20.000 |
| 2 | Thu phí | ví sender | ví system | 500 |

**Mỗi step trỏ tới ví bằng `target`, có 2 dạng** — đây là lý do màn Quản lý Ví quan trọng:

| Dạng target | Nghĩa | Ví dụ |
|-------------|-------|-------|
| **role (động)** | ví engine *tra ra lúc chạy* từ fieldBuilder | `sender`, `receiver`, `biller` |
| **wallet (cố định)** | trỏ thẳng một ví đã tạo ở màn Quản lý Ví | `system`, `bank` |

> 💡 **Quy tắc bỏ step:** step nào tính ra `amount == 0` thì **bỏ qua** (vd giao dịch miễn phí → bỏ step phí). Nhờ vậy một kịch bản dùng được cho cả có phí lẫn không phí.
>
> 🧠 Officer *vẽ* `glSteps` bằng config; engine *chạy* nó (ở Bước 3, trong ACID). Ví `role` lấy từ fieldBuilder, ví `wallet` (system/bank) lấy từ danh sách Officer đã tạo tay — **đó là vì sao Ví System & Bank phải tạo trước.**

---

# PHẦN 5 — Config gặp Runtime: bản đồ một trang ⭐

> 🎯 Đây là chỗ mọi mảnh ghép khớp lại. Giờ bạn đã biết **3 bước engine** (Phần 3) và **các khối cấu hình** (Phần 4) — ta nối chúng để thấy **mối quan hệ runtime ↔ config**.

Nhắc lại ý 0.2: **config là danh từ** (Officer điền sẵn ở *design-time*), **runtime là động từ** (engine đọc khi Customer bấm). Mỗi khối config **tồn tại để được đọc tại một khoảnh khắc cụ thể** trong 3 bước:

```
  DESIGN-TIME (Officer điền sẵn)         RUN-TIME (engine đọc khi Customer bấm)
  ────────────────────────────          ───────────────────────────────────────
  Service.fieldBuilder ───────►  ┐
  TransField ─────────────────►  │  BƯỚC 1 · REQUEST
  Biller.inquiryUrl ──────────►  ├─   dựng biến → kiểm ĐỊNH DẠNG → (hoá đơn)
  Fee ────────────────────────►  │    tra SỐ TIỀN → tính PHÍ → kiểm LUẬT
  TransValidation ────────────►  ┘    → preview              (TIỀN CHƯA CHẠY)
  ──────────────────────────────────────────────────────────────────────────────
  Service.auth (PIN / NONE) ──►     BƯỚC 2 · CONFIRM · chuẩn bị xác thực
                                                              (TIỀN CHƯA CHẠY)
  ──────────────────────────────────────────────────────────────────────────────
  Service.auth ───────────────►  ┐  BƯỚC 3 · VERIFY
  Biller.paymentUrl ──────────►  ├─   kiểm PIN → (hoá đơn) gọi THANH TOÁN
  TransDefinition (glSteps) ──►  ┘    → GHI SỔ KÉP (ACID)      ★ TIỀN CHẠY ✅ ★
```

> 🧠 **Đọc bản đồ theo 2 chiều:**
> - **Dọc (config → runtime):** mỗi dòng trái là một "câu trả lời" Officer chuẩn bị sẵn; engine bên phải "hỏi" tới đâu thì đọc tới đó. Officer **không** viết *trình tự* — trình tự là của engine, cố định; Officer chỉ điền *nội dung từng ô*.
> - **Ngang (3 bước):** tiền **chỉ chạy ở dòng cuối** (TransDefinition @Verify). Mọi thứ trước đó là chuẩn bị + kiểm tra — lý do tách 3 bước (1.7).

> 💡 Vì cột phải (engine) **cố định** và chỉ biết "đọc config rồi làm", **thêm một nghiệp vụ mới = điền một bộ ô bên trái khác**; cột phải không đổi và phục vụ mọi nghiệp vụ. Đó là toàn bộ "config-driven", gói trong một bản đồ.
>
> *(Cash-in lệch chuẩn: Officer trigger, bỏ Bước 2, `auth = NONE`, glSteps chỉ có 1 dòng `bank → customer` — xem 6.2.)*

---

# PHẦN 6 — Đi xuyên 3 nghiệp vụ bằng config

> 🎯 Cùng một engine 3 bước. Khác biệt chỉ ở **config** và **ai gọi** (customer hay officer). Đọc xong, bạn nên *tự hình dung được* cách cấu hình một nghiệp vụ mới.

| Khía cạnh | **P2P** (BASIC) | **Cash-in** (MEDIUM) | **Bill Payment** (HIGH) |
|-----------|-----------------|----------------------|--------------------------|
| Người trigger | Customer | **Officer** (1 API, tự chạy 3 bước) | Customer |
| Ví gửi (debit) | ví Customer | **ví Bank** | ví Customer |
| Ví nhận (credit) | ví Customer khác | ví Customer | **ví Biller** |
| Số tiền lấy từ | user nhập | officer nhập | **kết quả enquiry** |
| Enquiry / gọi ngoài? | ❌ | ❌ | ✅ inquiry @Request + payment @Verify |
| Xác thực | PIN | NONE (đã là Officer) | PIN |
| glSteps | sender→receiver; sender→system | bank→customer | sender→biller; sender→system |

## 6.1 P2P Transfer (BASIC)

Khách nhập SĐT người nhận + số tiền. Engine tra ví hai bên (fieldBuilder), kiểm định dạng (TransField), tính phí (Fee), kiểm luật (không chuyển cho mình, đủ số dư — TransValidation), rồi chạy 2 bút toán (TransDefinition).
**Kết quả mẫu** (An gửi Bình 20.000, phí 500): An −20.500 · Bình +20.000 · System +500.

## 6.2 Cash-in (MEDIUM) — do Officer trigger

**Đặc thù:** không có người dùng bấm từng bước. Officer gọi **một API**; API này **ở phía server tự dựng input rồi chạy engine Request → (bỏ Confirm) → Verify**. Nguồn tiền là **ví Bank** (đã nạp sẵn số dư lớn), thường miễn phí, không cần PIN (thay bằng kiểm "là Officer").
**Kết quả mẫu** (Officer nạp 100.000 cho An): Bank −100.000 · An +100.000.

> 🧠 **Bài học:** chứng minh engine có thể **gọi từ server** và **bỏ qua bước Confirm** — cách hệ thật làm các giao dịch nội bộ/tự động.

## 6.3 Bill Payment (HIGH) — gọi URL Inquiry + Payment

Nghiệp vụ khó nhất. Khách chọn Biller + nhập **mã hoá đơn** — **KHÔNG nhập số tiền**.

```
 [REQUEST]  tra ví khách + biller (kèm 2 URL)                       ← fieldBuilder
   → ENQUIRY: gọi inquiryUrl của biller → lấy số tiền hoá đơn       ← Biller.inquiryUrl
   → đặt số tiền = kết quả enquiry; tính phí; validate đủ số dư
   → Trail pending. Preview "Hoá đơn EVN 50.000đ, phí 1.000đ, tổng 51.000đ".
 [CONFIRM]  khách nhập PIN.
 [VERIFY]   khoá ví → kiểm PIN → validate lại
   → PAYMENT: gọi paymentUrl của biller (biller xác nhận đã thu)    ← Biller.paymentUrl
              (biller thất bại → huỷ, KHÔNG ghi sổ, Trail = failed)
   → ACID: khách −51.000, biller +50.000, system +1.000; lưu billerRefId
   → mở khoá ví. Xong.
```

**Hợp đồng gọi URL (high-level — nhóm tự chốt chi tiết):**
- **Inquiry** (@Request): gửi mã hoá đơn → biller trả **số tiền phải trả** (hoặc báo không tìm thấy).
- **Payment** (@Verify): gửi mã hoá đơn + số tiền + **một mã tham chiếu giao dịch** → biller trả **thành công + mã biller** (hoặc thất bại).

> 🔁 **Idempotency:** gửi kèm mã tham chiếu; gọi lại cùng mã thì biller nên trả kết quả cũ thay vì thu thêm lần nữa.
>
> 🧪 **Mock Biller (để test):** vì biller là hệ thống ngoài, nhóm dựng một service giả lập giữ **bảng hoá đơn mẫu** (mã → số tiền, đã thanh toán?). `inquiryUrl` trả số tiền nếu chưa thanh toán; `paymentUrl` đánh dấu đã thu + trả mã biller. Mục đích: học **mẫu tích hợp hệ thống ngoài** (dựng request động, gọi HTTP, xử lý thành/bại, idempotency) — kỹ năng cốt lõi của backend tài chính.

---

# PHẦN 7 — Phía Admin (Officer): làm được gì & các màn hình

> 🎯 Officer phải **đăng nhập** mới vào được; **mọi officer quyền ngang nhau — sản phẩm này KHÔNG phân quyền RBAC giữa các officer.** Policy chỉ cần chặn: ai không phải officer thì không vào được API admin (deny-by-default). Mọi danh sách cần **phân trang + tìm kiếm/lọc**.

## 7.1 Workflow của Officer (theo thứ tự phụ thuộc)

Đây là "config như nào", từ lúc trống tới lúc một nghiệp vụ chạy được:

1. **Chuẩn bị ví dùng chung:** tạo **Ví System** (gom phí) và **Ví Bank** (nạp sẵn số dư lớn để cash-in). *(màn Quản lý Ví)*
2. **Khai báo Biller** (chỉ khi là nghiệp vụ hoá đơn): tạo biller → **tự sinh ví biller** + 2 URL inquiry/payment. *(màn Quản lý Biller)*
3. **Tạo Service** (khai danh tính nghiệp vụ), rồi vào **Transaction Design** điền **5 khối config** (Phần 4): `fieldBuilder · TransField · TransValidation · Fee · TransDefinition`. Step dạng `wallet` chọn ví từ danh sách đã tạo ở bước 1.
4. **Bật Service** → nghiệp vụ "lên sóng", Customer dùng được ngay — **không deploy, không sửa code engine**.
5. **Vận hành:** trigger Cash-in cho khách · giám sát qua Trail/History · quản lý Customer.

## 7.2 Các màn hình cần có

| Màn hình | Mục đích |
|----------|----------|
| **Quản lý Service** | CRUD nghiệp vụ + bật/tắt. Tạo xong → sang Transaction Design |
| **Transaction Design** ⭐ | *Trái tim config-driven.* Chọn một Service rồi cấu hình **5 khối** (Phần 4) |
| **Quản lý Ví** | Tạo ví (chủ yếu System & Bank; nạp sẵn số dư Bank); các ví này dùng để chọn vào glStep dạng `wallet` |
| **Quản lý Biller** | CRUD biller; **tạo biller → tự tạo ví biller**; cấu hình 2 URL |
| **Quản lý Customer** | Xem/tìm khách + số dư; (tuỳ chọn) khoá/mở tài khoản |
| **Transaction Trail** | Xem **mọi** lần giao dịch (kể cả thất bại/đang dở) + `transStepLog` để **truy vết & gỡ lỗi** |
| **Transaction History** | Xem các **Transaction thành công** (biên lai chính thức) |

> 🔎 **Trail vs History:** Trail = *mọi* lần thử (soi quá trình). History = *chỉ thành công* (biên lai).
>
> 💡 **Gợi ý độ khó:** `fieldBuilder` và `glSteps` là form **động/lồng** (thêm/xoá dòng) → khó nhất, làm **sau cùng**. Thiếu thời gian có thể cho nhập bằng **ô JSON + nút validate** — vẫn đạt mục tiêu "tạo nghiệp vụ qua UI".

---

# PHẦN 8 — Phía Customer: làm được gì

## 8.1 Đăng ký / Đăng nhập (chỉ SĐT + PIN)

Đăng ký `{ phone, pin }` → tạo Customer + **tự tạo ví** (số dư 0). Một PIN dùng cho cả đăng nhập lẫn xác thực giao dịch. PIN phải **hash** khi lưu; log **che PIN** ở production — không bao giờ lộ PIN thô. *(Không cần email/mật khẩu riêng.)*

## 8.2 Luồng giao dịch (3 bước)

```
 Chọn service → nhập thông tin → REQUEST → xem preview (số tiền, phí, tổng)
              → CONFIRM → nhập PIN → VERIFY → xem kết quả + biên lai
```

Áp dụng cho **P2P** và **Bill Payment**. Với Bill Payment, preview cho thấy **số tiền hoá đơn engine vừa tra được** (enquiry) — khách không tự nhập. *(Cash-in do Officer, không nằm trong luồng customer.)*

## 8.3 Xem số dư & lịch sử

- **Số dư:** trả `balance` ví Customer (**kiểm checksum trước khi trả**).
- **Lịch sử:** danh sách Transaction của khách (list + detail), phân trang.

---

# PHẦN 9 — Mô hình dữ liệu (Models)

> 🎯 Liệt kê **model cần có và vai trò** — *không* đặc tả từng trường (đó là phần thiết kế của nhóm). **Không có** Distribution, Offer (đã đơn giản hoá: phí về thẳng System; phí + xác thực gắn trên Service).

**Nhóm Config (WHAT):**
| Model | Vai trò |
|-------|---------|
| `Service` | nghiệp vụ + phí + xác thực + fieldBuilder |
| `TransField` | định dạng từng field input |
| `TransValidation` | luật nghiệp vụ |
| `TransDefinition` | kịch bản ghi sổ kép (glSteps) |

**Nhóm Runtime / Ledger (HOW + sổ):**
| Model | Vai trò |
|-------|---------|
| `TransactionTrail` | hồ sơ giao dịch xuyên 3 bước (input/output, transStepLog, status) |
| `Transaction` | biên lai bất biến (nối Trail qua `transRefId`) |
| `Pocket` (Ví) | số dư chủ thể (`balance` + `checksum`) |
| `PocketEntry` | dấu vết từng bút toán |

**Nhóm Danh tính / Đối tác:**
| Model | Vai trò |
|-------|---------|
| `Customer` | khách hàng (phone, pinHash, ví) |
| `Officer` | admin (đăng nhập; **KHÔNG** RBAC — mọi officer quyền ngang nhau) |
| `Biller` | nhà cung cấp hoá đơn (2 URL, ví biller) |
| `Currency` | một loại tiền (sản phẩm này: 1 loại) |
| *token/session* | lưu đăng nhập; policy `bearer` đọc → gắn `req.info.user` |

---

# PHẦN 10 — Từ điển thuật ngữ

| Thuật ngữ | Nghĩa |
|-----------|-------|
| **Config-driven / WHAT vs HOW** | Mô tả nghiệp vụ bằng dữ liệu (WHAT); một engine generic (HOW) đọc config mà chạy |
| **Design-time / Run-time** | Lúc Officer điền config (hiếm, tiền không chạy) / lúc Customer giao dịch (liên tục, tiền chạy) |
| **Service** | Một nghiệp vụ, mô tả bằng bộ khối config |
| **Ví (Pocket)** | Số dư của một chủ thể; có `balance` + `checksum`; 4 loại: customer/system/bank/biller |
| **Ghi sổ kép / Debit-Credit** | Mọi thay đổi tiền ghi thành cặp bằng nhau; debit = trừ ví, credit = cộng ví |
| **glStep / TransDefinition** | Một bút toán (trừ ví nào, cộng ví nào) / kịch bản ghi sổ của một service |
| **target role / wallet** | Cách glStep trỏ ví: `role` (tra lúc chạy: sender/receiver/biller) / `wallet` (ví cố định: system/bank) |
| **3 bước Request/Confirm/Verify** | Request: kiểm tra + tính phí · Confirm: xác thực · Verify: tiền chạy (ACID) |
| **TransactionTrail** | Hồ sơ giao dịch xuyên 3 bước (input/output + transStepLog + status) |
| **TRANSBODY** | Túi dữ liệu chuẩn hoá engine dùng xuyên các bước |
| **Transaction** | Biên lai bất biến sau khi tiền đã chạy |
| **transRefId** | Khoá nối Transaction ↔ Trail ↔ PocketEntry |
| **fieldBuilder / TransField / TransValidation** | Dựng biến / định dạng field / luật nghiệp vụ |
| **Fee** | Phí (cố định/phần trăm) → về Ví System |
| **Enquiry (Inquiry) / Payment URL** | Gọi biller tra số tiền (@Request) / thực hiện thanh toán (@Verify) |
| **ACID / Checksum** | Thành công hết hoặc huỷ hết / dấu vân tay phát hiện sửa số dư trái phép |
| **Biller / Mock Biller** | Nhà cung cấp hoá đơn (ví nhận + 2 URL) / bản giả lập để test |
| **Phong bì `{err,…}`** | Mọi API trả `{ err, message, ...data }`, HTTP luôn 200; `err===200` = OK |
| **Policy / `req.info`** | "Lính gác" trước controller (deny-by-default); `bearer*` gắn `req.info.user`; admin chỉ kiểm "là officer" |
| **`$inc` (native)** | Toán tử Mongo cộng/trừ balance nguyên tử, tránh race @Verify |
