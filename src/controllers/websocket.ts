import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/user.auth.model.js";
import { Application } from "express";

// Store userId to socketId mappings
const userSocketMap = new Map<string, string>();
console.log(userSocketMap, "userSocketMap initialized");

// Initialize Socket.IO server
export const initializeWebSocket = (server: HttpServer, app: Application) => {
  const io = new Server(server, {
    cors: {
      origin:"*",
      // origin: (origin, callback) => {
      //   const allowedOrigins = [
      //     "exp://o87i5p4-anonymous-8081.exp.direct",
      //     "http://localhost:5173/",
      //     "http://13.201.188.234:4000",
      //   ];
      //   if (process.env.CORS_ORIGIN) {
      //     const envOrigins = process.env.CORS_ORIGIN.split(",").map((origin) =>
      //       origin.trim().replace(/\/$/, "")
      //     );
      //     allowedOrigins.push(...envOrigins);
      //   }
      //   if (!origin || allowedOrigins.includes(origin)) {
      //     callback(null, true);
      //   } else {
      //     callback(new Error("Not allowed by CORS"));
      //   }
      // },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Attach io and userSocketMap to the Express app
  app.set("io", io);
  app.set("userSocketMap", userSocketMap);

  // WebSocket connection handling
  io.on("connection", async (socket) => {
    console.log("New WebSocket connection:", socket.id);
    const token = socket.handshake.query.token as string;

    if (!token) {
      console.log("No token provided, disconnecting:", socket.id);
      socket.disconnect();
      return;
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret") as {
        id: string;
        userType?: string;
      };
      const userId = decoded.id;

      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        console.log("Invalid userId, disconnecting:", socket.id);
        socket.disconnect();
        return;
      }

      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        console.log("User not found, disconnecting:", socket.id);
        socket.disconnect();
        return;
      }

      // Map userId to socketId
      userSocketMap.set(userId, socket.id);
      console.log(`User ${userId} mapped to socket ${socket.id}`);

      // Join a room for the user
      socket.join(`user:${userId}`);
      console.log(`User ${user.email} joined room: user:${userId}`);

      // Join admin room if user is an admin
      if (user.userType === "admin") {
        socket.join("admins");
        console.log(`Admin user ${user.email} joined room: admins`);
      }

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
        userSocketMap.delete(userId);
        socket.leave(`user:${userId}`);
        if (user.userType === "admin") {
          socket.leave("admins");
        }
        console.log(`User ${userId} and socket ${socket.id} cleaned up.`);
      });
    } catch (error) {
      console.error("JWT verification error:", error);
      console.log("JWT verification failed, disconnecting:", socket.id);
      socket.disconnect();
    }
  });

  return { io, userSocketMap };
};