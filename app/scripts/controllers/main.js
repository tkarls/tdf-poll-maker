'use strict';

/**
 * @ngdoc function
 * @name tdfPollMakerApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the tdfPollMakerApp
 */
angular.module('tdfPollMakerApp')
    .controller('MainCtrl', function ($http, $scope) {
        
        $scope.tdfUri = 'http://dollforum.com/forum/viewtopic.php?f=119&t=90472';

        var loadPollThreads = function() {
            $http.get('http://dollforum.com/forum/viewforum.php?f=119').then((result)=>{
                var html = result.data;
                var a = 2;
            });
        };

        $scope.loadCandidates = function(uri) {
            return $http.post('/api/parse/entry-thread', {threadUri: uri}).then((candidates)=>{
                $scope.candidates = candidates.data;
            });
        }

      
        //run code
        //loadPollThreads();
    }).filter('highlight', function($sce) {
        return function(text, item) {
            var regex = new RegExp(/((?:[A-Z]?[a-zA-z]+ and )?[A-Z]?[a-zA-z]+) (?:i|I)n."([a-zA-Z' -]+)"/)
            
            var match = text.match(regex);
            if(match){
                item.dollName = match[1];
                item.title = match[2]
            }
            text = text.replace(regex, '<span class="highlighted">$1</span> in "<span class="highlighted">$2</span>"')
            
            return $sce.trustAsHtml(text)
        }
      });
