
angular.module('help-ctrls', [])
.controller('Help', ['$scope', function($scope) {
    $scope.url = "https://api.modelseed.mcs.anl.gov";
    $scope.version = 1;
}])
