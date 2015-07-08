/*
 * MoodelSEED Service API
 *
 *   This is responsible for the MS-related calls
 *
*/

angular.module('MS', [])
.service('MS', ['$http', '$log', '$cacheFactory', '$q', 'ModelViewer', 'WS',
    function($http, $log, $cacheFactory, $q, MV, WS) {

    var self = this;

    // model for displayed things
    this.myModels = null;

    var cache = $cacheFactory('ms');

    // takes   fixme: cleanup
    this.uploadData = function(p) {
        var objs = [[p.path, p.type, p.meta ? p.meta : null, p.data ? p.data : null]];
        var params = {objects:objs};
        return $http.rpc('ws', 'create', params).then(function(res) {
                    $log.log('response', res)
                    return res;
                })
    }

    // takes path of new folder, creates it
    this.createFolder = function(path) {
        var params = {objects: [[path, 'Directory']]};
        return $http.rpc('ws', 'create', params).then(function(res) {
                    $log.log('response', res)
                    return res;
                }).catch(function(e){
                    console.error('Could not create folder', path, e.data.error)
                })
    }

    this.getDownloads = function(path) {
        var jsonPath = path,
            hiddenDir = path.slice(0, path.lastIndexOf('/')+1)+'.'+ path.split('/').pop();

        var p1 = WS.list(hiddenDir, {recursive: true, excludeDirectories: true});
        var p2 = WS.getObjectMeta(jsonPath).then(function(res) { return res[0]; })

        return $q.all([p1, p2])
                 .then(function(args) {
                    var r = args[0], r2 = args[1];

                    var paths = [], objs = [];
                    for (var i=0; i<r.length; i++) {
                        var obj = r[i];
                        objs.push({path: obj.path+obj.name, size: obj.size, name: obj.name});
                        paths.push(obj.path+obj.name);
                    }

                    // add json download url data
                    objs.push({path: r2[2]+r2[0], size: r2[6], name: r2[0]});
                    paths.push(r2[2]+r2[0]);

                    return $http.rpc('ws', 'get_download_url', {objects:paths})
                                .then(function(urls) {
                                    var downloads = {};
                                    for (var i=0; i<urls.length; i++) {
                                        var url = urls[i],
                                            obj = objs[i];

                                        var dl = {url: url,
                                                  size: obj.size,
                                                  name: obj.name};

                                        if (i == urls.length-1)
                                            downloads.json = dl;
                                        else if (url.indexOf('.sbml') > 0)
                                            downloads.sbml = dl;
                                        else if (url.indexOf('.cpdtbl') > 0)
                                            downloads.cpdTable = dl;
                                        else if (url.indexOf('.rxntbl') > 0)
                                            downloads.rxnTable = dl;
                                    }

                                    return downloads;
                                })

                 })


    }

    this.reconstruct = function(form) {
        $log.log('reconstruct form', form)
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

    this.getObjectMetas = function(paths) {
        if ( cache.get('objectmetas') )
            return cache.get('objectmetas');

        $log.log('get (metas)', paths)

        var p = $http.rpc('ws', 'get', {objects: paths, metadata_only: 1})
                    .then(function(res) {
                        $log.log('get (metas) res', res)
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
        return $http.rpc('ms', 'list_models')
                    .then(function(res) {
                        $log.log('listmodels resp', res)
                        var data = [];
                        for (var i=0; i<res.length; i++) {
                            var obj = res[i];

                            data.push(self.sanitizeModel(obj))
                        }

                        self.myModels = data;
                        return data;
                    })
    }

    this.sanitizeModel = function(obj) {
        return {name: obj.id,
                path: obj.ref,
                orgName: obj.name,
                rxnCount: obj.num_reactions,
                cpdCount: obj.num_compounds,
                fbaCount: obj.fba_count,
                timestamp: Date.parse(obj.rundate),
                gapfillCount: obj.unintegrated_gapfills + obj.integrated_gapfills}

    }

    this.getPublicMedia = function() {
        var publicMedia = '/chenry/public/modelsupport/media';
        return WS.listL(publicMedia)
                 .then(function(objs) {

                        var media = [];
                        for (var i=0; i<objs.length; i++) {
                            media.push({name: objs[i][7].name,
                                        path: objs[i][2]+objs[i][0] });
                        }

                        $log.log('returned media', media)
                        return media;
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

    this.downloadSBML = function(path) {
        $log.log('export model (download sbml)', path)
        return $http.rpc('ms', 'export_model', {model: path, format: "sbml", toshock: 1})
                    .then(function(res) {
                        $log.log('export model (download sbml) response', res)
                        return res;
                    })

    }

    this.addModel = function(model) {
        $log.log('adding model', model)
        this.myModels.push(self.sanitizeModel(model))
    }

}]);
