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

                            genomes.push({
                                timestamp: Date.parse(job.mod_time+'+0000'),
                                genome_name: job.genome_name,
                                genome_id: job.genome_id,
                                id: job.id,
                                contigs: job.contig_count
                            });
                        }

                        return genomes;
                    }).catch(function(e) {
                        console.error('list rast genomes error', e);
                    })
    }
    // download method for model directories
    this.getDownloads = function(path) {
        // get meta on objects in model folder
        var p1 = WS.list(path, {recursive: true, excludeDirectories: true});

        // get meta on model
        var p2 = WS.getObjectMeta(path+'/model')
                    .then(function(res) {
                        return res[0];
                    })

        // get paths and meta, along with download urls
        return $q.all([p1, p2])
            .then(function(args) {
                var r = args[0], r2 = args[1];
                var paths = [], objs = [];
                for (var i=0; i<r.length; i++) {
                    var obj = r[i];
                    objs.push({path: obj.path+obj.name, size: obj.size, name: obj.name});
                    paths.push(obj.path);
                }

                objs.push({path: r2[2]+r2[0], size: r2[6], name: r2[0]});
                paths.push(r2[2]+r2[0]);

                return $http.rpc('ws', 'get_download_url', {objects: paths})
                            .then(function(urls) {
                                var downloads = {};
                                for (var i=0; i<urls.length; i++) {
                                    var url = urls[i],
                                        obj = objs[i];

                                    var dl = {
                                        url: url,
                                        size: obj.size,
                                        name: obj.name
                                    };

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

    
    
    this.reconstructionPipeline = function(name, annotate) {
        var args = {destname: name, annotate: annotate};
        console.log('calling pipeline:', args)
        return $http.rpc('ms', 'plant_pipeline', args)
                    .then(function(res){
                        console.log('response', res)
                        return res;
                    })
    }
    
    
    
    this.reconstruct = function(form, params) {
    	var parameters = angular.extend(form, {loadingPlants: true});
        // var params = angular.extend(form, params);
        console.log('reconstruct form:', form, ' parameters: ', parameters, ' params: ', params);
        return $http.rpc('ms', 'ModelReconstruction', parameters)
                    .then(function(res){
                        return res;
                    } ).catch(function(e) {
                  	  console.log( 'BuildPlant ctrls Reconstruct Error', e.error.message );
                  	  return e;
                    } );
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

    this.createGenomeFromShock = function(node, name) {
        var args = {shock_id: node, destname: name, annotate: 1};
        console.log('calling create genome from shock:', args)
        return $http.rpc('ms', 'plant_pipeline', args)
                    .then(function(res){
                        console.log('response', res)
                        return res;
                    })        
    }        

    this.createExpressionFromShock = function(node, modelFolder, name) {
        var args = {
            shock_id: node, 
            destmodel: modelFolder,
            destname: name
        };
        console.log('calling create_featurevalues_from_shock:', args)
        return $http.rpc('ms', 'create_featurevalues_from_shock', args)
                    .then(function(res){
                        console.log('featurevalues res:', res)
                        return res;
                    })               
    }

    this.annotatePlant = function(opts) {
        var args = {
            //genome: path,
            destmodel: opts.destmodel,
            kmers: opts.kmers ? 1 : 0,
            blast: opts.blast ? 1 : 0      
        }

        console.log('calling annotate_plant_genome:', args)
        return $http.rpc('ms', 'annotate_plant_genome', args)
                    .then(function(res){
                        console.log('annotate_plant_genomes res:', res)
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

                            data.push({
                                name: meta[0],
                                timestamp: Date.parse(meta[3]+'+0000'),
                                path: meta[2]+meta[0],
                                orgName: d.name,
                                rxnCount: d.num_reactions,
                                cpdCount: d.num_compounds
                            })
                        }

                        return data;
                    })
        cache.put('objectmetas', p);
        return p;
    }

    this.listModels = function(path) {
        var params = path ? {path: path} : {};
        
        return $http.rpc('ms', 'list_models', params)
            .then(function(res) {
                var data = [];
                for (var i=0; i<res.length; i++) {
                    var obj = res[i];

                    //if (!obj.type) continue; // list models will return non modelfolders :()
                    
                    data.push(self.sanitizeModel(obj))
                }

                // cache data according to plants/microbes
                if (path && path.split('/')[2] === 'plantseed') self.myPlants = data
                else self.myModels = data;

                console.log('data', data)
                return data;
            })
    }

    this.sanitizeModel = function(obj) {
        return {
            name: obj.id,
            path: obj.ref,
            orgName: obj.name,
            
            
            
            geneCount: obj.num_genes,
            
            
            
            rxnCount: obj.num_reactions,
            cpdCount: obj.num_compounds,
            fbaCount: obj.fba_count,
            timestamp: Date.parse(obj.rundate+'+0000'),
            gapfillCount: obj.unintegrated_gapfills + obj.integrated_gapfills,
            expression: 'expression_data' in obj ? obj.expression_data : []
        }
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
        return $http.rpc('ms', 'list_fba_studies', {model: modelPath})
                    .then(function(res) {
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
        return $http.rpc('ms', 'list_gapfill_solutions', {model: path})
                    .then(function(res) {
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

    this.getFeature = function(genome, feature) {
        return $http.rpc('ms', 'get_feature', {genome: genome, feature: feature})
                    .then(function(res) {
                        return res;
                    })

    }

    // adds model to local data model (cache)
    this.addModel = function(model, type) {
        //console.log('adding model', model)
        if (type.toLowerCase() === 'microbe')
            syncCache(this.myModels, model)
        else if (type.toLowerCase() === 'plant')
            syncCache(this.myPlants, model)
    }

    // adds notice to my models cache; only microbes right now
    this.submittedModel = function(subData) {
        if (!self.myModels) return;

        var data = {
            status: 'submitted',
            name: subData.name,
            orgName: subData.orgName,
            jobId: subData.jobId,
            timestamp: Date.now()
        }
        self.myModels.splice(0, 0, data);
    }

    var endpoint = config.services.ms_rest_url+'model';
    //var endpoint = 'http://0.0.0.0:3000/v0/'+'model';
    var headers =  {
        headers: {
            Authentication: Auth.token
        }
    }

    //console.log('header', headers)
    this.getModel = function(path) {
        return $http.get(endpoint+path, headers).then(function(res) {
            return res.data;
        })
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
