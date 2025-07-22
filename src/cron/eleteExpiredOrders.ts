import cron from "node-cron";
import Order from "../models/order.model.js";
import ErrorHandler from "@/utils/errorHandler.js";

////// Schedule to run this 5day after
cron.schedule("* * * * *", async () => {
  console.log("Running cleanup for expired soft-deleted orders...");
  try {
    const retentionPeriod = 60 * 1000; // 1 minute
    const cutOffDate = new Date(Date.now() - retentionPeriod);
    const result = await Order.deleteMany({
      isdeleted: true,
      deletedAt: { $lte: cutOffDate },
    });
    console.log(`Permanently deleted ${result.deletedCount} expired orders`);
  } catch (error) {
    console.error("Error in cleanup cron job:", error);
    throw new ErrorHandler(500, "Failed to clean up expired orders");
  }
});