const respCode = require('./respCode');

module.exports = {
    executeTransfer: async function (senderId, receiverPhone, amount) {
        // Check input data
        if (!receiverPhone || !amount || amount < 1000) {
            return {
                isError: true,
                code: respCode.BAD_REQUEST,
                msg: "Vui lòng nhập SĐT người nhận và số tiền hợp lệ!"
            };
        }

        // Get infomation of Sender Wallet
        const senderPocket = await Pocket.findOne({ customer: senderId }).populate('customer');
        if (senderPocket.customer.phone === receiverPhone) {
            return {
                isError: true,
                code: respCode.BAD_REQUEST,
                msg: "Bạn không thể chuyển tiền cho chính bạn!"
            };
        }

        // Get information of Receiver and Receiver Wallet
        const receiverCustomer = await Customer.findOne({ phone: receiverPhone });
        if (!receiverCustomer) {
            return {
                isError: true,
                code: respCode.INVALID_CREDENTIALS,
                msg: "Không tìm thấy SĐT người nhận!"
            };
        }

        const receiverPocket = await Pocket.findOne({ customer: receiverCustomer.id });

        // Check if user's money isn't enough to transfer
        if (senderPocket.balance < amount) {
            return {
                isError: true,
                code: respCode.BAD_REQUEST, // Changed back to BAD_REQUEST to ensure it exists
                msg: "Số dư trong tài khoản không đủ!"
            };
        }

        await Pocket.updateOne({ id: senderPocket.id }).set({
            balance: senderPocket.balance - amount
        });
        await Pocket.updateOne({ id: receiverPocket.id }).set({
            balance: receiverPocket.balance + amount
        });

        // Create new Transaction history
        const newTransaction = await Transaction.create({
            sender: senderId,
            receiver: receiverCustomer.id,
            amount: amount,
            status: 'success'
        }).fetch();

        return {
            isError: false,
            transaction: newTransaction
        };
    }
};