const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  logger.error(err.message, {
    stack:  err.stack,
    route:  req.path,
    method: req.method,
    user:   req.user?.username || 'anonim',
  });

  const isProd = process.env.NODE_ENV === 'production';

  res.status(err.status || 500).json({
    error: 'Sunucu hatası',
    ...(!isProd && { detail: err.message }),
  });
}

module.exports = errorHandler;
