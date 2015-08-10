
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


.controller('Biochem',['$scope', 'Biochem', '$state', '$stateParams', 'MS',
/**
 * [Responsible for options, table specs,
 * 	and updating of reaction/compound tables ]
 * @param  {[type]} $scope  [description]
 * @param  {[type]} Biochem [Biochem Service]
 */
function($s, Biochem, $state, $stateParams, MS) {
    $s.rxnOpts = {query: '', limit: 10, offset: 0, sort: {field: 'id'},
                  visible: ['name', 'id', 'definition', 'deltag', 'deltagerr', 'direction'] };
    $s.cpdOpts = {query: '', limit: 10, offset: 0, sort: {field: 'id'},
                  visible: ['name', 'id', 'formula', 'abbreviation', 'deltag', 'deltagerr', 'charge'] };
    $s.mediaOpts = {query: '', limit: 20, offset: 0, sort: {field: 'name'}};

    if ($stateParams.tab === 'compounds')
        $s.tabs = {selectedIndex : 1};
    else
        $s.tabs = {selectedIndex : 0};


    $s.rxnHeader = [{label: 'Name', key: 'name'},
                    {label: 'ID', key: 'id'},
                    {label: 'EQ', key: 'definition'},
                    {label: 'deltaG', key: 'deltag'},
                    {label: 'detalGErr', key: 'deltagerr'}];

    $s.cpdHeader = [{label: 'Name', key: 'name'},
                    {label: 'ID', key: 'id'},
                    {label: 'Formula', key: 'formula'},
                    {label: 'Abbrev', key: 'abbreviation'},
                    {label: 'deltaG', key: 'deltag'},
                    {label: 'detalGErr', key: 'deltagerr'},
                    {label: 'Charge', key: 'charge'}];

    $s.mediaHeader = [{label: 'Name', key: 'name',
                            link: {
                                state: 'app.mediaPage',
                                getOpts: function(row){
                                    return {path: row.path};
                                }
                            }
                        },
                        {label: 'Minimal?', key: 'isMinimal'},
                        {label: 'Defined?', key: 'isDefined'},
                        {label: 'Type', key: 'type'}];

    function updateRxns() {
        Biochem.get('model_reaction', $s.rxnOpts)
               .then(function(res) {
                    $s.rxns = res;
                    $s.loadingRxns = false;
               })
    }

    function updateCpds() {
        Biochem.get('model_compound', $s.cpdOpts)
               .then(function(res) {
                    $s.cpds = res;
                    $s.loadingCpds = false;
               })
    }

    $s.loadingMedia = true;
    MS.listPublicMedia()
      .then(function(media) {
          $s.media = media;
          $s.loadingMedia = false;
      })

    $s.$watch('rxnOpts', function(after, before) {
        $s.loadingRxns = true;
        updateRxns();
    }, true)

    $s.$watch('cpdOpts', function(opts) {
        $s.loadingCpds = true;
        updateCpds();
    }, true)

    $s.doSomething = function(row) {
        $state.go('app.biochem', {tab: 'compounds'})
              .then(function() {
                  $state.go('app.biochemViewer', {cpd: row.id})
              })
    }
}])


.controller('BiochemViewer',['$scope', 'Biochem', '$state', '$stateParams', 'Biochem',
function($s, Biochem, $state, $stateParams, Bio) {
    $s.opts = {query: '', limit: 10, offset: 0, sort: {field: 'id'}};

    var cpdID = $stateParams.cpd;;

    Bio.get('model_compound', {query: cpdID})
       .then(function(res) {
           $s.totalFound = res.numFound;
           $s.cpd = res.docs[0];
       })

    $s.loading = true;
    Bio.findReactions(cpdID)
       .then(function(res) {
           $s.reactionCount = res.numFound;
           $s.data = res.docs;
           stats($s.data);
           $s.loading = false;
       })

    function stats(rxns) {
        var leftCount = 0, rightCount = 0;
        var search = /(cpd\d*)/g;

        for (var i in rxns) {
            var rxn = rxns[i];

            var splitEq = rxn.equation.split('<=>'),
                substrates = splitEq[0].match(search),
                products = splitEq[1].match(search)

            if (substrates.indexOf(cpdID) !== -1)
                leftCount += 1;
            if (products.indexOf(cpdID) !== -1)
                rightCount += 1;
        }

        $s.substrateCount = leftCount;
        $s.productCount = rightCount;
    }

}])

.controller('PlantAnnotations',['$scope', 'WS', '$compile',
function($s, WS, $compile) {
    var url = 'http://pubseed.theseed.org/SubsysEditor.cgi',
        subsystemUrl = url +'?page=ShowSubsystem&subsystem=',
        roleUrl = url + '?page=FunctionalRolePage&fr=',
        pathwayUrl = 'http://pmn.plantcyc.org/ARA/NEW-IMAGE?type=PATHWAY&object=',
        featurePath = '#/feature/plantseed/Genomes/Athaliana-TAIR10/';



    var wsPath = '/plantseed/Genomes/annotation_overview';

    $s.annoOpts = {query: '', limit: 20, offset: 0, sort: {field: 'subsystems'}};

    $s.annoHeader = [
                     {label: 'Role', key: 'role'},
                     {label: 'Subsystems', key: 'subsystems',
                        formatter: function(row) {
                            var links = [];
                            row.subsystems.forEach(function(name) {
                                links.push('&middot; <a href="'+subsystemUrl+name+'" target="_blank">'+
                                                        name.replace(/_/g, ' ')+
                                                    '</a>');
                            })

                            return links.join('<br>') || '-';
                        }},
                     {label: 'Classes', key: 'classes',
                        formatter: function(row) {
                            return row.classes.join('<br>') || '-';
                        }},
                     {label: 'Pathways', key: 'pathways',
                        formatter: function(row) {
                            var links = [];
                            row.pathways.forEach(function(name) {
                                links.push('<a href="'+pathwayUrl+name+'" target="_blank">'+
                                                name+
                                           '</a>');
                            })

                            return links.join('<br>') || '-';
                        }},
                     {label: 'Reactions', key: 'reactions',
                        formatter: function(row) {
                            return row.reactions.join('<br>') || '-';
                        }},
                     {label: 'Features', key: 'features',
                        formatter: function(row) {
                            var links = [];
                            row.features.forEach(function(name) {
                                links.push('<a href="'+featurePath+name+'">'+name+'</a>');
                            })

                            return links.join('<br>') || '-';
                        }},
                    ];

    $s.loading = true;
    WS.get(wsPath)
      .then(function(res) {
          $s.annoOverview = parseOverview(res.data);
          $s.loading = false;
      })


    // The annotation overview structure seems to consist of hashes with
    // values of "1", instead of flat arrays.  This should be fixed.
    // Note: the 'role' structure is correct
    function parseOverview(data) {
        for (var i=0; i<data.length; i++) {
            data[i].pathways = Object.keys(data[i].pathways);
            data[i].classes = Object.keys(data[i].classes);
            data[i].features = Object.keys(data[i].features);
            data[i].subsystems = Object.keys(data[i].subsystems);
            data[i].reactions = Object.keys(data[i].reactions);
        }

        return data;
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
             console.log('res', res)
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
['$scope', 'Patric', '$timeout', '$http', 'Dialogs', 'ViewOptions', 'WS', 'Auth',
function($scope, Patric, $timeout, $http, Dialogs, ViewOptions, WS, Auth) {
    $scope.plantModelsPath = '/plantseed/Models/';

    // microbes / plants view
    $scope.view = ViewOptions.get('organismType');

    $scope.changeView = function(view) {
        $scope.view = ViewOptions.set('organismType', view);
    }

    $scope.showMenu = function() {
      $scope.menuVisible = true;
    }

    $scope.filters = {myGenomes: ViewOptions.get('viewMyGenomes')};

    $scope.opts = {query: '',
                   limit: 25,
                   offset: 0,
                   sort: {field: 'genome_name'},
                   visible: ['genome_name', 'genome_id', 'genus', 'taxon_id', 'contigs']};

   $scope.myPlantsOpts = {query: '',
                          limit: 25,
                          offset: 0,
                          sort: null};

    $scope.columns = [{prop: 'genome_name', label: 'Name'},
                      {prop: 'genome_id', label: 'ID'},
                      {prop: 'genus', label: 'Genus'},
                      {prop: 'taxon_id', label: 'Tax ID'},
                      {prop: 'contigs', label: 'Contigs'}]

    $scope.myPlantsHeader = [{key: 'name', label: 'Name',
                                link: {
                                    state: 'app.genomePage',
                                    getOpts: function(row) {
                                        return {path: row.path}
                                    }
                                }
                            }]



    WS.listPlantMetas('/plantseed/Genomes/')
      .then(function(objs) {
          var plants = [];
          for (var i=0; i<objs.length; i++) {
              var obj = objs[i];

              // skip any "hidden" directories and test files
              if (obj.name[0] === '.' ||
                  obj.name.toLowerCase().indexOf('test') !== -1)
                  continue;

              plants.push(obj);
          }

          $scope.plants = plants;
      })

      // load my plants
      $scope.loadingMyPlants = true;
      WS.list('/'+Auth.user+'/plantseed/genomes/')
        .then(function(res) {

          // remove non-genomes
          var i = res.length;
          while (i--) {
              var obj = res[i];
              if (obj.name[0] === '.' || obj.type !== 'genome')
                  res.splice(i,1);
          }

          $scope.myPlants = res;
          $scope.loadingMyPlants = false;
      }).catch(function(e) {
          if (e.error.code === -32603)
              $scope.error = 'Something seems to have went wrong. '+
                             'Please try logging out and back in again.';
          else
              $scope.error = e.error.message;
          $scope.loadingMyPlantsMicrobes = false;
      })

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
        $timeout(function() {
            ViewOptions.set('viewMyGenomes', $scope.filters.myGenomes);
            update()
        });
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
                /*MS.addModel({name: res[0],
                             path: res[1],
                             orgName: item.genome_name})*/
            })
    }

}])

.controller('MyModels',
['$scope', 'WS', 'MS', 'uiTools', '$mdDialog', 'Dialogs',
 'ModelViewer', '$document', '$mdSidenav', '$q', '$timeout', 'ViewOptions', 'Auth',
function($scope, WS, MS, uiTools, $mdDialog, Dialogs,
MV, $document, $mdSidenav, $q, $timeout, ViewOptions, Auth) {
    var $self = $scope;

    $scope.MS = MS;
    $scope.uiTools = uiTools;
    $scope.relativeTime = uiTools.relativeTime;

    $scope.relTime = function(datetime) {
        return $scope.relativeTime(Date.parse(datetime));
    }

    // microbes / plants view
    $scope.view = ViewOptions.get('organismType');

    $scope.changeView = function(view) {
        $scope.view = ViewOptions.set('organismType', view);
    }

    // table options
    $scope.opts = {query: '', limit: 10, offset: 0, sort: {}};
    $scope.opts = {query: '', limit: 10, offset: 0, sort: {}};

    // the selected item for operations such as download, delete.
    $scope.selected = null;

    // load models
    if (MS.myModels) {
        $scope.data = MS.myModels;
    } else {
        $scope.loadingMicrobes = true;
        MS.getModels().then(function(res) {
            $scope.data = res;
            $scope.loadingMicrobes = false;
        }).catch(function(e) {
            if (e.error.code === -32603)
                $scope.error = 'Something seems to have went wrong. '+
                               'Please try logging out and back in again.';
            else
                $scope.error = e.error.message;
            $scope.loadingMicrobes = false;
        })
    }

    $scope.showFBAs = function(item) {
        $scope.showGapfills(item);

        if (item.relatedFBAs) delete item.relatedFBAs;
        else updateFBAs(item)
    }

    function updateFBAs(item) {
        item.loading = true;
        MS.getModelFBAs(item.path)
            .then(function(fbas) {
                item.relatedFBAs = fbas;
                item.loading = false;
            })
    }

    $scope.showGapfills = function(item) {
        if (item.relatedGapfills)
            delete item.relatedGapfills;
        else {
            updateGapfills(item);
        }
    }

    function updateGapfills(item) {
        item.loading = true;
        MS.getModelGapfills(item.path)
            .then(function(gfs) {
                item.relatedGapfills = gfs;
                item.loading = false;
            })
    }

    $scope.runFBA = function(ev, item) {
        Dialogs.runFBA(ev, item, function() {
            updateFBAs(item)
        })
    }

    $scope.gapfill = function(ev, item) {
        Dialogs.gapfill(ev, item, function() {
            updateGapfills(item)
        })
    }

    $scope.addFBA = function(e, fba, model) {
        e.preventDefault();
        e.stopPropagation();

        var data = {model: model.path,
                    fba: fba.path,
                    org: model.orgName,
                    media: fba.media};


        if (fba.checked) {
            MV.rm(data, true);
            fba.checked = false;
        } else {
            MV.add(data);
            fba.checked = true;
        }
    }


    // fixme: use MV service and refs
    $scope.$on('MV.event.change', function(e, item) {
        // if added to MV
        if (!item) return;

        if (item === 'clear') {
            for (var i in $scope.data) {
                var model = $scope.data[i];

                for (var j in model.relatedFBAs) {
                    var fba = model.relatedFBAs[j];
                    fba.checked = false;
                }
            }
        } else {
            for (var i in $scope.data) {
                var model = $scope.data[i];
                if (!model.relatedFBAs) continue;

                for (var j in model.relatedFBAs) {
                    var fba = model.relatedFBAs[j];

                    if (item.model === model.path && item.fba === fba.path)
                        fba.checked = false;
                }
            }
        }
    })


    // general operations
    $scope.deleteFBA = function(e, i, model) {
        e.stopPropagation();
        WS.deleteObj(model.path)
          .then(function(res) {
              model.relatedFBAs.splice(i, 1);
              model.fbaCount -= 1;
          })
    }

    $scope.integrateGapfill = function(isIntegrated, model, gapfill) {
        // if not integrated, integrate
        // if integrated, unintegrate
        gapfill.loading = true;
        MS.manageGapfills(model.path, gapfill.id, isIntegrated ? 'U' : 'I')
          .then(function(res) {
              delete gapfill.loading;
              for (var i=0; i < model.relatedGapfills.length; i++) {
                  var gf = model.relatedGapfills[i];
                  if (gf.id == gapfill.id) {
                      model.relatedGapfills[i] = res
                      break;
                  }
              }
          })
    }

    $scope.deleteGapfill = function(i, model, gapfill) {
        gapfill.loading = true;
        MS.manageGapfills(model.path, gapfill.id, 'D')
          .then(function(res) {
              model.relatedGapfills.splice(i, 1)
              model.gapfillCount -= 1;
          })
    }

    $scope.toggleOperations = function(e, type, item) {
        var tar = e.target;
        e.stopPropagation();

        // set selected item
        $scope.selected = item;

        $scope.loadingDownloads = true;
        MS.getDownloads(item.path)
          .then(function(dls) {
              $scope.selected.downloads = dls;
              $scope.loadingDownloads = false;
          })

        if (type === 'download') {
            if (!$mdSidenav('downloadOpts').isOpen())
                $mdSidenav('downloadOpts').open();

            $document.bind('click', function(e) {
                $mdSidenav('downloadOpts').close()
                $document.unbind(e)
                $scope.selected = null;
            })
        } else if ($mdSidenav('downloadOpts').isOpen()) {
            $mdSidenav('downloadOpts').close()
        }
    }

    $scope.rmModel = function(ev, i, item) {
        ev.stopPropagation();

        var confirm = $mdDialog.confirm()
            .title('WARNING')
            .content('Are you sure you want to delete '+item.name+' and all associated data?')
            .ariaLabel('Are you sure you want to delete '+item.name+' and all associated data?')
            .ok('Delete it all!')
            .cancel('No')
            .clickOutsideToClose(true)
            .targetEvent(ev);

        $mdDialog.show(confirm).then(function() {
            //delete both object and related data
            var folder = item.path.slice(0, item.path.lastIndexOf('/')+1)+'.'+item.name;
            var p1 = WS.deleteObj(item.path),
                p2 = WS.deleteObj(folder, true);
            $q.all([p1,p2]).then(function(one, two) {
                $self.data.splice(i, 1)
                Dialogs.showComplete('Deleted', item.name)
            })
        }, function() {
            console.log('not deleting')
        });
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
