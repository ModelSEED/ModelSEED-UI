
angular.module('Regulons', [])
.controller('Regulons',
['$scope', '$http', '$state', 'uiTools', 'Dialogs',
function($scope, $http, $state, uiTools, Dialogs) {

    var query = $state.params.q ? $state.params.q: '';
    var table;

    // fetch data
    if ($state.current.name == "projects.regulons.genes") {
        $scope.opts = {query: query, limit: 25, offset: 0, sort: {field: 'bsu_number'}};
        $http.get('projects/regulons/data/genes.json')
             .then(function(d) {
                table = d.data
                $scope.header = table.thead;
                $scope.data = table.tbody;
             })

    } else if ($state.current.name == "projects.regulons.regulators") {
        $scope.opts = {query: query, limit: 25, offset: 0, sort: {field: 'regulator_name'}};
        $http.get('projects/regulons/data/regulators.json')
             .then(function(data) {
                $scope.header = data.data[0];
                $scope.data = data.data.slice(1);
             })
    }

    if (query !== '') {
        $scope.$watch('opts.query', function(newQ, oldQ) {
            if (newQ !== oldQ)
                $state.transitionTo($state.current.name, {}, {notify: false})
        })
    }

    $scope.formatter = function(item) {
        if (item === '-') return '-';

        var items = item.split('|')
        items.pop();
        return items.join('<br>')
    }

    $scope.download = function($ev) {
        Dialogs.download($ev, table.cols, table.tbody, $state.current.name.split('.').pop() );
    }



}])
