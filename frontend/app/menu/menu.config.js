(function(angular) {
  'use strict';

  angular.module('linagora.esn.dashboard').config(injectApplicationMenu);

  function injectApplicationMenu(dynamicDirectiveServiceProvider) {
    dynamicDirectiveServiceProvider.addInjection(
      'esn-application-menu',
      new dynamicDirectiveServiceProvider.DynamicDirective(
        true,
        'dashboard-application-menu',
        { priority: 30 }
      )
    );
  }
})(angular);
