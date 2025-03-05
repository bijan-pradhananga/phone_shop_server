const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },  // User who rated
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },  // Rated product
    rating: { type: Number, required: true, min: 1, max: 5 },  // Rating (1-5)
    review: { type: String },  // Optional review text
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Rating", RatingSchema);
