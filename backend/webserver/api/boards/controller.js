module.exports = dependencies => {
  const logger = dependencies('logger');
  const dashboardModule = require('../../../lib/dashboard')(dependencies);
  const { denormalizeDashboard, denormalizeWidget } = require('./denormalize')(dependencies);

  return {
    addWidget,
    list,
    listWidgets,
    get,
    remove,
    removeWidget,
    create,
    update,
    updateWidgetSettings,
    reorderWidgets
  };

  function list(req, res) {
    dashboardModule.list({ creator: req.user._id })
      .then((dashboards = []) => (dashboards))
      .then(dashboards => Promise.all(dashboards.map(denormalizeDashboard)))
      .then(denormalized => res.status(200).json(denormalized))
      .catch(err => catchError(err, res, 'Error while listing dashboards'));
  }

  function get(req, res) {
    dashboardModule.get(req.params.id)
      .then(dashboard => {
        if (!dashboard) {
          return res.status(404).send();
        }

        return dashboard;
      })
      .then(denormalizeDashboard)
      .then(dashboard => res.status(200).json(dashboard))
      .catch(err => catchError(err, res, 'Error while getting dashboard'));
  }

  function remove(req, res) {
    dashboardModule.remove(req.params.id)
      .then(() => res.status(204).send())
      .catch(err => catchError(err, res, 'Error while removing dashboard'));
  }

  function create(req, res) {
    const dashboard = {...req.body, creator: req.user._id };

    dashboardModule.create(dashboard)
      .then(denormalizeDashboard)
      .then(created => res.status(201).json(created))
      .catch(err => catchError(err, res, 'Error while creating widgets'));
  }

  function update(req, res) {
    if (!req.body || !Object.keys(req.body).length) {
      const message = 'Request body is required';

      return badRequest(new Error(message), res, message);
    }

    dashboardModule.update(req.params.id, req.body)
      .then(denormalizeDashboard)
      .then(updated => res.status(200).json(updated))
      .catch(err => {
        if (err.message.match(/is required/)) {
          return badRequest(err, res, 'Request body is malformed');
        }

        catchError(err, res, 'Error while updating dashboard');
      });
  }

  function removeWidget(req, res) {
    dashboardModule.removeWidget(req.params.id, req.params.wid)
      .then(() => res.status(204).send())
      .catch(err => catchError(err, res, 'Error while removing widgets'));
  }

  function addWidget(req, res) {
    dashboardModule.addWidget(req.params.id, req.body)
      .then(() => res.status(200).send())
      .catch(err => {
        if (err.name && err.name === 'ValidationError') {
          badRequest(err, res, 'Widget data is malformed');
        } else {
          catchError(err, res, 'Error while adding widgets');
        }
      });
  }

  function listWidgets(req, res) {
    dashboardModule.listWidgets(req.params.id)
      .then(widgets => Promise.all((widgets || []).map(denormalizeWidget)))
      .then(widgets => res.status(200).send(widgets))
      .catch(err => catchError(err, res, 'Error while listing widgets'));
  }

  function reorderWidgets(req, res) {
    if (!req.body || req.body.length === 0) {
      const message = 'Request body is required';

      return badRequest(new Error(message), res, message);
    }

    dashboardModule.reorderWidgets(req.params.id, req.body)
      .then(() => res.status(200).send())
      .catch(err => catchError(err, res, 'Error while ordering widgets'));
  }

  function updateWidgetSettings(req, res) {
    dashboardModule.updateWidgetSettings(req.params.id, req.params.wid, req.body)
      .then(denormalizeWidget)
      .then(widget => res.status(200).send(widget))
      .catch(err => catchError(err, res, 'Error while updating widget'));
  }

  function catchError(err, res, details) {
    logger.error(details, err);

    res.status(500).json({
      error: {
        code: 500,
        message: 'Server Error',
        details
      }
    });
  }

  function badRequest(err, res, details) {
    logger.error('Schema error', err);

    res.status(400).json({
      error: {
        code: 400,
        message: 'Bad request',
        details
      }
    });
  }
};