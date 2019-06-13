module.exports = dependencies => {
  const logger = dependencies('logger');
  const dashboardModule = require('../../../lib/dashboard')(dependencies);

  return {
    canList,
    canGet,
    canRemove,
    canCreate,
    canUpdate,
    loadDashboard,
    loadWidget,
    assertDefaultDashboard
  };

  function loadDashboard(req, res, next) {
    dashboardModule.getDashboardForUser(req.params.id, req.user)
      .then(dashboard => {
        if (!dashboard) {
          return res.status(404).json({
            error: {
              code: 404,
              message: 'Not found',
              details: 'dashboard not found'
            }
          });
        }

        req.dashboard = dashboard;
        next();
      })
      .catch(err => {
        logger.error('Error while loading dashboard', err);

        res.status(500).send();
      });
  }

  function loadWidget(req, res, next) {
    if (!req.dashboard) {
      return res.status(500).json({
        error: {
          code: 500,
          message: 'Server error',
          details: 'dashboard is not defined in request'
        }
      });
    }

    const widget = (req.dashboard.widgets.instances || []).find(widget => (widget.id === req.params.wid));

    if (!widget) {
      return res.status(404).json({
        error: {
          code: 404,
          message: 'Not found',
          details: 'widget not found'
        }
      });
    }

    req.widget = widget;

    next();
  }

  function canList(req, res, next) {
    next();
  }

  function canGet(req, res, next) {
    next();
  }

  function canRemove(req, res, next) {
    next();
  }

  function canCreate(req, res, next) {
    next();
  }

  function canUpdate(req, res, next) {
    next();
  }

  function assertDefaultDashboard(req, res, next) {
    dashboardModule.createDefaultDashboard(req.user)
      .then(() => next())
      .catch(err => {
        const details = 'Can not create default dashboard';

        logger.error(details, err);

        res.status(500).json({
          error: {
            code: 500,
            message: 'Server error',
            details
          }
        });
      });
  }
};
