# Thiết kế Hệ thống Mini Wallet

## 1. [mini-mini-wallet] Sơ đồ Luồng Chuyển tiền P2P (Peer-to-Peer Transfer)
Sơ đồ dưới đây mô tả luồng nghiệp vụ khi một người dùng thực hiện chuyển tiền cho người dùng khác, đảm bảo tuân thủ các quy ước bảo mật và nghiệp vụ của dự án.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Người dùng (Client)
    participant Policy as Policy (isLoggedIn)
    participant Controller as TransactionController
    participant DB as Database (MongoDB)
    
    Client->>Policy: POST /transfer (Token, receiverPhone, amount)
    
    alt Token không hợp lệ / Hết hạn
        Policy-->>Client: HTTP 200 { err: 401, message: "Unauthorized" }
    else Token hợp lệ
        Policy->>Controller: Cho phép đi qua (Gắn req.userId)
        
        Controller->>Controller: Kiểm tra Input (amount >= 1000, receiverPhone)
        
        alt Input không hợp lệ
            Controller-->>Client: HTTP 200 { err: 400, message: "Dữ liệu không hợp lệ" }
        else Input hợp lệ
            Controller->>DB: Lấy Ví người gửi (senderPocket)
            DB-->>Controller: Dữ liệu Ví người gửi
            
            alt Tự chuyển cho bản thân
                Controller-->>Client: HTTP 200 { err: 400, message: "Không thể tự chuyển" }
            else Khác số điện thoại
                Controller->>DB: Tìm Khách hàng nhận (receiverPhone)
                DB-->>Controller: Dữ liệu Khách hàng nhận
                
                alt Không tìm thấy người nhận
                    Controller-->>Client: HTTP 200 { err: 400, message: "Không tìm thấy người nhận" }
                else Người nhận tồn tại
                    Controller->>DB: Lấy Ví người nhận (receiverPocket)
                    DB-->>Controller: Dữ liệu Ví người nhận
                    
                    alt Số dư < amount
                        Controller-->>Client: HTTP 200 { err: 400, message: "Số dư không đủ" }
                    else Đủ số dư
                        Note over Controller,DB: Bắt đầu giao dịch (Transaction)
                        Controller->>DB: Trừ tiền Ví người gửi (balance - amount)
                        Controller->>DB: Cộng tiền Ví người nhận (balance + amount)
                        Controller->>DB: Lưu Lịch sử Giao dịch (Transaction.create)
                        Controller-->>Client: HTTP 200 { err: 200, message: "Thành công", data: {...} }
                    end
                end
            end
        end
    end
```
