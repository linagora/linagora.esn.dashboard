(function(angular) {
  'use strict';

  angular
    .module('linagora.esn.dashboard')
    .controller(
      'dashboardApplicationMenuController',
      dashboardApplicationMenuController
    );

  function dashboardApplicationMenuController(DashboardService) {
    var self = this;

    DashboardService.getApplicationUrl().then(function(url) {
      self.url = url;
    });
  }
})(angular);
