module.exports = function(dependencies) {
  const models = require('./db')(dependencies);
  const dashboard = require('./dashboard')(dependencies);

  return {
    models,
    dashboard
  };
};
