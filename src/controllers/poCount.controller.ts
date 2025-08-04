

// --- Import Mongoose Model ---
// IMPORTANT: Replace '../models/Order' with the actual path to your Mongoose Order model file.
// This model should be connected to your MongoDB database.
 // Assuming your Order model is defined here

import orderModel from "@/models/order.model.js";

/**
 * Controller function to get the total count of active purchase orders from MongoDB.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getTotalPOCount = async (req, res) => {
    try {
        // Query MongoDB to count documents where 'isdeleted' is false
        const totalCount = await orderModel.countDocuments({ isdeleted: false });
        res.status(200).json({ total_po_count: totalCount });
    } catch (error) {
        console.error("Error fetching total PO count from DB:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

/**
 * Helper function to get the count of purchase orders by status from MongoDB.
 * This function is used internally by the specific status count controllers.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {string} status - The status to filter by (e.g., 'pending', 'completed', 'delayed', 'rejected').
 */
const getPOCountByStatus = async (req, res, status) => {
    try {
        // Query MongoDB to count documents where 'status' matches and 'isdeleted' is false
        const count = await orderModel.countDocuments({ status: status, isdeleted: false });
        res.status(200).json({ [`${status}_po_count`]: count });
    } catch (error) {
        console.error(`Error fetching ${status} PO count from DB:`, error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

/**
 * Controller function for '/pending-po-count'.
 */
export const getPendingPOCount = async (req, res) => {
    await getPOCountByStatus(req, res, 'pending');
};

/**
 * Controller function for '/completed-po-count'.
 */
export const getCompletedPOCount = async (req, res) => {
    await getPOCountByStatus(req, res, 'completed');
};

/**
 * Controller function for '/delayed-po-count'.
 */
export const getDelayedPOCount = async (req, res) => {
    await getPOCountByStatus(req, res, 'delayed');
};

/**
 * Controller function for '/rejected-po-count'.
 */
export const getRejectedPOCount = async (req, res) => {
    await getPOCountByStatus(req, res, 'rejected');
};