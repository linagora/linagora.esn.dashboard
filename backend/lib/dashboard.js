const uuidV4 = require('uuid').v4;

module.exports = dependencies => {
  const { DASHBOARD_EVENTS, DEFAULT_LIMIT, DEFAULT_OFFSET, DEFAULT_NAME } = require('./constants');
  const mongoose = dependencies('db').mongo.mongoose;
  const pubsub = dependencies('pubsub');
  const esnConfig = dependencies('esn-config');
  const DashboardModel = mongoose.model('Dashboard');

  return {
    list,
    get,
    getDashboardForUser,
    create,
    remove,
    update,
    listWidgets,
    reorderWidgets,
    reorderDashboards,
    addWidget,
    removeWidget,
    updateWidgetSettings,
    updateWidgetColumns,
    createDefaultDashboard,
    checkDefaultDashboardExists
  };

  function list(options = {}) {
    const query = {};

    if (options.creator) {
      query.creator = options.creator;
    }

    return DashboardModel
      .find(query)
      .skip(+options.offset || DEFAULT_OFFSET)
      .limit(+options.limit || DEFAULT_LIMIT)
      .sort({ 'timestamps.creation': 1 })
      .exec();
  }

  function checkDefaultDashboardExists(user) {
    return getDashboardForUser(user._id, user._id).then(dashboard => !!dashboard);
  }

  function createDefaultDashboard(user) {
    return getDefaultWidgets(user)
      .then(defaultWidgets => defaultWidgets || [])
      .then(defaultWidgets => defaultWidgets.map(widget => ({ ...widget, ...{ id: uuidV4() } })))
      .then(defaultWidgets => ({
        _id: user._id,
        name: DEFAULT_NAME,
        creator: user,
        widgets: {
          instances: defaultWidgets
        }
      }))
      .then(dashboard => create(dashboard));
  }

  function getDefaultWidgets(user) {
    return esnConfig('widgets')
      .inModule('linagora.esn.dashboard')
      .forUser(user, true)
      .get()
      .then(widgets => widgets || [])
      .then(widgets => widgets.filter(widget => widget.default))
      .catch(() => []);
  }

  function get(dashboardId) {
    return DashboardModel.findById(dashboardId).exec();
  }

  function getDashboardForUser(dashboardId, userId) {
    return DashboardModel.findOne({ _id: dashboardId, creator: userId }).exec();
  }

  function create(dashboard) {
    if (!dashboard) {
      return Promise.reject(new Error('dashboard is required'));
    }

    return new DashboardModel(dashboard).save()
      .then(created => {
        pubsub.local.topic(DASHBOARD_EVENTS.CREATED).publish(created);

        return created;
      });
  }

  function remove(dashboardId) {
    if (!dashboardId) {
      return Promise.reject(new Error('dashboardId is required'));
    }

    return DashboardModel.findByIdAndRemove(dashboardId)
      .exec()
      .then(removed => {
        if (removed) {
          pubsub.local.topic(DASHBOARD_EVENTS.DELETED).publish(removed);
        }

        return removed;
      });
  }

  function update(dashboardId, dashboard = {}) {
    if (!dashboard.name) {
      return Promise.reject(new Error('name is required'));
    }

    return DashboardModel.findByIdAndUpdate(dashboardId, { $set: { name: dashboard.name } }, { new: true })
      .exec()
      .then(publish);

      function publish(dashboard) {
        pubsub.local.topic(DASHBOARD_EVENTS.UPDATED).publish(dashboard);

        return dashboard;
      }
  }

  function listWidgets(dashboardId) {
    if (!dashboardId) {
      return Promise.reject(new Error('dashboardId is required'));
    }

    return DashboardModel.findById(dashboardId)
      .select('widgets.instances')
      .exec()
      .then(dashboard => (dashboard.widgets.instances || []));
  }

  /**
   * Reorder the widgets
   *
   * @param {*} dashboardId the dashboard ID
   * @param {*} widgets: Array of widget IDs in the right order
   */
  function reorderWidgets(dashboardId, widgetsOrder = []) {
    return DashboardModel.findByIdAndUpdate(dashboardId, { $set: { 'widgets.order': widgetsOrder } }, { new: true })
      .exec()
      .then(publish);

      function publish(dashboard) {
        pubsub.local.topic(DASHBOARD_EVENTS.UPDATED).publish(dashboard);

        return dashboard;
      }
  }

  /**
   * Reorder the dashboards
   *
   * @param {*} dashboardsOrder: Array of dashboard IDs in the right order
   */
  function reorderDashboards(user, dashboardsOrder = []) {
    return esnConfig('dashboards')
      .inModule('linagora.esn.dashboard')
      .forUser(user, true)
      .set('order', dashboardsOrder);
  }

  /**
   * Add a widget to a dashboard
   *
   * @param {*} dashboardId
   * @param {*} widget
   */
  function addWidget(dashboardId, widget) {
    if (!dashboardId) {
      return Promise.reject(new Error('dashboardId is required'));
    }

    if (!widget) {
      return Promise.reject(new Error('widget is required'));
    }

    // used mongoose version does not validate $push data so that we can put anything without validating...
    //return DashboardModel.findOneAndUpdate({ _id: dashboardId }, { $push: { 'widgets.instances': widget } })
    return DashboardModel.findById(dashboardId)
      .exec()
      .then(dashboard => {
        if (!dashboard) {
          throw new Error('Dashboard not found');
        }

        return dashboard;
      })
      .then(pushWidget)
      .then(publish);

    function pushWidget(dashbboard) {
      dashbboard.widgets.instances.push(widget);

      return dashbboard.save();
    }

    function publish(dashbboard) {
      pubsub.local.topic(DASHBOARD_EVENTS.UPDATED).publish(dashbboard);
    }
  }

  /**
   * Remove a widget from a dashboard
   *
   * @param {*} dashboardId
   * @param {*} widgetId
   */
  function removeWidget(dashboardId, widgetId) {
    return DashboardModel.findByIdAndUpdate(dashboardId, { $pull: { 'widgets.instances': { id: widgetId }, 'widgets.order': widgetId } })
      .exec()
      .then(updated => {
        pubsub.local.topic(DASHBOARD_EVENTS.UPDATED).publish(updated);

        return updated;
      });
  }

  /**
   * Update a widget settings
   */
  function updateWidgetSettings(dashboardId, widgetId, settings) {
    if (!dashboardId) {
      return Promise.reject(new Error('dashboardId is required'));
    }

    if (!widgetId) {
      return Promise.reject(new Error('widgetId is required'));
    }

    return DashboardModel.findById(dashboardId)
      .exec()
      .then(dashboard => {
        if (!dashboard) {
          throw new Error('Dashboard not found');
        }

        return dashboard;
      })
      .then(updateWidgetSettings)
      .then(publish);

    function updateWidgetSettings(dashbboard) {
      const widget = dashbboard.widgets.instances.find((widget => widget.id === widgetId));

      if (!widget) {
        return Promise.reject(new Error('Widget has not been found'));
      }

      widget.settings = settings;

      return dashbboard.save();
    }

    function publish(dashbboard) {
      pubsub.local.topic(DASHBOARD_EVENTS.UPDATED).publish(dashbboard);
    }
  }

  function updateWidgetColumns(dashboardId, widgetId, columns) {
    if (!dashboardId) {
      return Promise.reject(new Error('dashboardId is required'));
    }

    if (!widgetId) {
      return Promise.reject(new Error('widgetId is required'));
    }

    return DashboardModel.findById(dashboardId)
      .exec()
      .then(dashboard => {
        if (!dashboard) {
          throw new Error('Dashboard not found');
        }

        return dashboard;
      })
      .then(_updateWidgetColumns)
      .then(publish);

    function _updateWidgetColumns(dashbboard) {
      const widget = dashbboard.widgets.instances.find((widget => widget.id === widgetId));

      if (!widget) {
        return Promise.reject(new Error('Widget has not been found'));
      }

      widget.settings = {...widget.settings, ...{ columns }};

      return dashbboard.save();
    }

    function publish(dashbboard) {
      pubsub.local.topic(DASHBOARD_EVENTS.UPDATED).publish(dashbboard);
    }
  }
};
