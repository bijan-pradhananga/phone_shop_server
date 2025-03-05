const Brand = require("../models/Brand");
const User = require("../models/User");

class UserController {
    async store(req, res) {
        try {
            const brand = await User.create({ ...req.body });
            res.status(201).json({ message: 'User created successfully', data: brand });
        } catch (err) {
            if (err.name === 'ValidationError') {
                return res.status(400).json({ message: 'Validation error', errors: err.errors });
            }
            console.error('Error creating user:', err.message);
            res.status(500).json({ message: 'Failed to create user' });
        }
    }
}

module.exports = UserController;