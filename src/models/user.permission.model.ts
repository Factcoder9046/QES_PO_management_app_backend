import mongoose from "mongoose"


const permissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    resource: {
      type: String,
      required: [true, "Resource is required"],
      enum: ["users", "permissions", "orders"],
      trim: true,
    },
    actions: {
      type: [String],
      required: [true, "Actions are required"],
     enum: ["readOnly", "write", "update", "create", "delete"],
      validate: {
        validator: (arr: string[]) => arr.length > 0,
        message: "At least one action is required",
      },
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);


const Permission = mongoose.model("Permission", permissionSchema);


export default Permission





