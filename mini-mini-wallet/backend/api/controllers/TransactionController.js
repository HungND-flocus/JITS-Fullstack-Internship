/**
 * TransactionController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const respCode = require('../services/respCode');

module.exports = {
    // 1. API Chuyển tiền
    transfer: async function (req, res) {
        try {
            // 1. Controller should stay lightweight: they only handle data from the request
            // Controller should be responsible only for handling request data.
            // Fat Services, skinny controllers
            const { receiverPhone, amount } = req.body;
            const senderId = req.userId;

            // Call Service
            const result = await TransactionService.executeTransfer(senderId, receiverPhone, amount);

            if (result.isError) {
                return res.error(result.code, result.msg);
            }

            return res.ok({
                message: 'Chuyển tiền thành công',
                transaction: result.transaction
            });

        } catch (err) {
            return res.error(respCode.SERVER_ERROR, "Lỗi hệ thống" + err.message);
        }
    },

    // 2. API Xem Lịch sử Giao dịch
    history: async function (req, res) {
        try {
            const myId = req.userId;

            // Lấy Ví hiện tại của user để xem Số dư
            const myPocket = await Pocket.findOne({ customer: myId });

            const transactions = await Transaction.find({
                where: {
                    or: [
                        { sender: myId },
                        { receiver: myId }
                    ]
                },
                sort: 'createdAt DESC',
            })
                .populate('sender')
                .populate('receiver');

            // Trả về số dư VÀ danh sách lịch sử
            return res.ok({
                currentBalance: myPocket ? myPocket.balance : 0,
                transactions: transactions
            });
        } catch (err) {
            return res.error(respCode.SERVER_ERROR, "Lỗi hệ thống" + err.message);
        }
    }
};

