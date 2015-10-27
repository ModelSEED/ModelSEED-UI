

angular.module('Patric', [])
.service('Patric', ['$http', '$q', '$rootScope', 'config', 'Auth',
function($http, $q, $rootScope, config, Auth) {
    "use strict";

    var self = this;

    var endpoint = config.services.solr_url;

    var liveReq;
    this.getGenomes = function(opts, owned) {
        console.error('Patric.getGenomes is DEPRECATED')
        var cache = true;
        var url = endpoint+'genome/?http_accept=application/solr+json';

        if (opts) {
            var query = opts.query ? opts.query.replace(/\ /g, '+') : null,
                limit = opts.limit ? opts.limit : null,
                offset = opts.offset ? opts.offset : null,
                sort = opts.sort ? (opts.sort.desc ? '-': '+') : null,
                sortField = opts.sort ? opts.sort.field : '',
                cols = opts.visible ? opts.visible : [];
        }

        if (limit) url += '&limit('+limit+ (offset ? ','+offset : '') +')';
        if (sort) url += '&sort('+(opts.sort.desc ? '-': '+')+opts.sort.field+')';

        if (cols.length) {
            var set = [];
            for (var i=0; i<cols.length; i++) {
                set.push(cols[i]);
            }
            url += '&select('+set.join(',')+')';
        }

        if (query && cols.length) {
            var set = [];
            for (var i=0; i<cols.length; i++) {
                set.push('eq('+cols[i]+',*'+query+'*)');
            }
            url += '&or('+set.join(',')+')';
        }
        if (query) {
            url += "&keyword("+query+")";
            cache = false;
        } else
            url += '&keyword(*)';

        // cancel any previous request
        if (liveReq) liveReq.resolve();
        liveReq = $q.defer();

        if (owned) {
            url += "&eq(public,false)";
            var p = $http.get(url, {cache: cache,
                                    timeout: liveReq.promise,
                                    headers: { 'Authorization': Auth.token}});
        } else
            var p = $http.get(url, {cache: cache, timeout: liveReq.promise});

        return p.then(function(res){
                        liveReq = false;
                        return res.data.response;
                    })
    }

    // this is to replace this.getGenomes
    this.listGenomes = function(opts, owned) {
        var cache = true;
        var url = endpoint+'genome/?http_accept=application/solr+json';

        if (opts) {
            var query = opts.query ? opts.query : null,
                limit = opts.limit ? opts.limit : null,
                offset = opts.offset ? opts.offset : null,
                sort = opts.sort ? (opts.sort.desc ? '-': '+') : null,
                sortField = opts.sort ? opts.sort.field : '',
                cols = opts.visible ? opts.visible : [];
        }

        if (limit) url += '&limit('+limit+ (offset ? ','+offset : '') +')';
        if (sort) url += '&sort('+(opts.sort.desc ? '-': '+')+opts.sort.field+')';


        if (cols.length) {
            var set = [];
            for (var i=0; i<cols.length; i++) {
                set.push(cols[i]);
            }
            url += '&select('+set.join(',')+')';
        }

        //mycobacterium tubercu
        if (query) {
            var words = query.split(' ');

            if (words.length > 1) {
                var q = [];
                for (var i=0; i<words.length-1; i++) {
                    q.push('eq(genome_name,'+words[i]+')')
                }
                q.push('eq(genome_name,'+words.pop()+'*)')
                url += '&and('+q.join(',')+')';
            } else {
                url += '&or(eq(genome_name,'+words[0]+'*),eq(genome_id,'+words[0]+'))';
            }

            cache = false;
        } else
            url += '&keyword(*)';

        // cancel any previous request
        if (liveReq) liveReq.resolve();
        liveReq = $q.defer();

        if (owned) {
            url += "&eq(public,false)";
            var p = $http.get(url, {cache: cache,
                                    timeout: liveReq.promise,
                                    headers: { 'Authorization': Auth.token}});
        } else
            var p = $http.get(url, {cache: cache, timeout: liveReq.promise});

        return p.then(function(res){
                        liveReq = false;
                        return res.data.response;
                     })
    }

}])
