const Product = require('../models/Product'); // Product model
const Cart = require("../models/Cart");
const Order = require('../models/Order');
const fs = require('fs');
const path = require('path');

class ProductController {
  // Create a product
  async store(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'At least one image is required.' });
      }
      // Limit to 5 images
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
      // Extract query parameters for pagination
      const page = parseInt(req.query.page) || 1; // Default to page 1
      const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
      const sort = req.query.sort || 'def'; // Default to 'def' (latest products first)

      let sortQuery = {};

      // Determine sorting based on 'sort' query parameter
      if (sort === 'asc') {
        sortQuery = { price: 1 }; // Ascending order by price
      } else if (sort === 'desc') {
        sortQuery = { price: -1 }; // Descending order by price
      } else {
        sortQuery = { createdAt: 1 }; // Default sorting
      }

      // Calculate the number of items to skip for pagination
      const skip = (page - 1) * limit;

      // Fetch paginated and sorted products
      const products = await Product.find()
        .skip(skip) // Skip the first N results
        .limit(limit) // Limit the number of results
        .sort(sortQuery) // Sort based on the dynamic sort object
        .populate('brand', 'name');

      // Get the total count of products for pagination info
      const total = await Product.countDocuments();

      // Send the response with paginated products and pagination info
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


      // Handle new image uploads
      if (req.files && req.files.length > 0) {


        // Combine existing and new images
        const newImages = req.files.map(file => file.path.replace('public\\', '').replace('public/', ''));
        const combinedImages = [...product.images, ...newImages];

        // Validate the total number of images
        if (combinedImages.length > 5) {
          // Remove uploaded files since they won't be saved
          req.files.forEach(file => {
            const fullPath = path.join(__dirname, '..', '..', 'public', file.path);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
          });

          return res.status(400).json({ message: 'A maximum of 5 images are allowed per product.' });
        }

        // Update the product's images
        product.images = combinedImages;
      }

      // Update other fields
      Object.assign(product, req.body);
      await product.save();

      res.status(200).json({ message: 'Product updated successfully', product });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  //delete product
  async destroy(req, res) {
    try {
      const productId = req.params.id;

      // Check if the product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Check if the product exists in any cart
      const productInCart = await Cart.findOne({ 'items.product': productId });
      if (productInCart) {
        return res.status(400).json({ message: 'Cannot delete product as it exists in a cart.' });
      }

      // Check if the product exists in any order
      const productInOrder = await Order.findOne({ 'items.product': productId });
      if (productInOrder) {
        return res.status(400).json({ message: 'Cannot delete product as it exists in an order.' });
      }

      // Delete product images
      product.images.forEach((imagePath) => {
        const fullImagePath = path.join(__dirname, '..', '..', 'public', imagePath);
        fs.unlinkSync(fullImagePath);
      });

      // Delete the product
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

      // Find the product by ID
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Ensure the product has more than one image
      if (product.images.length <= 1) {
        return res.status(400).json({
          message: 'Cannot delete the last remaining image of the product.',
        });
      }

      // Normalize the image path to use forward slashes
      const imagePath = `products/${imageName}`; // Use forward slashes
      const normalizedImages = product.images.map(image => image.replace(/\\/g, '/')); // Normalize all stored image paths

      // console.log('Normalized Product Images:', normalizedImages); // Debug log
      // console.log('Image Path to Delete:', imagePath); // Debug log

      const imageIndex = normalizedImages.findIndex(img => img === imagePath);
      if (imageIndex === -1) {
        return res.status(404).json({ message: 'Image not found in the product.' });
      }

      // Remove the image from the images array
      product.images.splice(imageIndex, 1);

      // Delete the image file from the public folder
      const fullImagePath = path.join(__dirname, '..', 'public', imagePath);
      // console.log('Full Image Path:', fullImagePath); // Debug log
      if (fs.existsSync(fullImagePath)) {
        fs.unlinkSync(fullImagePath);
      }

      // Save the product with the updated images array
      await product.save();

      res.status(200).json({ message: 'Image deleted successfully', product });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }


  async search(req, res) {
    try {
      // Get the search query from the request's query parameters
      const searchQuery = req.query.q || '';

      // Search products using regex to match product names (case insensitive)
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


};


module.exports = ProductController;