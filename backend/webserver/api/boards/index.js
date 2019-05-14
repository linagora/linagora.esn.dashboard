module.exports = (dependencies, lib, router, moduleName) => {
  const authorizationMW = dependencies('authorizationMW');
  const controller = require('./controller')(dependencies, lib);
  const middleware = require('./middleware')(dependencies, lib);
  const moduleMW = dependencies('moduleMW');

  router.all('/boards*',
    authorizationMW.requiresAPILogin,
    moduleMW.requiresModuleIsEnabledInCurrentDomain(moduleName)
  );

  router.get('/boards',
    middleware.canList,
    controller.list);
};
