import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    clientName: { type: String, required: true },
    companyName: { type: String },
    gstNumber: { type: String },
    contact: { type: String, required: true },
    address: { type: String, required: true },
    zipCode: { type: String, required: true },
    products: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 0 },
        remark: { type: String, required: false },
      },
    ],
    estimatedDispatchDate: { type: Date },
    generatedBy: {
      user: {
        username: { type: String, required: true },
      },
      employeeId: { type: String, required: true },
    },
    orderThrougth: { type: String },
    department: { type: String, required: true },
    createdBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      username: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "delayed", "rejected"],
      default: "pending",
    },
    assignedToUser: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
      },
      department: {
        type: String,
        enum: ["sales", "production", "Accounts", "R&D"],
        required: false,
      },
    },
    isdeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
