import express from "express";
import { TryCatch } from "../middlewares/error.js";
import { adminSignup ,adminLogin,adminCreateUser,assignPermissions,AdmineCreateuserLogin,getAllUser,changePassword,deleteUser,searchProfile, subAdminLogin, subAdminCreate} from "../controllers/user.auth.controller.js";
import { adminVerify} from "../middlewares/user.verify.permission.middleware.js"
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { approvePermissionRequest, authenticateUser, requirePermissionForResource, restrictTo } from "@/middlewares/check.permission.middleware.js";

// Derive __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to frontend's public/images directory
const FRONTEND_IMAGES_PATH = path.join(__dirname, "../../../op-management-apps/public/images");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, FRONTEND_IMAGES_PATH); // Store files in frontend's public/images directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and GIF images are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
});

// getAllUser

const userRouter = express.Router();

userRouter.route("/admin-signup").post(TryCatch(adminSignup));
userRouter.route("/admin-sigin").post(TryCatch(adminLogin));
userRouter.route("/admin-create-user").post(adminVerify,upload.single("profilePicture"),restrictTo(["admin","subadmin"]),adminCreateUser);
userRouter.route("/admin-assign-permission").post(adminVerify,restrictTo(["admin", "subadmin"]),assignPermissions)
userRouter.route("/assign-permission-to-admin").post(assignPermissions)
userRouter.route("/admin-get-all-user").get(adminVerify,restrictTo(["admin","subadmin"]),getAllUser)
userRouter.route("/admin-delete/:id").delete(adminVerify,restrictTo(["admin","subadmin"]),deleteUser)
userRouter.route("/admin-user-profie").get(adminVerify,restrictTo(["admin","subadmin"]),searchProfile)



//// admin create for the user
userRouter.route("/admin-create-user-login").post(AdmineCreateuserLogin);
userRouter.route("/admin-user-change-password").patch(adminVerify,changePassword)
userRouter.route("/user-request-permission").post(authenticateUser,requirePermissionForResource );
userRouter.route("/admin-check-permission").post(adminVerify,restrictTo(["admin","subadmin"]),approvePermissionRequest);



//// route for subadmin
userRouter.route("/admin-create-subadmin").post(adminVerify,upload.single("profilePicture"), subAdminCreate )
userRouter.route("/subadmin-login").post(TryCatch(subAdminLogin));



export default userRouter;