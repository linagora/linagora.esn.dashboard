(function(angular) {
  'use strict';

  angular
    .module('linagora.esn.dashboard')
    .directive('dashboardApplicationMenu', dashboardApplicationMenu);

  function dashboardApplicationMenu(applicationMenuTemplateBuilder) {
    return {
      retrict: 'E',
      replace: true,
      controller: 'dashboardApplicationMenuController',
      controllerAs: '$ctrl',
      scope: true,
      template: applicationMenuTemplateBuilder(
        { url: '{{$ctrl.url}}', target: '_blank', rel: 'noopener noreferrer' },
        { url: '/linagora.esn.dashboard/images/dashboard.svg' },
        'Dashboard'
      )
    };
  }
})(angular);
