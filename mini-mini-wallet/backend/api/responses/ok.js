const respCode = require("../services/respCode");

module.exports = function ok(data = {}) {
    const res = this.res;

    return res.status(200).json({
        err: respCode.SUCCESS,
        message: 'Success',
        data: data
    });
};