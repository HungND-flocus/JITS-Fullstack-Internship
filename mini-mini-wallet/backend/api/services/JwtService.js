const jwt = require('jsonwebtoken');

const SECRET_KEY = 'DO_ANH_BAT_DUOC_EM';

module.exports = {
    sign: function (payload) {
        return jwt.sign(payload, SECRET_KEY, { expiresIn: '1d' });
    },

    verify: function (token) {
        return jwt.verify(token, SECRET_KEY);
    }
}