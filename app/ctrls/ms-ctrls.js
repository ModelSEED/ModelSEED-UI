
angular.module('ms-ctrls', [])
.controller('Login', ['$scope', '$state', 'authService', '$window',
    function($scope, $state, auth, $window) {

    $scope.loginUser = function(user, pass) {
        $scope.loading = true;
        auth.login(user, pass)
            .success(function(data) {

                // see https://github.com/angular-ui/ui-router/issues/582
                $state.transitionTo('app.publicModels', {}, {reload: true, inherit: true, notify: false})
                      .then(function() {
                        setTimeout(function(){
                            $window.location.reload();
                        }, 0);
                      });

            }).error(function(e, status){
                console.log('error', e)
                $scope.loading = false;
                if (status == 401) {
                    $scope.inValid = true;
                } else {
                    $scope.failMsg = "Could not reach authentication service: "+e.error_msg;
                }

            })
    }

    $scope.logout = function() {
        auth.logout();
        $state.transitionTo('home', {}, { reload: true, inherit: true, notify: false })
              .then(function() {
                  $window.location.reload();
              });
    }
}])

.controller('Biochem',
['$scope', 'FBA',
function($scope, FBA) {

    $scope.rxnOpts = {query: '', limit: 10, offset: 0, sort: null};
    $scope.cpdOpts = {query: '', limit: 10, offset: 0, sort: null};

    $scope.tabs = {selectedIndex : 0};

    $scope.loadingRxns = true,
    $scope.loadingCpds = true;

    $scope.rxnHeader = [{label: 'ID', key: 'id'},
                        {label: 'Name', key: 'name'},
                        {label: 'Equation', key: 'name'},
                        {label: 'deltaG', key: 'deltaG'},
                        {label: 'detalGErr', key: 'deltaGErr'}];

    $scope.cpdHeader = [{label: 'ID', key: 'id'},
                        {label: 'Name', key: 'name'},
                        {label: 'Formula', key: 'formula'},
                        {label: 'Abbrev', key: 'abbrev'},
                        {label: 'deltaG', key: 'deltaG'},
                        {label: 'detalGErr', key: 'deltaGErr'}];

    $scope.$watch('rxnOpts', function(value){
        $scope.rxnsOpts = value
    }, true)

    FBA.getBiochem()
       .then(function(res) {

            FBA.getRxns(res.reactions)
               .then(function(rxns) {
                    $scope.rxns = rxns;
                    $scope.loadingRxns = false;
               })

            FBA.getCpds(res.compounds)
               .then(function(cpds) {
                    $scope.cpds = cpds;
                    $scope.loadingCpds = false;
               })
       })

}])

.controller('ModelEditor',
['$scope', 'FBA', 'WS', '$mdDialog', '$sce', '$timeout',
function($scope, FBA, WS, $dialog, $sce, $timeout) {
    $scope.FBA = FBA;

    // pre fetch bio chemistry if needed.
    $scope.rxnOpts = {query: '', limit: 10, offset: 0, sort: {field: 'id'}};
    $scope.rxnHeader = [{label: 'ID', key: 'id'},
                        {label: 'Name', key: 'name'},
                        {label: 'Equation', key: 'equation'},
                        {label: 'deltaG', key: 'deltaG'},
                        {label: 'detalGErr', key: 'deltaGErr'}];

    $scope.loadingRxns = true;
    var biochem = FBA.getBiochem()
       .then(function(res) {
            FBA.getRxns(res.reactions)
               .then(function(rxns) {
                    $scope.rxns = rxns;
                    $scope.loadingRxns = false;
               })
       })

    $scope.opts = {query: '', limit: 20, offset: 0, sort: {field: 'id'}};
    $scope.modelHeader = [{label: 'ID', key: 'id'},
                          {label: 'Name', key: 'name'},
                          {label: 'Equation', key: 'equation'}];

    // checked reactions for removal
    $scope.checkedRxns = []

    // get user's writable workspaces
    $scope.loading = true;
    WS.getMyWS()
      .then(function(wsList) {
          $scope.wsList = wsList;
          $scope.selectedWS = wsList[0]; // use first by default
          $scope.loading = false;
      })

    // update model dropdown on workspace dropdown change
    $scope.$watch('selectedWS', function(value) {
        if (!value) return;

        $scope.loading = true;
        $scope.selectedModel = {};
        WS.getMyModels(value.name)
          .then(function(models) {
              $scope.models = models;
              $scope.selectedModel = models[0];
              $scope.loading = false;
          })
    })

    // update model editor on model dropdown change
    $scope.$watch('selectedModel', function(value) {
        $scope.data = undefined;
        if (!value || angular.equals(value, {}))
            return;

        // clear any checked reactions
        $scope.checkedRxns = [];

        updateModel();
    })


    function updateModel() {
        $scope.loadingModel = true;
        WS.getModel($scope.selectedWS.name, $scope.selectedModel.name )
          .then(function(data){
              $scope.data = data.modelreactions;
              $scope.loadingModel = false;
           })
    }


    $scope.addRxns = function(ev, item) {
        $dialog.show({
            templateUrl: 'app/views/dialogs/add-rxns.html',
            targetEvent: ev,
            scope: $scope.$new(),
            preserveScope: true,
            controller: ['$scope', '$http',
            function($scope, $http) {

                $scope.cancel = function(){
                    $dialog.hide();
                }

                $scope.addItems = function(items){
                    console.log('clicked add items... data was', $scope.data)
                    $dialog.hide();
                    var ws = $scope.selectedWS.name,
                        name = $scope.selectedModel.name;

                    $scope.loadingModel = true;
                    FBA.addRxns($scope.selectedWS.name, name, items)
                       .then(function(res) {
                        console.log('res', res)
                            $scope.data = $scope.data.concat(items)
                            $scope.loadingModel = false;
                            console.log('data is now', $scope.data)
                       })
                }
            }]
        })
    }

    $scope.rmRxns = function() {
        var ws = $scope.selectedWS.name,
            name = $scope.selectedModel.name;

        $scope.loadingModel = true;
        FBA.rmRxns(ws, name, $scope.checkedRxns)
           .then(function() {
                //fixme: fix if rxn ids are not unique?
                for (var i=0; i<$scope.data.length; i++) {
                    for (var j=0; j<$scope.checkedRxns.length; j++) {
                        if ($scope.data[i].id === $scope.checkedRxns[j].id) {
                            console.log('removing locally', $scope.data[i])
                            $scope.data.splice(i, 1)
                            break;
                        }
                    }
                }

                $scope.checkedRxns = [];
                $scope.loadingModel = false;
           })
    }

    $scope.editRxn = function(ev, item) {
        $dialog.show({
            templateUrl: 'app/views/dialogs/edit-rxn.html',
            targetEvent: ev, //fixme
            controller: ['$scope', '$http',
            function($scope, $http) {

                $scope.cancel = function(){
                    $dialog.hide();
                }

                $scope.select = function(item){
                }
            }]
        })
    }

    $scope.checkRxn = function(item) {
        item.checked = item.checked ? false : true;

        if (item.checked)
            $scope.checkedRxns.push(item)
        else {
            // remove from checked list
            for (var i=0; i<$scope.checkedRxns.length; i++) {
                if ( angular.equals($scope.checkedRxns[i], item) )
                    $scope.checkedRxns.splice(i, 1)
            }
        }
    }

    $scope.editDirection = function($event, item) {
        item.editable = true;
    }

    $scope.saveDirection = function(item, direction) {
        item.editable = false;
        var ws = $scope.selectedWS.name,
            name = $scope.selectedModel.name;

        $scope.loadingModel = true;
        FBA.saveDirection(ws, name, item.id, direction)
           .then(function(res) {
                var eq = item.equation;

                item.direction = direction;
                item.equation = FBA.splitEq(eq)[0] +
                                FBA.sanitizeDir(direction) +
                                FBA.splitEq(eq)[1];
                $scope.loadingModel = false;
           })
    }

    $scope.joinGenes = function(genes) {
        var ids = []
        for (var i in genes) ids.push(genes[i].id);
        return $sce.trustAsHtml(ids.join('<br>'));
    }

    $scope.editGenes = function(genes) {
        var ids = []
        for (var i in genes) ids.push(genes[i].id);
        return $sce.trustAsHtml(ids.join('<br>'));
    }

}])

.controller('Reconstruct',
['$scope', 'ModelViewer', 'Patric', '$q', '$timeout',
function($scope, MV, Patric, $q, $timeout) {

    $scope.opts = {query: '', limit: 25, offset: 0, sort: null};

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
        templateUrl: 'app/views/general/table.html',
        link: function(scope, elem, attrs) {

        }
    }
 })


.directive('ngTableEditor', function() {
    return {
        restrict: 'EA',
        scope: {
            header: '=tableHeader',
            data: '=tableData',
            opts: '=tableOpts',
            loading: '=tableLoading',
            placeholder: '@tablePlaceholder',
            addItems: '=tableAddItems',
        },
        templateUrl: 'app/views/general/table-editor.html',
        link: function(scope, elem, attrs) {

            scope.checkedItems = [];

            scope.checkItem = function(item) {
                item.checked = item.checked ? false : true;

                if (item.checked)
                    scope.checkedItems.push(item)
                else {
                    // remove from checked list
                    for (var i=0; i<scope.checkedItems.length; i++) {
                        if ( angular.equals(scope.checkedItems[i], item) )
                            scope.checkedItems.splice(i, 1)
                    }
                }
            }

        }
    }
 })


.directive('editable', ['$timeout', 'FBA',
    function($timeout, FBA) {
    return {
        restrict: 'EA',
        link: function(scope, elem, attrs) {

            $(elem).hover(function(){
                $(this).append(' <i class="fa fa-pencil-square-o pull-right"'+
                    ' style="position: absolute; bottom: 0; right: 0;"></i>')
            }, function() {
                $(this).find('i').remove();
            })

        }
    }
 }])

.directive('autoFocus', ['$timeout', function($timeout) {
    return {
        restrict: 'AC',
        link: function(scope, elem) {
            $timeout(function(){
                elem[0].focus();
            }, 0);
        }
    }
}])

.directive('sortable', function() {
    return {
        restrict: 'EA',
        link: function(scope, elem, attrs) {

            // see table styling in core.css for sorting carets
            scope.sortBy = function($event, name) {
                var desc = scope.opts.sort ? !scope.opts.sort.desc : false;
                scope.opts.sort = {field: name, desc: desc};

                angular.element(elem).find('th').removeClass('sorting-asc')
                angular.element(elem).find('th').removeClass('sorting-desc')

                if (desc) {
                    angular.element($event.target).removeClass('sorting-asc')
                    angular.element($event.target).addClass('sorting-desc')
                } else {
                    angular.element($event.target).removeClass('sorting-desc')
                    angular.element($event.target).addClass('sorting-asc')
                }
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

