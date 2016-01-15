

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
                            data.push( self.sanitizeObj(d[i]) );

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

    this.listPlantMetas = function(path) {
        return $http.rpc('ws', 'ls', {paths: [path]})
                    .then(function(d) {
                        var d = d[path];

                        var data = [];
                        for (var i in d) {
                            var obj = d[i];

                            if ( !('name' in obj[7]) ) continue;

                            data.push( {name: obj[0],
                                        path: obj[2]+obj[0],
                                        meta: obj[7]});
                        }

                        data.sort(function(a, b){
                            if (a.meta.organism.toLowerCase() < b.meta.organism.toLowerCase())
                                return -1;
                            if (a.meta.organism.toLowerCase() > b.meta.organism.toLowerCase())
                                return 1;
                            return 0;
                        })

                        return data;
                    })
    }

    // sanitizeObj: takes workspace info array, returns dict.
    this.sanitizeObj = function(obj) {
        return {name: obj[0],
                type: obj[1],
                path: obj[2]+obj[0],
                modDate: obj[3],
                id: obj[4],
                owner: obj[5],
                size: obj[6],
                files: null, // need
                folders: null, // need
                timestamp: Date.parse(obj[3]+'+0000')
               };
    }

    this.cached = {}
    this.get = function(path, opts) {
        if (opts && opts.cache && path in self.cached) return self.cached[path];

        //console.log('fetching', path)
        var p = $http.rpc('ws', 'get', {objects: [path]})
                    .then(function(res) {
                        console.log('raw', res)
                        var meta = res[0][0],
                            node = meta[11];

                        // if shock node, fetch. Otherwise, return data.
                        if (node.length > 0) {
                            console.log('getting data from shock', Auth.token);
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
        //console.log('retrieving meta', path)
        return $http.rpc('ws', 'get', {objects: [path], metadata_only: 1})
                    .then(function(res) {
                        return res[0];
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

    this.copy = function(src, dest, overwrite) {
        var params = {objects: [[src, dest]], overwrite: overwrite || false};
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
                    $log.log('response', res)
                    return res;
                }).catch(function(e){
                    console.error('Could not create folder', path, e.data.error)
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
