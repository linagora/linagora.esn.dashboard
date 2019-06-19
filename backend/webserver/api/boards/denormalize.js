module.exports = dependencies => {
  const settings = require('../../../lib/settings')(dependencies);

  return {
    denormalizeDashboard,
    denormalizeWidget
  };

  function denormalizeDashboard(dashboard, user) {
    return settings.getWidgetsSettings({ user })
      .then(settings => (settings || []))
      .then(settings => {
        const widgets = orderWidgets(dashboard.widgets);

        dashboard.widgets.instances = widgets.map(widget => {
          widget.settings = getUpdatedWidgetSettings(widget, getSettings(settings, widget.type));

          return widget;
        });

        return dashboard;
      });
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

  function getUpdatedWidgetSettings(widget, settings = {}) {
    return { ...widget.settings, ...settings };
  }

  function getSettings(settings, type) {
    const configuration = settings.find(e => e.type === type);

    return configuration ? configuration.settings || {} : {};
  }
};
