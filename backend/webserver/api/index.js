const express = require('express');
const MODULE_NAME = 'linagora.esn.dashboard';

module.exports = (dependencies, lib) => {
  const router = express.Router();

  require('./boards')(dependencies, lib, router, MODULE_NAME);
  require('./settings')(dependencies, lib, router, MODULE_NAME);
  require('./cors')(dependencies, lib, router, MODULE_NAME);

  return router;
};
