/**
 * [module Dialogs]
 *
 * Set of dialogs for analysis (and prompts)
 *
 */
angular.module('Dialogs', [])
.service('Dialogs', ['MS', 'WS', '$mdDialog', '$mdToast',
function(MS, WS, $dialog, $mdToast) {
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
                    self.showToast('Reconstructing', item.name)
                    MS.reconstruct($scope.form)
                      .then(function(r) {
                           cb(r);
                           self.showComplete('Reconstruct Complete', item.name, r[2]+r[0])
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
                    self.showToast('Reconstructing', item.name)
                    MS.reconstruct($scope.form, {gapfill: false})
                      .then(function(r) {
                           cb(r);
                           self.showComplete('Reconstruct Complete', item.name, r[2]+r[0])
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
                    self.showToast('Running Flux Balance Analysis', item.name)
                    MS.runFBA($scope.form)
                      .then(function(res) {
                          console.log('run fba response', res)
                          cb();
                          self.showComplete('FBA Complete',
                                       res[0]+' '+res[7].media.split('/').pop())
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
                    self.showToast('Gapfilling', item.name)

                    MS.gapfill($scope.form)
                      .then(function(res) {
                           cb();
                           self.showComplete('Gapfill Complete', res[0])
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

                $scope.cancel = function(){
                    if (cancelCB) cancelCB();
                    $dialog.hide();
                }
            }]
        })
    }

    this.showToast = function(title, name) {
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
        hideDelay: 0,
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
