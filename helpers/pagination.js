module.exports = (objectPagination, query, countPage) => {
  const total = Number(countPage) || 0;
  const totalPage = Math.ceil(total / objectPagination.limitPage) || 0;

  let currentPage = parseInt(query.page, 10);
  if (!Number.isFinite(currentPage) || currentPage < 1) currentPage = 1;
  if (totalPage > 0 && currentPage > totalPage) currentPage = totalPage;

  objectPagination.currentPage = currentPage;
  objectPagination.totalPage = totalPage;
  objectPagination.skipPage = (currentPage - 1) * objectPagination.limitPage;
  return objectPagination;
};
