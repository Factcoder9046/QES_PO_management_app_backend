export const getOrderStatus = (estimatedDispatchDate?: Date): string => {
  if (!estimatedDispatchDate) return "pending";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dispatchDate = new Date(estimatedDispatchDate);
  dispatchDate.setHours(0, 0, 0, 0);

  if (dispatchDate < today) {
    return "delayed"; // Past date
  } else {
    return "pending"; // Today or future date
  }
};
