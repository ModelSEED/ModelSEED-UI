

angular.module('MSSolr', [])
.service('MSSolr', ['$http', '$q', '$rootScope', 'config', 'Auth',
function($http, $q, $rootScope, config, Auth) {
    "use strict";

    var self = this;

    var endpoint = config.services.ms_solr_url;

    var liveReqs = {};

    // this is to replace this.getGenomes
    this.search = function(core, opts) {
        var cache = true;

        var url = this.getUrl(core, opts);

        // cancel any previous request still being made
        if (core in liveReqs && liveReqs[core]) liveReqs[core].resolve();
        liveReqs[core] = $q.defer();

        //console.log('url', url)
        var p = $http.get(url, {cache: cache, timeout: liveReqs[core].promise});

        return p.then(function(res) {
            liveReqs[core] = false;
            return res.data.response;
        })
    }

    this.getUrl = function(core, opts) {
        //var url = "http://0.0.0.0:8983/solr/"+core+'/select?wt=json'
        var url = endpoint+core+'/select?wt=json'

        if (opts) {
            var limit = opts.limit ? opts.limit : null,
                offset = opts.offset ? opts.offset : 0,
                sort = opts.sort ? (opts.sort.desc ? 'desc': 'asc') : null,
                sortField = opts.sort && 'field' in opts.sort ? opts.sort.field : '',
                searchFields = 'searchFields' in opts ? opts.searchFields : null, // fields to query against
                queryColumn = 'queryColumn' in opts ? opts.queryColumn : null, // query individual column
                query = 'query' in opts && query != '' ? opts.query : null,
                cols = opts.visible ? opts.visible : [];
        }


        if (limit) url += '&rows='+limit+'&start='+offset;
        if (sort && sortField) url += '&sort='+sortField+' '+sort;

        if (query || queryColumn) {
            if (queryColumn) {
                var f = [];
                for (var field in queryColumn) {
                    f.push(field+':(*'+queryColumn[field]+'*)');
                }
                url += '&q='+f.join(' AND ')
            } else if (searchFields) {
                var f = [];
                for (var i=0; i<searchFields.length; i++) {
                    f.push(searchFields[i]+':(*'+query+'*)');
                }
                url += '&q='+f.join(' OR ')
            }
        } else {
            url += '&q=*';
        }

        return url;
    }

    this.getDownloadUrl = function(core, opts) {
        var settings =  angular.copy(opts);
        settings.limit = 100000; // download row limit
        settings.start = 0;

        var url = this.getUrl(core, settings).replace(/wt=json/g, 'wt=csv');
        return url;
    }

}])
