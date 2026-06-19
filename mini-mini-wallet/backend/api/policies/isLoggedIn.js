const JwtService = require('../services/JwtService');
const respCode = require('../services/respCode');

module.exports = async function (req, res, proceed) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.error(respCode.UNAUTHORIZED, 'Bạn chưa đăng nhập hoặc thiếu Token');
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decodedPayload = JwtService.verify(token);

        req.userId = decodedPayload.id;
        return proceed();

    } catch (err) {
        return res.error(respCode.UNAUTHORIZED, 'Token không hợp lệ hoặc đã hết hạn');
    }
};