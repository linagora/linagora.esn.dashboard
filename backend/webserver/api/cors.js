const corsAnywhere = require('cors-anywhere');

module.exports = (dependencies, lib, router, moduleName) => {
  const moduleMW = dependencies('moduleMW');

  const proxy = corsAnywhere.createServer({
    originWhitelist: [],
    requireHeaders: [],
    removeHeaders: []
  });

  router.all('/cors*',
    moduleMW.requiresModuleIsEnabledInCurrentDomain(moduleName)
  );

  router.get('/cors/:proxyUrl*', (req, res) => {
    req.url = req.url.replace('/cors/', '/');
    proxy.emit('request', req, res);
  });
};
