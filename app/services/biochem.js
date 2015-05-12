

angular.module('Biochem', [])
.service('Biochem', ['$http', '$q', '$rootScope',
function($http, $q, $rootScope) {
    "use strict";

    var self = this

    var endpoint = 'https://www.beta.patricbrc.org/api/'


    var cpdReq, rxnReq;
    this.get = function(collection, opts) {
        var cache = true;
        var query = opts ? opts.query : null;
        var url = endpoint+'model_'+collection+'/?http_accept=application/solr+json'

        if (opts.limit)
            url += '&limit('+opts.limit+ (opts.offset ? ','+opts.offset : '') +')';

        if (opts.sort) {
            url += '&sort('+(opts.sort.desc ? '-': '+')+opts.sort.field+')';
            cache = false;
        }

        if (query) {
            url += '&keyword("'+query+'")';
            cache = false;
        } else
            url += '&keyword(*)';

        // cancel any previous request
        if (rxnReq && collection === 'reaction') rxnReq.resolve();
        if (cpdReq && collection === 'compound') cpdReq.resolve();

        var liveReq = $q.defer();

        if (collection === 'reaction')
            rxnReq = liveReq;
        else if (collection === 'compound')
            cpdReq = liveReq;

        return $http.get(url, {cache: cache, timeout: liveReq.promise})
                    .then(function(res){
                        liveReq = false;
                        return res.data.response;
                    })
    }

}])