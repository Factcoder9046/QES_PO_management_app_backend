import cron from "node-cron";
import Order from "../models/order.model.js";
import { getOrderStatus } from "../utils/getOrderStatus.js";



export const startAutoStatusUpdateJob = () => {
  return cron.schedule("0 * * * *", async () => {
    console.log("🔄 Auto status update job started...");
    try {
      const orders = await Order.find({ status: { $in: ["pending", "delayed"] } });
      for (const order of orders) {
        const newStatus = getOrderStatus(order.estimatedDispatchDate);
        if (order.status !== newStatus) {
          await Order.updateOne(
            { _id: order._id },
            { $set: { status: newStatus } }
          );
          console.log(` Order ${order._id} status updated to ${newStatus}`);

        
        }
      }
      console.log("Auto update job finished");
    } catch (err) {
      console.error(" Auto update job failed:", err);
    }
  });
};
