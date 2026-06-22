/**
 * Customer.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const bcrypt = require('bcrypt');

module.exports = {
  attributes: {
    phone: {
      type: 'string',
      required: true,
      unique: true,
      regex: /^[0-9]{10,11}$/,
    },

    password: {
      type: 'string',
      required: true,
    },

    refreshToken: {
      type: 'string',
      allowNull: true
    },
  },

  beforeCreate: async function (valuesToSet, proceed) {
    try {
      valuesToSet.password = await bcrypt.hash(valuesToSet.password, 10);
      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },

  customToJSON: function () {
    return _.omit(this, ['password']);
  }
};

