module.exports = dependencies => {
  return {
    denormalizeDashboard,
    denormalizeWidget
  };

  function denormalizeDashboard(dashboard) {
    dashboard.widgets.instances = orderWidgets(dashboard.widgets);

    return Promise.resolve(dashboard);
  }

  function denormalizeWidget(widget) {
    return Promise.resolve(widget);
  }

  function orderWidgets(widgets) {
    const { order = [], instances = []} = widgets;

    return instances.sort((a, b) => {
      if (order.indexOf(a.id) < order.indexOf(b.id) || order.indexOf(a.id) === -1 || order.indexOf(b.id) === -1) {
        return -1;
      }

      return 1;
    });
  }
};
