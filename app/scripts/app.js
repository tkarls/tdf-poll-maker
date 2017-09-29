'use strict';

/**
 * @ngdoc overview
 * @name tdfPollMakerApp
 * @description
 * # tdfPollMakerApp
 *
 * Main module of the application.
 */
angular
  .module('tdfPollMakerApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        controllerAs: 'main'
      })
      .otherwise({
        redirectTo: '/'
      });
  }).config(function ($locationProvider) {
    $locationProvider.html5Mode(true).hashPrefix('*');
  });
