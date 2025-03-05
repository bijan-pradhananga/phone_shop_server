const Cart = require("../models/Cart");
const Product = require("../models/Product");

class CartController {

    // View Cart
    async index(req, res) {
        try {
            const { userId } = req.body; // Use userId from req.user
            let cart = await Cart.findOne({ user: userId }).populate('items.product');
            if (!cart) {
                cart = await Cart.create({
                    user: userId,
                    items: [],
                });
            }
            // Calculate total price of items in the cart
            const totalPrice = cart.items.reduce((acc, item) => {
                return acc + (item.quantity * item.product.price); // Assuming each item has a price in `product`
            }, 0);
            // Calculate total quantity of items in the cart
            const total = cart.items.reduce((acc, item) => acc + item.quantity, 0);
            // Respond with cart details and the calculated totals
            res.status(200).json({ cart, totalPrice, total });
        } catch (err) {
            console.error("Error fetching cart:", err.message);
            res.status(500).json({ message: "Failed to fetch cart" });
        }
    }


    // Add to Cart
    async store(req, res) {
        try {
            const { userId, productId, quantity } = req.body;

            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ message: "Product not found" });
            }
            let cart = await Cart.findOne({ user: userId });

            if (!cart) {
                cart = await Cart.create({
                    user: userId,
                    items: [{ product: productId, quantity }],
                });
            } else {
                const existingItem = cart.items.find((item) => item.product.toString() === productId);
                if (existingItem) {
                    existingItem.quantity += quantity;
                } else {
                    cart.items.push({ product: productId, quantity });
                }
                await cart.save();
            }
            res.status(201).json({ message: "Product added to cart" });
        } catch (err) {
            console.error("Error adding to cart:", err.message);
            res.status(500).json({ message: "Failed to add product to cart" });
        }
    }

    // Remove from Cart
    async destroy(req, res) {
        try {
            const { userId, productId } = req.body;
            const cart = await Cart.findOne({ user: userId });
            if (!cart) {
                return res.status(404).json({ message: "Cart not found" });
            }
            cart.items = cart.items.filter((item) => item.product.toString() !== productId);
            await cart.save();
            res.status(200).json({ message: "Product removed from cart" });
        } catch (err) {
            console.error("Error removing from cart:", err.message);
            res.status(500).json({ message: "Failed to remove product from cart" });
        }
    }

}

module.exports = CartController;
