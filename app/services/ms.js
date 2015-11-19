/*
 * MoodelSEED Service API
 *
 *   This is responsible for the MS-related calls
 *
*/

angular.module('MS', [])
.service('MS',
['$http', '$log', '$cacheFactory', '$q', 'ModelViewer', 'WS', 'config', 'Auth',
function($http, $log, $cacheFactory, $q, MV, WS, config, Auth) {

    var self = this;

    // model for displayed things
    this.myModels = null;
    this.myPlants = null;

    var cache = $cacheFactory('ms');

    this.listRastGenomes = function() {
        return $http.rpc('msSupport', 'list_rast_jobs', {})
                    .then(function(jobs) {
                        var genomes = [];
                        for (var i=0; i<jobs.length; i++) {
                            var job = jobs[i];
                            if (job.type !== 'Genome') continue;

                            genomes.push({timestamp: Date.parse(job.mod_time+'+0000'),
                                          genome_name: job.genome_name,
                                          genome_id: job.genome_id,
                                          id: job.id,
                                          contigs: job.contig_count});
                        }

                        return genomes;
                    }).catch(function(e) {
                        console.error('list rast genomes error', e);
                    })
    }



    this.uploadData = function(p) {
        var objs = [[p.path, p.type, p.meta ? p.meta : null, p.data ? p.data : null]];
        var params = {objects:objs};
        return $http.rpc('ws', 'create', params).then(function(res) {
                    $log.log('response', res)
                    return res;
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
                        paths.push(obj.path);
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

    this.reconstruct = function(form, params) {
        console.log('form', form)
        console.log('addtional params', params)
        var params = angular.extend(form, params)
        $log.log('reconstruct form', params)
        return $http.rpc('ms', 'ModelReconstruction', params)
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

    this.gapfill = function(form) {
        return $http.rpc('ms', 'GapfillModel', form)
                    .then(function(res){
                        return res;
                    })
    }

    this.getObjectMetas = function(paths) {
        if ( cache.get('objectmetas') )
            return cache.get('objectmetas');

        //console.log('get (metas)', paths)

        var p = $http.rpc('ws', 'get', {objects: paths, metadata_only: 1})
                    .then(function(res) {
                        //$log.log('get (metas) res', res)
                        var res = [].concat.apply([], res)

                        var data = [];
                        for (var i=0; i<res.length; i++) {
                            var meta = res[i];
                            var d = meta[8];

                            data.push({name: meta[0],
                                       timestamp: Date.parse(meta[3]+'+0000'),
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

    this.listModels = function(path) {
        var params = path ? {path: path} : {};
        //$log.log('list models', params)
        return $http.rpc('ms', 'list_models', params)
                    .then(function(res) {
                        //console.log('listmodels resp', res)
                        var data = [];
                        for (var i=0; i<res.length; i++) {
                            var obj = res[i];
                            data.push(self.sanitizeModel(obj))
                        }

                        // cache data according to plants/microbes
                        if (path.split('/')[2] === 'plantseed') self.myPlants = data
                        else self.myModels = data;
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
                timestamp: Date.parse(obj.rundate+'+0000'),
                gapfillCount: obj.unintegrated_gapfills + obj.integrated_gapfills}

    }

    this.myMedia = null; //cached media data
    this.listMyMedia = function() {
        if (self.myMedia != null) {
            var d = $q.defer();
            d.resolve(self.myMedia)
            return d.promise;
        }

        var path = '/'+Auth.user+'/media';
        return WS.listL(path)
            .then(function(objs) {
                if (!objs) return [];
                var media = [];
                for (var i=0; i<objs.length; i++) {
                    var obj = objs[i];
                    media.push(self.sanitizeMedia(obj));
                }

                self.myMedia = media
                return media;
            })
    }

    this.addMyMedia = function(media) {
        if (!self.myMedia) return;
        self.myMedia.push(self.sanitizeMedia(media));
    }

    this.media = null;
    this.listPublicMedia = function() {
        if (self.media != null) return self.media;

        self.media = WS.listL( config.paths.media )
                       .then(function(objs) {
                            var media = [];
                            for (var i=0; i<objs.length; i++) {
                                 var obj = objs[i];
                                media.push(self.sanitizeMedia(obj));
                            }

                            return media;
                        })
        return self.media;
    }

    this.sanitizeMedia = function(obj) {
        return {name: obj[0],
                path: obj[2]+obj[0],
                isMinimal: obj[7].isMinimal ? true : false,
                isDefined: obj[7].isDefined ? true : false,
                type: obj[7].type ? obj[7].type : 'unspecified',
                timestamp: Date.parse(obj[3]+'+0000'),
                value: obj[0].toLowerCase() }
    }

    this.sanitizeMediaObjs = function(objs) {
        var mediaList = [];
        for (var i=0; i<objs.length; i++) { mediaList.push( self.sanitizeMedia(objs[i]) ) }
        return mediaList;
    }

    this.getModelFBAs = function(modelPath) {
        //$log.log('list related fbas!', modelPath)
        return $http.rpc('ms', 'list_fba_studies', {model: modelPath})
                    .then(function(res) {
                        //console.log('related fbas', res)
                        // select any previously selected
                        var d = [];

                        for (var i=0; i<res.length; i++) {
                            var fba = res[i];

                            if (MV.isSelected(modelPath, fba.ref))
                                fba.checked = true;

                            // fixme: backwards compatible
                            fba.path = fba.ref;

                            fba.media = fba.media_ref
                            fba.timestamp = Date.parse(fba.rundate+'+0000');

                            d.push(res[i]);
                        }
                        return d;
                    }).catch(function() {
                        return [];
                    })
    }

    this.getModelGapfills = function(path) {
        //$log.log('list gapfills', path)
        return $http.rpc('ms', 'list_gapfill_solutions', {model: path})
                    .then(function(res) {
                        $log.log('related gfs', res)

                        var d = [];
                        for (i in res) {
                            var gf = res[i];
                            gf.media = gf.media_ref ? gf.media_ref.split('/').pop() : '';
                        }

                        return res;
                    }).catch(function() {
                        return [];
                    })
    }

    this.manageGapfills = function(path, gfID, operation){
        //$log.log('manage_gapfill_solutions', path)
        var commands = {};
        commands[gfID] = operation;
        return $http.rpc('ms', 'manage_gapfill_solutions', {model: path, commands: commands})
                    .then(function(res) {
                        $log.log('manage_gapfill_solutions response', res)
                        return res[gfID];
                    })
    }

    this.getModelEdits = function(model) {
        //$log.log('list model edits', model)
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
        //$log.log('manage model edits', p)
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

    this.getFeature = function(genome, feature) {
        //console.log('getting feature', feature)
        return $http.rpc('ms', 'get_feature', {genome: genome, feature: feature})
                    .then(function(res) {
                        $log.log('feature response', feature)
                        return res;
                    })

    }

    this.addModel = function(model, type) {
        //console.log('adding model', model)
        if (type.toLowerCase() === 'microbe')
            syncCache(this.myModels, model)
        else if (type.toLowerCase() === 'plant')
            syncCache(this.myPlants, model)
    }

    // if new object already exists in cache,
    // delete old, replace with new
    function syncCache(data, model) {
        for (var i=0; i<data.length; i++) {
            if (data[i].path === model.ref) data.splice(i,1)
            break;
        }

        model.fba_count += 1; // increment fba count on client for now
        data.push( self.sanitizeModel(model) );
        sortCachedModels(data);
    }

    function sortCachedModels(data) {
        data.sort(function(a, b) {
            if (a.timestamp < b.timestamp) return 1;
            if (a.timestamp > b.timestamp) return -1;
            return 0;
        })
    }

}]);
