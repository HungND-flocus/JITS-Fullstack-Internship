module.exports = {
    SUCCESS: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401, // (chưa xác thực - đăng nhập - hết token)
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,

    // Mã lỗi nghiệp vụ ví điện tử (Bắt đầu từ 1000)
    PHONE_ALREADY_EXISTS: 1001, // Số điện thoại đã tồn tại
    INVALID_CREDENTIALS: 1002, // Số điện thoại hoặc mật khẩu không đúng
    SENDER_NOT_FOUND: 1003, // Không tìm thấy người gửi
    RECEIVER_NOT_FOUND: 1004, // Không tìm thấy người nhận
    INSUFFICIENT_BALANCE: 1005, // Số dư tài khoản không đủ
    INVALID_AMOUND: 1006, // Số tiền giao dịch không hợp lệ (<= 0)
    TRANSFER_TO_SELF: 1007, // Không thể tự chuyển tiền cho bản thân
};

