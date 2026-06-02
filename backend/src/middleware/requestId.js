function requestId(req, res, next) {
  const inboundId = req.headers["x-request-id"];
  const id = typeof inboundId === "string" && inboundId.trim() ? inboundId.trim() : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
}

module.exports = { requestId };
