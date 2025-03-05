const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true },
    stock: { type: Number, default: 0 }, 
    specifications: {
      ram_capacity: { type: Number, required: true }, // GB
      internal_memory: { type: Number, required: true }, // GB
      screen_size: { type: Number, required: true }, // Inches
      battery_capacity: { type: Number, required: true }, // mAh
      processor: { type: String, required: true },
      primary_camera_rear: { type: Number ,required: true }, // MP
      primary_camera_front: { type: Number ,required: true } // MP
    },
    images: [{ type: String }], 
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
