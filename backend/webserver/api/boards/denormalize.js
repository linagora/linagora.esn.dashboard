module.exports = dependencies => {
  return {
    denormalizeDashboard,
    denormalizeWidget
  };

  function denormalizeDashboard(dashboard) {
    return Promise.resolve(dashboard);
  }

  function denormalizeWidget(widget) {
    return Promise.resolve(widget);
  }
};
