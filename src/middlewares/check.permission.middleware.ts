

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.auth.model.js"; // Adjust path as per your project structure
import Permission from "../models/user.permission.model.js"; // Adjust path as per your project structure
import { config } from "dotenv";
import { createPermissionRequestNotification } from "../controllers/notificationService.js"; // Ensure this alias is configured in tsconfig.json
import PermissionRequest from "../models/permissionRequest.js"; // Adjust path as per your project structure


// Assuming you have a custom ErrorHandler class for consistent error responses
// If not, you might need to remove its usage or define a simple one.
// import ErrorHandler from "../utils/errorHandler"; // Uncomment if you have this utility


config(); // Load environment variables from .env file


// Extend Express Request interface to include the 'user' property
export  interface CustomRequest extends Request {
  user?: {
    id: string;
    userType: string;
    username: string; // Added username for consistency
    // isVerified: boolean;
    permissions: { resource: string; actions: string[] }[];
  };
  // Adding types for socket.io if they are attached to req.app
  // app: Express.Application & {
  //   get(name: 'io'): any; // Replace 'any' with actual Socket.IO Server type if available
  //   get(name: 'userSocketMap'): Map<string, string>; // Replace 'any' with actual Map type if available
  // };
}


// Define the structure of your JWT payload
interface CustomJwtPayload extends jwt.JwtPayload {
  id: string; // The user ID stored in your JWT payload
  email: string;
  userType: string;
  iat: number;
  exp: number;
  // If you store permissions directly in the token, include them here:
  permissions?: { resource: string; actions: string[] }[];
}


// Define allowed user types for restrictTo middleware
export type UserType = "admin" | "subadmin" | "user"; // Matches your schema's enum


// Middleware to check for specific resource permissions
export const requirePermission = (resource: string, action: string) => {
  return async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      let token: string | undefined;


      // 1. Prioritize extracting token from Authorization header (Bearer token)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1]; // Extract the token string after "Bearer "
      }


      // 2. Fallback: Check for token in cookie if not found in Authorization header
      //    This is for compatibility if some parts of your app still rely on cookies.
      //    If your frontend consistently sends via Authorization header, you can remove this block.
      if (!token && req.headers.cookie) {
        // Look for "jwt=" in the cookie string and extract its value
        const jwtCookie = req.headers.cookie.split('; ').find(row => row.startsWith('jwt='));
        if (jwtCookie) {
            token = jwtCookie.split('=')[1];
        }
      }


      // If no token is found after checking both sources
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Authentication token missing.", // More specific message
        });
      }


      // Verify JWT token using the secret from environment variables
      if (!process.env.JWT_SECRET) {
        // This should ideally be caught during app startup, but good for safety
        throw new Error("JWT_SECRET is not defined in environment variables.");
      }
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      ) as CustomJwtPayload;


      // Fetch user details from the database using the ID from the decoded token
      const user = await User.findById(decoded.id)
        .select("userType Isverified username") // Select necessary fields
        .lean(); // Use .lean() for faster queries if you don't need Mongoose document methods


      // If user not found (e.g., deleted user, invalid ID in token)
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User not found for provided token.",
        });
      }


      // Fetch user-specific permissions from the database
      const permissions = await Permission.find({ userId: decoded.id }).lean();


      // Attach user and permissions data to the request object for subsequent middlewares/controllers
      req.user = {
        id: user._id.toString(), // Convert ObjectId to string
        userType: user.userType,
        username: user.username,
        // isVerified: user.isVerified, // Assuming Isverified is the correct field name in your User model
        permissions: permissions.map((perm) => ({
          resource: perm.resource,
          actions: perm.actions,
        })),
      };


      // Check if the user has the required action for the specified resource
      const userPermissions = req.user.permissions || [];
      const resourcePermissions = userPermissions.find(
        (perm) => perm.resource === resource
      );


      if (
        !resourcePermissions ||
        !resourcePermissions.actions.includes(action)
      ) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: You do not have '${action}' permission on '${resource}'.`,
        });
      }


      next(); // Proceed to the next middleware or route handler
    } catch (error: any) {
      console.error("Authentication/Permission error in requirePermission:", error);


      // Handle specific JWT errors for more informative responses
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Invalid authentication token.",
        });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Authentication token expired.",
        });
      }


      // Generic error for unexpected issues during authentication or permission check
      return res.status(500).json({
        success: false,
        message: "Internal server error during authentication/permission check.",
        error: error.message,
      });
    }
  };
};


// Middleware to check if user is authenticated (without specific permissions)
export const authenticateUser = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;


    // 1. Prioritize extracting token from Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }


    // 2. Fallback: Check for token in cookie if not found in Authorization header
    if (!token && req.headers.cookie) {
        const jwtCookie = req.headers.cookie.split('; ').find(row => row.startsWith('jwt='));
        if (jwtCookie) {
            token = jwtCookie.split('=')[1];
        }
    }


    // If no token is found after checking both sources
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No authentication token provided.",
      });
    }


    // Verify JWT token
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined.");
    }
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    ) as CustomJwtPayload;


    // Fetch user details from the database
    const user = await User.findById(decoded.id)
      .select("userType Isverified username") // Added 'username' here as well for consistency
      .lean();


    // If user not found
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found for provided token.",
      });
    }


    // Attach user data to the request object
    req.user = {
      id: user._id.toString(),
      userType: user.userType,
      username: user.username, // Ensure username is attached
      // isVerified: user.Isverified, // Assuming Isverified is the correct field name
      permissions: [], // This middleware doesn't load permissions, so keep it empty or adjust if needed
    };


    next(); // Proceed to the next middleware or route handler
  } catch (error: any) { // Catch block should handle specific JWT errors
    console.error("Authentication error in authenticateUser:", error);


    // Handle specific JWT errors for more informative responses
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid authentication token.",
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Authentication token expired.",
      });
    }


    // Generic error for unexpected issues
    return res.status(500).json({ // Changed from 401 to 500 for unexpected errors
      success: false,
      message: "Internal server error during authentication.",
      error: error.message,
    });
  }
};


// Middleware to restrict access based on user type/role
export const restrictTo = (allowedTypes: UserType[]) => {
  return (req: CustomRequest, res: Response, next: NextFunction) => {
    // Ensure req.user is populated by a preceding authentication middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Please log in to access this resource.",
      });
    }


    // Check if the user's type is among the allowed types
    if (!allowedTypes.includes(req.user.userType as UserType)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have the necessary role to access this resource.",
      });
    }
    next();
  };
};


// Middleware to restrict access only to verified users (specifically 'user' type)
export const restrictToVerifiedUser = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  // Ensure req.user is populated by a preceding authentication middleware
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Please log in to access this resource.",
    });
  }
  // This middleware seems to imply "user" type specifically and verified.
  // If it's just about being verified for *any* user type, adjust the logic.
  if (req.user.userType !== "user" ) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Only verified users can access this resource.",
    });
  }
  next();
};


// Controller to handle permission requests (e.g., user requesting more permissions)
export const requirePermissionForResource = async (
  req: CustomRequest,
  res: Response
) => {
  try {
    const { resource, action, description } = req.body;
    const userId = req.user?.id; // Get userId from authenticated user
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User ID not found in token.",
      });
    }
    // Validate action type
    if (!["readonly", "write", "update", "create", "delete"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action specified.",
      });
    }
    // Validate resource type
    if (!["users", "permissions", "orders"].includes(resource)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource specified.",
      });
    }


    const io = req.app.get("io"); // Get Socket.IO instance from app locals


    // Fetch the user's username from the database for notification message
    const userDoc = await User.findById(userId).select("username").lean();
    const username = userDoc?.username || "unknown user";


    // Create a permission request notification
    const permissionRequest = await createPermissionRequestNotification(
      userId,
      action as "read" | "write" | "update" | "create" , // Ensure action type is correct
      description ||
        `Permission to ${action} ${resource} requested by ${username}.`,
      io,
      resource as "orders" | "users" | "permissions"
    );


    return res.status(201).json({
      success: true,
      message: "Permission request created successfully.",
      data: permissionRequest,
    });
  } catch (error) {
    console.error("Error in requirePermissionForResource:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while processing permission request.",
      error: (error as Error).message,
    });
  }
};








// Controller for admin to approve or reject permission requests
export const approvePermissionRequest = async (
  req: CustomRequest,
  res: Response
) => {
  try {
    const { requestId, status } = req.body; // Expecting requestId and status in the request body
    const userId = req.user?.id; // Get admin's userId from authenticated user


    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Admin User ID not found.",
      });
    }
    // Validate status value
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status specified. Must be 'approved' or 'rejected'.",
      });
    }


    // Find the permission request by ID
    const permissionRequest = await PermissionRequest.findById(requestId);
    if (!permissionRequest) {
      return res.status(404).json({
        success: false,
        message: "Permission request not found.",
      });
    }


    // Fetch the admin's username from the database
    const userDoc = await User.findById(userId).select("username").lean();
    const username = userDoc?.username || "Admin";
    const adminId = userDoc?._id; // Get admin's _id


    // Update the status and respondedBy fields of the permission request
    permissionRequest.status = status;
    permissionRequest.respondedBy = {
      userId: adminId,
      username,
    };


    // Declare permission variable outside the if/else block
    let permission;


    // If approved, update or create the user's permissions
    if (status === "approved") {
      const { requester, resource, action } = permissionRequest;
      permission = await Permission.findOne({ // Assign to the declared 'permission'
        userId: requester.userId,
        resource,
      });


      if (permission) {
        // If permission for resource exists, add action if not already present
        if (!permission.actions.includes(action)) {
          permission.actions.push(action);
          await permission.save();
        }
      } else {
        // If no permission for resource exists, create a new one
        permission = new Permission({ // Assign to the declared 'permission'
          userId: requester.userId,
          resource,
          actions: [action],
        });
        // Removed 'session' parameter as it's not typically available here
        // and usually managed at a higher level (e.g., transaction middleware).
        await permission.save();
      }
    }
   
    await permissionRequest.save(); // Save the updated permission request


    // Optionally, create a notification for the requester
    const io = req.app.get("io");
    if (!permissionRequest.requester || !permissionRequest.requester.userId) {
      return res.status(400).json({
        success: false,
        message: "Permission request does not have a valid requester ID.",
      });
    }


    await createPermissionRequestNotification(
      permissionRequest.requester.userId.toString(),
      status === "approved" ? "create" : "update", // Action for notification
      `Your permission request for '${permissionRequest.resource}' has been ${status}.`,
      io,
      permissionRequest.resource as "orders" | "users" | "permissions"
    );


    return res.status(200).json({
      success: true,
      message: `Permission request ${status} successfully.`,
      data: permissionRequest,
    });
  } catch (error) {
    console.error("Error approving permission request:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while processing permission request approval.",
      error: (error as Error).message,
    });
  }
};









































