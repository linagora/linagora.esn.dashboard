(function(angular) {
  angular
    .module('linagora.esn.dashboard')
    .factory('DashboardService', DashboardService);

  function DashboardService(esnConfig, DASHBOARD_DEFAULT_URL) {
    return {
      getApplicationUrl: getApplicationUrl
    };

    function getApplicationUrl() {
      return esnConfig('linagora.esn.dashboard.applicationUrl')
        .then(function(url) {
          if (!url) {
            return DASHBOARD_DEFAULT_URL;
          }

          return url.endsWith('/') ? url : url + '/';
        });
    }
  }
})(angular);
