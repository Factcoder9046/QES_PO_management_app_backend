
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from "express";
import Order from "../models/order.model.js";
import mongoose, { Types } from "mongoose";
import { FilterQuery } from "mongoose";
import ErrorHandler from "../utils/errorHandler.js";
// import User from "../models/user.auth.model";
import { createOrderNotification } from "./notificationService.js";
import { CustomRequest } from "../middlewares/check.permission.middleware.js";


// Function to generate orderNumber in format "01/QESPL/JUN/25"
export const createOrderNumber = async (
  date: Date = new Date()
): Promise<string> => {
  const year = date.getFullYear();
  const monthName = date
    .toLocaleString("default", { month: "short" })
    .toUpperCase();
  const yearShort = year.toString().slice(-2);


  // Get the next sequence number for the current month
  const prefix = `QESPL/${monthName}/${yearShort}`;
  const regex = new RegExp(`^\\d{2}/${prefix}$`);
  const lastOrder = await Order.findOne({ orderNumber: regex })
    .sort({ orderNumber: -1 })
    .select("orderNumber")
    .lean();
  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderNumber.split("/")[0], 10);
    sequence = lastSequence + 1;
  }


  const orderNumber = `${String(sequence).padStart(2, "0")}/${prefix}`;
  return orderNumber;
};


export const orderCreate = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      orderNumber: providedOrderNumber,
      clientName,
      companyName,
      gstNumber,
      contact,
      address,
      zipCode,
      products,
      estimatedDispatchDate,
      generatedBy,
      orderThrough,
    } = req.body
    if (
      !clientName ||
      // !contact ||
      // !address ||
      // !zipCode ||
      // !products ||
      !generatedBy ||
      // !orderThrough ||
      !req.user ||
      !req.user.id ||
      !req.user.username
    ) {
      console.log(req.body,"chek user......")
      throw new ErrorHandler(400, "Missing or invalid required fields");
    }


    // Validate products array
    if (!Array.isArray(products) || products.length === 0) {
      throw new ErrorHandler(
        400,
        "Products array is required and cannot be empty"
      );
    }
    for (const product of products) {
      if (
        !product.name ||
        typeof product.price !== "number" ||
        typeof product.quantity !== "number" ||
        product.quantity < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Each product must have a name, a valid price (number), and a valid quantity (non-negative number)",
        });
      }
    }
    // Generate order number if not provided
    const orderNumber = providedOrderNumber || (await createOrderNumber());
    // Create and save the order
    const newOrder = new Order({
      orderNumber,
      clientName,
      companyName,
      gstNumber,
      contact,
      address,
      zipCode,
      products,
      estimatedDispatchDate,
      generatedBy: {
        username: generatedBy.username,
        employeeId: generatedBy.employeeId, // From request body
      },
      orderThrough: {
        username: orderThrough.username,
        employeeId: orderThrough.employeeId, // From request body
      },
     
    });
    const savedOrder = await newOrder.save();
    // Notification logic
    const userSocketMap: Map<string, string> = req.app.get("userSocketMap");
    const userId = req.user.id;
    const io = req.app.get("io");
    await createOrderNotification(
      savedOrder._id.toString(),
      userId,
      io,
      userSocketMap,
      "create"
    );
    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: savedOrder,
    });
  } catch (error) {
    console.error("Error in orderCreate:", error);
    next(error);
  }
};


export const getOrderDetailsById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) {
      throw new ErrorHandler(400, "Order not found");
    }
    return res.status(200).json({
      success: true,
      message: "Order details retrieved successfully",
      data: order,
    });
  } catch (error: unknown) {
    if (error instanceof mongoose.Error.CastError) {
      throw new ErrorHandler(400, "Invalid Order ID format");
    }
    next(error);
  }
};


export const getAllOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    if (page < 1) {
      throw new ErrorHandler(400, "Page number must be a positive integer");
    }
    const skip = (page - 1) * limit;
    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);
    const orders = await Order.find().skip(skip).sort({ createdAt: -1 });
    if (page > totalPages && totalOrders > 0) {
      throw new ErrorHandler(
        400,
        `Page ${page} exceeds total pages (${totalPages})`
      );
    }
    return res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      data: {
        orders,
        pagination: {
          currentPage: page,
          totalPages,
          totalOrders,
          limit,
        },
      },
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};


///// create function for the softdelete


// export const deleteOrder = async (req: CustomRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     console.log(req.params,"nnef")
//     const { isSoftdelete = false, permanent = false } = req.body;
//     if (!req.user) {
//       throw new ErrorHandler(401, "Unauthorized: User not found");
//     }
//     const order = await Order.findById(id);
//     if (!order) {
//       throw new ErrorHandler(404, "Order not found");
//     }
//     if (!isSoftdelete && !permanent) {
//       order.isdeleted = true;
//       order.deletedAt = new Date();
//       await order.save();
//       return res.status(200).json({
//         success: true,
//         message: "Order move to Recycle Bin Successfully",
//       });
//     } else if (permanent) {
//       await Order.deleteOne({ _id: id });
//       return res.status(200).json({
//         success: true,
//         message: "Order permanently deleted successfully",
//       });
//     } else {
//       throw new ErrorHandler(400, "Invalid deletion request");
//     }
//   } catch (error) {
//     console.log(error);
//     throw new ErrorHandler(500, "Internal server error");
//   }
// };


//// create a funcations for the restoreOrder
// export const restoreOrder = async (req: CustomRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { ids } = req.body;
//     if (!req.user) {
//       throw new ErrorHandler(401, "Unauthorized: User not found");
//     }
//     // Handle single order restore
//     if (id) {
//       const order = await Order.findById(id);
//       if (!order) {
//         throw new ErrorHandler(404, "Order not found");
//       }
//       if (!order.isdeleted) {
//         throw new ErrorHandler(400, "Order is not in Recycle Bin");
//       }
//       order.isdeleted = false;
//       order.deletedAt = null;
//       await order.save();
//       return res.status(200).json({
//         success: true,
//         message: "Order restored successfully",
//       });
//     }
//     // Handle multiple order restore
//     if (ids && Array.isArray(ids) && ids.length > 0) {
//       // Verify all orders exist and are in recycle bin
//       const orders = await Order.find({
//         _id: { $in: ids },
//         isdeleted: true,
//       });
//       if (orders.length !== ids.length) {
//         throw new ErrorHandler(
//           404,
//           "One or more orders not found or not in Recycle Bin"
//         );
//       }
//       // Restore orders
//       const result = await Order.updateMany(
//         { _id: { $in: ids }, isdeleted: true },
//         { $set: { isdeleted: false, deletedAt: null } }
//       );
//       if (result.modifiedCount === 0) {
//         throw new ErrorHandler(500, "Failed to restore orders");
//       }
//       if (result.modifiedCount === 0) {
//         throw new ErrorHandler(500, "Failed to restore orders");
//       }
//       return res.status(200).json({
//         success: true,
//         message: `${result.modifiedCount} order(s) restored successfully`,
//       });
//     }
//   } catch (error) {
//     console.error(error);
//     throw new ErrorHandler(500, "Internal server error");
//   }
// };


//// create funcation for the get order form the recycleBin
// export const getRecycleBinOrders = async (
//   req: CustomRequest,
//   res: Response
// ) => {
//   try {
//     if (!req.user) {
//       throw new ErrorHandler(401, "Unauthorized: User not found");
//     }
//     const orders = await Order.find({
//       isdeleted: true,
//     });
//     if (orders.length === 0) {
//       return res.status(200).json({
//         success: true,
//         message: "No orders found in Recycle Bin",
//         data: [],
//       });
//     }
//     return res.status(200).json({
//       success: true,
//       data: orders,
//     });
//   } catch (error) {
//     if (error instanceof ErrorHandler) {
//       throw error;
//     }
//     throw new ErrorHandler(500, "Internal server error");
//   }
// };


///// create a function update order details by ID
export const updateOrderDetailsById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      orderNumber,
      clientName,
      companyName,
      gstNumber,
      contact,
      address,
      zipCode,
      products,
      estimatedDispatchDate,
      generatedBy,
      formGeneratedBy,
      orderCategory,
    } = req.body;
    // Validate required fields
    if (
      !clientName ||
      !contact ||
      !address ||
      !zipCode ||
      !products ||
      !generatedBy ||
      !generatedBy.name ||
      !generatedBy.employeeId
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }
    // Validate products array
    if (!Array.isArray(products) || products.length === 0) {
      throw new ErrorHandler(
        400,
        "Products array is required and cannot be empty"
      );
    }
    for (const product of products) {
      if (
        !product.name ||
        typeof product.price !== "number" ||
        typeof product.quantity !== "number" ||
        product.quantity < 0
      ) {
        throw new ErrorHandler(
          400,
          "Each product must have a name, a valid price (number), and a valid quantity (non-negative number)"
        );
      }
    }
    // Validate GST number if provided
    if (gstNumber) {
      const gstRegex =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(gstNumber)) {
        throw new ErrorHandler(
          400,
          "GST number must be exactly 15 characters and follow the valid Indian GST format (e.g., 27AABCU9603R1ZM)"
        );
      }
    }
    // Update the order
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        orderNumber,
        clientName,
        companyName,
        gstNumber,
        contact,
        address,
        zipCode,
        products,
        estimatedDispatchDate,
        generatedBy,
        formGeneratedBy,
        orderCategory,
      },
      { new: true, runValidators: true } // Return the updated document and run schema validators
    );
    if (!updatedOrder) {
      throw new ErrorHandler(400, "Order not found");
    }
    ///// create a notification for the updated order
    const userSocketMap: Map<string, string> = req.app.get("userSocketMap");
    const userId = (req as any).user?.id;
    const io = req.app.get("io");
    if (updatedOrder) {
      await createOrderNotification(
        updatedOrder._id.toString(),
        userId,
        io,
        userSocketMap,
        "update"
      );
    }


    // Return the updated order
    return res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};


/// create funcation for the searching base on this parameters like clientName, companyName,  products.name, generatedBy.name
export const searchOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { query, startDate, endDate, status } = req.query;
    console.log(startDate, endDate, "jhgdsgdsf");
    const searchQuery: FilterQuery<typeof Order> = {};
    if (query && typeof query === "string") {
      const regex = { $regex: new RegExp(query, "i") }; // Case-insensitive regex
      searchQuery.$or = [
        { clientName: regex },
        { companyName: regex },
        { "products.name": regex },
        { "generatedBy.name": regex },
        { orderNumber: regex },
      ];
    }
    // Filter by date range (createdAt)
    if (startDate || endDate) {
      searchQuery.createdAt = {};
      if (startDate && typeof startDate === "string") {
        searchQuery.createdAt.$gte = new Date(startDate).setHours(0, 0, 0, 0);
      }
      if (endDate && typeof endDate === "string") {
        searchQuery.createdAt.$lte = new Date(endDate).setHours(23, 59, 59);
      }
    }
    if (endDate && typeof endDate === "string") {
      searchQuery.createdAt = {
        ...searchQuery.createdAt,
        $lte: new Date(endDate).setHours(23, 59, 59, 999), // End of the day
      };
    }
    // Filter by status
    if (status && typeof status === "string") {
      searchQuery.status = status;
    }
    // Exclude deleted orders
    // searchQuery.isdeleted = false;
    const orders = await Order.find(searchQuery)
      .select(
        "orderNumber clientName companyName products generatedBy status createdAt"
      )
      .sort({ createdAt: -1 });
    console.log(orders, "jdsfusf");
    return res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};



export const deleteOrder = async (req: CustomRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log(req.params, "nnef");
    const { isSoftdelete = false, permanent = false } = req.body;
    if (!req.user) {
      throw new ErrorHandler(401, "Unauthorized: User not found");
    }
    const order = await Order.findById(id);
    if (!order) {
      throw new ErrorHandler(404, "Order not found");
    }
    if (!isSoftdelete && !permanent) {
      order.isdeleted = true;
      order.deletedAt = new Date();
      await order.save();
      return res.status(200).json({
        success: true,
        message: "Order move to Recycle Bin Successfully",
      });
    } else if (permanent) {
      await Order.deleteOne({ _id: id });
      return res.status(200).json({
        success: true,
        message: "Order permanently deleted successfully",
      });
    } else {
      throw new ErrorHandler(400, "Invalid deletion request");
    }
  } catch (error) {
    console.log(error);
    throw new ErrorHandler(500, "Internal server error");
  }
};


//// create a funcations for the restoreOrder
export const restoreOrder = async (req: CustomRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log(req.params, "id check order restore id");
    const { ids } = req.body;
    if (!req.user) {
      throw new ErrorHandler(401, "Unauthorized: User not found");
    }
    // Handle single order restore
    if (id) {
      const order = await Order.findById(id);
      if (!order) {
        throw new ErrorHandler(404, "Order not found");
      }
      if (!order.isdeleted) {
        throw new ErrorHandler(400, "Order is not in Recycle Bin");
      }
      order.isdeleted = false;
      order.deletedAt = null;
      await order.save();
      return res.status(200).json({
        success: true,
        message: "Order restored successfully",
      });
    }
    // Handle multiple order restore
    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Verify all orders exist and are in recycle bin
      const orders = await Order.find({
        _id: { $in: ids },
        isdeleted: true,
      });
      if (orders.length !== ids.length) {
        throw new ErrorHandler(
          404,
          "One or more orders not found or not in Recycle Bin"
        );
      }
      // Restore orders
      const result = await Order.updateMany(
        { _id: { $in: ids }, isdeleted: true },
        { $set: { isdeleted: false, deletedAt: null } }
      );
      if (result.modifiedCount === 0) {
        throw new ErrorHandler(500, "Failed to restore orders");
      }
      if (result.modifiedCount === 0) {
        throw new ErrorHandler(500, "Failed to restore orders");
      }
      return res.status(200).json({
        success: true,
        message: `${result.modifiedCount} order(s) restored successfully`,
      });
    }
  } catch (error) {
    console.error(error);
    throw new ErrorHandler(500, "Internal server error");
  }
};


// Adjust the import path as needed


export const deleteOrderPermanently = async (
  req: CustomRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { ids } = req.body;
    // Check if user is authenticated
    if (!req.user) {
      throw new ErrorHandler(401, "Unauthorized: User not found");
    }
    // Handle single order deletion
    if (id) {
      // Validate ObjectId
      if (!Types.ObjectId.isValid(id)) {
        throw new ErrorHandler(400, "Invalid order ID");
      }
      const order = await Order.findById(id);
      if (!order) {
        throw new ErrorHandler(404, "Order not found");
      }
      if (!order.isdeleted) {
        throw new ErrorHandler(404, "Order is not in the recycle bin");
      }
      await Order.deleteOne({ _id: id });
      return res.status(200).json({
        success: true,
        message: "Order permanently deleted successfully",
      });
    }


    // Handle multiple order deletion
    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Validate all IDs
      if (!ids.every((id) => Types.ObjectId.isValid(id))) {
        throw new ErrorHandler(400, "One or more invalid order IDs");
      }


      const orders = await Order.find({
        _id: { $in: ids },
        isdeleted: true,
      });


      if (orders.length === 0) {
        throw new ErrorHandler(404, "No orders found in the recycle bin");
      }


      const result = await Order.deleteMany({ _id: { $in: ids } });
      if (result.deletedCount === 0) {
        throw new ErrorHandler(500, "Failed to delete orders permanently");
      }
      return res.status(200).json({
        success: true,
        message: `${result.deletedCount} order(s) permanently deleted successfully`,
      });
    }
    throw new ErrorHandler(400, "No order ID(s) provided");
  } catch (error) {
    console.error("Error in deleteOrderPermanently:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof ErrorHandler ? error.message : "Internal server error",
    });
  }
};


//// create funcation for the get order form the recycleBin
export const getRecycleBinOrders = async (
  req: CustomRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      throw new ErrorHandler(401, "Unauthorized: User not found");
    }
    const orders = await Order.find({
      isdeleted: true,
    });
    if (orders.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No orders found in Recycle Bin",
        data: [],
      });
    }
    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    if (error instanceof ErrorHandler) {
      throw error;
    }
    throw new ErrorHandler(500, "Internal server error");
  }
};


