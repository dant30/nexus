import { useState } from "react";

export const usePagination = (pageSize = 20) => {
  const [page, setPage] = useState(1);
  return { page, pageSize, setPage };
};
