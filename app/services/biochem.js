

angular.module('Biochem', [])
.service('Biochem', ['$http', '$q', '$rootScope',
function($http, $q, $rootScope) {
    "use strict";

    var self = this

    var endpoint = 'https://www.beta.patricbrc.org/api/'


    var cpdReq, rxnReq;
    this.get = function(collection, opts) {
        var cache = true;
        var url = endpoint+'model_'+collection+'/?http_accept=application/solr+json'

        if (opts) {
            var query = opts.query ? opts.query : null,
                limit = opts.limit ? opts.limit : null,
                offset = opts.offset ? opts.offset : null,
                sort = opts.sort ? (opts.sort.desc ? '-': '+') : null,
                sortField = opts.sort ? opts.sort.field : '';
        }

        if (limit)
            url += '&limit('+limit+ (offset ? ','+offset : '') +')';

        if (sort && !query) {
            url += '&sort('+sort+sortField+')';
            cache = false;
        }

        if (query) {
            // sort by id when querying
            url += '&keyword("'+query+'")&sort(id)'
            cache = false;
        } else {
            url += '&keyword(*)';
            cache = false;
        }

        if (offset === 0) cache = true;

        // cancel any previous request using defer
        if (rxnReq && collection === 'reaction') rxnReq.resolve();
        if (cpdReq && collection === 'compound') cpdReq.resolve();

        var liveReq = $q.defer();

        // save defer for later use
        if (collection === 'reaction')
            rxnReq = liveReq;
        else if (collection === 'compound')
            cpdReq = liveReq;

        return $http.get(url, {cache: cache, timeout: liveReq.promise})
                    .then(function(res){
                        rxnReq = false, cpdReq = false;
                        return res.data.response;
                    })
    }

}])
