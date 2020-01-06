const corsAnywhere = require('cors-anywhere');

module.exports = (dependencies, lib, router, moduleName) => {
  const moduleMW = dependencies('moduleMW');

  const proxy = corsAnywhere.createServer({
    originWhitelist: [],
    requireHeaders: [],
    removeHeaders: [],
    httpProxyOptions: {
      secure: false
    }
  });

  router.all('/cors*',
    moduleMW.requiresModuleIsEnabledInCurrentDomain(moduleName)
  );

  router.get('/cors', (req, res) => {
    const url = req.query.proxy;

    if (!url) {
      return res.status(400).send();
    }

    req.url = `/${url}`;
    proxy.emit('request', req, res);
  });
};
