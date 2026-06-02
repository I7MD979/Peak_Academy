"use client";

import { useState } from "react";

export const usePagination = (initialPage = 1, limit = 20) => {
  const [page, setPage] = useState(initialPage);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { page, from, to, limit, setPage };
};
