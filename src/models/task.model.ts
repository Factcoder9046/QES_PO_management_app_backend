import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true, 
  },
  description: {
    type: String,
    required: true, 
  },
  status: {
    type: String,
    enum: ["completed", "pending", "canceled"], 
    default: "pending",
  },
  markStatus:{
    type:Boolean,
    default:false
  },
  taskType: {
    type: String,
    enum: ["installation", "maintenance", "calibration", "repair", "inspection"],
    required: true, 
  },
  assignedUsers: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Changed to array for multiple users
    required: false,
  },
   poId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  taskDeadline: {
    type: Date,
    required: false, // Optional deadline; set to true if mandatory
  },
});

// Add indexes for faster queries
taskSchema.index({ assignedUsers: 1 });
taskSchema.index({ poId: 1 });

const Task = mongoose.model("Task", taskSchema);
export default Task;