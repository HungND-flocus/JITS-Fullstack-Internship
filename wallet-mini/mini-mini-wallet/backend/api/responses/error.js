module.exports = function error(errCode, message = 'Error occurred', data = {}) {
    const res = this.res;

    return res.status(200).json({
        err: errCode,
        message: message,
        data: data
    });
};