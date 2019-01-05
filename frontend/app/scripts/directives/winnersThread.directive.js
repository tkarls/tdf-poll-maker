'use strict';

function WinnersThreadController($http, $scope, $localStorage, $timeout, $log, $sce){
 
    $scope.storage = $localStorage;

    $scope.loadWinners = function(uri) {
        $scope.loadingWinners = true;
        $scope.data = {
            numWinners: 3
        };

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

    $scope.getNumumWinnersWithTies = function () {
        if(!$scope.winners){
            return $scope.data.numWinners;
        }

        var numPlaces = $scope.data.numWinners;
        var numWinnersNeeded = 0;
        var lastVotes = 0;
        var place = 0;
        $scope.winners.forEach(function(winner){
            if(lastVotes !== winner.votes){
                numPlaces--;
                place++;
            }
            if(numPlaces >= 0){
                numWinnersNeeded++;
            }
            lastVotes = winner.votes;

            winner.place = place;
        });

        return numWinnersNeeded;
    };

    var trim = function (string){
        if(string){
            return string.trim().replace(/^\"|\"$/g, '');
        }
        return 'unknown';
    };

    $scope.color = {
        1: '#CCB200',
        2: '#919191',
        3: '#DA7726',
        dollColor: '#FF00FF',
        captionColor: '#FF0000'
    };

    $scope.colorOptions = {
        format: 'hexString',
        alpha: false,
        case: 'upper'
    };

    var places = {
        1: 'First',
        2: 'Second',
        3: 'Third',
        4: 'Fourth',
        5: 'Fifth',
    };

    var size = {
        1: 200,
        2: 160,
        3: 140,
    };

    $scope.misc = {
        reverseOrder: true
    };

    $scope.getAllWinnerBbCode = function () {
        var winners = $scope.winners.slice(0, $scope.getNumumWinnersWithTies());
        if($scope.misc.reverseOrder === true){
            winners = winners.reverse();
        }

        var bbCode = '[center]\n';
        winners.forEach(function (winner){
            bbCode += '[size=' + (size[winner.place] || 130) + ']';
                bbCode += 'In [color='+($scope.color[winner.place] || '#000000')+']'+ (places[winner.place] || (winner.place.toString() + ':th')) +' place[/color], with [b]'+ winner.votes +' votes[/b]\n';
                bbCode+= '[b][color='+$scope.color.dollColor+']'+trim(winner.dollName)+'[/color][/b] in [color='+$scope.color.captionColor+']"'+trim(winner.caption) +'"[/color]\n';
                bbCode+= 'by [i]'+trim(winner.contestant) +'[/i]\n';
                bbCode+= '[img600]'+winner.imageUri+'[/img600]\n';
            bbCode += '[/size]\n\n\n\n\n\n';

        });

        bbCode = bbCode.trim();
        bbCode+='[/center]';

        return bbCode;
    };

    var bbParser = window.XBBCODE;
    var tags = bbParser.tags();
    var newTags = {
        img600: tags.img,
        size: {
            openTag: function(params) {
                params = params || '';

                var mySize = parseInt(params.substr(1),10) || 0;
                if (mySize < 50){
                    mySize = 50;
                }
                if(mySize > 200){
                    mySize = 200;
                }

                return '<span style="font-size:' + mySize + '%">';
            },
            closeTag: function() {
                return '</span>';
            }
        }
    };
    bbParser.addTags(newTags);

    $scope.getAllWinnerHtmlCode = function () {
        var res = bbParser.process({
            text: $scope.getAllWinnerBbCode(),
            removeMisalignedTags: false,
            addInLineBreaks: true
        });

        return $sce.trustAsHtml(res.html);
    };

    //run code on page load
    loadThreads();
}

function winnersThread(){
    return {
        templateUrl: 'views/winnersThread.html',
        restrict: 'EA',
        scope: {
        },
        controller: WinnersThreadController,
        controllerAs: 'vm',
        bindToController: true
    };
}

angular.module('tdfPollMakerApp')
    .directive('winnersThread', winnersThread);