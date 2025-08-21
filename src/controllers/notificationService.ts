/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import User from "../models/user.auth.model.js";
import Order from "../models/order.model.js";
import Permission from "../models/user.permission.model.js";
import PermissionRequest from "../models/permissionRequest.js";
import { Socket } from "socket.io";
import { userSocketMap } from "../app.js";
import Task from "@/models/task.model.js";
// import { sendToKafka } from "./kafka.js";



//// check if user has permission for the action
export const hasPermission = async (
  userId: string,
  resource: string | string[],
  action: string
): Promise<boolean> => {
  const permission = await Permission.findOne({
    userId,
    resource,
    actions: action,
  });


  return !!permission;
};




///// create a notification for the permissionRequest action for the admin
export const createPermissionRequestNotification = async (
  userId: string,
  action: "read" | "write" | "update" | "create",
  description: string,
  io: Socket,
  resource: "users" | "permissions" | "orders" = "orders" // Default to "orders" for this context
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");
    const permissionRequest = new PermissionRequest({
      requester: {
        userId: user._id,
        username: user.username,
      },
      resource,
      action,
      description,
      status: "pending",
    });
    await permissionRequest.save({ session });
    // Notify admins or relevant users (e.g., users with permission to approve requests)
    const adminUsers = await User.find({ role: "admin" })
      .select("_id")
      .session(session); // Adjust based on your user roles
    const recipients = adminUsers.map((admin) => ({
      userId: admin._id,
      isRead: false,
    }));
    const message = `Permission request from ${user.username}: ${description}`;
    const notification = new Notification({
      type: "permission_request",
      message,
      sender: { userId: user._id, username: user.username },
      recipients,
      referenceId: permissionRequest._id,
      referenceModel: "PermissionRequest",
    });


    await notification.save({ session });


    // Emit notification to admin users
    recipients.forEach((recipient) => {
      const socketId = userSocketMap.get(recipient.userId.toString());
      if (socketId) {
        io.to(`user:${recipient.userId}`).emit("notification", {
          id: notification._id,
          type: notification.get("type"),
          message: notification.message,
          sender: notification.sender,
          createdAt: notification.createdAt,
        });
      }
    });


    await session.commitTransaction();
    return permissionRequest;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};



// export const createOrderNotification = async (
//   orderId: string,
//   userId: string,
//   io: Socket, // Use proper Socket type from socket.io
//   userSocketMap: Map<string, string>,
//   action: "create" | "update" | "delete"
// ) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   // Map action to notification type
//   const notificationActionMap = {
//     create: "order_create",
//     update: "order_update",
//     delete: "order_delete",
//   };
//   try {
//     const user = await User.findById(userId).session(session);
//     if (!user) throw new Error("User not found");
//     const order = await Order.findById(orderId).session(session);
//     if (!order) throw new Error("Order not found");
//     const actionsMap = {
//       create: "create",
//       update: "update",
//       delete: "delete",
//     };
//     const actionMessage = actionsMap[action];
//     const hasPer = await hasPermission(userId, "orders", actionMessage);
//     if (!hasPer) {
//       // Map "delete" to "write" for permission request notification
//       const permissionAction =
//         action === "delete"
//           ? "write"
//           : (actionsMap[action] as "create" | "update" | "write" | "read");
//       await createPermissionRequestNotification(
//         userId,
//         permissionAction,
//         `Permission to ${action} order #${order.orderNumber}`,
//         io
//       );
//       throw new Error(`Permission required for ${action} on orders`);
//     }
//     const allUsers = await User.find({}).select("_id").session(session);
//     const recipients = allUsers.map((user) => ({
//       userId: user._id,
//       isRead: false,
//     }));
//     const message = `User ${user.username} ${action}d order #${order.orderNumber}`;
//     const notification = new Notification({
//       type: notificationActionMap[action],
//       message,
//       sender: { userId: user._id, username: user.username },
//       recipients,
//       referenceId: order._id,
//       referenceModel: "Order",
//     });
//     await notification.save({ session });
//     recipients.forEach((recipient) => {
//       const socketId = userSocketMap.get(recipient.userId.toString());
//       if (socketId) {
//         io.to(`user:${recipient.userId}`).emit("notification", {
//           id: notification._id,
//           type: notification.get("type"),
//           message: notification.message,
//           sender: notification.sender,
//           createdAt: notification.createdAt,
//         });
//       }
//     });
//     await session.commitTransaction();
//     return notification;
//   } catch (error) {
//     await session.abortTransaction();
//     throw error;
//   } finally {
//     session.endSession();
//   }
// };

export const createOrderNotification = async (orderId, userId, action) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('User not found');
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error('Order not found');
    const notificationActionMap = {
      create: 'order_create',
      update: 'order_update',
      delete: 'order_delete',
    };
    const message = {
      type: notificationActionMap[action],
      content: `User ${user.username} ${action}d order #${order.orderNumber}`,
      sender: { userId: user._id, username: user.username },
      recipients: (await User.find({}).select('_id').session(session)).map(u => u._id.toString()),
      referenceId: order._id,
      referenceModel: 'Order',
    };
    // await sendToKafka('notifications', message);
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};


export const createTaskNotification = async (
  taskId: string,
  userId: string,
  io: Socket,
  userSocketMap: Map<string, string>,
  action: "create"
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const notificationActionMap = {
    create: "task_create",
  };

  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");
    const task = await (await Task.findById(taskId).session(session)).populate("assignedUsers")
    if (!task) throw new Error("Task not found");
    const recipients = task.assignedUsers.map((assignedUser: any) => ({
      userId: assignedUser._id,
      isRead: false,
    }));
    const message = `User ${user.username} created task: ${task.title}`;
    const notification = new Notification({
      type: notificationActionMap[action],
      message,
      sender: { userId: user._id, username: user.username },
      recipients,
      referenceId: task._id,
      referenceModel: "Task",
    });
    await notification.save({ session });
    recipients.forEach((recipient) => {
      const socketId = userSocketMap.get(recipient.userId.toString());
      if (socketId) {
        io.to(`user:${recipient.userId}`).emit("notification", {
          id: notification._id,
          type: notification.type,
          message: notification.message,
          sender: notification.sender,
          createdAt: notification.createdAt,
        });
      }
    });

    await session.commitTransaction();
    return notification;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};