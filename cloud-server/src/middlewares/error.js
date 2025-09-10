export const errorHandler = (err, _req, res, _next) => {
  console.error(err);
  const code = err.status || 400;
  res.status(code).json({ error: err.message || 'Error' });
};
