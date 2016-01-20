/**
 * [module Dialogs]
 *
 * Set of dialogs for analysis (and prompts)
 *
 */
angular.module('Dialogs', [])
.service('Dialogs', ['MS', 'WS', '$mdDialog', '$mdToast', 'uiTools', '$timeout',
function(MS, WS, $dialog, $mdToast, uiTools, $timeout) {
    var self = this;

    this.showMeta = function(ev, path) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/show-meta.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($s, $http) {
                $self = $s;
                $s.editMeta = false;
                $s.edit = {userMeta: '', autoMeta: ''};
                $s.validJSON = true;

                $s.loading = true;

                WS.getObjectMeta(path)
                  .then(function(meta) {
                      $s.meta = meta[0];

                      if ( Object.keys($s.meta[7]).length === 0 ) $s.userMeta = null;
                      else $s.userMeta = JSON.stringify($s.meta[7], null, 4);

                      if ( Object.keys($s.meta[8]).length === 0 ) $s.autoMeta = null;
                      else $s.autoMeta = JSON.stringify($s.meta[8], null, 4);

                      $s.loading = false;
                  })

                $s.editUserMeta = function() {
                    $s.editMeta = !$s.editMeta;
                }

                $s.saveMeta = function(meta) {
                    $s.savingMeta = true;
                    WS.saveMeta($s.meta[2] + $s.meta[0], meta)
                      .then(function(newMeta) {
                          $s.userMeta = JSON.stringify(newMeta, null, 4);;
                          $s.editMeta = false, $s.savingMeta = false;
                      })
                }

                WS.getPermissions(path)
                  .then(function(blah) {

                  })

                $s.tidy = function(text) {
                    $s.edit.userMeta = JSON.stringify(JSON.parse(text), null, 4)
                }

                $s.validateJSON = function(text) {
                    try {
                        var meta = JSON.parse(text);
                        $s.validJSON = true;
                    } catch(err) { $s.validJSON = false }
                }

                $s.cancel = function(){
                    $dialog.hide();
                }
            }]
        })
    }

    this.reconstruct = function(ev, item, cb) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/reconstruct.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                $scope.item = item;
                $scope.form = {genome: item.path};

                $scope.reconstruct = function(){
                    self.showToast('Reconstructing', item.name, 5000)
                    MS.reconstruct($scope.form)
                      .then(function(r) {
                           cb(r);
                      }).catch(function(e) {
                          self.showError('Reconstruct Error', e.error.message.slice(0,30)+'...')
                      })

                    $dialog.hide();
                }

                $scope.cancel = function(){
                    $dialog.hide();
                }
            }]
        })
    }

    this.reconstructPlant = function(ev, item, cb) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/reconstruct-plant.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                $scope.item = item;
                $scope.form = {genome: item.path};

                $scope.reconstruct = function(){
                    self.showToast('Reconstructing', item.name, 5000)
                    MS.reconstruct($scope.form, {gapfill: false})
                      .then(function(r) {
                           cb(r);
                           //self.showComplete('Reconstruct Complete', item.name, r[2]+r[0])
                      }).catch(function(e) {
                          self.showError('Reconstruct Error', e.error.message.slice(0,30)+'...')
                      })

                    $dialog.hide();
                }

                $scope.cancel = function(){
                    $dialog.hide();
                }
            }]
        })
    }

    /**
     * [function runFBA]
     * @param  {[type]}   ev   [$event object]
     * @param  {[type]}   item [describes model fba is being ran on]
     * @param  {Function} cb   [callback function for when operation is complete]
     * @return {[type]}        [undefined]
     */
    this.runFBA = function(ev, item, cb) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/runFBA.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                $scope.isPlant = item.path.split('/')[2] === 'plantseed' ? true : false;
                $scope.form = {model: item.path, media_supplement: []};

                $scope.runFBA = function(){
                    self.showToast('Running Flux Balance Analysis', item.name, 5000)
                    MS.runFBA($scope.form)
                      .then(function(res) {
                          console.log('run fba response', res)
                          cb();
                          //self.showComplete('FBA Complete',
                          //             res.id+' '+res.media_ref.split('/').pop())
                      }).catch(function(e) {
                          self.showError('Run FBA Error', e.error.message.slice(0,30)+'...')
                      })
                    $dialog.hide();
                }

                $scope.cancel = function(){
                    $dialog.hide();
                }

            }]
        })
    }

    this.gapfill = function(ev, item, cb) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/gapfill.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                $scope.isPlant = item.path.split('/')[2] === 'plantseed' ? true : false;
                $scope.form = {model: item.path};

                $scope.gapfill = function(){
                    self.showToast('Gapfilling', item.name, 5000)

                    MS.gapfill($scope.form)
                      .then(function(res) {
                           cb();
                           //self.showComplete('Gapfill Complete', res[0])
                      }).catch(function(e) {
                          self.showError('Gapfill Error', e.error.message.slice(0,30)+'...')
                      })
                    $dialog.hide();
                }

                $scope.cancel = function(){
                    $dialog.hide();
                }

            }]
        })
    }

    this.saveAs = function(ev, saveCB, cancelCB) {
        ev.stopPropagation();
        return $dialog.show({
            templateUrl: 'app/views/dialogs/save-as.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {

                $scope.save = function(name){
                    saveCB(name);
                    $dialog.hide();
                }

                $scope.cancel = function($event){
                    console.log('calling cancel')
                    $event.preventDefault();
                    if (cancelCB) cancelCB();
                    $dialog.hide();
                }
            }]
        })
    }

    this.error = function(title, msg) {
        return $dialog.show({
            templateUrl: 'app/views/dialogs/error-prompt.html',
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($s, $http) {
                $s.title = title;
                $s.msg = msg;

                $s.ok = function(){
                    $dialog.hide();
                }

                $s.cancel = function(){
                    $dialog.hide();
                }
            }]
        })
    }

    this.showToast = function(title, name, duration) {
      $mdToast.show({
        controller: 'ToastCtrl',
        parent: angular.element('.sidebar'),
        //templateUrl:'app/views/dialogs/notify.html',
        template: '<md-toast>'+
                      '<span flex style="margin-right: 30px;">'+
                         '<span class="ms-color">'+title+'</span><br>'+
                         name.slice(0,20)+'...'+'</span>'+
                      '<!--<md-button offset="33" ng-click="closeToast()">'+
                        'Hide'+
                      '</md-button>-->'+
                    '</md-toast>',
        hideDelay: duration,
      });

    };

    this.showComplete = function(title, name, path) {
        $mdToast.show({
         controller: 'ToastCtrl',
         parent: angular.element('.sidebar'),
         //templateUrl:'app/views/dialogs/notify.html',
         template: '<md-toast>'+
                     '<span flex style="margin-right: 30px; width: 200px;">'+
                       '<span class="ms-color-complete">'+title+'</span>'+
                       (name ?
                          '<br>'+(name.length > 19 ? name.slice(0,20) +'...' : name)
                          : '')+
                      '</span>'+
                      (path ?
                          '<md-button offset="33" ng-click="closeToast()" ui-sref="app.modelPage({path:\''+path +'\'})">'+
                          'View'+
                          '</md-button>' : '')+
                 '</md-toast>',
         hideDelay: 10000
       });
    }

    this.showError = function(msg) {
       $mdToast.show({
        controller: 'ToastCtrl',
        parent: angular.element('.sidebar'),
        //templateUrl:'app/views/dialogs/notify.html',
        template: '<md-toast>'+
                        '<span flex style="margin-right: 30px;">'+
                          '<span class="ms-color-error">Error</span><br>'+
                          msg+
                         '</span>'+
                    '</md-toast>',
        hideDelay: 10000
      });
    }

    this.showError = function(msg) {
        $mdToast.show({
            controller: 'ToastCtrl',
            parent: angular.element('.sidebar'),
            //templateUrl:'app/views/dialogs/notify.html',
            template: '<md-toast>'+
                            '<span flex style="margin-right: 30px;">'+
                              '<span class="ms-color-error">Error</span><br>'+
                              msg+
                             '</span>'+
                        '</md-toast>',
            hideDelay: 10000
        });
    }

    this.download = function(ev, cols, tbody, filename) {
        ev.stopPropagation();
        return $dialog.show({
            templateUrl: 'app/views/dialogs/download.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                var csvData = uiTools.JSONToCSV(cols, tbody);
                var tabData = uiTools.JSONToTabTable(cols, tbody);

                $scope.filename = filename;

                $timeout(function () {
                    document.getElementById('download-csv')
                            .setAttribute("href", "data:text/csv;charset=utf-8,"+encodeURI(csvData));

                    document.getElementById('download-tab')
                            .setAttribute("href", "data:text/plain;charset=utf-8,"+encodeURI(tabData));

                })

                $scope.cancel = function($event){
                    $event.preventDefault();
                    $dialog.hide();
                }
            }]
        })
    }

    this.solrDownload = function(ev, core, csvUrl) {
        ev.stopPropagation();
        return $dialog.show({
            templateUrl: 'app/views/dialogs/solr-download.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                $scope.csvUrl = csvUrl;
                $scope.filename = core+'.csv';

                $scope.cancel = function($event){
                    $event.preventDefault();
                    $dialog.hide();
                }
            }]
        })
    }

}])

.service('AuthDialog',
['$rootScope', '$mdDialog', '$window', '$timeout', 'Auth', '$stateParams',
function($rootScope, $dialog, $window, $timeout, Auth, $stateParams) {

    this.signIn = function() {
        return $dialog.show({
            templateUrl: 'app/views/dialogs/auth.html',
            clickOutsideToClose: false,
            controller: ['$scope', '$state', '$http',
            function($s, $state, $http) {
                console.log('state params', $rootScope)

                // set login method
                if ($rootScope.$stateParams.login == 'patric')
                    $s.method = Auth.loginMethod('patric');
                else
                    $s.method = Auth.loginMethod('rast');

                $s.creds = {};

                // sets method and changes url param
                $s.switchMethod = function(method) {
                    $s.method = Auth.loginMethod(method);
                    $state.go($state.current.name, {login: method});
                }

                $s.ok = function(){
                    console.log('logging in', $s.creds)
                    $s.loading = true;

                    if ($stateParams.login == 'PATRIC')
                        var prom = Auth.loginPatric($s.creds.user, $s.creds.pass)
                    else
                        var prom = Auth.login($s.creds.user, $s.creds.pass)

                    prom.success(function(data) {
                        $dialog.hide();
                        $state.transitionTo($state.current.name, {}, {reload: true, inherit: true, notify: false})
                            .then(function() {
                                setTimeout(function(){
                                    $window.location.reload();
                                }, 0);
                            });

                    }).error(function(e, status){
                        $s.loading = false;
                        if (status == 401)
                            $s.inValid = true;
                        else
                            $s.failMsg = "Could not reach authentication service: "+e.error_msg;
                    })
                }

                $s.cancel = function(){
                    $dialog.hide();
                }
            }]
        })
    }

}])

.controller('ToastCtrl', ['$scope', '$mdToast', '$timeout', function($scope, $mdToast, $timeout) {
  $scope.closeToast = function() {
    $mdToast.hide();
  };
}])

.controller('AppCtrl', ['$scope', '$mdToast', '$timeout',
function($scope, $mdToast, $timeout) {
  $scope.closeToast = function() {
    $mdToast.hide();
  };
}])
