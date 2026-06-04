export const success = (res, data, message = "Success", status = 200) => {
  return res.status(status).json({ success: true, message, data });
};

export const error = (res, message = "Error", status = 400, data = null, code = null) => {
  return res.status(status).json({
    success: false,
    error: message,
    ...(code ? { code } : {}),
    ...(data ? { data } : {})
  });
};

export const paginated = (res, data, pagination, extra = {}) => {
  return res.status(200).json({ success: true, data, pagination, ...extra });
};
