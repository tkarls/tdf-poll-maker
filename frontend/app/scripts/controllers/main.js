'use strict';

/**
 * @ngdoc function
 * @name tdfPollMakerApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the tdfPollMakerApp
 */
angular.module('tdfPollMakerApp')
    .controller('MainCtrl', function ($scope, $localStorage) {
        $scope.storage = $localStorage;    
    });
