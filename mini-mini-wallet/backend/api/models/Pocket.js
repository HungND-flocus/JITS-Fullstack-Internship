/**
 * Pocket.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    balance: {
      type: 'number',
      defaultsTo: 1000000,
    },
    customer: {
      model: 'customer',
      required: true,
      unique: true,
    }
  },
};



