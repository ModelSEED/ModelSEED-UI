
angular.module('ctrls', [])
.controller('ModelCount', ['$scope', 'ModelViewer', function($scope, MV) {
    $scope.MV = MV;
}])

.controller('Documentation',
['$scope', '$state',
function($scope, $state) {
    console.log('state', $state)
}])


.controller('MediaDropdown', ['$scope', 'MS', '$log',
function($scope, MS, $log) {
    var self = this;
    self.form = $scope.form

    self.isDisabled = false;
    self.querySearch = querySearch;
    self.selectedItemChange = selectedItemChange;
    self.searchTextChange = searchTextChange;

    MS.listMediaDropdown()
      .then(function(media) {
         var objs = [];
         for (var i=0; i<media.length; i++) {
             objs.push({value: media[i].name.toLowerCase(),
                        name: media[i].name,
                        path: media[i].path });
         }

         self.media = objs;
      })

    function querySearch (query) {
        var results = query ? self.media.filter( createFilterFor(query) ) : self.media;
        return results;
    }

    function searchTextChange(text) {
      $log.info('Text changed to ' + text);
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


.controller('Public', ['$scope', 'WS', 'ModelViewer', '$compile', '$timeout',
function($scope, WS, MV, $compile, $timeout) {
    $scope.MV = MV;

    $scope.opts = {query: '', limit: 10, offset: 0, sort: {field: 'orgName'}};

    $scope.loading = true;
    WS.getPublic().then(function(data) {
        $scope.data = data;
        $scope.loading = false;
    })


    $scope.showFBAs = function($event, item) {
        if (item.relatedFBAs)
            delete item.relatedFBAs;
        else {
            item.loading = true;
            MV.getRelatedFBAs([{workspace: item.ws, name: item.name}])
                .then(function(fbas) {

                    // select any previously selected
                    for (var i=0; i<fbas.length; i++) {
                        if (MV.isSelected(item, fbas[i]))
                            fbas[i].checked = true;
                    }

                    item.relatedFBAs = fbas;

                    item.loading = false;
                })
        }
    }

    $scope.addFBA = function(e, fba, model) {
        e.preventDefault();
        e.stopPropagation();

        var data = {model: {
                        ws: model.ws,
                        name: model.name
                    },
                    fba: {
                        ws: fba.ws,
                        name: fba.name
                    },
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
                    if (item.model.ws === model.ws &&
                        item.model.name === model.name &&
                        item.fba.ws === fba.ws &&
                        item.fba.name === fba.name)
                        fba.checked = false;
                }
            }
        }
    })

}])

.controller('SelectedData', ['$scope', '$mdDialog', 'ModelViewer', '$rootScope',
function($scope, $dialog, MV, $rootScope) {

    $scope.MV = MV;

    $rootScope.$on('$stateChangeStart',
        function(event, toState, toParams, fromState, fromParams){
            if (['modelPage', 'fbaPage'].indexOf(toState.name) === -1 ) {
                angular.element('#selected-models').find('.active').removeClass('active')
            }
        })

    // selected navigation item.  Only highlights clicked
    $scope.makeActive = function(event, index, type, item) {
        //angular.element(event.target).parent().addClass('active');
    }


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

.controller('Compare', ['$state', '$scope', 'ModelViewer', '$stateParams', '$timeout', 'VizOptions',
function($state, $scope, MV, $stateParams, $timeout, VizOpts) {
    var coreMaps = ['map00010', 'map00020', 'map00030', 'map00040', 'map00051', 'map00052'];
    $scope.MV = MV;
    $scope.VizOpts = VizOpts;

    // map table
    $scope.predicate = 'id';
    $scope.reverse = false;

    $scope.updateOptions = function() {
        // wait for radio animation
        $timeout(function() {
            $scope.$broadcast('Compare.event.absFlux', VizOpts.flux == 'absFlux')
        }, 100)
    }

    // fetch maps (once)
    $scope.loading = true;
    MV.getMaps().then(function(d) {
        $scope.loading = false;

        var maps = [];
        for (var i=0; i<d.length; i++) {
            if (coreMaps.indexOf(d[i].id) === -1) continue
            maps.push(d[i]);
        }

        $scope.maps = maps;
    })
}])



.controller('DataPage',
    ['$scope', '$state', '$stateParams', 'Auth',
    function($scope, $state, $sParams, Auth) {

    if ($sParams.login === 'patric' && !Auth.isAuthenticated()) {
        $state.transitionTo('home', {redirect: $sParams.path, login: 'patric'});
    }

    $scope.path = $sParams.path.split('/').pop();
}])


.controller('CompareTabs', ['$scope', '$timeout', 'ModelViewer', 'VizOptions',
function ($scope, $timeout, MV, VizOpts) {
    var tabs = [
        { title: 'Heatmap'},
        { title: 'Pathways'}
    ];

    $scope.tabs = tabs;
    $scope.selectedIndex = 0;

    $scope.addTab = function (map) {
        // if is already open, go to it
        for (var i=0; i<tabs.length; i++) {
            if (tabs[i].map === map.id) {
                $scope.selectedIndex = i
                return;
            }
        }

        tabs.push({ title: map.name.slice(0,10)+'...',
                    removable: true,
                    map: map.id});

        $timeout(function() {
            $scope.selectedIndex = tabs.length-1;
            $scope.loadMap(map); //fixme!
        })

        $scope.$on('MV.event.change', function() {
            MV.updateData().then(function() {
                $scope.loadMap(map);
            })
        })


        // update if flux settings change
        $scope.$on('Compare.event.absFlux', function() {
            $scope.loadMap(map);
        })
    };

    $scope.removeTab = function (tab) {
        for (var j = 0; j < tabs.length; j++) {
            if (tab.title === tabs[j].title) {
                $scope.tabs.splice(j, 1);
                break;
            }
        }
    };

    $scope.loadMap = function(map) {
        $('#'+map.id).find('.path-container').remove();
        $('#'+map.id).append('<div class="path-container">')
        $scope.loadingMap = true;
        $('#'+map.id).find('.path-container').kbasePathway({
                                    options: {absFlux: VizOpts.flux === 'absFlux'},
                                    models: MV.data.FBAModel,
                                    fbas: MV.data.FBA,
                                    map_ws: 'nconrad:paths',
                                    map_name: map.id,
                                    cb: function() {
                                        $scope.$apply(function() {
                                            $scope.loadingMap = false;
                                        })
                                    }});
    }
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
