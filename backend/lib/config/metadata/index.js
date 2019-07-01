module.exports = dependencies => ({
  configurations: {
    applicationUrl: require('./applicationUrl')(dependencies),
    widgets: require('./widgets')(dependencies)
  }
});
