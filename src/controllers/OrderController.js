// controllers/OrderController.js
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const PController = require('../controllers/PaymentController');
const pInstance = new PController();

class OrderController {

    // View all orders for a user
    async index(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query; // Default to page 1, 10 items per page
            const pageNumber = parseInt(page, 10);
            const limitNumber = parseInt(limit, 10);

            // Calculate the starting index for the query
            const skip = (pageNumber - 1) * limitNumber;

            // Fetch orders with pagination
            const orders = await Order.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNumber);

            // Count the total number of orders for pagination metadata
            const total = await Order.countDocuments();

            // Respond with paginated orders and metadata
            res.status(200).json({
                orders,
                currentPage: pageNumber,
                totalPages: Math.ceil(total / limitNumber),
                total,
            });
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch orders', error });
        }
    }



    async createOrder(req, res) {
        try {
            const { userId, billingInfo } = req.body; // Extract userId and billingInfo from request body
    
            // Fetch the user's cart
            const cart = await Cart.findOne({ user: userId });
            if (!cart) return res.status(404).json({ message: 'Cart not found' });
    
            const items = cart.items;
            if (items.length === 0) return res.status(404).json({ message: 'No products in cart' });
    
            let totalAmount = 0;
            const orderItems = [];
    
            // Calculate total amount, prepare order items, and check product quantity
            for (const item of items) {
                const product = await Product.findById(item.product);
                if (!product) {
                    return res.status(400).json({ message: `Product with id ${item.product} not found` });
                }
                if (product.stock < item.quantity) {
                    return res.status(400).json({
                        message: `Not enough stock for product: ${product.name}. Available: ${product.stock}`,
                    });
                }
    
                const price = product.price;
                totalAmount += price * item.quantity;
                orderItems.push({
                    product: product._id,
                    quantity: item.quantity,
                    price,
                });
    
                // Decrease product stock
                product.stock -= item.quantity;
                await product.save();
            }
    
            // Create a new order
            const newOrder = new Order({
                user: userId,
                items: orderItems,
                status: 'Pending', // Initial status
                totalAmount,
                billingInfo,
            });
    
            // Save the order
            await newOrder.save();
    
            // clear the cart after creating the order
            await Cart.deleteOne({ user: userId });
    
            // Handle payment
            if (billingInfo.paymentMethod === 'Cash on Delivery') {
                // Record the payment for COD
                const payment = new Payment({
                    orderId: newOrder._id,
                    amount: totalAmount,
                    paymentGateway: 'cash on delivery',
                    status: 'pending', // Payment pending until cash is received
                });
                await payment.save();
    
                return res.status(201).json({ 
                    message: 'Order created successfully with Cash on Delivery',
                    order: newOrder,
                    payment,
                });
            }
    

            // if (billingInfo.paymentMethod === 'Esewa') {
            //     return pInstance.initializeEsewaPayment(newOrder, res); // Pass the order to payment initialization
            // }
            // if (billingInfo.paymentMethod === 'Khalti') {
            //     return pInstance.initializeKhaltiPayment(newOrder, res);
            // }
    
            res.status(400).json({ message: 'Invalid payment method' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to create order', error });
        }
    }
    

    // View all orders for a user use post
    async viewOrders(req, res) {
        try {
            const { userId } = req.body; // Get user ID from authenticated session
            const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
            res.status(200).json({ orders });
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch orders', error });
        }
    }

    // View details of a specific order
    async viewOrderDetails(req, res) {
        try {
            const orderId = req.params.id;
            const order = await Order.findById(orderId).populate('items.product').sort({ createdAt: -1 });
            if (!order) return res.status(404).json({ message: 'Order not found' });
            res.status(200).json({ order });
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch order details', error });
        }
    }

    //search order
    async search(req, res) {
        try {
            const { q } = req.query; // Assume `query` contains the search string
            if (!q) {
                return res.status(400).json({ message: "Query parameter is required." });
            }

            // Convert _id to string and use $expr for partial match
            const orders = await Order.find({
                $expr: {
                    $regexMatch: {
                        input: { $toString: "$_id" },
                        regex: q, // Query string as regex
                        options: "i", // Case-insensitive
                    },
                },
            }).sort({ createdAt: -1 });

            res.status(200).json({ orders });
        } catch (error) {
            res.status(500).json({ message: "Failed to search orders", error });
        }
    }


    // Confirm an order
    async confirmOrder(req, res) {
        try {
            const orderId = req.params.id;
            const order = await Order.findById(orderId);
            if (!order) return res.status(404).json({ message: 'Order not found' });

            if (order.status === 'Cancelled') {
                return res.status(400).json({ message: 'Cancelled orders cannot be confirmed' });
            }
            if (order.status === 'Delivered') {
                return res.status(400).json({ message: 'Order has already been delivered.' });
            }

            order.status = 'Delivered';
            order.paymentStatus = 'Paid';
            order.updatedAt = Date.now();
            await order.save();

            res.status(200).json({ message: 'Order confirmed', order });
        } catch (error) {
            res.status(500).json({ message: 'Failed to confirm order', error });
        }
    }

    async cancelOrder(req, res) {
        try {
            const orderId = req.params.id;

            // Fetch the order
            const order = await Order.findById(orderId).populate('items.product');
            if (!order) return res.status(404).json({ message: 'Order not found' });

            if (order.status === 'Cancelled') {
                return res.status(400).json({ message: 'Order is already cancelled.' });
            }
            if (order.status === 'Delivered') {
                return res.status(400).json({ message: 'Order has already been delivered.' });
            }
            // Increase product quantities back
            for (const item of order.items) {
                const product = await Product.findById(item.product._id);
                if (product) {
                    product.stock += item.quantity;
                    await product.save();
                }
            }

            order.status = 'Cancelled';
            order.paymentStatus = 'Failed';
            await order.save();

            res.status(200).json({ message: 'Order cancelled successfully', order });
        } catch (error) {
            res.status(500).json({ message: 'Failed to cancel order', error });
        }
    }

}

module.exports = OrderController;
