import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderDate:{type:Date,required:false}, 
    invoiceNumber:{type:String,required:false},
    orderNumber: { type: String, required: true, unique: true },
    clientName: { type: String, required: true },
    companyName: { type: String,required: false },
    gstNumber: { type: String,required: false },
    contact: { type: String, required: false },
    address: { type: String, required: false },
    zipCode: { type: String, required: false },
    products: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0 },
        price: { type: Number, required: false },
        remark: { type: String, required: false },
      },
    ],
    estimatedDispatchDate: { type: Date, required:false },
    generatedBy: {
      username:{type:String,required:false},
      employeeId: { type: String, required: false },
       userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
      },
    },

    orderThrough: {
    type: new mongoose.Schema(
      {
        username: { type: String, required: false },
        employeeId: { type: String, required: false }
      },
      { _id: false }
    ),
    required: false
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




