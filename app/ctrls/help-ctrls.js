
angular.module('help-ctrls', [])
.controller('Help', ['$scope', function($scope) {

    $scope.url = "https://api.modelseed.mcs.anl.gov";
    $scope.version = 1;

}])
.directive('apiParams', function() {
    return {
        restrict: 'EA',
        link: function(scope, elem, attrs) {
        	/*
        	var content = angular.element(elem)
        	var contentText = content.text();
        	var lines = contentText.split('\n');

        	for (var i=0; i<lines.length; i++) {
        		var item = lines[i].split(' - ')[0];

        		console.log('item *'+item+'*')
        		if (item === '') continue;

        		var param = item.split(' (')[0].replace(' ','');
        		console.log()
        		var type = item.split(' (')[1].replace(')', '')

        		console.log('replacing', param, 'with new')
        		contentText.replace(''+param+'', '<b>'+param+'</b>')
        	}

        	console.log('contentText', contentText)
        	content.text('')
        	content.append(contentText)*/
        }
    }
 })

.directive('param-required', function() {
    return {
        restrict: 'EA',
        link: function(scope, elem, attrs) {

        }
    }
 })


