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
            const { receiverPhone, amount } = req.body;
            const senderId = req.userId;

            if (!receiverPhone || !amount || amount < 1000) {
                return res.error(respCode.BAD_REQUEST, "Vui lòng nhập SĐT người nhận và số tiền hợp lệ");
            }

            const senderPocket = await Pocket.findOne({ customer: senderId }).populate('customer');
            if (senderPocket.customer.phone === receiverPhone) {
                return res.error(respCode.BAD_REQUEST, "Bạn không thể chuyển tiền cho chính mình");
            }

            const receiverCustomer = await Customer.findOne({ phone: receiverPhone });
            if (!receiverCustomer) {
                return res.error(respCode.BAD_REQUEST, "Không tìm thấy người nhận");
            }
            const receiverPocket = await Pocket.findOne({ customer: receiverCustomer.id });
            if (senderPocket.balance < amount) {
                return res.error(respCode.BAD_REQUEST, "Số dư trong ví không đủ");
            }

            await Pocket.updateOne({ id: senderPocket.id }).set({
                balance: senderPocket.balance - amount
            });

            await Pocket.updateOne({ id: receiverPocket.id }).set({
                balance: receiverPocket.balance + amount
            });

            const newTransaction = await Transaction.create({
                sender: senderId,
                receiver: receiverCustomer.id,
                amount: amount,
                status: 'success'
            }).fetch();

            return res.ok({
                message: 'Chuyển tiền thành công',
                transaction: newTransaction
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

