

angular.module('MSSolr', [])
.service('MSSolr', ['$http', '$q', '$rootScope', 'config', 'Auth',
function($http, $q, $rootScope, config, Auth) {
    "use strict";

    var self = this;

    var endpoint = config.services.solr_url;

    var liveReqs = {};

    // this is to replace this.getGenomes
    this.search = function(core, opts) {
        var cache = true;
        //var url = "http://0.0.0.0:8983/solr/"+core+'/select?wt=json'
        var url = "http://modelseed.theseed.org/solr/"+core+'/select?wt=json'

        if (opts) {
            var limit = opts.limit ? opts.limit : null,
                offset = opts.offset ? opts.offset : 0,
                sort = opts.sort ? (opts.sort.desc ? 'desc': 'asc') : null,
                sortField = opts.sort && 'field' in opts.sort ? opts.sort.field : '',
                searchFields = 'searchFields' in opts ? opts.searchFields : null,
                query = 'query' in opts && query != '' ? opts.query : null,
                cols = opts.visible ? opts.visible : [];
        }

        if (limit) url += '&rows='+limit+'&start='+offset;
        if (sort && sortField) url += '&sort='+sortField+' '+sort;

        // only select columns of data specified
        /*
        if (cols.length) {
            var set = [];
            for (var i=0; i<cols.length; i++) {
                set.push(cols[i]);
            }
            url += '&select('+set.join(',')+')';
        }*/

        // break query into words, and search for AND of those words.
        // if only 1 word, also search genome_id
        if (query) {
            if (searchFields) {
                var f = [];
                for (var i=0; i<searchFields.length; i++) {
                    f.push(searchFields[i]+':(*'+query+'*)');
                }
                url += '&q='+f.join(' OR ')
            }

            cache = false;
        } else
            url += '&q=*';

        // cancel any previous request still being made
        if (core in liveReqs && liveReqs[core]) liveReqs[core].resolve();
        liveReqs[core] = $q.defer();

        console.log('url', url)
        var p = $http.get(url, {cache: cache, timeout: liveReqs[core].promise});

        return p.then(function(res) {
            liveReqs[core] = false;
            return res.data.response;
        }).catch(function(e) {
            alert('error!')
            console.log('e', e)
        })

    }

}])
