const express = require('express')
const Rating = require('../controllers/RatingController');
const ratingRouter = express.Router();
const rInstance = new Rating();

ratingRouter.post('/', rInstance.addOrUpdateRating);
ratingRouter.get('/:productId', rInstance.getProductRatings);
ratingRouter.get('/has-rated/:userId/:productId', rInstance.hasUserRatedProduct);
ratingRouter.delete('/:userId/:productId', rInstance.deleteRating);
module.exports =  ratingRouter;
