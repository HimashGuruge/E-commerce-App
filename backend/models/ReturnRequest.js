import mongoose from "mongoose";

const returnRequestSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        variant: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Variant",
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        reason: {
          type: String,
          enum: [
            "defective",
            "wrong_item",
            "not_as_described",
            "damaged_on_arrival",
            "change_of_mind",
            "other",
          ],
          required: true,
        },
    description: {
      type: String,
      maxlength: 1000,
    },
    },
],
    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "processing",
        "shipped",
        "completed",
        "refunded",
      ],
      default: "pending",
    },
    shippingCostPaidBy: {
      type: String,
      enum: ["store", "customer"],
      default: "customer",
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    restockingFee: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    rejectionReason: {
      type: String,
      maxlength: 500,
    },
    returnLabelUrl: {
      type: String,
    },
    images: [
      {
        url: {
          type: String,
        },
        caption: {
          type: String,
        },
      },
    ],
    exchangeOffered: {
      type: Boolean,
      default: false,
    },
    exchangeProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  },
  { timestamps: true }
);

// Index for efficient queries
returnRequestSchema.index({ order: 1, status: 1 });
returnRequestSchema.index({ user: 1, status: 1 });
returnRequestSchema.index({ createdAt: -1 });

const ReturnRequest = mongoose.model("ReturnRequest", returnRequestSchema);
export default ReturnRequest;
