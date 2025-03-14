const Rating = require('../models/Rating');
const Product = require('../models/Product');
const UserActivity = require("../models/UserActivity");
const { logRating } = require('./UserActivityController');

class RatingController {
    // Add or Update Rating
    async addOrUpdateRating(req, res) {
        const { userId, productId, rating, review } = req.body;

        try {
            // Check if the user has already rated the product
            const existingRating = await Rating.findOne({ user: userId, product: productId });

            if (existingRating) {
                // If rating exists, update it
                existingRating.rating = rating;
                existingRating.review = review;
                await existingRating.save();
            } else {
                // If no rating, create a new one
                const newRating = new Rating({
                    user: userId,
                    product: productId,
                    rating,
                    review
                });
                await newRating.save();
            }

            // Update the product's average rating and total ratings count
            const ratings = await Rating.find({ product: productId });
            const totalRatings = ratings.length;
            const averageRating = ratings.reduce((sum, rate) => sum + rate.rating, 0) / totalRatings;

            await Product.findByIdAndUpdate(productId, {
                averageRating,
                totalRatings
            });
            await logRating(userId, productId, rating, review);
            res.status(200).json({ message: 'Rating added successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    };

    // Get Ratings for a Product
    async getProductRatings(req, res) {
        const { productId } = req.params;

        try {
            const ratings = await Rating.find({ product: productId }).populate("user", "name");
            res.status(200).json({ ratings });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    };

    // Check if user has rated a product
    async hasUserRatedProduct(req, res) {
        const { userId, productId } = req.params;

        try {
            // Check if the user has already rated the product
            const existingRating = await Rating.findOne({ user: userId, product: productId });

            if (existingRating) {
                // If rating exists, return true and the rating details
                return res.status(200).json({
                    hasRated: true,
                    rating: existingRating
                });
            } else {
                // If no rating exists, return false
                return res.status(200).json({ hasRated: false });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // Delete Rating
    async deleteRating(req, res) {
        const { userId, productId } = req.params;
        try {
            // Find and delete the rating
            const rating = await Rating.findOneAndDelete({ user: userId, product: productId });

            if (!rating) {
                return res.status(404).json({ message: 'Rating not found' });
            }

            // Recalculate product rating after deletion
            const ratings = await Rating.find({ product: productId });
            const totalRatings = ratings.length;
            const averageRating = totalRatings > 0
                ? ratings.reduce((sum, rate) => sum + rate.rating, 0) / totalRatings
                : 0; // Handle case where there are no ratings left

            // Update the product's average rating and total ratings count
            await Product.findByIdAndUpdate(productId, {
                averageRating,
                totalRatings,
            });

            // Update UserActivity: Remove the rating entry
            const userActivity = await UserActivity.findOne({ user: userId });

            if (userActivity) {
                userActivity.ratings = userActivity.ratings.filter(
                    (r) => r.product.toString() !== productId
                );
                await userActivity.save();
            }
            res.status(200).json({ message: 'Rating deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}

module.exports = RatingController;