

angular.module('FBA', [])
.service('FBA', ['$http', '$q', '$cacheFactory',
function($http, $q, $cacheFactory) {


    var self = this;

    var cache = $cacheFactory('fbaCache');

    this.getBiochem = function() {
        if ( cache.get('get_biochemistry') ) {
            return cache.get('get_biochemistry')
        }

        var p = $http.rpc('fba', 'get_biochemistry', {})
                    .then(function(res) {
                        return res;
                    })

        cache.put('get_biochemistry', p);
        return p;
    }

    this.getRxns = function(rxns) {
        if ( cache.get('get_reactions') ) {
            return cache.get('get_reactions')
        }

        var p = $http.rpc('fba', 'get_reactions', {reactions: rxns})
                    .then(function(res) {
                        return res;
                    })

        cache.put('get_reactions', p);
        return p;
    }

    this.getCpds = function(cpds) {
        if ( cache.get('get_compounds') ) {
            return cache.get('get_compounds')
        }

        var p = $http.rpc('fba', 'get_compounds', {compounds: cpds})
                    .then(function(res) {
                        return res;
                    })

        cache.put('get_compounds', p);
        return p;
    }


}])