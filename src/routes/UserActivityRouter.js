const express = require('express');
const userActivityRouter = express.Router();
const {
    logViewedProduct,
    getUserActivity
} = require('../controllers/UserActivityController');

// Log viewed product
userActivityRouter.post('/view', logViewedProduct);
// Get user activity
userActivityRouter.post('/', getUserActivity);

module.exports = userActivityRouter;
