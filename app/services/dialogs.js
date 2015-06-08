
/**
 * [module Dialogs]
 *
 * Set of dialogs for analysis (and prompts)
 *
 */
angular.module('Dialogs', [])
.service('Dialogs', ['MS', '$mdDialog', '$mdToast',
function(MS, $dialog, $mdToast) {

    this.showMeta = function(ev, path) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/show-meta.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                MS.getObjectMeta(path)
                  .then(function(meta) {
                      $scope.metaData = meta;
                  })

                $scope.cancel = function(){
                    $dialog.hide();
                }
            }]
        })
    }

    this.reconstruct = function(ev, item) {
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
                    console.log('form!', $scope.form)

                    showToast('Reconstructing', item.name)
                    MS.reconstruct($scope.form)
                      .then(function(r) {
                           showComplete('Reconstruct Complete', item.name, r[2]+r[0])
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
                $scope.item;
                $scope.form = {model: item.path, media_supplement: []};

                $scope.runFBA = function(){
                    showToast('Running Flux Balance Analysis', item.name)
                    MS.runFBA($scope.form)
                      .then(function(res) {
                          console.log('resp', res)
                           cb();
                           showComplete('FBA Complete',
                                        res[0]+' '+res[7].media.toName())
                      }).catch(function(e) {
                          showError(e.error.message)
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
        console.log('item!!!', item)
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/gapfill.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {

                $scope.gapfill = function(){
                    showToast('Gapfilling', item.name)

                    MS.gapfill(item.path)
                      .then(function(res) {
                          console.log('gapfill response', res)
                           cb();
                           showComplete('Gapfill Complete', res[0])
                      }).catch(function(e) {
                          showError(e.error.message)
                      })
                    $dialog.hide();
                }

                $scope.cancel = function(){
                    $dialog.hide();
                }

            }]
        })
    }

    function showToast(title, name) {
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

    function showComplete(title, name, path) {
        $mdToast.show({
         controller: 'ToastCtrl',
         parent: angular.element('.sidebar'),
         //templateUrl:'app/views/dialogs/notify.html',
         template: '<md-toast>'+
                     '<span flex style="margin-right: 30px;">'+
                       '<span class="ms-color-complete">'+title+'</span><br>'+
                       name.slice(0,20)+'...'+
                      '</span>'+
                   '<md-button offset="33" ng-click="closeToast()" ui-sref="app.modelPage({path:\''+path +'\'})">'+
                     'View'+
                   '</md-button>'+
                 '</md-toast>',
         hideDelay: 10000
       });
    }

    function showError(msg) {
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

// takes workspace path, returns name
String.prototype.toName = function() {
    var a = this.split('/');
    return a[a.length-1]
}
