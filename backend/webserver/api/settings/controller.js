module.exports = dependencies => {
  const { catchError } = require('../commons')(dependencies);
  const settingsModule = require('../../../lib/settings')(dependencies);

  return {
    getSettings
  };

  function getSettings(req, res) {
    const user = req.user;

    Promise.all([
      settingsModule.getWidgetsSettings({ user }),
      settingsModule.getDashboardsSettings({ user })
    ])
    .then(results => res.status(200).json(
      {
        widgets: {
          settings: results[0]
        },
        dashboards: {
          settings: results[1]
        }
      }
    ))
    .catch(err => catchError(err, res, 'Can not get settings'));
  }
};
