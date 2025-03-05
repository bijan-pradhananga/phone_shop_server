const Rating = require('../models/Rating'); 
const Product = require('../models/Product');

class RatingController{
    // Add or Update Rating
    async addOrUpdateRating (req, res) {
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
    
            res.status(200).json({ message: 'Rating added successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    };
    
    // Get Ratings for a Product
    async getProductRatings (req, res){
        const { productId } = req.params;
    
        try {
            const ratings = await Rating.find({ product: productId }).populate("user", "name");
            res.status(200).json({ ratings });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    };
    
    // Delete Rating
    async deleteRating (req, res) {
        const { userId, productId } = req.params;  
        try {
            const rating = await Rating.findOne({ user: userId, product: productId });
            if (!rating) {
                return res.status(404).json({ message: 'Rating not found' });
            }
    
            await rating.remove();
    
            // Recalculate product rating after deletion
            const ratings = await Rating.find({ product: productId });
            const totalRatings = ratings.length;
            const averageRating = ratings.reduce((sum, rate) => sum + rate.rating, 0) / totalRatings;
    
            await Product.findByIdAndUpdate(productId, { 
                averageRating, 
                totalRatings 
            });
    
            res.status(200).json({ message: 'Rating deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    };
    
}

module.exports = RatingController;