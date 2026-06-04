function safeInt(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export const paginate = (page = 1, limit = 20) => {
  const pageNum = safeInt(page, 1, { min: 1 });
  const limitNum = safeInt(limit, 20, { min: 1, max: 100 });
  const from = (pageNum - 1) * limitNum;
  const to = from + limitNum - 1;
  return { from, to, limit: limitNum, page: pageNum };
};

export const paginationMeta = (count, page, limit) => ({
  total: count || 0,
  page: parseInt(page, 10),
  limit: parseInt(limit, 10),
  totalPages: Math.ceil((count || 0) / limit),
  hasMore: page * limit < (count || 0)
});
