
angular.module('Browser', ['uiTools'])
.controller('MyData',
['$scope', '$state', '$stateParams', 'WS', '$log',
 'uiTools', '$document', '$timeout', '$mdDialog', '$mdToast',
 'Upload', '$mdSidenav', 'Dialogs', 'ViewOptions',
  function($scope, $state, $stateParams, WS, $log, uiTools, $document,
           $timeout, $dialog,  $mdToast, Upload, $mdSidenav, Dialogs, ViewOptions) {

    $scope.Upload = Upload;
    $scope.WS = WS;

    $scope.uiTools = uiTools;
    $scope.relativeTime = uiTools.relativeTime;
    $scope.readableSize = uiTools.readableSize;

    // sort by time first
    $scope.predicate = 'timestamp';
    $scope.reverse = true;

    // model: row selection data
    $scope.selected = {};

    // model: when in edit mode
    $scope.edit = false;

    // model: primary click on row
    $scope.select = false;

    // model: items in folder that is being viewed
    $scope.items;

    // Use url in path
    $scope.folder = $stateParams.dir;

    // get path in list form
    var depth = $scope.folder.split('/').length -2;
    $scope.path = $scope.folder.split('/').splice(2, depth);

    // get path strings for parent folders
    var dir_names = $scope.folder.split('/').splice(1, depth);
    var links = [];
    for (var i=0; i < depth; i++) {
        var link = '/'+dir_names.join('/');
        links.push(link);
        dir_names.pop();
    }
    links.reverse();
    links = links.slice(1, links.length);

    // load initial data
    $scope.loading = true;
    WS.list($scope.folder).then(function(data) {
        var d = [];

        // skip "hidden"; mapping for links to pages
        for (var i=0; i<data.length; i ++) {
            var item = data[i];
            if (item.name[0] == '.') item.hidden = true;

            item.state = getState(item);

            d.push(item);
        }

        $scope.items = d;
        $scope.loading = false;
    })

    $scope.showHidden = ViewOptions.get('wsBrowser').showHidden;
    $scope.toggleHidden = function() {
        $scope.showHidden = !$scope.showHidden;
        ViewOptions.set('wsBrowser', {showHidden: $scope.showHidden} )
    }

    $scope.filterHidden = function(item) {
        if ($scope.showHidden == true) return true;
        return !item.hidden;
    }

    // method for retrieving links of all parent folders
    $scope.getLink = function(i) {
        return links[i];
    }

    $scope.prevent = function(e) {
        e.stopPropagation();
    }

    // context menu open
    $scope.openMenu = function(e, i, item) {
        $scope.selectRow(e, i , item, true);
    }

    // context menu close
    $scope.closeMenu = function(e, i, item) {
        // if not editing something, remove selection
        if (!$scope.edit) {
            $scope.selected = undefined;
        }
    }

    // used for creating new folder, maybe other things later
    $scope.newPlaceholder = function() {
        $scope.placeHolder = true;
        $timeout(function() {
            $scope.$broadcast('placeholderAdded');
        })
    }

    // saves the folder name, updates view
    $scope.createFolder = function(name) {
        $scope.placeHolder = false;

        // if nothing entered, return
        if (!name) return;

        $scope.saving = true;
        return WS.createFolder( path(name) ).then(function(res) {
                   $scope.saving = false;
                   $scope.items.push(WS.sanitizeMeta(res[0]))
               }).catch(function(e){
                    console.log('there was an error', e)
                    $scope.saving = false;
               })
    }

    // delete an object
    $scope.filtered;
    $scope.deleteObj = function(item) {
        WS.deleteObj( path(item.name), item.type ).then(function(res) {
            $scope.items.splice($scope.items.indexOf(item.name), 1);
        })
    }

    // used to create editable name
    $scope.editableName = function(selected) {
        $scope.edit = {index: selected.index};

        $timeout(function() {
            $scope.$broadcast('editable');
        })
    }

    // used for rename and move, update view
    $scope.mv = function(src, dest) {
        $scope.selected = undefined;

        $scope.saving = true;
        WS.mv(src, dest).then(function( ){
            $scope.saving = false;
            $scope.edit = false;
            $scope.updateDir();
        }).catch(function(e) {
            console.error('could not save', e)
            $scope.saving = false;
            $scope.edit = false;
        });
    }

    // used for rename and move, update view
    $scope.rename = function(name, new_name) {
        $scope.selected = undefined;

        $scope.saving = true;
        $scope.mv( path(name), path(new_name) );
    }


    $scope.selectRow = function(e, i, item, hideTop) {
        $scope.select = hideTop ? false : true;
        $scope.selected = {type: item.type ? item.type : null,
                           path: item.path,
                           name: item.name,
                           index: i};

        e.stopPropagation();
        e.preventDefault();

        // if not context menu, let template update close top on document click
        if (!hideTop) {
            $timeout(function() { $document.bind('click', events); })

            // don't interfere with context menu
            function events() {
                $scope.$apply(function() {
                    $scope.select = false;
                    $scope.selected = undefined;
                })
                $document.unbind('click', events);
            }
        }

        if (item.type != 'folder') {
            WS.getDownloadURL(item.path)
              .then(function(res) {
                    $scope.selected.downloadURL = res[0];
              })
        }
    }

    $scope.triggerDownload = function(item) {
        WS.getDownloadURL(item.path)
          .then(function(res) {
              window.open(res[0], "Download")
          })
    }

    // updates the view (bruteforce for now)
    $scope.updateDir = function() {
        WS.list($scope.folder).then(function(data) {
            $scope.items = data;
        })
    }

    // updates the view
    $scope.updateWorkspaces = function() {
        WS.getWorkspaces().then(function(d) {
            $scope.workspaces = d;
            $scope.loading = false;
        })
    }

    function path(name) {
        return $scope.folder+'/'+name;
    }

    $scope.openUploader = function(ev, path) {
        $dialog.show({
            targetEvent: ev,
            scope: $scope.$new(),
            preserveScope: true,
            templateUrl: 'app/components/browser/mini-uploader.html',
            controller: ['$scope', function($scope) {
                var $this = $scope;
                $scope.uploadPath = path;   // putting this here there due to onchange issues

                // user selects a type
                $scope.type;

                $scope.createNode = function(files) {
                    // upload to SHOCK
                    WS.createNode({path: path+'/'+files[0].name, type:$scope.type})
                      .then(function(res) {
                          $dialog.hide();
                          Upload.uploadFile(files, res[0][11])
                      })
                      .catch(function(e) {
                          if (e.data.error.code == -32603) {
                              $dialog.show({
                                  templateUrl: 'app/components/browser/confirm.html',
                                  controller: ['$scope', function($scope) {
                                      $scope.cancel = function(){
                                          $dialog.hide();

                                      }
                                      $scope.overwrite = function(name){
                                          $this.createNode(files, true);
                                      }

                                      /*
                                      $scope.keep = function(name){
                                          $this.createNode(files, true);
                                          $dialog.hide();
                                      }*/
                                  }]
                              })
                            } else {
                                alert('Server error! Could not upload node.')
                            }
                       })

                    function errorHandler(event) {
                        alert(event);
                    }
                }

                $scope.cancel = function() {
                    $dialog.hide();
                }
            }]
        })
    }

    // update dropdown after upload
    $scope.$watch('Upload.status', function(value) {
        $timeout(function() {

            if (value.complete == true) {
                console.log('updating')
                $scope.updateDir();
            }
            $scope.status = value;

        })

    }, true);


    $scope.showMeta = function(ev, item) {
        Dialogs.showMeta(ev, path(item.name))
    }

    $scope.reconstruct = function(ev, item) {
        Dialogs.reconstruct(ev, item)
    }

    $scope.runFBA = function(ev, item) {
        Dialogs.runFBA(ev, item)
    }

    $scope.gapfill = function(ev, item) {
        Dialogs.gapfill(ev, item)
    }


    function toggleOperations(item) {
        if (item.type === 'model') {
            if (!$mdSidenav('modelOpts').isOpen())
                $mdSidenav('modelOpts').open();

            $document.bind('click', function(e) {
                $mdSidenav('modelOpts').close();
                $document.unbind(e)
            })
        } else if (item.type === 'genome') {
            if (!$mdSidenav('genomeOpts').isOpen())
                $mdSidenav('genomeOpts').open();

            $document.bind('click', function(e) {
                $mdSidenav('genomeOpts').close();
                $document.unbind(e)
            })

        } else if ($mdSidenav('modelOpts').isOpen()) {
            $mdSidenav('modelOpts').close()
        }
    }

    $scope.goTo = function(item, state) {
        if (item.type === 'folder' || item.type === 'modelfolder')
            $state.go('app.myData', {dir: item.path});
        else {
            if (!state) var state = getState(item);
            if (state) {
                // models are special in that url is /model/<parent_dir_of_model>
                if (item.type === 'model') {
                    var path =  item.path.slice(0, item.path.lastIndexOf('/') );
                    $state.go(state, {path: path});
                } else {
                    $state.go(state, {path: item.path });
                }
            }
        }
    }

    $scope.getUrlPath = function(item) {
        // models are special in that url is /model/<parent_dir_of_model>
        if (item.type === 'model')
            return item.path.slice(0, item.path.lastIndexOf('/') );
        else
            return item.path;
    }

    function getState(item) {
        if (item.type === "model")
            return 'app.modelPage';
        else if (item.type === "media")
            return 'app.mediaPage';
        else if (item.type === "png")
            return 'app.image';
        else if (item.type === "genome")
            return 'app.genomePage';
        else if (item.name.slice(0,3) === "map")
            return 'app.map';
    }
}])
