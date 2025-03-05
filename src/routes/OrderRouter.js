const express = require('express')
const Order = require('../controllers/OrderController');
const orderRouter = express.Router();
const oInstance = new Order();

orderRouter.get('/', oInstance.index); // View all orders (admin/general use)
orderRouter.get('/search', oInstance.search); // Search orders
orderRouter.get('/:id', oInstance.viewOrderDetails); // View details of a specific order
orderRouter.post('/', oInstance.createOrder); // Create a new order
orderRouter.post('/user-orders', oInstance.viewOrders); // View all orders for a specific user
orderRouter.put('/:id/confirm', oInstance.confirmOrder); // Confirm an order
orderRouter.put('/:id/cancel', oInstance.cancelOrder); // Cancel an order

module.exports =  orderRouter;