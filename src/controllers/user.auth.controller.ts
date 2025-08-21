import { Request, Response, NextFunction } from "express";
import User from "../models/user.auth.model.js";
import Permission from "../models/user.permission.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import ErrorHandler from "../utils/errorHandler.js";
import mongoose from "mongoose";
config();

export const adminSignup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { username, email, password, userType = "user" } = req.body;

    if (!username || !email || !password) {
      throw new ErrorHandler(400, "Username or email already exists");
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      throw new ErrorHandler(400, "Username or email already exists");
    }
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      userType,
      Isverified: false,
      profilePicture: null,
    });
    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: { id: user._id, username, email, userType },
    });
  } catch (error) {
    next(error);
  }
};

//// create funcation for the user login
export const adminLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, userType,employeeId,profilePicture } = req.body;
    // Validate input
    if (!email || !password) {
      throw new ErrorHandler(400, "Email and password are required");
    }
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new ErrorHandler(400, "user not founds");
    }
    // Validate password
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log(isValidPassword, "invalidadd");
    if (!isValidPassword) {
      throw new ErrorHandler(400, "Invalid email or password");
    }
    // Validate userType if provided
    if (userType && userType !== user.userType) {
      throw new ErrorHandler(400, "Invalid user type");
    }
    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email, userType: user.userType },
      process.env.JWT_SECRET as string,
      { expiresIn: "5d" } // Changed to 5 days
    );

    // Set JWT in a cookie
    res.cookie("jwt", token, {
      httpOnly: true, // Prevents client-side JavaScript access
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      sameSite: "strict", // Mitigates CSRF attacks
      maxAge: 5 * 24 * 60 * 60 * 1000, // 5 days in ms
    });

    // Send success response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        userType: user.userType,
        username: user.username,
        employeeId: user.employeeId,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    next(error);
  }
};

// desgination


//// admin assign the permission for operation performs
export const assignPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, resource, actions } = req.body;
    if (!userId || !resource || !actions || !Array.isArray(actions)) {
      throw new ErrorHandler(
        400,
        "User ID, resource, and actions are required"
      );
    }
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new ErrorHandler(400, "User not found");
    }
    // Validate resource and actions
    const validResources = ["users", "permissions", "orders"];
    const validActions = ["readOnly", "create", "update", "delete"];
    if (!validResources.includes(resource)) {
      return res.status(400).json({
        success: false,
        message: `Invalid resource. Must be one of: ${validResources.join(
          ", "
        )}`,
      });
    }
    if (!actions.every((action: string) => validActions.includes(action))) {
      return res.status(400).json({
        success: false,
        message: `Invalid actions. Must be one of: ${validActions.join(", ")}`,
      });
    }
    // Upsert permission (update if exists, create if not)
    await Permission.findOneAndUpdate(
      { userId, resource },
      { actions },
      { upsert: true, new: true }
    );
    return res.status(200).json({
      success: true,
      message: "Permissions assigned successfully",
      permission: { userId, resource, actions },
    });
  } catch (error) {
    console.error("Assign permissions error:", error);
    next(error);
  }
};
export const assignPermissionToAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, resource, actions } = req.body;
    if (!userId || !resource || !actions || !Array.isArray(actions)) {
      throw new ErrorHandler(
        400,
        "User ID, resource, and actions are required"
      );
    }
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new ErrorHandler(400, "User not found");
    }
    // Validate resource and actions
    const validResources = ["users", "permissions", "orders"];
    const validActions = ["readOnly", "create", "update", "delete"];
    if (!validResources.includes(resource)) {
      return res.status(400).json({
        success: false,
        message: `Invalid resource. Must be one of: ${validResources.join(
          ", "
        )}`,
      });
    }
    if (!actions.every((action: string) => validActions.includes(action))) {
      return res.status(400).json({
        success: false,
        message: `Invalid actions. Must be one of: ${validActions.join(", ")}`,
      });
    }
    // Upsert permission (update if exists, create if not)
    await Permission.findOneAndUpdate(
      { userId, resource },
      { actions },
      { upsert: true, new: true }
    );
    return res.status(200).json({
      success: true,
      message: "Permissions assigned successfully",
      permission: { userId, resource, actions },
    });
  } catch (error) {
    console.error("Assign permissions error:", error);
    next(error);
  }
};

////// admin create user funcation
export const adminCreateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      username,
      email,
      password,
      userType = "user",
      employeeId,
      designation
    } = req.body;
    if (!username || !email || !password) {
      throw new ErrorHandler(400, "Username, email, and password are required");
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ErrorHandler(400, "email already exists");
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const profilePicture = req.file ? `/images/${req.file.filename}` : null;
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      userType,
      Isverified: false,
      profilePicture,
      employeeId,
      designation
    });
    return res.status(201).json({
      success: true,
      message: "User created successfully by admin",
      user: {
        id: user._id,
        username,
        email,
        userType,
        employeeId,
        profilePicture,
      },
    });
  } catch (error) {
    console.error("Admin create user error:", error);
    next(error);
  }
};

export const AdmineCreateuserLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, userType } = req.body;
    // Validate input
    if (!email || !password) {
      throw new ErrorHandler(400, "Email and password are required");
    }
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new ErrorHandler(400, "Invalid email or password");
    }
    // Validate password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new ErrorHandler(400, "Invalid email or password");
    }
    // Validate userType if provided
    if (userType && userType !== user.userType) {
      throw new ErrorHandler(400, "Invalid user type");
    }
    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email, userType: user.userType },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" } // Token expiration time
    );

    // Set JWT in a cookie
    res.cookie("jwt", token, {
      httpOnly: true, // Prevents client-side JavaScript access
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      sameSite: "strict", // Mitigates CSRF attacks
      maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds, matching token expiration
    });

    // Send success response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (error) {
    next(error);
  }
};


//// create a function for the subadmin create user
export const subAdminCreate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      username,
      email,
      password,
      department,
      userType = "subadmin",
      employeeId,
      designation
    } = req.body;
    // Validate required fields
    if (!username || !email || !password || !department) {
      throw new ErrorHandler(
        400,
        "Username, email, password, and department are required"
      );
    }
    // Process department string into a single valid department
    let selectedDepartment;
    if (typeof department === "string") {
      const departmentArray = department.split(",").map((dep) => dep.trim());
      selectedDepartment = departmentArray.find((dep) =>
        ["sales", "production", "Accounts", "R&D"].includes(dep)
      );
    } else {
      throw new ErrorHandler(400, "Department must be a string");
    }
    // Validate department
    if (!selectedDepartment) {
      throw new ErrorHandler(400, "No valid department found in input");
    }
    // Check for existing username or email
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      throw new ErrorHandler(400, "Username or email already exists");
    }


    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      userType,
      department: selectedDepartment,
      profilePicture: null,
      employeeId,
      designation
    });
    res.status(201).json({
      success: true,
      message: "Subadmin created successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        department: selectedDepartment,
        employeeId:user.employeeId,
        designation:user.designation
      },
    });
  } catch (error) {
    next(error);
  }
};






///// create function for the subadmin login
export const subAdminLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, userType } = req.body;
    // Validate input
    if (!email || !password) {
      throw new ErrorHandler(400, "Email and password are required");
    }
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new ErrorHandler(400, "Invalid email or password");
    }
    // Validate password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new ErrorHandler(400, "Invalid email or password");
    }
    // Validate userType if provided
    if (userType && userType !== user.userType) {
      throw new ErrorHandler(400, "Invalid user type");
    }
    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email, userType: user.userType },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" } // Token expiration time
    );

    // Set JWT in a cookie
    res.cookie("jwt", token, {
      httpOnly: true, // Prevents client-side JavaScript access
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      sameSite: "strict", // Mitigates CSRF attacks
      maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds, matching token expiration
    });

    // Send success response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        userType: user.userType,
        username: user.username,
      },
    });
  } catch (error) {
    next(error);

  }
}



//// create funcation change password
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { oldPassword, newPassword, email } = req.body;
    // Validate input
    if (!email || !oldPassword || !newPassword) {
      throw new ErrorHandler(
        400,
        "email, old password, and new password are required"
      );
    }
    // Validate password strength (example: minimum 8 characters)
    if (newPassword.length < 8) {
      throw new ErrorHandler(
        400,
        "New password must be at least 8 characters long"
      );
    }
    // Find user
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new ErrorHandler(404, "User not found");
    }
    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      throw new ErrorHandler(400, "Invalid old password");
    }
    // Prevent same password reuse
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new ErrorHandler(
        400,
        "New password cannot be the same as old password"
      );
    }
    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate(
      { email },
      { $set: { password: hashedPassword } },
      { new: true, runValidators: true }
    );
    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    next(error);
  }
};

//// create a function for the get all user with po coount each user
const ORDER_STATUSES = ["pending", "processing", "completed", "cancelled"];

export const getAllUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Parse and validate query parameters
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "10", 10);
    const status = req.query.status as string | undefined;
    const skip = (page - 1) * limit;

    if (isNaN(page) || page < 1) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid page number" });
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ success: false, message: "Invalid limit" });
    }
    if (status && !ORDER_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    // Build match stage for orders
    const orderMatch = status ? { "orders.status": status } : {};

    // Aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [
      // Initial user match: only verified users and specific userType
      { $match: { userType: { $in: ["user", "subadmin"] } } }, // Filter verified users
      // Lookup to join orders
      {
        $lookup: {
          from: "orders",
          localField: "employeeId",
          foreignField: "generatedBy.employeeId",
          as: "orders",
        },
      },
      // Filter orders by status (if provided)
      { $match: orderMatch },
      // Project to include only necessary fields
      {
        $project: {
          username: 1,
          employeeId: 1,
          email: 1,
          Isverified: 1,
          profilePicture: 1,
          // orders: 1,
          orderCount: { $size: "$orders" },
          designation:1,
          userType:1
        },
      },
      // Sort by username
      { $sort: { username: 1 } },
      // Pagination
      { $skip: skip },
    ];

    // Run aggregation and count in parallel for efficiency
    const [users, totalUsers] = await Promise.all([
      User.aggregate(pipeline),
      User.countDocuments({ userType: "user" }), // Adjust match criteria as needed
    ]);

    // Prepare response
    const response = {
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    next(error); // Pass to centralized error handler
  }
};

////  create a funcation for the delete user
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      throw new ErrorHandler(404, "User not found");
    }
    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};

//// create a for the search profile using username or email
export const searchProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== "string") {
      throw new ErrorHandler(
        400,
        "Query parameter is required and must be a string"
      );
    }
    const regex = new RegExp(query, "i"); // Case-insensitive search
    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          $and: [
            { userType: "user" },
            {
              $or: [{ username: regex }, { email: regex }],
            },
          ],
        },
      },
      // Lookup to join orders
      {
        $lookup: {
          from: "orders",
          localField: "employeeId",
          foreignField: "generatedBy.employeeId",
          as: "orders",
        },
      },
      // Project to include necessary fields and order count
      {
        $project: {
          username: 1,
          employeeId: 1,
          email: 1,
          Isverified: 1,
          orderCount: { $size: "$orders" },
        },
      },
      // Sort by username
      { $sort: { username: 1 } },
    ];

    // Run aggregation
    const users = await User.aggregate(pipeline);
    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};
