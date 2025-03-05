const { getEsewaPaymentHash, verifyEsewaPayment } = require("../helper/esewa");
const { initializeKhaltiPayment, verifyKhaltiPayment } = require("../helper/khalti");
const Order = require('../models/Order');
const Payment = require('../models/Payment');

class PaymentController {
    //for checkout
    async initializeEsewaPayment(order, res) {
        try {
            // Initiate payment with eSewa
            const payment = await getEsewaPaymentHash({
                amount: order.totalAmount,
                transaction_uuid: order._id,
            });

            // Respond with payment details
            res.status(201).json({
                message: 'Order created successfully',
                success: true,
                payment,
                order: order,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    async initializeKhaltiPayment(order, res) {
        try {

            const paymentInitate = await initializeKhaltiPayment({
                amount: order.totalAmount * 100, // amount should be in paisa (Rs * 100)
                purchase_order_id: order._id, // purchase_order_id because we need to verify it later
                purchase_order_name: order._id,
                return_url: `${process.env.BACKEND_URI}/payment/complete-payment2`, // it can be even managed from frontedn
                website_url: `${process.env.FRONTEND_URL}`,
            });
            
            res.status(201).json({
                message: 'Order created successfully',
                success: true,
                payment: paymentInitate,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error,
            });
        }
    }

    async completeKhaltiPayment(req, res) {
        const {
            pidx,
            amount,
            purchase_order_id,
            transaction_id,
        } = req.query;

        try {
            const paymentInfo = await verifyKhaltiPayment(pidx);

            // Check if payment is completed and details match
            if (
                paymentInfo?.status !== "Completed" ||
                paymentInfo.transaction_id !== transaction_id ||
                Number(paymentInfo.total_amount) !== Number(amount)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Incomplete information",
                    paymentInfo,
                });
            }

            // Find the purchased item using the transaction UUID
            const order = await Order.findById(
                purchase_order_id
            );

            if (!order) {
                return res.status(400).send({
                    success: false,
                    message: "Purchased data not found",
                });
            }

            // Update the purchased item payment status to 'paid'
            await Order.findByIdAndUpdate(
                purchase_order_id,
                { $set: { paymentStatus: "Paid" } }
            );

            // Create a new payment record
            const paymentData = await Payment.create({
                pidx,
                transactionId: transaction_id,
                orderId: purchase_order_id,
                amount,
                dataFromVerificationReq: paymentInfo,
                apiQueryFromUser: req.query,
                paymentGateway: "khalti",
                status: "success",
            });

            // Send success response
            // res.json({
            //     success: true,
            //     message: "Payment Successful",
            //     paymentData,
            // });
            // Respond with success message
            return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${order._id}`)
        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false,
                message: "An error occurred",
                error,
            });

        }
    }

    async completePayment(req, res) {
        const { data } = req.query; // Data received from eSewa's redirect

        try {
            // Verify payment with eSewa
            const paymentInfo = await verifyEsewaPayment(data);

            // Find the purchased item using the transaction UUID
            const order = await Order.findById(
                paymentInfo.response.transaction_uuid
            );

            if (!order) {
                return res.status(500).json({
                    success: false,
                    message: "Purchase not found",
                });
            }


            // Create a new payment record in the database
            const paymentData = await Payment.create({
                pidx: paymentInfo.decodedData.transaction_code,
                transactionId: paymentInfo.decodedData.transaction_code,
                orderId: paymentInfo.response.transaction_uuid,
                amount: order.totalAmount,
                dataFromVerificationReq: paymentInfo,
                apiQueryFromUser: req.query,
                paymentGateway: "esewa",
                status: "success",
            });

            // Update the purchased item payment status to 'paid'
            await Order.findByIdAndUpdate(
                paymentInfo.response.transaction_uuid,
                { $set: { paymentStatus: "Paid" } }
            );

            // Respond with success message
            return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${order._id}`)
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "An error occurred during payment verification",
                error: error.message,
            });
        }
    }
}
module.exports = PaymentController