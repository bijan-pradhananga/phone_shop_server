const express = require('express');
const brandRouter = require('./BrandRouter');
const cartRouter = require('./CartRouter');
const ratingRouter = require('./RatingRouter');
const orderRouter = require('./OrderRouter');
const userRouter = require('./UserRouter')
const productRouter = require('./ProductRouter');
const paymentRouter = require('./PaymentRouter');
const activityRouter = require('./UserActivityRouter');
const router = express.Router();

// routes
router.use('/brand', brandRouter);
router.use('/cart', cartRouter);
router.use('/order', orderRouter);
router.use('/rating', ratingRouter);
router.use('/payment', paymentRouter);
router.use('/product', productRouter);
router.use('/user',userRouter)
router.use('/activity',activityRouter)

module.exports = router;
