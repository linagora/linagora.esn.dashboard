module.exports = dependencies => {

  const esnConfig = dependencies('esn-config');

  return {
    getWidgetsSettings,
    getDashboardsSettings
  };

  function getWidgetsSettings({ user }) {
    return esnConfig('widgets')
      .inModule('linagora.esn.dashboard')
      .forUser(user)
      .get()
      .then(config => (config || []));
  }

  function getDashboardsSettings({ user }) {
    return esnConfig('dashboards')
      .inModule('linagora.esn.dashboard')
      .forUser(user, true)
      .get()
      .then(config => (config || {}));
    }
};
