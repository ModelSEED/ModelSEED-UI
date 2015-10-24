
angular.module('ctrls', [])
.controller('ModelCount', ['$scope', 'ModelViewer', function($scope, MV) {
    $scope.MV = MV;
}])

.controller('Documentation',
['$scope', '$state',
function($scope, $state) {
    console.log('state', $state)
}])


.controller('MediaDropdown', ['$scope', 'MS', '$log', 'uiTools',
function($s, MS, uiTools) {
    var self = this;

    $s.relativeTime = uiTools.relativeTime;
    $s.filterPublic = true;

    self.form = $s.form;

    self.isDisabled = false;
    self.querySearch = querySearch;
    self.selectedItemChange = selectedItemChange;
    self.searchTextChange = searchTextChange;

    MS.listPublicMedia()
      .then(function(media) {
          $s.media = media;
      })


    MS.listMyMedia()
      .then(function(media) {
          $s.myMedia = media;
      })

    function querySearch (query) {
        if (!$s.filterPublic)
            var results = query ? $s.myMedia.filter( createFilterFor(query) ) : $s.myMedia;
        else
            var results = query ? $s.media.filter( createFilterFor(query) ) : $s.media;
        return results.slice(0, 50);
    }

    function searchTextChange(text) {

    }
    function selectedItemChange(item) {
        self.form.media = item.path;
    }

    function createFilterFor(query) {
        var lowercaseQuery = angular.lowercase(query);
        return function filterFn(state) {
            return (state.value.indexOf(lowercaseQuery) >= 0);
        };
    }

}])

.controller('CompoundDropdown', ['$scope', 'Biochem',
function($scope, Biochem) {
    var self = this;
    self.form = $scope.form

    self.readonly = false;
    self.selectedItem = null;
    self.searchText = null;
    self.querySearch = querySearch;
    self.compounds = [];
    self.numberChips = [];
    self.numberChips2 = [];
    self.numberBuffer = '';

    function querySearch (query) {
        return Biochem.get('model_compound', {query: query, limit: 10})
                .then(function(res) {
                    var data = [];
                    for (var i in res.docs) {
                        var doc = res.docs[i];

                        if (doc.id === 'cpd00000') continue;
                        data.push({name: doc.name,
                                  id: doc.id})
                    }

                    return data;
                })
    }
}])

.controller('ReactionDropdown', ['$scope', 'Biochem',
function($scope, Biochem) {
    var self = this;
    self.form = $scope.form

    self.readonly = false;
    self.selectedItem = null;
    self.searchText = null;
    self.querySearch = querySearch;
    self.reactions = [];
    self.numberChips = [];
    self.numberChips2 = [];
    self.numberBuffer = '';

    function querySearch (query) {
        return Biochem.get('model_reaction', {query: query, limit: 10})
                .then(function(res) {
                    var data = [];
                    for (var i in res.docs) {
                        var doc = res.docs[i];

                        if (doc.id === 'rxn00000') continue;
                        data.push({name: doc.name,
                                  id: doc.id})
                    }

                    return data;
                })
    }
}])

.controller('SelectedData', ['$scope', '$mdDialog', 'ModelViewer',
function($scope, $dialog, MV) {
    $scope.MV = MV;

    $scope.openFBAView = function(ev, $index, item) {
        $dialog.show({
            templateUrl: 'app/views/dialogs/fba.html',
            // targetEvent: ev, //fixme: bug report
            controller: ['$scope', '$http', 'ModelViewer',
                function($scope, $http, MV) {
                $scope.MV = MV;
                $scope.item = item;
                $scope.selectedIndex = $index;

                MV.getRelatedFBAs([{workspace: item.model.ws, name: item.model.name}])
                  .then(function(fbas) {
                      for (var i=0; i<fbas.length; i++) {
                          if ( $scope.item.fba.name === fbas[i].name &&
                               $scope.item.fba.ws === fbas[i].ws)
                               $scope.activeFBAIndex = i;
                      }
                      $scope.fbas = fbas;
                  })

                $scope.selectFBA = function($index, newFBA) {
                    var newItem = {model: {name: item.model.name, ws: item.model.ws },
                                   fba: {name: newFBA.name, ws: newFBA.ws},
                                   org: item.org,
                                   media: newFBA.media};

                    MV.swapItem($scope.selectedIndex, newItem);
                    $scope.activeFBAIndex = $index;
                    $scope.item = newItem;
                    $dialog.hide();

                    //angular.element(ev.target).parent().fadeOut(150)
                    //       .fadeIn(200);
                }

                $scope.cancel = function(){
                    $dialog.hide();
                }

                $scope.select = function(item){

                }
            }]
        })
    }


}])

.controller('Compare', ['$state', '$scope', '$timeout', 'VizOptions', 'Tabs', 'ModelViewer',
function($state, $scope, $timeout, VizOpts, Tabs, MV) {
    $scope.MV = MV;
    $scope.VizOpts = VizOpts;

    $scope.topLevelTabs = {selectedIndex: 0};

    // secondary tabs
    $scope.Tabs = Tabs;
    Tabs.totalTabCount = 2;

    $scope.mapOpts = {query: '', limit: 20, offset: 0, sort: {field: 'id'}};
    $scope.mapHeader = [{label: 'Name', key: 'name',
                         click: function(item) {
                             Tabs.addTab({name: item.name, mapID: item.id});
                        }},
                        {label: 'ID', key: 'id'},
                        {label: 'Rxns', key: 'rxnCount'},
                        {label: 'Cpds', key: 'cpdCount'}
                        ]

    $scope.updateOptions = function() {
        // wait for radio animation
        $timeout(function() {
            $scope.$broadcast('Compare.event.absFlux', VizOpts.flux == 'absFlux')
        }, 100)
    }

    // fetch maps
    $scope.loadingMaps = true;
    MV.getMaps().then(function(d) {
        $scope.loadingMaps = false;
        $scope.maps = d;
    })

    function update() {
        $scope.loading = true;
        MV.updateData().then(function(d) {

            var models = d.model,
                fbas = d.fba;

            // regenerates heatmap and kegg maps
            $scope.heatmapData = parseData(models, fbas);
            $scope.models = models;
            $scope.fbas = fbas;
            $scope.loading = false;
        })
    }

    // update data (and rerender) when selected data changes
    update();
    $scope.$on('MV.event.change', function() {
        update()
    })

    function parseData(models, fbas) {
        // create heatmap data
        var rxnIDs = [],
            modelNames = [],
            data = [];

        // first, get union of reactions
        for (var i=0; i < models.length; i++) {
            var model = models[i];
            modelNames.push(model.name);

            var rxns = model.modelreactions;
            for (var j=0; j < rxns.length; j++) {
                var rxnID = rxns[j].id;
                if (rxnIDs.indexOf(rxnID) === -1) rxnIDs.push(rxnID);
            }
        }

        var rows = [];
        var allFluxes = []; //used for stats

        // for each model, get data for box, left to right
        for (var i=0; i < models.length; i++) {
            var rxns = models[i].modelreactions;

            // see if there is an fba result
            // if so, get create rxn hash
            var hasFBA = false,
                fbaRXNs = {};
            if (fbas && fbas[i]) {
                hasFBA = true;
                var fbaRxns = fbas[i].FBAReactionVariables;

                for (var j=0; j<fbaRxns.length; j++) {
                    // oh. man.
                    var rxnId = fbaRxns[j].modelreaction_ref.split('||')[1].split('/').pop();
                    fbaRXNs[rxnId] = fbaRxns[j];
                }
            }

            var row = [];
            // for each rxn in union of rxns, try to find rxn for that model
            for (var j=0; j < rxnIDs.length; j++) {
                var rxnID = rxnIDs[j];

                var found = false, flux;

                for (var k=0; k<rxns.length; k++) {
                    if (rxns[k].id === rxnID) {
                        found = true;
                        if (hasFBA && fbaRXNs[rxnID]) {
                            flux = fbaRXNs[rxnID].value;
                            allFluxes.push(flux);
                        }
                        break;
                    }
                }

                row.push({present: (found ? 1 : 0), flux: flux});
            }

            rows.push(row);
        }

        // rxn000001_c0 => rxn000001[c0]
        var i = rxnIDs.length;
        while (i--) rxnIDs[i] = rxnIDs[i].replace('_','[')+']'

        // update min/max for legend
        $scope.minFlux = Math.min.apply(null, allFluxes);
        $scope.maxFlux = Math.max.apply(null, allFluxes);

        return {x: rxnIDs, y: modelNames, data: rows};
    }
}])



.controller('DataPage',
    ['$scope', '$state', '$stateParams', 'Auth',
    function($scope, $state, $sParams, Auth) {

    if ($sParams.login === 'patric' && !Auth.isAuthenticated()) {
        $state.transitionTo('home', {redirect: $sParams.path, login: 'patric'});
    }

    $scope.path = $sParams.path.split('/').pop();
}])


.controller('Proto',
['$scope', '$stateParams', 'WS', '$http',
function($scope, $stateParams, WS, $http) {



}])


.controller('SideNav',
['$scope', '$mdSidenav',
function($scope, $mdSidenav) {
    $scope.close = function() {
        $mdSidenav('right').toggle();
    }
}])

.controller('LeftCtrl', ['$scope', '$timeout', '$mdSidenav', '$log',
function ($scope, $timeout, $mdSidenav, $log) {

    $scope.close = function () {
        $mdSidenav('left').close()
          .then(function () {
              $log.debug("close LEFT is done");
          });
    };
}])

.service('VizOptions', [function() {

    // default for abs flux
    this.flux = 'absFlux';

}])

.service('ViewOptions', [function() {
    /**
     *  Options that persist across pages
    */

    var defaultSettings = {
                            organismType: 'Microbes',
                            viewMyGenomes: false,
                            wsBrowser: {showHidden: false}
                          };

    // get stored options
    var options = JSON.parse( localStorage.getItem('ViewOptions') );

    // verify previous settings or reset
    if (!options || !angular.equals(Object.keys(options), Object.keys(defaultSettings)) ) {
        options = defaultSettings;
        localStorage.setItem('ViewOptions', JSON.stringify(options) );
    }

    this.set = function(key, value) {
        options[key] = value;
        localStorage.setItem('ViewOptions', JSON.stringify(options) )
        return options[key];
    }

    this.get = function(key) {
        return options[key];
    }

}])

.service('Session', [function() {
    this.tabs = {};

    this.setTab = function(state, tab) {
        this.tabs[state.current.name] = tab.tabIndex;
    }

    this.getTab = function(state) {
        return this.tabs[state.current.name] || null;
    }
}])


.controller('Publications',
['$scope', '$http', 'uiTools',
function($s, $http, uiTools) {

    $http.get('docs/publications/Jose_publications.csv')
        .then(function(data) {
            console.log('date', data)

            var csv = data.data;

            $s.pubs = uiTools.csvToJSON(csv).rows;
            

        })


}])
