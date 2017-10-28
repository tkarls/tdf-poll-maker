'use strict';

function WinnersThreadController($http, $scope, $localStorage, $timeout, $log){
 
    $scope.storage = $localStorage;

    $scope.loadWinners = function(uri) {
        $scope.loadingWinners = true;
        $scope.numWinners = 3;

        return $http.post('/api/parse/poll-thread', {threadUri: uri}).then( function (result) {
            
            $scope.winners = result.data.map( function (winner) {
                return winner;
            });
        }).catch(function (error){
            $log.error(error);
        }).then(function (){
            $scope.loadingWinners = false;
            
            $timeout(function(){
                //run a digest cycle after page is rendered!
            },1000);
        });
    };

    function loadThreads() {
        return $http.post('/api/parse/forum-polls').then(function (result){
            $scope.months = result.data;
        }).catch(function (error){
            $log.error(error);
        }).then(function (){});
    }

    //run code on page load
    loadThreads();
}

function winnersThread(){
    var directive = {
        templateUrl: 'directives/winnersThread.html',
        restrict: 'EA',
        scope: {
        },
        controller: WinnersThreadController,
        controllerAs: 'vm',
        bindToController: true
    };
    return directive;
}

angular.module('tdfPollMakerApp')
    .directive('winnersThread', winnersThread)