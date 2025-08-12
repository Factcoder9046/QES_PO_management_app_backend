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
  deleteOrderPermanently,
  getOrdersByUser,
  nonApprovalPOs
} from "../controllers/order.create.js";
import { TryCatch } from "../middlewares/error.js";
import {authenticateUser, requirePermission, restrictTo,restrictToVerifiedUser} from "../middlewares/check.permission.middleware.js"
import { getCompletedPOCount, getDelayedPOCount, getLastPOCreated, getPendingPOCount, getRejectedPOCount, getTotalPOCount } from "@/controllers/poCount.controller.js";
const router = express.Router();











router.route("/order-create-api").post(requirePermission("orders","create"),TryCatch(orderCreate));
router.route("/get-order-details/:id").get(authenticateUser,TryCatch(getOrderDetailsById));
router.route("/get-all-orders").get(authenticateUser,restrictTo(["admin", "user","subadmin"]),TryCatch(getAllOrders));
router.route("/get-non-approval-orders").get(authenticateUser,restrictTo(["admin", "user","subadmin"]),TryCatch(nonApprovalPOs));
router.route("/search-order").get(authenticateUser,TryCatch(searchOrders));
router.route("/upadate-order/:id").put(authenticateUser,TryCatch(updateOrderDetailsById));
router.route("/get-order-login-user/").get(authenticateUser,TryCatch(getOrdersByUser));

router.route("/delete-order/:id").delete(authenticateUser,requirePermission("orders","delete"),TryCatch(deleteOrder));


// Route for single order restore
console.log('Registered route: PATCH /order/api/user-restore-order/:id');
router.route('/user-restore-order/:id').post(authenticateUser, TryCatch(restoreOrder));
// Route for multiple order restore
router.route('/restore-orders/').post(authenticateUser, TryCatch(restoreOrder));
// Route for getting orders in recycle bin
console.log('Registered route: GET /user-recycle-bin-order/');
//// deletion order single permanently
router.route("/user-delete-permanently/:id").delete(authenticateUser, TryCatch(deleteOrderPermanently));
//// deletion order multiple permanently
router.route("/user-delete-permanently/").delete(authenticateUser, TryCatch(deleteOrderPermanently ));
router.route("/user-get-po-login-user/").get(authenticateUser, TryCatch(getOrdersByUser));


router.route("/user-recycle-bin-order/").get(authenticateUser,TryCatch(getRecycleBinOrders));









// Count Routes

router.route("/get-total-po-count").get(authenticateUser,getTotalPOCount)
router.route("/get-completed-po-count").get(authenticateUser,getCompletedPOCount)
router.route("/get-pending-po-count").get(authenticateUser,getPendingPOCount)
router.route("/get-delayed-po-count").get(authenticateUser,getDelayedPOCount)
router.route("/get-rejected-po-count").get(authenticateUser,getRejectedPOCount)
router.route("/get-last-po-number").get(authenticateUser,getLastPOCreated)




export default router;