import mongoose from "mongoose";

const permissionRequestSchema = new mongoose.Schema(
  {
    requester: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Requester user ID is required"],
        index: true,
      },
      username: {
        type: String,
        required: [true, "Requester username is required"],
        trim: true,
      },
    },
    resource: {
      type: String,
      required: [true, "Resource is required"],
      enum: ["users", "permissions", "orders"],
      trim: true,
    },
    action: {
      type: String,
      required: [true, "Action is required"],
      enum: ["readOnly",  "update", "create", "delete"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected",'Accepted'],
      default: "pending",
    },
    respondedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      username: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
    indexes: [
      { key: { "requester.userId": 1 } }, // Optimize queries by requester
      { key: { status: 1 } }, // Optimize queries by status
    ],
  }
);

const PermissionRequest = mongoose.model("PermissionRequest", permissionRequestSchema);

export default PermissionRequest;