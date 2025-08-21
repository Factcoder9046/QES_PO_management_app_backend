import mongoose from "mongoose";




const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
       enum: ["order_create", "order_update", "order_delete", "permission_request", "permission_response","task_create"],
      required: true,
    },
    message: { type: String, required: true },
    sender: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      username: { type: String, required: true },
    },
    recipients: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        isRead: { type: Boolean, default: false },
      },
    ],
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "referenceModel",
      required: false,
    },
    referenceModel: {
      type: String,
      enum: ["Order", "Permission", "PermissionRequest","Task"],
      required: false,
    },
  },
  {
    timestamps: true,
    indexes: [
      { key: { "recipients.userId": 1, isRead: 1 } }, // Optimize queries for user notifications
      { key: { createdAt: -1 } }, // Optimize sorting by creation time
    ],
  }
);

export default mongoose.model("Notification", notificationSchema);
