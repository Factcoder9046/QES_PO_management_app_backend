import express from "express";
import {
  orderCreate,
  getOrderDetailsById,
  getAllOrders,
  searchOrders,
  updateOrderDetailsById,
  deleteOrder,
  restoreOrder,
  getRecycleBinOrders,
} from "../controllers/order.create.js";
import { TryCatch } from "../middlewares/error.js";
import {authenticateUser, requirePermission, restrictTo,restrictToVerifiedUser} from "../middlewares/check.permission.middleware.js"




const router = express.Router();

router.route("/order-create-api").post(requirePermission("orders","create"),TryCatch(orderCreate));
router.route("/get-order-details/:id").get(authenticateUser,TryCatch(getOrderDetailsById));
router.route("/get-all-orders").get(authenticateUser,restrictTo(["admin", "user","subadmin"]),TryCatch(getAllOrders));
router.route("/search-order").get(authenticateUser,TryCatch(searchOrders));
router.route("/upadate-order/:id").get(authenticateUser,restrictToVerifiedUser,TryCatch(updateOrderDetailsById));
//// deletion management
router.route("/user-delete-order/:id").delete(authenticateUser,requirePermission("orders","delete"),TryCatch(deleteOrder));
router.route("/user-restore-order/:id").patch(authenticateUser,TryCatch(restoreOrder));
router.route("/user-recycle-bin-order/").get(authenticateUser,TryCatch(getRecycleBinOrders));


export default router;
