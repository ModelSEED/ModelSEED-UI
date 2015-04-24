

angular.module('Patric', [])
.service('Patric', ['$http', '$q', '$rootScope',
function($http, $q, $rootScope) {
    "use strict";

    var self = this

    var endpoint = 'https://www.patricbrc.org/api/';

    var liveReq;
    this.getGenomes = function(opts) {
        var query = opts.query;
        var url = endpoint+'genome/?http_accept=application/solr+json';

        if (opts.limit)
            url += '&limit('+opts.limit+ (opts.offset ? ','+opts.offset : '') +')';

        if (opts.sort)
            url += '&sort('+(opts.sort.desc ? '-': '+')+opts.sort.field+')';

        var cache = true;
        if (query) {
            url += '&keyword('+query+')';
            cache = false;
        } else
            url += '&keyword(*)';

        // cancel any previous request
        if (liveReq) liveReq.resolve();

        liveReq = $q.defer();
        return $http.get(url, {cache: cache, timeout: liveReq.promise})
                    .then(function(res){
                        liveReq = false;
                        return res.data.response;
                    })
    }

}])