module.exports = dependencies => {
  const logger = dependencies('logger');

  return {
    catchError,
    badRequest
  };

  function catchError(err, res, details) {
    logger.error(details, err);

    res.status(500).json({
      error: {
        code: 500,
        message: 'Server Error',
        details
      }
    });
  }

  function badRequest(err, res, details) {
    logger.error('Schema error', err);

    res.status(400).json({
      error: {
        code: 400,
        message: 'Bad request',
        details
      }
    });
  }
};
