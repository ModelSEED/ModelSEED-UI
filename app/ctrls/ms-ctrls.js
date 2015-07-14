
angular.module('ms-ctrls', [])
.controller('Login', ['$scope', '$state', '$stateParams', 'Auth', '$window',
/**
 * [Login contoller used on login/logout]
 * @param $scope
 * @param $state
 * @param Auth    [Auth Service]
 * @param $window [Used to do refresh of app state]
 */
function($scope, $state, $stateParams, Auth, $window) {

    // set login method
    if ($stateParams.login == 'patric')
        $scope.method = Auth.loginMethod('patric');
    else
        $scope.method = Auth.loginMethod('rast');


    // sets method and changes url param
    $scope.switchMethod = function(method) {
        $scope.method = Auth.loginMethod(method);
        $state.go('home', {login: method});
    }

    $scope.loginUser = function(user, pass) {
        $scope.loading = true;

        if ($scope.method.name == 'PATRIC')
            var prom = Auth.loginPatric(user, pass)
        else
            var prom = Auth.login(user, pass)

        prom.success(function(data) {
            // see https://github.com/angular-ui/ui-router/issues/582
            if ($stateParams.redirect) {
                var path = $stateParams.redirect.replace(/%2F/g, '/');
                var p = $state.transitionTo('app.modelPage', {path: path},
                                        {reload: true, inherit: true, notify: false})
            } else
                var p = $state.transitionTo('app.reconstruct', {}, {reload: true, inherit: true, notify: false})

            p.then(function() {
                setTimeout(function(){
                    $window.location.reload();
                }, 0);
            });
        }).error(function(e, status){
            $scope.loading = false;
            if (status == 401)
                $scope.inValid = true;
            else
                $scope.failMsg = "Could not reach authentication service: "+e.error_msg;
        })
    }

    $scope.logout = function() {
        Auth.logout();
        $state.transitionTo('home', {}, { reload: true, inherit: true, notify: false })
              .then(function() {
                  $window.location.reload();
              });
    }
}])

.controller('Home', ['$scope', '$stateParams',
function($scope, $stateParams) {
    console.log('$stateParams', $stateParams)
}])



.controller('Run',
['$scope', '$http',
function($scope, $http) {


}])


.controller('Biochem',['$scope', 'Biochem',
/**
 * [Responsible for options, table specs,
 * 	and updating of reaction/compound tables ]
 * @param  {[type]} $scope  [description]
 * @param  {[type]} Biochem [Biochem Service]
 */
function($scope, Biochem) {
    $scope.rxnOpts = {query: '', limit: 10, offset: 0, sort: {field: 'id'},
                      visible: ['id', 'name', 'definition', 'deltag', 'deltagerr'] };
    $scope.cpdOpts = {query: '', limit: 10, offset: 0, sort: null,
                      visible: ['id', 'name', 'formula', 'abbreviation', 'deltag', 'deltagerr', 'charge'] };

    $scope.tabs = {selectedIndex : 0};

    $scope.rxnHeader = [{label: 'ID', key: 'id'},
                        {label: 'Name', key: 'name'},
                        {label: 'EQ', key: 'definition'},
                        {label: 'deltaG', key: 'deltag'},
                        {label: 'detalGErr', key: 'deltagerr'}];

    $scope.cpdHeader = [{label: 'ID', key: 'id'},
                        {label: 'Name', key: 'name'},
                        {label: 'Formula', key: 'formula'},
                        {label: 'Abbrev', key: 'abbreviation'},
                        {label: 'deltaG', key: 'deltag'},
                        {label: 'detalGErr', key: 'deltagerr'},
                        {label: 'Charge', key: 'charge'}];


    function updateRxns() {
        Biochem.get('model_reaction', $scope.rxnOpts)
               .then(function(res) {
                    $scope.rxns = res;
                    $scope.loadingRxns = false;
               })
    }

    function updateCpds() {
        Biochem.get('model_compound', $scope.cpdOpts)
               .then(function(res) {
                    $scope.cpds = res;
                    $scope.loadingCpds = false;
               })
    }

    $scope.$watch('rxnOpts', function(after, before) {
        $scope.loadingRxns = true;
        updateRxns();
    }, true)

    $scope.$watch('cpdOpts', function(opts) {
        $scope.loadingCpds = true;
        updateCpds();
    }, true)

    $scope.doSomething = function(row) {
        console.log('row', row)
    }
}])

.controller('MediaEditor',
['$scope', 'FBA', 'WS', '$mdDialog', '$sce', '$http', 'Biochem', '$timeout',
/**
 * [Responsible for:
 *  	- table options/spec,
 *  	- updating state of table,
 *  	- adding, removing, updating things in table(s)]
 * @param  {[type]} $scope   [description]
 * @param  {[type]} FBA      [OLD FBA Service]
 * @param  {[type]} WS       [Workspace Service]
 * @param  {[type]} $dialog  [Material Dialog]
 * @param  {[type]} $sce     [Needed for altering of DOM]
 * @param  {[type]} $timeout [description]
 * @return {[type]}          [description]
 */
function($scope, FBA, WS, $dialog, $sce, $http, Biochem, $timeout) {

    // data model for media data
    $scope.data;

    // data model for checked compounds
    $scope.checkedCpds= [];

    $scope.opts = {query: '', limit: 10, offset: 0, sort: {field: 'id'}};

    var req = 'data/test-data/Rsp_minimal.json';
    $scope.loading = true
    $http.get(req)
         .then(function(res) {
             var cpds = res.data.mediacompounds;
             var data = [];
             for (var i=0; i<cpds.length; i++) {
                 var obj = cpds[i];
                 obj.id = getCpdName(obj.compound_ref)
                 data.push(obj)
             }

             $scope.data = data;
             $scope.loading = false;
         })


    function getCpdName(ref) {
        var pathList = ref.split('/');
        return pathList[pathList.length -1];
    }

    // replace with whated update method(s)
    $scope.addToDataModel = function(newItems) {
        $scope.data = $scope.data.concat(newItems)
    }

    $scope.checkCpd = function(item) {
        console.log('item', item)
        item.checked = item.checked ? false : true;

        if (item.checked)
            $scope.checkedCpds.push(item)
        else {
            // remove from checked list
            for (var i=0; i<$scope.checkedCpds.length; i++) {
                if ( angular.equals($scope.checkedCpds[i], item) )
                    $scope.checkedCpds.splice(i, 1)
            }
        }
    }

    $scope.addCpds = function(ev, item) {
        $dialog.show({
            templateUrl: 'app/views/dialogs/add-cpds.html',
            targetEvent: ev,
            scope: $scope.$new(),
            preserveScope: true,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                $scope.cancel = function(){
                    $dialog.hide();
                }

                $scope.addItems = function(items){
                    $dialog.hide();

                    // add items to media
                    var newItems = [];
                    for (var i=0; i<items.length; i++) {
                        var cpd = items[i]
                        newItems.push({compound_ref: '/some/path/ref/'+cpd.id,
                                       deltagerr: cpd.deltagerr,
                                       deltag: cpd.deltag,
                                       name: cpd.name,
                                       concentration: 0})
                    }

                    $scope.addToDataModel(newItems)
                }
            }]
        })
    }

    $scope.rmCpds = function() {
        for (var i=0; i<$scope.data.length; i++) {
            for (var j=0; j<$scope.checkedCpds.length; j++) {
                if ($scope.data[i].compound_ref === $scope.checkedCpds[j].compound_ref) {
                    $scope.data.splice(i, 1)
                    break;
                }
            }
        }

        $scope.checkedCpds = [];
    }

    $scope.cpdOpts = {query: '', limit: 10, offset: 0, sort: null};
    $scope.cpdHeader = [{label: 'Name', key: 'name'},
                        {label: 'ID', key: 'id'},
                        {label: 'Formula', key: 'formula'},
                        {label: 'Abbrev', key: 'abbreviation'},
                        {label: 'deltaG', key: 'deltag'},
                        {label: 'detalGErr', key: 'deltagerr'},
                        {label: 'Charge', key: 'charge'}];

    function updateCpds() {
        Biochem.get('compound', $scope.cpdOpts)
               .then(function(res) {
                    $scope.cpds = res;
                    $scope.loadingCpds = false;
               })
    }

    $scope.$watch('cpdOpts', function(value){
        $scope.loadingCpds = true;
        updateCpds();
    }, true)

}])

.controller('ModelEditor',
['$scope', 'FBA', 'WS', '$mdDialog', '$sce',
/**
 * [Responsible for:
 *  	- table options/spec,
 *  	- updating state of table,
 *  	- adding, removing, updating things in table(s)]
 * @param  {[type]} $scope   [description]
 * @param  {[type]} FBA      [OLD FBA Service]
 * @param  {[type]} WS       [Workspace Service]
 * @param  {[type]} $dialog  [Material Dialog]
 * @param  {[type]} $sce     [Needed for altering of DOM]
 * @param  {[type]} $timeout [description]
 * @return {[type]}          [description]
 */
function($scope, FBA, WS, $dialog, $sce) {
    $scope.FBA = FBA;

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

    /**
     * [checkedRxns description]
     * @type {Array}
     */
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

    /**
     * [updateModel description]
     */
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
                    $dialog.hide();
                    var ws = $scope.selectedWS.name,
                        name = $scope.selectedModel.name;

                    $scope.loadingModel = true;
                    FBA.addRxns($scope.selectedWS.name, name, items)
                       .then(function(res) {
                            $scope.data = $scope.data.concat(items)
                            $scope.loadingModel = false;
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
['$scope', 'Patric', '$mdDialog', '$timeout', '$http', 'Dialogs', 'ViewOptions',
function($scope, Patric, $dialog, $timeout, $http, Dialogs, ViewOptions) {
    // microbes / plants view
    $scope.view = ViewOptions.getType();

    $scope.changeView = function(view) {
        $scope.view = ViewOptions.changeType(view);
    }

    $scope.showMenu = function() {
      $scope.menuVisible = true;
    }

    $http.get('data/plants/plants.json')
         .then(function(res) {
             $scope.plants = res.data;
         })

    $scope.filters = {myGenomes: false};

    $scope.opts = {query: '',
                   limit: 25,
                   offset: 0,
                   sort: null,
                   visible: ['genome_name', 'genome_id', 'genus', 'taxon_id', 'contigs']};

    // all possible columns
    $scope.columns = [{prop: 'genome_name', label: 'Name'},
                      {prop: 'genome_id', label: 'ID'},
                      {prop: 'genus', label: 'Genus'},
                      {prop: 'taxon_id', label: 'Tax ID'},
                      {prop: 'contigs', label: 'Contigs'}]

    $scope.getLabel = function(prop) {
        for (var i=0; i<$scope.columns.length; i++) {
            var col = $scope.columns[i];
            if (col.prop === prop) return col.label;
        }
        return '';
    }

    $scope.exists = function(item, visible) {
      return visible.indexOf(item) > -1;
    }

    $scope.toggle = function(item, visible) {
        var idx = visible.indexOf(item);
        if (idx > -1) visible.splice(idx, 1);
        else visible.push(item);
    };

    $scope.$watch('opts', function(value){
        update()
    }, true)

    $scope.toggleMyGenomes = function() {
        // timeout for prom
        $timeout(function() { update() });
    }

    // update visible genomes
    function update() {
        $scope.loading = true;
        Patric.getGenomes( $scope.opts, $scope.filters.myGenomes )
              .then(function(genomes) {
                  $scope.genomes = genomes;
                  $timeout(function() {
                      $scope.loading = false;
                  })
              })
    }

    $scope.reconstruct = function(ev, item) {
        $scope.selected = item;
        Dialogs.reconstruct(ev,
            {path: 'PATRICSOLR:'+item.genome_id, name: item.genome_name},
            function(res) {
                console.log('the response', res)
                /*MS.addModel({name: res[0],
                             path: res[1],
                             orgName: item.genome_name})*/
            })
    }

}])

.controller('RunReconstruct',
['$scope',
function($scope) {


}])

.controller('RunFBA',
['$scope',
function($scope) {


}])


.controller('RunGapfill',
['$scope',
function($scope) {


}])
