const express = require('express')
const Brand = require('../controllers/RatingController');
const ratingRouter = express.Router();
const rInstance = new Brand();

ratingRouter.post('/', rInstance.addOrUpdateRating);
ratingRouter.get('/:id', rInstance.getProductRatings);
ratingRouter.delete('/:id', rInstance.deleteRating);

module.exports =  ratingRouter;