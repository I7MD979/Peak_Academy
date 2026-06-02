export const success = (res, data, message = "Success", status = 200) => {
  return res.status(status).json({ success: true, message, data });
};

export const error = (res, message = "Error", status = 400) => {
  return res.status(status).json({ success: false, error: message });
};

export const paginated = (res, data, pagination, extra = {}) => {
  return res.status(200).json({ success: true, data, pagination, ...extra });
};
