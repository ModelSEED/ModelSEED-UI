

angular.module('Biochem', [])
.service('Biochem', ['$http', '$q', 'config', '$log',
function($http, $q, config, $log) {
    "use strict";

    var self = this

    var endpoint = config.services.solr_url;

    var cpdReq, rxnReq, geneReq;
    this.get = function(collection, opts) {
        var cache = true;
        var url = endpoint+collection+'/?http_accept=application/solr+json'

        if (opts) {
            var query = opts.query ? opts.query : null,
                limit = opts.limit ? opts.limit : null,
                offset = opts.offset ? opts.offset : null,
                sort = opts.sort ? (opts.sort.desc ? '-': '+') : null,
                sortField = opts.sort ? opts.sort.field : '';
        }

        if (query) {
            // sort by id when querying
            url += '&keyword(*'+query+'*)&sort(id)'
            cache = false;
        } else {
            url += '&keyword(*)';
            cache = false;
        }

        if (limit)
            url += '&limit('+limit+ (offset ? ','+offset : '') +')';

        if (sort) {
            url += '&sort('+sort+sortField+')';
            cache = false;
        }

        if (offset === 0) cache = true;

        // cancel any previous request using defer
        if (rxnReq && collection === 'model_reaction') rxnReq.resolve();
        if (cpdReq && collection === 'model_compound') cpdReq.resolve();
        if (geneReq && collection === 'gene') geneReq.resolve();

        var liveReq = $q.defer();

        // save defer for later use
        if (collection === 'model_reaction')
            rxnReq = liveReq;
        else if (collection === 'model_compound')
            cpdReq = liveReq;
        else if (collection === 'gene')
            geneReq = liveReq;

        return $http.get(url, {cache: cache, timeout: liveReq.promise})
                    .then(function(res) {
                        rxnReq = false, cpdReq = false; geneReq = false;
                        return res.data.response;
                    })
    }

    this.getRxn = function(id) {
        var url = endpoint+'model_reaction/?http_accept=application/json&eq(id,'+id+')'
        return $http.get(url)
                    .then(function(res) {
                        return res.data[0];
                    })
    }

    this.getCpd= function(id) {
        var url = endpoint+'model_compound/?http_accept=application/json&eq(id,'+id+')'
        return $http.get(url)
                    .then(function(res) {
                        return res.data[0];
                    })
    }

}])
