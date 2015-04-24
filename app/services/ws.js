

angular.module('WS', [])
.service('WS', ['$http', '$q', '$cacheFactory',
function($http, $q, $cacheFactory) {
    "use strict";

    var self = this;
    var cache = $cacheFactory('ws');

    this.getMyWS = function() {
        //if ( cache.get('getMyWS') )
        //    return cache.get('getMyWS');

        var p = $http.rpc('ws', 'list_workspaces', {})
                    .then(function(res) {
                        var res = res.sort(function (a,b) {
                                    if (Date.parse(b[2]) < Date.parse(a[2])) return -1;
                                    if (Date.parse(b[2]) >  Date.parse(a[2])) return 1;
                                    return 0;
                                  });

                        // only include writable
                        var wsList = [];
                        for (var i in res) {
                            if (['w', 'a'].indexOf(res[i][4]) === -1) continue;
                            wsList.push({name: res[i][0]});
                        }

                        return wsList;
                    })

        //cache.put('getMyWS', p);
        return p;
    }

    this.getMyModels = function(ws) {
        //if ( cache.get('getMyModels-'+ws) )
        //    return cache.get('getMyModels-'+ws);

        var params = {workspaces: [ws], type: 'KBaseFBA.FBAModel'};
        var p = $http.rpc('ws', 'list_objects', params)
                    .then(function(res) {
                        var res = res.sort(function (a,b) {
                                    if (Date.parse(b[3]) < Date.parse(a[3])) return -1;
                                    if (Date.parse(b[3]) >  Date.parse(a[3])) return 1;
                                    return 0;
                                  });

                        var objList = [];
                        for (var i in res) objList.push({name: res[i][1]});

                        return objList;
                    })

        //cache.put('getMyModels-'+ws, p);
        return p;
    }

    this.getObject = function(ws, name) {
        return $http.rpc('ws', 'get_objects', [{workspace: ws, name: name}])
                    .then(function(res) {
                        return res[0].data;
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

}])