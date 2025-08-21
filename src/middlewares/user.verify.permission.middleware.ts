import { Response, NextFunction } from "express";
import ErrorHandler from "../utils/errorHandler.js";

import jwt from "jsonwebtoken";
import { config } from "dotenv";
import { CustomRequest } from "../middlewares/check.permission.middleware.js";
import User from "../models/user.auth.model.js";

config();

interface JwtPayload {
  user?: {
    id: string;
    userType: string;
    isVerified: boolean;
    username?: string;
    permissions: { resource: string; actions: string[] }[];
  };
}

interface CustomJwtPayload extends JwtPayload {
  id: string;
  email: string;
  userType: string;
  iat: number;
  exp: number;
}


export const adminVerify = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from cookie
    let token: string | undefined;

    // 1. Check Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2. Fallback: Check cookie
    else if (req.headers.cookie) {
      token = req.headers.cookie.split("jwt=")[1]?.split(";")[0]; // Safe parsing
    }

    if (!token) {
      throw new ErrorHandler(401, "No token provided");
    }
    // Verify JWT token
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    ) as CustomJwtPayload;
    // Fetch user data
    const user = await User.findById(decoded.id)
      .select("userType isVerified username")
      .lean();
    if (!user) {
      throw new ErrorHandler(401, "Unauthorized: User not found");
    }
    const allowRole: string[] = ["admin", "subadmin"];
    if (!allowRole.includes(decoded.userType)) {
      throw new ErrorHandler(
        403,
        "Not authorized: Required role access denied"
      );
    }
    req.user = {
      id: user._id.toString(),
      userType: user.userType,
      username: user.username,
      permissions: [], // Use JWT permissions or empty array
    };
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token has expired",
      });
    }
    if (error instanceof ErrorHandler) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid token",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};