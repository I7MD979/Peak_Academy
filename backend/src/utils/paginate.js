export const paginate = (page = 1, limit = 20) => {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
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
