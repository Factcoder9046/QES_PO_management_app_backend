import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

// import connectDB  from "./lib/db";
import orderRouter from "./routes/order.js";
import { errorMiddleware } from "./middlewares/error.js";
import userRouter from "./routes/auth.route.js";
import taskRouter from './routes/task.route.js'
// import notificationRouter from "./routes/notification.route.js";
import http from "http";
import { initializeWebSocket } from "./controllers/websocket.js";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import mongoose from "mongoose";

// Resolve __filename and __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: "./.env" });

// export const envMode = process.env.NODE_ENV?.trim() || "DEVELOPMENT";
const port = process.env.PORT || 8080;
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/orderdb"; // Default local MongoDB
if (
  !mongoURI.startsWith("mongodb://") &&
  !mongoURI.startsWith("mongodb+srv://")
) {
  console.error(
    "Invalid MONGO_URI. Please set a valid MongoDB connection string."
  );
  process.exit(1);
}
// const mongoURI = process.env.MONGO_URI || "";

// const mongoTestURI = process.env.MONGO_TEST_URI || "mongodb://localhost:27017/testdb"; // Default local MongoDB for testing
const connectDB = () =>
  mongoose
    .connect(mongoURI)
    .then((c) => {
      console.log(`Connected to MongoDB with database: ${c.connection.name}`);
    })
    .catch((e) => {
      console.error("MongoDB connection error:", e);
      throw e;
    });

connectDB();

const app = express();
const server = http.createServer(app);

// NOTE: Moved the CORS middleware to be one of the first things
// the Express app uses to ensure it handles preflight requests correctly.
const allowedOrigins = [
  "http://localhost:4000",
  "http://localhost:5173",
  "http://13.233.137.149:4000",
  "exp://o87i5p4-anonymous-8081.exp.direct",
  "capacitor://localhost",
  "android-app://com.visualeye.app"
];

// Add CORS_ORIGIN from environment variable if defined
if (process.env.CORS_ORIGIN) {
  const envOrigins = process.env.CORS_ORIGIN.split(",").map((origin) =>
    origin.trim().replace(/\/$/, "")
  );
  allowedOrigins.push(...envOrigins);
}

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Initialize WebSocket and pass both server and app
export const { io, userSocketMap } = initializeWebSocket(server, app); // Pass app here

const frontendDistPath = path.join(__dirname, "../../op-management-apps/dist");
app.use(express.static(frontendDistPath));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/order/api", orderRouter);
app.use("/user/api", userRouter);
app.use("/task/api", taskRouter);
// app.use("/notification/api", notificationRouter);

// Serve index.html for SPA (Single Page Application) routing
app.get("*", (req, res) => {
  const indexPath = path.join(frontendDistPath, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("Error serving index.html:", err);
      res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }
  });
});

app.use(errorMiddleware);

server.listen(port, () =>
  console.log(`Server is working on Port: ${port} in  Mode.`)
);
