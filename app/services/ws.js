

angular.module('WS', [])
.service('WS', ['$http', '$q', '$cacheFactory', '$log', 'config', 'Auth',
function($http, $q, $cacheFactory, $log, config, Auth) {
    "use strict";

    var self = this;
    this.workspaces = [];

    this.list = function(path, opts) {
        var params = {paths: typeof path === 'string' ? [path] : path };
        angular.extend(params, opts);

        return $http.rpc('ws', 'ls', params)
                    .then(function(d) {
                        //console.log('ls', d)
                        var d = d[path];

                        // parse into list of dicts
                        var data = [];
                        for (var i in d)
                            data.push( self.sanitizeMeta(d[i]) );

                        return data;
                    })
    }

    this.listL = function(path, opts) {
        var params = {paths: typeof path === 'string' ? [path] : path };
        angular.extend(params, opts);

        return $http.rpc('ws', 'ls', params)
                    .then(function(d) {
                        if (typeof path === 'string') return d[path];
                        return d;
                    })
    }

    this.listPublicPlants = function(path) {
        // first get paths to genomes
        var prom = $http.rpc('ws', 'ls', {paths: [path]})
            .then(function(res) {
                var objs = res[path];

                var genomePaths = [];
                objs.forEach(function(obj) {
                    var name = obj[0],
                        type = obj[1];

                    // ignore non modelfolders
                    if (type !== 'modelfolder') return;                            

                    genomePaths.push(obj[2]+obj[0]+'/genome');
                })

                return genomePaths;
            })
        
        // next get genome meta, return prom for public plants
        return prom.then(function(paths) {
            return self.getObjectMetas(paths)
                .then(function(metas) {
                    var plants = metas.map(function(m) {
                        return {
                            name: m[0],
                            path: m[2]+'.plantseed_data/minimal_genome',
                            meta: m[7]
                        };
                    })

                    return plants;
                })
        })
    }

    this.listPublicModels = function(path) {
        // first get paths to plantseed_data
        var params = path ? {paths: [path]} : {};

        return $http.rpc('ws', 'ls', params)
            .then(function(res) {
                var data = [];
                var model_paths = params['paths'];
                for (var i=0; i<model_paths.length; i++) {
                    var mods = res[model_paths[i]];
                    for (var j=0; j<mods.length; j++) {
                        var obj = mods[j][7];

                        // if (!obj.type) continue;
                        // XXX: list models will return non modelfolders???

                        data.push(self.sanitizeModel(obj))
                    }
                }
                data.sort(function (x, y) {
                    let a = x.name.toUpperCase(),
                    b = y.name.toUpperCase();
                    return a == b ? 0 : a > b ? 1 : -1;
                });
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
            status: obj.status,
            geneCount: obj.num_genes,
            rxnCount: obj.num_reactions,
            cpdCount: obj.num_compounds,
            fbaCount: obj.fba_count,
            timestamp: Date.parse(obj.rundate),
            gapfillCount: obj.unintegrated_gapfills + obj.integrated_gapfills,
            expression: 'expression_data' in obj ? obj.expression_data : []
        }
    }


    // sanitizeMeta: takes workspace info array, returns dict.
    this.sanitizeMeta = function(obj) {
        return {
            name: obj[0],
            type: obj[1],
            path: obj[2]+obj[0],
            modDate: obj[3],
            id: obj[4],
            owner: obj[5],
            size: obj[6],
            userMeta: obj[7],
            autoMeta: obj[8],
            files: null, // need
            folders: null, // need
            timestamp: Date.parse(obj[3])
        };
    }

    this.cached = {}
    this.get = function(path, opts) {
        if (opts && opts.cache && path in self.cached) return self.cached[path];

        var p = $http.rpc('ws', 'get', {objects: [path]})
                .then(function(res) {
                    var meta = self.sanitizeMeta(res[0][0]),
                        node = res[0][0][11];

                    // if shock node, fetch. Otherwise, return data.
                    if (node.length > 0) {
                        var url = node+'?download&compression=gzip',
                            header = {headers: {Authorization: 'OAuth '+Auth.token}};

                        return $http.get(url, header)
                                    .then(function(res) {
                                        return {meta: meta, data: res.data};
                                    })
                    } else {
                        // try to parse, if not, assume data is string.
                        try {
                            var data = JSON.parse(res[0][1]);
                        } catch(e) {
                            var data = res[0][1];
                        }

                        return {meta: meta, data: data};
                    }
                }).catch(function(e) {
                    console.log("WS.get() caught an error:\n", e);
                    throw e;
                })

        if (opts && opts.cache) self.cached[path] = p;
        return p;
    }

    this.getObjects = function(paths) {
        //console.log('fetching', paths)
        return $http.rpc('ws', 'get', {objects: paths})
                    .then(function(res) {
                        var objs = [];
                        for (var i=0; i<res.length; i++) {
                            var meta = res[i][0],
                                node = meta[11];

                            // try to parse, if not, assume data is string.
                            try {
                                var data = JSON.parse(res[i][1]);
                            } catch(e) {
                                var data = res[i][1];
                            }
                            objs.push({meta: meta, data: data});
                        }

                        return objs;
                    })
    }


    this.getObjectMeta = function(path) {
        return $http.rpc('ws', 'get', {objects: [path], metadata_only: 1})
                    .then(function(res) {
                        return res[0];
                    })
    }

    this.getObjectMetas = function(paths) {
        return $http.rpc('ws', 'get', {objects: paths, metadata_only: 1})
                    .then(function(res) {             
                        return res.reduce(function(a,b) { return a.concat(b); }, []); 
                    })
    }
    

    this.saveMeta = function(path, data) {
        //$log.log('update meta meta', path)

        try {
            var meta = JSON.parse(data);
        } catch(err) {
            console.log("can't parse error", err)
        }

        return $http.rpc('ws', 'update_metadata', {objects: [[path, meta]]})
                    .then(function(res) {
                        //console.log('response', res)
                        return res[0][7];
                    })
    }

    // takes source and destimation paths, moves object
    this.mv = function(src, dest) {
        var params = {objects: [[src, dest]], move: 1, recursive: 1};
        return $http.rpc('ws', 'copy', params)
                    .then(function(res) {
                        return res;
                    }).catch(function(e) {
                        console.error('could not mv', e)
                    })
    }

    this.copy = function(src, dest, overwrite, recursive) {
        if (src instanceof Object) {
            var params = {
                objects: [[src.src, src.dest]], 
                overwrite: src.overwrite || false,
                recursive: src.recursive || false
            };
        } else {
            var params = {
                objects: [[src, dest]], 
                overwrite: overwrite || false,
                recursive: recursive || false
            };
        }
        return $http.rpc('ws', 'copy', params)
            .then(function(res) {
                return res;
            })
    }

    this.copyList = function(paths, destFolder, overwrite) {
        var ops = []
        paths.forEach(function(path) {
            ops.push( [path, destFolder+'/'+path.split('/').pop()] );
        })

        var params = {objects: ops, overwrite: overwrite || false};
        return $http.rpc('ws', 'copy', params)
                    .then(function(res) {
                        return res;
                    })
    }

    // takes path of object, deletes object
    this.deleteObj = function(path, isFolder) {
        $log.log('calling delete')
        var params = {objects: Array.isArray(path) ? path : [path],
                      deleteDirectories: isFolder ? 1 : 0,
                      force: isFolder ? 1 : 0};
        return $http.rpc('ws', 'delete', params)
                    .then(function(res) {
                        $log.log('deleted object', res)
                        return res;
                    }).catch(function(e) {
                        $log.error('delete failed', e, path)
                    })

    }

    this.deleteFolder = function(path) {
        return self.deleteObj(path, true)
    }

    // Method to upload data directly to workspaces
    // Not used; here for convenience only
    this.uploadData = function(p) {
        var objs = [[p.path, p.type, p.meta ? p.meta : null, p.data ? p.data : null]];
        var params = {objects:objs};
        return $http.rpc('ws', 'create', params).then(function(res) {
                    $log.log('upload response', res)
                    return res;
                })
    }

    // takes path of new folder, creates it
    this.createFolder = function(path) {
        var params = {objects: [[path, 'Directory']]};
        return $http.rpc('ws', 'create', params).then(function(res) {
                    return res;
                }).catch(function(e){
                    console.error('Could not create folder', path, e.data.error)
                })
    }

    this.createModelFolder = function(path) {
        var params = {objects: [[path, 'modelfolder']]};
        return $http.rpc('ws', 'create', params).then(function(res) {
                    return res;
                }).catch(function(e){
                    console.error('Could not create modelfolder', path, e.data.error)
                })
    }    

    

    this.getModel = function(ws, name) {
        return self.getObject(ws, name)
                   .then(function(data) {
                        var kbModeling = new KBModeling();
                        var obj = new kbModeling['KBaseFBA_FBAModel'](self);
                        obj.setData(data);
                        return obj;
                   })
    }

    // takes workspace spec hash, creates node.  fixme: cleanup
    this.createNode = function(p) {
        var objs = [[p.path, p.type, null, null]];
        var params = {objects:objs, createUploadNodes: 1};
        return $http.rpc('ws', 'create', params).then(function(res) {
                    return res;
                })
    }

    this.getDownloadURL = function(path) {
        return $http.rpc('ws', 'get_download_url', {objects:[path]})
                    .then(function(res) {
                        $log.log('download response', res)
                        return res;
                    })
    }

    this.getPermissions = function(path) {
        return $http.rpc('ws', 'list_permissions', {objects:[path]})
                    .then(function(res) {
                        $log.log('list_permissions response', res)
                        return res;
                    })
    }

    this.save = function(path, data, opts) {
        var params = {objects: [[path,
                                opts.type ? opts.type : 'string',
                                opts.userMeta ? opts.userMeta : {},
                                data]],
                      overwrite: opts.overwrite ? true : false
                     };

        return $http.rpc('ws', 'create', params)
                    .then(function(res) {
                        return res[0];
                    })
    }
}])
