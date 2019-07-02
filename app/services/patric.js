

angular.module('Patric', [])
.service('Patric', ['$http', '$q', '$rootScope', 'config', 'Auth',
function($http, $q, $rootScope, config, Auth) {
    "use strict";

    var self = this;

    var endpoint = config.services.patric_solr_url;

    var liveReq;

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

        // MODELSEED-70:
        if (limit) url += '&limit('+limit+ (offset ? ','+offset : '') +')';
        if (sort) url += '&sort('+(opts.sort.desc ? '-': '+')+opts.sort.field+')';

        // only select columns of data specified
        if (cols.length) {
            var set = [];
            for (var i=0; i<cols.length; i++) {
                set.push(cols[i]);
            }
            url += '&select('+set.join(',')+')';
        }

        // break query into words, and search for AND of those words.
        // if only 1 word, also search genome_id
        if (query) {
            var words = query.split(' ');

            if (words.length > 1) {
                var q = [];
                for (var i=0; i<words.length; i++) {
                    var word = words[i].trim();
                    word = word.replace(/(;|,|\:|\"|\'|\+|\.|\-|[0-9]+)/g, ""); // get rid of these symbols
                    if (word.indexOf(' ') != -1 || word.indexOf('%20') != -1) {
                        word = word.replace(/'20%'/g, '*').replace(/\s/g, '*');
                    }
                    q.push('eq(genome_name,'+word+'*)')
                }
                url += '&and('+q.join(',')+')';
            } else {
                url += '&or(eq(genome_name,'+words[0]+'*),eq(genome_id,'+words[0]+'))';
            }

            cache = false;
        } else
            url += '&keyword(*)';

        // cancel any previous request still being made
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
