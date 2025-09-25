import { createTask, getTasksByPO, getTasksByUser, updateStatusTask } from "@/controllers/task.controller.js";
import { authenticateUser, restrictTo } from "@/middlewares/check.permission.middleware.js";
import { TryCatch } from "@/middlewares/error.js";
import express from "express";


const router = express.Router();
router.route("/admin-subadmin-create-task").post(authenticateUser,restrictTo(["admin","subadmin"]),TryCatch(createTask));
router.route("/admin-subadmin-update-status/:taskId").put(authenticateUser,restrictTo(["admin", "user", "subadmin"]),TryCatch(updateStatusTask));
router.route("/admin-subadmin-getTask-By-po/:poId").get(authenticateUser,restrictTo(["admin","subadmin"]),TryCatch(getTasksByPO));
// router.route("/get-tasks-assigned-to-user/:userId").get(authenticateUser,restrictTo(["admin","subadmin"]),TryCatch(getTasksAssignedToUser ));
// Get tasks by user
router.get("/user/:userId", getTasksByUser);
router.put(
  "/task/update-status/:taskId",
  authenticateUser,   // har user login hoke ayega
  TryCatch(updateStatusTask)
);




export default router