'use strict';

/**
 * @ngdoc function
 * @name tdfPollMakerApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the tdfPollMakerApp
 */
angular.module('tdfPollMakerApp')
    .controller('MainCtrl', function ($http, $scope, $localStorage, $timeout, $log) {
        
        $scope.storage = $localStorage;

        $scope.loadCandidates = function(uri) {
            $scope.loadingCandidates = true;
            return $http.post('/api/parse/entry-thread', {threadUri: uri}).then( function (result) {
                
                $scope.candidates = result.data.map( function (cand) {
                    var storageKey = uri + cand.postAuthor + cand.postBody.images[0];
                    cand.storageKey = storageKey;
                    $localStorage[storageKey] = $localStorage[storageKey] || {isIncluded: true};
                    $localStorage[storageKey].imageSelectionIndex = $localStorage[storageKey].imageSelectionIndex || 0;
                    return cand;
                });
            }).catch(function (error){
                $log.error(error);
            }).then(function (){
                $scope.loadingCandidates = false;
                
                $timeout(function(){
                    //run a digest cycle after page is rendered!
                },1000);
            });
        };

        function loadThreads() {
            return $http.post('/api/parse/forum-page').then(function (result){
                $scope.months = result.data;
            }).catch(function (error){
                $log.error(error);
            }).then(function (){});
        }

        var trim = function (string){
            if(string){
                return string.trim().replace(/^\"|\"$/g, '');
            }
            return 'unknown';
        };

        $scope.getBbCode = function(cand) {
            var nameCaption = $localStorage[cand.storageKey];
            return '[center][list][size=140][color=#EFF7FB][*][*][*][*]*[/color][b][color=#FF00FF]'+trim(nameCaption.dollName)+'[/color] [color=#000000]in[/color] [color=#0040FF]"'+trim(nameCaption.caption)+'" [/color][/b][color=#EFF7FB][*]*[/color][i][color=#000000]by '+cand.postAuthor+'[/color][/i][/size][color=#EFF7FB][*]*[/color][color=#EFF7FB][*][img600]'+cand.postBody.images[nameCaption.imageSelectionIndex]+'[/img600][/color][/list][/center]';
        };

        $scope.getAllBbCode = function() {
            var text = '';
            ($scope.candidates || []).forEach(function(element) {
                if(!$localStorage[element.storageKey].isIncluded){
                    return;
                }
                text += $scope.getBbCode(element) + '\n';
            });
 
            return text.trim();
        };

        $scope.getNumEntries = function() {
            if(!$scope.candidates){
                return 0;
            }

            return $scope.candidates.filter( function (element) {
                return $localStorage[element.storageKey].isIncluded;
            }).length;
        };


        //run code on page load
        loadThreads();
        
    }).filter('highlight', function($sce, $localStorage) {
        return function(text, cand) {
            var regex = new RegExp(/((?:[A-Z][a-zA-Z_\-0-9]+ )?(?:[A-Z][a-zA-Z_\-0-9]+ and )?[A-Z][a-zA-Z_\-0-9]+) (?:i|I)n.{0,4}(?:"|'')([a-zA-Z0-9!?.,' -_~]+)(?:"|'')/);
            
            var match = text.match(regex);
            if(match){
                if(!$localStorage[cand.storageKey].dollName){
                    $localStorage[cand.storageKey].dollName = match[1];        
                }
                if(!$localStorage[cand.storageKey].caption){
                    $localStorage[cand.storageKey].caption = match[2];      
                }
            }
            text = text.replace(regex, '<span class="highlighted">$1</span> in "<span class="highlighted">$2</span>"');
            
            return $sce.trustAsHtml(text);
        };
      });
