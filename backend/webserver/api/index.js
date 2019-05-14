const express = require('express');

module.exports = (dependencies, lib) => {
  const router = express.Router();

  require('./boards')(dependencies, lib, router, 'linagora.esn.dashboard');

  return router;
};
