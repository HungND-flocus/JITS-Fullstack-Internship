/**
 * Transaction.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    sender: {
      model: 'customer',
      required: true,
    },
    receiver: {
      model: 'customer',
      required: true,
    },
    amount: {
      type: 'number',
      required: true,
      min: 1000,
    },
    status: {
      type: 'string',
      isIn: ['success', 'failed'],
      defaultsTo: 'success',
    },
  },
};

