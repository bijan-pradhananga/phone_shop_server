const express = require('express')
const Cart = require('../controllers/CartController');
const cartRouter = express.Router();
const cInstance = new Cart();

cartRouter.post('/',cInstance.index);
cartRouter.post('/addToCart', cInstance.store);
cartRouter.delete('/', cInstance.destroy);

module.exports =  cartRouter;