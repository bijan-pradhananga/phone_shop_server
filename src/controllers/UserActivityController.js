const UserActivity = require('../models/UserActivity');
const Product = require('../models/Product');
const mongoose = require("mongoose");
// Log Viewed Product
exports.logViewedProduct = async (req, res) => {
    const { productId, userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid productId or userId" });
    }

    try {
        await UserActivity.findOneAndUpdate(
            { user: userId },
            { $addToSet: { viewedProducts: productId } }, 
            { upsert: true, new: true }
        );

        res.status(200).json({ message: "Product view logged successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Log Purchased Product
exports.logPurchase = async (userId, orderItems)=> {
    try {
        let userActivity = await UserActivity.findOne({ user: userId });

        if (!userActivity) {
            userActivity = new UserActivity({ user: userId, purchasedProducts: [] });
        }

        orderItems.forEach((item) => {
            userActivity.purchasedProducts.push({ product: item.product });
        });

        await userActivity.save();
    } catch (error) {
        console.error("Error logging purchase:", error);
    }
}

// Log Rating Activity
exports.logRating = async (userId, productId, rating, review) => {
    try {
        let userActivity = await UserActivity.findOne({ user: userId });

        if (!userActivity) {
            userActivity = new UserActivity({ user: userId });
        }

        // Check if the product is already rated by the user
        const existingRatingIndex = userActivity.ratings.findIndex(
            (r) => r.product.toString() === productId
        );

        if (existingRatingIndex !== -1) {
            // Update existing rating
            userActivity.ratings[existingRatingIndex].rating = rating;
            userActivity.ratings[existingRatingIndex].review = review;
        } else {
            // Add new rating entry
            userActivity.ratings.push({ product: productId, rating, review });
        }

        await userActivity.save();
    } catch (error) {
        console.error("Error logging rating in UserActivity:", error);
    }
};



// Get User Activity
exports.getUserActivity = async (req, res) => {
    const {userId} = req.body;

    try {
        const userActivity = await UserActivity.findOne({ user: userId })
           

        if (!userActivity) {
            return res.status(404).json({ message: "No user activity found." });
        }

        res.status(200).json(userActivity);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
