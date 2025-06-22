const mongoose = require("mongoose");
const Payment = require('../models/Payment');
const { getEsewaPaymentHash, verifyEsewaPayment } = require("../helper/esewa");
const { initializeKhaltiPayment, verifyKhaltiPayment } = require("../helper/khalti");
const Order = require('../models/Order');

class PaymentController {
    // Existing methods (abridged for brevity)
    async initializeEsewaPayment(order, res) {
        try {
            const payment = await getEsewaPaymentHash({
                amount: order.totalAmount,
                transaction_uuid: order._id,
            });
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
                amount: order.totalAmount * 100,
                purchase_order_id: order._id,
                purchase_order_name: order._id,
                return_url: `${process.env.BACKEND_URI}/payment/complete-payment2`,
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
        const { pidx, amount, purchase_order_id, transaction_id } = req.query;
        try {
            const paymentInfo = await verifyKhaltiPayment(pidx);
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
            const order = await Order.findById(purchase_order_id);
            if (!order) {
                return res.status(400).send({
                    success: false,
                    message: "Purchased data not found",
                });
            }
            await Order.findByIdAndUpdate(purchase_order_id, { $set: { paymentStatus: "Paid" } });
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
            return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${order._id}`);
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
        const { data } = req.query;
        try {
            const paymentInfo = await verifyEsewaPayment(data);
            const order = await Order.findById(paymentInfo.response.transaction_uuid);
            if (!order) {
                return res.status(500).json({
                    success: false,
                    message: "Purchase not found",
                });
            }
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
            await Order.findByIdAndUpdate(paymentInfo.response.transaction_uuid, { $set: { paymentStatus: "Paid" } });
            return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${order._id}`);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "An error occurred during payment verification",
                error: error.message,
            });
        }
    }

    async getPaymentStats(req, res) {
        try {
            const stats = await Payment.aggregate([
                {
                    $group: {
                        _id: { status: "$status", paymentGateway: "$paymentGateway" },
                        count: { $sum: 1 },
                        totalAmount: { $sum: "$amount" }
                    }
                },
                {
                    $group: {
                        _id: "$_id.status",
                        gateways: {
                            $push: { gateway: "$_id.paymentGateway", count: "$count", totalAmount: "$totalAmount" }
                        },
                        totalCount: { $sum: "$count" }
                    }
                },
                { $project: { status: "$_id", gateways: 1, totalCount: 1, _id: 0 } }
            ]);

            const chartData = {
                labels: ['esewa', 'khalti', 'cash on delivery'],
                datasets: [
                    { label: 'Success', data: Array(3).fill(0), backgroundColor: 'rgba(75, 192, 192, 0.6)' },
                    { label: 'Pending', data: Array(3).fill(0), backgroundColor: 'rgba(255, 206, 86, 0.6)' },
                    { label: 'Failed', data: Array(3).fill(0), backgroundColor: 'rgba(255, 99, 132, 0.6)' }
                ]
            };

            stats.forEach(stat => {
                const statusIndex = { 'success': 0, 'pending': 1, 'failed': 2 }[stat.status];
                stat.gateways.forEach(gateway => {
                    const gatewayIndex = chartData.labels.indexOf(gateway.gateway);
                    if (gatewayIndex !== -1) {
                        chartData.datasets[statusIndex].data[gatewayIndex] = gateway.count;
                    }
                });
            });

            res.status(200).json({
                success: true,
                chartData: {
                    ...chartData,
                    options: {
                        responsive: true,
                        plugins: { legend: { position: 'top' }, title: { display: true, text: 'Payment Distribution by Status and Gateway' } },
                        scales: { y: { beginAtZero: true, title: { display: true, text: 'Number of Payments' } }, x: { title: { display: true, text: 'Payment Gateway' } } }
                    }
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Error fetching payment statistics",
                error: error.message
            });
        }
    }

    async getPaymentsByDate(req, res) {
        try {
            const { groupBy = 'month' } = req.query; // Default to grouping by month
            let groupFormat, dateFormat;

            switch (groupBy) {
                case 'day':
                    groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } };
                    dateFormat = '%Y-%m-%d';
                    break;
                case 'year':
                    groupFormat = { $dateToString: { format: '%Y', date: '$paymentDate' } };
                    dateFormat = '%Y';
                    break;
                case 'month':
                default:
                    groupFormat = { $dateToString: { format: '%Y-%m', date: '$paymentDate' } };
                    dateFormat = '%Y-%m';
                    break;
            }

            const payments = await Payment.aggregate([
                {
                    $match: { status: 'success' } // Only include successful payments
                },
                {
                    $group: {
                        _id: groupFormat,
                        totalAmount: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { _id: 1 } // Sort by date ascending
                },
                {
                    $project: {
                        date: '$_id',
                        totalAmount: 1,
                        count: 1,
                        _id: 0
                    }
                }
            ]);

            // Format data for Chart.js bar chart
            const chartData = {
                labels: payments.map(p => p.date),
                datasets: [
                    {
                        label: 'Total Payment Amount',
                        data: payments.map(p => p.totalAmount),
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }
                ]
            };

            res.status(200).json({
                success: true,
                chartData: {
                    ...chartData,
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'top' },
                            title: {
                                display: true,
                                text: `Payments by ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}`
                            }
                        },
                        scales: {
                            y: { beginAtZero: true, title: { display: true, text: 'Total Amount' } },
                            x: { title: { display: true, text: groupBy.charAt(0).toUpperCase() + groupBy.slice(1) } }
                        }
                    }
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Error fetching payments by date",
                error: error.message
            });
        }
    }
}

module.exports = PaymentController;