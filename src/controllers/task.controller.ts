/* eslint-disable @typescript-eslint/no-unused-vars */
import ErrorHandler from "../utils/errorHandler.js";
import { Request, Response } from "express";
import User from "@/models/user.auth.model.js";
import {createTaskNotification } from "./notificationService.js";
import { CustomRequest } from "@/middlewares/check.permission.middleware.js";
import Task from "@/models/task.model.js";


//// create a function to assign the task for the user

// Create task endpoint
// export const createTask = async (req: CustomRequest,res: Response) => {
//   try {
//     const {
//       title,
//       description,
//       taskType,
//       status,
//       taskDeadline,
//       assignedUsers,
//       poId,
//     } = req.body;
//     console.log(req.body)
//     if (assignedUsers?.length) {
//       const users = await User.find({ _id: { $in: assignedUsers } }).lean();
//       if (users.length !== assignedUsers.length) {
//         throw new ErrorHandler(500, "Internal server error");
//       }
//     }
//     // Create new task
//     const newTask = new Task({
//       title,
//       description,
//       taskType,
//       status: status || "pending",
//       taskDeadline: taskDeadline ? new Date(taskDeadline) : null,
//       assignedUsers: assignedUsers || [],
//       poId
//     });
//     const savedTask = await newTask.save();
//     const userId = req.user.id;
//     const userSocketMap: Map<string, string> = req.app.get("userSocketMap");
//     const io = req.app.get("io");
//    await createTaskNotification(savedTask._id.toString(), userId, io, userSocketMap, "create");
//     const populatedTask = await Task.findById(savedTask._id)
//       .lean()
//       .populate("assignedUsers", "username email");

//     return res.status(201).json({
//       message: "Task created successfully",
//       task: populatedTask,
//     });
//   } catch (error) {
//     console.log(error);
//     throw new ErrorHandler(500, "Internal server error");
//   }
// };


interface TaskRequestBody {
  poId: string;
  title: string;
  description: string;
  taskType: string;
  taskDeadline?: string;
  status?: string;
  assignedUsers?: { _id: string; username: string }[];
}

export const createTask = async (req: CustomRequest, res: Response) => {
  try {
    const {
      title,
      description,
      taskType,
      status,
      taskDeadline,
      assignedUsers,
      poId,
    } = req.body as TaskRequestBody;

    console.log(req.body, "Received task data");

    // Validate assignedUsers if provided
    let userIds: string[] = [];
    if (assignedUsers?.length) {
      // Extract unique _id values
      userIds = [...new Set(assignedUsers.map((user) => user._id))];
      // Validate user IDs exist
      const users = await User.find({ _id: { $in: userIds } }).lean();
      if (users.length !== userIds.length) {
        throw new ErrorHandler(400, "One or more assigned user IDs are invalid");
      }
    }

    // Create new task
    const newTask = new Task({
      title,
      description,
      taskType,
      status: status || "pending",
      taskDeadline: taskDeadline ? new Date(taskDeadline) : null,
      assignedUsers: userIds, // Store unique user IDs
      poId,
    });

    const savedTask = await newTask.save();

    // Trigger notification
    const userId = req.user.id;
    const userSocketMap: Map<string, string> = req.app.get("userSocketMap");
    const io = req.app.get("io");
    await createTaskNotification(savedTask._id.toString(), userId, io, userSocketMap, "create");

    // Populate task for response
    const populatedTask = await Task.findById(savedTask._id)
      .lean()
      .populate("assignedUsers", "username email")
      .populate("poId", "orderNumber");

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error("Error creating task:", error);
    if (error instanceof ErrorHandler) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};




// Assign task endpoint
export const assignTask = async (req: Request, res: Response) => {
  try {
    const { taskId, userIds } = req.body;
    const users = await User.find({ _id: { $in: userIds } }).lean();
    if (users.length !== userIds.length) {
      throw new ErrorHandler(404, "One or more users not found");
    }
    const task = await Task.findOneAndUpdate(
      { _id: taskId },
      { assignedUsers: userIds },
      { new: true, lean: true }
    ).populate("assignedUsers", "username email");
    if (!task) {
      throw new ErrorHandler(404, "Task not found");
    }
    return res.status(200).json({
      message: "Task assigned successfully",
      task,
    });
  } catch (error) {
    console.log(error);
    throw new ErrorHandler(500, "Internal server error");
  }
};

//// create api for update update status of the status
export const updateStatusTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { markStatus } = req.body;
    console.log('status task ',markStatus)
    console.log(taskId,"jjdhdh  taskId")

    // Validate taskId
    if (!taskId || !taskId) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }
    // Find and update the task
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { markStatus },
      { new: true, runValidators: true } // Return updated document and validate
    );

    if (!updatedTask) {
       throw new ErrorHandler(500, "task not found");
    }

    return res.status(200).json({
      success: true,
      message: "Task status updated successfully",
      data: updatedTask,
    });

  } catch (error) {
    console.error("Error updating task status:", error);
    throw new ErrorHandler(500, "Internal server error");;
  }
};


export const getTasksByPO = async (req: Request, res: Response) => {
  try {
    const { poId } = req.params;
    console.log(poId, "check POid");
    if (!poId) {
      throw new ErrorHandler(400, "Invalid purchase order ID");
    }
    const tasks = await Task.find({ poId: poId }) // Query by poId field, not _id
      .populate("assignedUsers", "username email")
      .lean();
    return res.status(200).json({
      success: true,
      message: "Tasks retrieved successfully",
      data: tasks,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    if (error instanceof ErrorHandler) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    throw new ErrorHandler(500, "Internal server error");
  }
};