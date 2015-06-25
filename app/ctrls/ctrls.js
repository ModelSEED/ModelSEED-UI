
angular.module('ctrls', [])
.controller('ModelCount', ['$scope', 'ModelViewer', function($scope, MV) {
    $scope.MV = MV;
}])


.controller('MyModels',
['$scope', 'WS', 'MS', '$compile', 'uiTools', '$mdDialog', 'Dialogs',
 'ModelViewer', '$document', '$mdSidenav', '$q', '$log',
function($scope, WS, MS, $compile, uiTools, $mdDialog, Dialogs,
MV, $document, $mdSidenav, $q, $log) {
    var $self = $scope;



    $scope.MS = MS;
    $scope.uiTools = uiTools;
    $scope.relativeTime = uiTools.relativeTime;

    $scope.relTime = function(datetime) {
        return $scope.relativeTime(Date.parse(datetime));
    }

    // the selected item for operations such as download, delete.
    $scope.selected = null;

    // table options
    $scope.opts = {query: '', limit: 10, offset: 0, sort: {}};

    // load models
    if (MS.myModels) {
        $scope.data = MS.myModels;
    } else {
        $scope.loading = true;
        MS.getModels().then(function(res) {
            $scope.data = res;
            $scope.loading = false;
        }).catch(function(e) {
            $scope.error = e.message.error;
            $scope.loading = false;
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
                console.log('gfs', gfs)
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

        console.log('adding', fba, model)
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
    $scope.deleteFBA = function(e, i, item, fbas) {
        e.stopPropagation();
        WS.deleteObj(item.path)
          .then(function(res) {
              fbas.splice(i, 1);
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
              console.log('download stuff', dls)
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
                $log.log('removing entity', i)
                $self.data.splice(i, 1)
                Dialogs.showComplete('Deleted', item.name)
            })
        }, function() {
            $log.log('not deleting')
        });
    }
}])


.controller('MediaDropdown', ['$scope', 'MS', '$log',
function($scope, MS, $log) {
    var self = this;

    self.form = $scope.form
    console.log('form!!!', self.form)

    self.isDisabled = false;
    self.querySearch = querySearch;
    self.selectedItemChange = selectedItemChange;
    self.searchTextChange = searchTextChange;

    MS.getPublicMedia()
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
            return (state.value.indexOf(lowercaseQuery) === 0);
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
    console.log('form', self.form)

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

    $scope.path = $sParams.path.toName();
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
    ['$scope', '$stateParams',
    function($scope, $stateParams) {
    }
])


.controller('SideNav',
['$scope', '$mdSidenav',
function($scope, $mdSidenav) {
    $scope.close = function() {
        $mdSidenav('right').toggle();
    }
}])

.service('VizOptions', [function() {

    // default for abs flux
    this.flux = 'absFlux';

}])
