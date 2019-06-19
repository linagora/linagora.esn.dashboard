module.exports = (dependencies, lib, router, moduleName) => {
  const authorizationMW = dependencies('authorizationMW');
  const controller = require('./controller')(dependencies, lib);
  const moduleMW = dependencies('moduleMW');

  router.all('/settings*',
    authorizationMW.requiresAPILogin,
    moduleMW.requiresModuleIsEnabledInCurrentDomain(moduleName)
  );

  router.get('/settings', controller.getSettings);
};
