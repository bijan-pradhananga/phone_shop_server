const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    viewedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    purchasedProducts: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      }
    ],
    ratings: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        rating: { type: Number, min: 1, max: 5 },
        review: { type: String },
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserActivity", userActivitySchema);
