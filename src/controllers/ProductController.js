const Product = require('../models/Product');
const Cart = require("../models/Cart");
const Order = require('../models/Order');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class ProductController {
  // Create a product
  async store(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'At least one image is required.' });
      }
      if (req.files.length > 5) {
        return res.status(400).json({ message: 'Maximum 5 images are allowed.' });
      }
      const imagePaths = req.files.map(file => file.path.replace('public\\', '').replace('public/', ''));
      const product = await Product.create({
        ...req.body,
        images: imagePaths
      });
      res.status(201).json({ message: 'Product created successfully' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  // Get all products
  async index(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const sort = req.query.sort || 'def';

      let sortQuery = {};
      if (sort === 'asc') {
        sortQuery = { price: 1 };
      } else if (sort === 'desc') {
        sortQuery = { price: -1 };
      } else {
        sortQuery = { createdAt: -1 };
      }

      const skip = (page - 1) * limit;
      const products = await Product.find()
        .skip(skip)
        .limit(limit)
        .sort(sortQuery)
        .populate('brand', 'name');
      const total = await Product.countDocuments();

      res.status(200).json({
        products,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  // Get similar phones from Python API
  async getSimilarProducts(req, res) {
    try {
      const { phone_model, top_n } = req.query;
      if (!phone_model) {
        return res.status(400).json({ message: 'Phone model is required.' });
      }

      const pythonApiUrl = `${process.env.PYTHON_API_URL}/similar_phones/`;
      const response = await axios.get(pythonApiUrl, {
        params: { phone_model, top_n: top_n || 4 },
      });

      const recommendedPhones = response.data.similar_phones;
      const products = await Product.find({ name: { $in: recommendedPhones } }).populate('brand');

      res.status(200).json({
        message: 'Recommended phones fetched successfully',
        products,
      });
    } catch (err) {
      console.error('Error fetching recommended phones:', err.message);
      res.status(500).json({ message: err.message });
    }
  }

  // Get recommendations (Collaborative Filtering)
  async getRecommendations(req, res) {
    try {
      const { user_id, top_n } = req.query;
      
      // Validate input
      if (!user_id) {
        return res.status(400).json({ message: 'User ID is required.' });
      }

      // Fetch user activity data
      const userActivityResponse = await axios.post(`${process.env.BACKEND_URI}/activity`, {
        userId: user_id,
      });

      // Check if user activity exists
      if (!userActivityResponse.data) {
        return res.status(404).json({ message: 'No user activity found for this user.' });
      }

      const userActivity = userActivityResponse.data;

      // Define minimum interactions required for recommendations (e.g., 3 interactions)
      const MIN_INTERACTIONS = 3;
      const interactionCount = (userActivity.viewedProducts?.length || 0) +
                              (userActivity.purchasedProducts?.length || 0) +
                              (userActivity.ratings?.length || 0);

      // Check if user has enough interactions
      if (interactionCount < MIN_INTERACTIONS) {
        return res.status(400).json({
          message: `Insufficient user activity. At least ${MIN_INTERACTIONS} interactions (views, purchases, or ratings) are required for recommendations.`,
        });
      }

      // Prepare activity data for Python API
      const activityData = {
        viewedProducts: userActivity.viewedProducts || [],
        purchasedProducts: userActivity.purchasedProducts.map(item => item.product) || [],
        ratings: userActivity.ratings.map(rating => ({
          product: rating.product,
          rating: rating.rating,
          review: rating.review
        })) || []
      };

      // Call the Python API
      const pythonApiUrl = `${process.env.PYTHON_API_URL}/recommendations/`;
      const response = await axios.post(pythonApiUrl, activityData, {
        params: { top_n: top_n || 4 },
      });

      // Extract recommended product IDs from the response
      const recommendedProductIds = response.data.recommendations;

      // Fetch full product details for the recommended products
      const products = await Product.find({ _id: { $in: recommendedProductIds } }).populate('brand');

      // Return the recommended products
      res.status(200).json({
        message: 'Recommended products fetched successfully',
        products,
      });
    } catch (err) {
      console.error('Error fetching recommended products:', err.message);
      res.status(500).json({ message: err.message });
    }
  }

  // Get single product
  async show(req, res) {
    try {
      const product = await Product.findById(req.params.id).populate('brand');
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.status(200).json(product);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  // Update a product
  async update(req, res) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => file.path.replace('public\\', '').replace('public/', ''));
        const combinedImages = [...product.images, ...newImages];

        if (combinedImages.length > 5) {
          req.files.forEach(file => {
            const fullPath = path.join(__dirname, '..', '..', 'public', file.path);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
          });
          return res.status(400).json({ message: 'A maximum of 5 images are allowed per product.' });
        }

        product.images = combinedImages;
      }

      Object.assign(product, req.body);
      await product.save();

      res.status(200).json({ message: 'Product updated successfully', product });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  // Delete product
  async destroy(req, res) {
    try {
      const productId = req.params.id;
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const productInCart = await Cart.findOne({ 'items.product': productId });
      if (productInCart) {
        return res.status(400).json({ message: 'Cannot delete product as it exists in a cart.' });
      }

      const productInOrder = await Order.findOne({ 'items.product': productId });
      if (productInOrder) {
        return res.status(400).json({ message: 'Cannot delete product as it exists in an order.' });
      }

      product.images.forEach((imagePath) => {
        const fullImagePath = path.join(__dirname, '..', '..', 'public', imagePath);
        fs.unlinkSync(fullImagePath);
      });

      await product.deleteOne();
      res.status(200).json({ message: 'Product deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  // Delete a single image from a product
  async deleteImage(req, res) {
    try {
      const { id, imageName } = req.params;
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      if (product.images.length <= 1) {
        return res.status(400).json({
          message: 'Cannot delete the last remaining image of the product.',
        });
      }

      const imagePath = `products/${imageName}`;
      const normalizedImages = product.images.map(image => image.replace(/\\/g, '/'));
      const imageIndex = normalizedImages.findIndex(img => img === imagePath);
      if (imageIndex === -1) {
        return res.status(404).json({ message: 'Image not found in the product.' });
      }

      product.images.splice(imageIndex, 1);
      const fullImagePath = path.join(__dirname, '..', 'public', imagePath);
      if (fs.existsSync(fullImagePath)) {
        fs.unlinkSync(fullImagePath);
      }

      await product.save();
      res.status(200).json({ message: 'Image deleted successfully', product });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  // Search products
  async search(req, res) {
    try {
      const searchQuery = req.query.q || '';
      const products = await Product.find({
        name: { $regex: searchQuery, $options: 'i' }
      })
        .populate('brand')
        .sort({ createdAt: -1 })
        .limit(8);
      const total = await Product.countDocuments({
        name: { $regex: searchQuery, $options: 'i' }
      });

      res.status(200).json({ products, total });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
}

module.exports = ProductController;