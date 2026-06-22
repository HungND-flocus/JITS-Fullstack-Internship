// api/controllers/AuthController.js
const bcrypt = require('bcrypt');
const respCode = require('../services/respCode');
const JwtService = require('../services/JwtService');

module.exports = {

    // 1. API ĐĂNG KÝ
    register: async function (req, res) {
        try {
            // B1: Lấy dữ liệu client gửi lên
            const { phone, password } = req.body;

            // B2: Validate cơ bản
            if (!phone || !password) {
                return res.error(respCode.BAD_REQUEST, 'Vui lòng nhập đủ SĐT và Mật khẩu');
            }

            // B3: Kiểm tra SĐT đã tồn tại chưa
            const existingCustomer = await Customer.findOne({ phone: phone });
            if (existingCustomer) {
                return res.error(respCode.PHONE_ALREADY_EXISTS, 'Số điện thoại này đã được đăng ký');
            }

            // B4: Tạo Customer mới (Sails sẽ tự động gọi beforeCreate để hash mật khẩu)
            // Dùng .fetch() để lấy lại dữ liệu Customer vừa tạo xong trong DB
            const newCustomer = await Customer.create({
                phone: phone,
                password: password
            }).fetch();

            // B5: Tạo ngay 1 chiếc Ví (Pocket) cho user này
            await Pocket.create({
                customer: newCustomer.id, // Liên kết ví với user ID vừa tạo
                balance: 1000000          // Lấy số dư mặc định
            });

            // B6: Trả về thành công
            return res.ok(newCustomer);

        } catch (err) {
            return res.error(respCode.SERVER_ERROR, 'Lỗi hệ thống: ' + err.message);
        }
    },

    // 2. API ĐĂNG NHẬP
    login: async function (req, res) {
        try {
            const { phone, password } = req.body;

            if (!phone || !password) {
                return res.error(respCode.BAD_REQUEST, 'Vui lòng nhập đủ SĐT và Mật khẩu');
            }

            // B1: Tìm user trong DB
            const user = await Customer.findOne({ phone: phone });
            if (!user) {
                return res.error(respCode.INVALID_CREDENTIALS, 'Sai số điện thoại hoặc mật khẩu');
            }

            // B2: So sánh mật khẩu (password gửi lên VS password băm trong DB)
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.error(respCode.INVALID_CREDENTIALS, 'Sai số điện thoại hoặc mật khẩu');
            }

            // B3: Sinh mã JWT Token chứa ID của user
            const accessToken = JwtService.sign({ id: user.id });
            const refreshToken = JwtService.signRefresh({ id: user.id });

            await Customer.updateOne({ id: user.id }).set({
                refreshToken: refreshToken
            });

            // B4: Trả về token và thông tin user
            return res.ok({
                accessToken: accessToken,
                refreshToken: refreshToken,
                user: user
            });

        } catch (err) {
            return res.error(respCode.SERVER_ERROR, 'Lỗi hệ thống: ' + err.message);
        }
    },

    refreshToken: async function (req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) return res.error(respCode.BAD_REQUEST, "Thiếu Refresh Token");
            let decoded;
            try {
                decoded = JwtService.verifyRefresh(refreshToken);
            } catch (err) {
                return res.error(respCode.UNAUTHORIZED, 'Refresh Token không hợp lệ hoặc đã hết hạn');
            }

            const user = await Customer.findOne({ id: decoded.id });

            if (!user) return res.error(respCode.NOT_FOUND, "Không tìm thấy người dùng");

            if (user.refreshToken !== refreshToken) {
                return res.error(respCode.UNAUTHORIZED, 'Refresh Token đã bị vô hiệu hóa');
            }

            const newAccessToken = JwtService.sign({ id: user.id });
            return res.ok({
                accessToken: newAccessToken
            });

        } catch (err) {
            return res.error(respCode.SERVER_ERROR, 'Lỗi hệ thống: ' + err.message);
        }
    }

};
