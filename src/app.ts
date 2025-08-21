import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import orderRouter from "./routes/order.js";
import { errorMiddleware } from "./middlewares/error.js";
import userRouter from "./routes/auth.route.js";
import taskRouter from './routes/task.route.js'
import http from "http";
import { initializeWebSocket } from "./controllers/websocket.js";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import mongoose from "mongoose";


// Resolve __filename and __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


dotenv.config({ path: "./.env" });


const port = process.env.PORT || 8080;
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/orderdb";


if (!mongoURI.startsWith("mongodb://") && !mongoURI.startsWith("mongodb+srv://")) {
  console.error(
    "Invalid MONGO_URI. Please set a valid MongoDB connection string."
  );
  process.exit(1);
}


const connectDB = () =>
  mongoose
    .connect(mongoURI)
    .then((c) => {
      console.log(`Connected to MongoDB with database: ${c.connection.name}`);
    })
    .catch((e) => {
      console.error("MongoDB connection error:", e);
      process.exit(1); // Exit process on DB connection failure
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
  "android-app://com.visualeye.app",
  "https://qes-po-management-app-frontend.vercel.app"
];


// Add CORS_ORIGIN from environment variable if defined and split into an array
if (process.env.CORS_ORIGIN) {
  const envOrigins = process.env.CORS_ORIGIN.split(",").map((origin) =>
    origin.trim().replace(/\/$/, "")
  );
  allowedOrigins.push(...envOrigins);
}


// Function to dynamically check if the origin is in the allowed list
const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};


app.use(cors(corsOptions)); // Use the dynamically checked corsOptions


// Initialize WebSocket and pass both server and app
export const { io, userSocketMap } = initializeWebSocket(server, app);


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
  console.log(`Server is working on Port: ${port} in  Mode.`)
);