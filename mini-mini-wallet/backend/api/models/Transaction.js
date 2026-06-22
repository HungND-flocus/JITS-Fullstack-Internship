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
    },
    receiver: {
      model: 'customer',
    },
    amount: {
      type: 'number',
      required: true,
      min: 1000,
    },
    type: {
      type: 'string',
      isIn: ['transfer', 'deposit', 'withdraw'],
      defaultsTo: 'transfer'
    },

    status: {
      type: 'string',
      isIn: ['success', 'failed'],
      defaultsTo: 'success',
    },
  },
};

