const Brand = require("../models/Brand");
const Product = require("../models/Product");

class BrandController {
    async index(req, res) {
        try {
            const brandData = await Brand.find().sort({ createdAt: -1 });
            const total = await Brand.countDocuments();
            res.status(200).json({ brands: brandData, total });
        } catch (err) {
            console.error('Error fetching brands:', err.message);
            res.status(500).json({ message: 'Failed to fetch brands' });
        }
    }

    async store(req, res) {
        try {
            const brand = await Brand.create({ ...req.body });
            res.status(201).json({ message: 'Brand created successfully', data: brand });
        } catch (err) {
            if (err.name === 'ValidationError') {
                return res.status(400).json({ message: 'Validation error', errors: err.errors });
            }
            console.error('Error creating brand:', err.message);
            res.status(500).json({ message: 'Failed to create brand' });
        }
    }

    async show(req, res) {
        try {
            const brandData = await Brand.findById(req.params.id);
            if (!brandData) {
                return res.status(404).json({ message: 'Brand not found' });
            }
            res.status(200).json(brandData);
        } catch (err) {
            console.error('Error fetching brand:', err.message);
            res.status(500).json({ message: 'Failed to fetch brand' });
        }
    }

    async update(req, res) {
        try {
            const updatedBrand = await Brand.findByIdAndUpdate(req.params.id, { ...req.body }, { new: true });
            if (!updatedBrand) {
                return res.status(404).json({ message: 'Brand not found' });
            }
            res.status(200).json({ message: 'Brand updated successfully', data: updatedBrand });
        } catch (err) {
            console.error('Error updating brand:', err.message);
            res.status(500).json({ message: 'Failed to update brand' });
        }
    }

    async destroy(req, res) {
        try {
            // Check if the brand is being used by any products
            const productsUsingBrand = await Product.findOne({ brand: req.params.id });
            if (productsUsingBrand) {
                return res.status(400).json({ message: 'Brand cannot be deleted as it is associated with products' });
            }
            const deletedBrand = await Brand.findByIdAndDelete(req.params.id);
            if (!deletedBrand) {
                return res.status(404).json({ message: 'Brand not found' });
            }

            res.status(200).json({ message: 'Brand deleted successfully' });
        } catch (err) {
            console.error('Error deleting brand:', err.message);
            res.status(500).json({ message: 'Failed to delete brand' });
        }
    }

    async search(req, res) {
        try {
            // Get the search query from the request's query parameters
            const searchQuery = req.query.q || ''; 

            // Search brands using regex to match brand names (case insensitive)
            const brands = await Brand.find({
                name: { $regex: searchQuery, $options: 'i' }
            }).sort({ createdAt: -1 });

            const total = await Brand.countDocuments({
                name: { $regex: searchQuery, $options: 'i' }
            });

            res.status(200).json({ brands, total });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
}

module.exports = BrandController;
