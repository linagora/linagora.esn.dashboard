module.exports = dependencies => ({
  configurations: {
    widgets: require('./widgets')(dependencies)
  }
});
