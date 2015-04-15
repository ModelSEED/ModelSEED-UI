
angular.module('ms-controllers', [])
.controller('Reconstruct',
['$scope', 'ModelViewer', 'Patric', '$q', '$timeout',
function($scope, MV, Patric, $q, $timeout) {

    $scope.opts = {query: '', limit: 25, offset: 0, sort: null};
    var desc = false;

    $scope.$watch('opts', function(value){
        update()
    }, true)

    function update(opts) {
        $scope.loading = true;
        Patric.getGenomes( $scope.opts )
              .then(function(genomes) {
                  $scope.genomes = genomes;
                  $timeout(function() {
                      $scope.loading = false;
                  })
              })
    }

}])

.controller('Biochem',
['$scope', 'FBA',
function($scope, FBA) {

    $scope.opts = {query: '', limit: 10, offset: 0, sort: null};
    $scope.rxnOpts = {query: '', limit: 10, offset: 0, sort: null};
    $scope.cpdOpts = {query: '', limit: 10, offset: 0, sort: null};

    $scope.tabs = {
        selectedIndex : 0
    };


    $scope.loadingRxns = true,
    $scope.loadingCpds = true;


    $scope.rxnHeader = [{title: 'ID', key: 'id'},
                        {title: 'Name', key: 'name'},
                        {title: 'Equation', key: 'name'},
                        {title: 'deltaG', key: 'deltaG'},
                        {title: 'detalGErr', key: 'deltaGErr'}];

    $scope.cpdHeader = [{title: 'ID', key: 'id'},
                        {title: 'Name', key: 'name'},
                        {title: 'Formula', key: 'formula'},
                        {title: 'Abbrev', key: 'abbrev'},
                        {title: 'deltaG', key: 'deltaG'},
                        {title: 'detalGErr', key: 'deltaGErr'}];


    FBA.getBiochem()
       .then(function(res) {

            FBA.getRxns(res.reactions)
               .then(function(rxns) {
                    $scope.rxns = rxns;
                    $scope.loadingRxns = false;
               })

            FBA.getCpds(res.compounds)
               .then(function(cpds) {
                console.log('cpds', cpds)
                    $scope.cpds = cpds;
                    $scope.loadingCpds = false;
               })
       })

}])



.directive('ngTable', function() {
    return {
        restrict: 'EA',
        scope: {
            header: '=tableHeader',
            data: '=tableData',
            opts: '=tableOpts',
            loading: '=tableLoading',
            placeholder: '@tablePlaceholder',
        },
        templateUrl: 'views/biochem/table.html',
        link: function(scope, elem, attrs) {


        }
    }
 })


.directive('sortable', function() {
    return {
        restrict: 'EA',
        scope: true,
        link: function(scope, elem, attrs) {
            var sorted;

            scope.sortBy = function($event, name) {
                console.log('sorting!', name)

                var desc = scope.opts.sort ? !scope.opts.sort.desc : false;
                scope.opts.sort = {field: name, desc: desc};


                angular.element(elem).find('i').remove();

                if (desc)
                    angular.element($event.target)
                           .append(' <i class="fa fa-caret-up pull-right"></i>')
                else
                    angular.element($event.target)
                           .append(' <i class="fa fa-caret-down pull-right"></i>')
            }
        }
    }
 })


.directive('pagination', function() {
    return {
        restrict: 'EA',
        scope: true,
        link: function(scope, elem, attrs) {

            scope.next = function() {
                scope.opts.offset += scope.opts.limit;
            }

            scope.prev = function() {
                scope.opts.offset -= scope.opts.limit;
            }
        }
    }
 })

