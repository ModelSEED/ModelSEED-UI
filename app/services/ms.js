/*
 * MoodelSEED Service API
 *
 *   This is responsible for the MS-related calls
 *
*/

angular.module('MS', [])
.service('MS', ['$http', '$log', '$cacheFactory', '$q', 'ModelViewer',
    function($http, $log, $cacheFactory, $q, MV) {

    var self = this;

    // model for displayed things
    this.workspaces = [];
    this.myModels = [];

    var cache = $cacheFactory('ms');

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

    this.reconstruct = function(form) {
        return $http.rpc('ms', 'ModelReconstruction', form)
                    .then(function(res){
                        return res;
                    })
    }

    this.runFBA = function(form) {
        $log.log('run fba params', form)
        return $http.rpc('ms', 'FluxBalanceAnalysis', form)
                    .then(function(res){
                        return res;
                    })
    }

    this.gapfill = function(path) {
        return $http.rpc('ms', 'GapfillModel', {model: path})
                    .then(function(res){
                        return res;
                    })
    }

    this.getObject = function(path) {
        $log.log('get (object)', path)
        return $http.rpc('ws', 'get', {objects: [path]})
                    .then(function(res) {
                        $log.log('get (object) response', res)
                        var data = {meta: res[0][0], data: JSON.parse(res[0][1])}
                        return data;
                    })
    }

    this.getObjectMeta = function(path) {
        $log.log('retrieving meta', path)
        return $http.rpc('ws', 'get', {objects: [path], metadata_only: 1})
                    .then(function(res) {
                        return res[0];
                    })
    }

    this.getObjectMetas = function(paths) {
        if ( cache.get('objectmetas') )
            return cache.get('objectmetas');

        $log.log('get (metas)', paths)

        var p = $http.rpc('ws', 'get', {objects: paths, metadata_only: 1})
                    .then(function(res) {
                        console.log('res', res)
                        var res = [].concat.apply([], res)

                        var data = [];
                        for (var i=0; i<res.length; i++) {
                            var meta = res[i];
                            var d = meta[8];

                            data.push({name: meta[0],
                                       timestamp: Date.parse(meta[3]),
                                       path: meta[2]+meta[0],
                                       orgName: d.name,
                                       rxnCount: d.num_reactions,
                                       cpdCount: d.num_compounds})
                        }

                        return data;
                    })
        cache.put('objectmetas', p);
        return p;
    }

    this.getModels = function() {
        $log.log('list models')
        return $http.rpc('ms', 'list_models', {})
                    .then(function(res) {
                        $log.log('listmodels resp', res)
                        var data = [];
                        for (var i=0; i<res.length; i++) {
                            var obj = res[i];

                            data.push({name: obj.id,
                                       path: obj.ref,
                                       orgName: obj.name,
                                       rxnCount: obj.num_reactions,
                                       cpdCount: obj.num_compounds,
                                       fbaCount: obj.fba_count,
                                       gapfillCount: obj.unintegrated_gapfills + obj.integrated_gapfills})
                        }
                        return data;
                    })
    }


    this.getModelFBAs = function(modelPath) {

        $log.log('list related fbas!', modelPath)
        return $http.rpc('ms', 'list_fba_studies', {model: modelPath})
                    .then(function(res) {
                        $log.log('related fbas', res)
                        // select any previously selected
                        var d = [];
                        for (key in res) {
                            var fba = res[key];
                            if (MV.isSelected(modelPath, fba))
                                fba.checked = true;

                            // consistency
                            fba.path = fba.fba;
                            delete fba['fba'];

                            fba.media = fba.media.toName();
                            fba.timestamp = Date.parse(fba.rundate);

                            d.push(res[key]);
                        }
                        return d;
                    }).catch(function() {
                        return [];
                    })
    }

    this.getModelGapfills = function(path) {
        $log.log('list gapfills', path)
        return $http.rpc('ms', 'list_gapfill_solutions', {model: path})
                    .then(function(res) {
                        $log.log('related gfs', res)

                        return res;
                    }).catch(function() {
                        return [];
                    })
    }

    this.manageGapfills = function(path, gfID, operation){
        $log.log('manage_gapfill_solutions', path)
        var commands = {};
        commands[gfID] = operation;
        return $http.rpc('ms', 'manage_gapfill_solutions', {model: path, commands: commands})
                    .then(function(res) {
                        $log.log('manage_gapfill_solutions response', res)
                        return res[gfID];
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
