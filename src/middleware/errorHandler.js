const logger = require('../utils/logger');
const { NotFoundError, ConflictError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  logger.error(err.stack);

  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }

  if (err instanceof ConflictError) {
    return res.status(409).json({ error: err.message });
  }

  // Handle validation errors
  if (err.array && typeof err.array === 'function') {
    return res.status(400).json({ errors: err.array() });
  }

  // Default error
  res.status(500).json({ error: 'Internal Server Error' });
}

module.exports = errorHandler;
