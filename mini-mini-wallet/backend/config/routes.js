/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * https://sailsjs.com/anatomy/config/routes-js
 */

module.exports.routes = {

    'POST /api/v1/auth/register': 'AuthController.register',
    'POST /api/v1/auth/login': 'AuthController.login',
    'POST /api/v1/transaction/transfer': 'TransactionController.transfer',
    'POST /api/v1/transaction/history': 'TransactionController.history',
    'POST /api/v1/transaction/deposit': 'TransactionController.deposit',
    'POST /api/v1/transaction/withdraw': 'TransactionController.withdraw',
    'POST /api/v1/auth/refresh-token': 'AuthController.refreshToken',
};
