/*
 * MoodelSEED Service API
 *
 *   This is responsible for the MS-related calls
 *
*/

angular.module('MS', [])
.service('MS', ['$http', '$log', 'Auth', 'config', '$cacheFactory', '$q',
    function($http, $log, auth, config, $cacheFactory, $q) {

    var self = this;

    // model for displayed workspaces
    this.workspaces = [];

    this.getMyData = function(path, opts) {
        var params = {paths: [path]};
        angular.extend(params, opts);

        return $http.rpc('ws', 'ls', params)
                    .then(function(d) {
                        console.log('ws data returned', d)
                        var d = d[path];

                        // parse into list of dicts
                        var data = [];
                        for (var i in d)
                            data.push( self.wsListToDict(d[i]) );

                        return data;
                    })
    }

    // wsListToDict: takes workspace info array, returns dict.
    this.wsListToDict = function(ws) {
        return {name: ws[0],
                type: ws[1],
                path: ws[2],
                modDate: ws[3],
                id: ws[4],
                owner: ws[5],
                size: ws[6],
                files: null, // need
                folders: null, // need
                timestamp: Date.parse(ws[3])
               };
    }

    this.addToModel = function(ws) {
        self.workspaces.push( self.wsListToDict(ws) );
    }


    this.rmFromModel = function(ws) {
        for (var i=0; i<self.workspaces.length; i++) {
            if (self.workspaces[i].id == ws[4])
                self.workspaces.splice(i, 1);
        }
    }

    // takes source and destimation paths, moves object
    this.mv = function(src, dest) {
        var params = {objects: [[src, dest]], move: 1 };
        console.log('trying to rename with', params);
        return $http.rpc('ws', 'copy', params)
                    .then(function(res) {
                        console.log('response was', res)
                        return res;
                    }).catch(function(e) {
                        console.log('could not mv', e)
                    })
    }

    // takes path of object, deletes object
    this.deleteObj = function(path, isFolder) {
        console.log('calling delete')
        var params = {objects: [path],
                      deleteDirectories: isFolder ? 1 : 0,
                      force: isFolder ? 1 : 0};
        return $http.rpc('ws', 'delete', params)
                    .then(function(res) {
                        console.log('deleted object', res)
                        return res;
                    }).catch(function(e) {
                        console.error('delete failed', e, path)
                    })

    }

    // takes workspace spec hash, creates node.  fixme: cleanup
    this.createNode = function(p) {
        var objs = [[p.path, p.type, null, null]];
        var params = {objects:objs, createUploadNodes: 1};
        return $http.rpc('ws', 'create', params).then(function(res) {
                    console.log('response', res)
                    return res;
                })
    }

    // takes   fixme: cleanup
    this.uploadData = function(p) {
        var objs = [[p.path, p.type, p.meta ? p.meta : null, p.data ? p.data : null]];
        var params = {objects:objs};
        return $http.rpc('ws', 'create', params).then(function(res) {
                    console.log('response', res)
                    return res;
                })
    }

    // takes path of new folder, creates it
    this.createFolder = function(path) {
        var params = {objects: [[path, 'Directory']]};
        return $http.rpc('ws', 'create', params).then(function(res) {
                    console.log('response', res)
                    return res;
                }).catch(function(e){
                    console.error('Could not create folder', path, e.data.error)
                })
    }

    this.getDownloadURL = function(path) {
        return $http.rpc('ws', 'get_download_url', {objects:[path]})
                    .then(function(res) {
                        console.log('download response', res)
                        return res;
                    })

    }

    this.reconstruct = function(item) {
        return $http.rpc('ms', 'ModelReconstruction', {genome: item})
                    .then(function(res){
                        return res;
                    })
    }

    this.runFBA = function(item) {
        return $http.rpc('ms', 'FluxBalanceAnalysis', {model: item})
                    .then(function(res){
                        return res;
                    })
    }

    this.gapfill = function(item) {
        return $http.rpc('ms', 'GapfillModel', {model: item})
                    .then(function(res){
                        return res;
                    })
    }

    this.getObject = function(path) {
        $log.log('retrieving object', path)
        return $http.rpc('ws', 'get', {objects: [path]})
                    .then(function(res) {
                        var data = {meta: res[0][0], data: JSON.parse(res[0][1])}
                        return data;
                    })
    }

    this.getObjectMeta = function(path) {
        $log.log('retrieving meta', path)
        return $http.rpc('ms', 'get', {objects: [path], metadata_only: 1})
                    .then(function(res) {
                        return res[0];
                    })
    }


    this.getModels = function() {
        $log.log('list models')
        return $http.rpc('ms', 'list_models', {})
                    .then(function(res) {
                        $log.log('list models res', res)
                        var models = []
                        for (var i in res) {
                            var name = res[i].split('/')
                            var model = {name: res[i].split('/')[res[i].split('/').length-1],
                                         ref: res[i]};
                            models.push(model);
                        }
                        return models;
                    })
    }


    this.getModelFBAs = function(model) {
        $log.log('list related fbas', model)
        return $http.rpc('ms', 'list_fba_studies', {model: model})
                    .then(function(res) {
                        return res;
                    })
    }

    this.getModelEdits = function(model) {
        $log.log('list model edits', model)
        return $http.rpc('ms', 'list_model_edits', {model: model})
                    .then(function(res) {
                        return res;
                    })
    }

    /*
        REQUIRED INPUTS:
        ref model - reference to model to integrate solutions for
        mapping<edit_id,gapfill_command> commands - list of edit commands

        OPTIONAL INPUTS:
        edit_data new_edit - list of new edits to add
    */
    this.manage_model_edits = function(p) {
        $log.log('manage model edits', p)
        return $http.rpc('ws', 'get', {model: p.model, commands: p.command})
                    .then(function(res) {
                        $log.log('manage model response', res)
                        return res;
                    })
    }

}]);
