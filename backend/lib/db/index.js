module.exports = dependencies => {
  const dashboard = require('./dashboard')(dependencies);

  return {
    dashboard
  };
};
