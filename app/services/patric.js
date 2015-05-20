

angular.module('Patric', [])
.service('Patric', ['$http', '$q', '$rootScope',
function($http, $q, $rootScope) {
    "use strict";

    var self = this

    var endpoint = 'https://www.patricbrc.org/api/';

    var liveReq;
    this.getGenomes = function(opts) {
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


        if (cols) {
            var set = [];
            for (var i=0; i<cols.length; i++) {
                set.push(cols[i]);
            }
            url += '&select('+set.join(',')+')';
        }

        console.log('columns', cols)
        if (query && cols.length) {
            console.log('adding eqs')
            var set = [];
            for (var i=0; i<cols.length; i++) {
                set.push('eq('+cols[i]+',*'+query+'*)');
            }
            url += '&or('+set.join(',')+')';
        } else if (query) {
            url += "&keyword('"+query+"')";
            cache = false;
        } else
            url += '&keyword(*)';

        // cancel any previous request
        if (liveReq) liveReq.resolve();

        console.log('url', url)
        liveReq = $q.defer();
        return $http.get(url, {cache: cache, timeout: liveReq.promise})
                    .then(function(res){
                        liveReq = false;
                        return res.data.response;
                    })
    }

}])
