const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true,
            },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
        },
    ],
    status: {
        type: String,
        enum: ['Pending', 'Delivered', 'Cancelled'],
        default: 'Pending',
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    billingInfo: {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        address: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            country: { type: String, required: true },
        },
        paymentMethod: {
            type: String,
            enum: ['Esewa', 'Cash on Delivery', 'Khalti'],
            required: true,
            default: 'Cash on Delivery'
        },
    },
    paymentStatus: {
        type: String,
        enum: ['Paid', 'Pending', 'Failed'],
        default: 'Pending',
    },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
