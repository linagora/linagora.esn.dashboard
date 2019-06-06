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

  router.put('/boards',
    middleware.canCreate,
    controller.create);

  router.get('/boards/:id',
    middleware.loadDashboard,
    middleware.canGet,
    controller.get);

  router.delete('/boards/:id',
    middleware.loadDashboard,
    middleware.canRemove,
    controller.remove);

  router.patch('/boards/:id',
    middleware.loadDashboard,
    middleware.canUpdate,
    controller.update);

  router.put('/boards/:id/widgets',
    middleware.loadDashboard,
    middleware.canCreate,
    controller.addWidget);

  router.get('/boards/:id/widgets',
    middleware.loadDashboard,
    middleware.canGet,
    controller.listWidgets);

  router.patch('/boards/:id/widgets/order',
    middleware.loadDashboard,
    middleware.canUpdate,
    controller.reorderWidgets);

  router.delete('/boards/:id/widgets/:wid',
    middleware.loadDashboard,
    middleware.loadWidget,
    middleware.canRemove,
    controller.removeWidget);

  router.post('/boards/:id/widgets/:wid/settings',
    middleware.loadDashboard,
    middleware.loadWidget,
    middleware.canUpdate,
    controller.updateWidgetSettings);
};
