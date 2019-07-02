module.exports = dependencies => ({
  configurations: {
    applicationUrl: require('./applicationUrl')(dependencies),
    widgets: require('./widgets')(dependencies),
    dashboards: require('./dashboards')(dependencies)
  }
});
