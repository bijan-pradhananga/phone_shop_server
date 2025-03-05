const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    transactionId: { type: String, unique: true, sparse: true }, // Optional for COD
    pidx: { type: String, unique: true, sparse: true }, // Optional for COD
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    amount: { type: Number, required: true },
    dataFromVerificationReq: { type: Object }, // Optional for COD
    apiQueryFromUser: { type: Object }, // Optional for COD
    paymentGateway: {
      type: String,
      enum: ['esewa', 'cash on delivery', 'khalti'],
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "pending", "failed"],
      default: "pending",
    },
    paymentDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Auto-generate transaction ID for COD
paymentSchema.pre("save", function (next) {
  if (this.paymentGateway === "cash on delivery" && !this.transactionId) {
    this.transactionId = `COD-${this._id}`; // Generate unique ID
  }
  next();
});

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
