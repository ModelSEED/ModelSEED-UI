

angular.module('FBA', [])
.service('FBA', ['$http', '$q', '$cacheFactory',
function($http, $q, $cacheFactory) {


    var self = this;

    var cache = $cacheFactory('fba');

    this.getBiochem = function() {
        if ( cache.get('getBiochem') )
            return cache.get('getBiochem');

        var p = $http.rpc('fba', 'get_biochemistry', {})
                    .then(function(res) {
                        return res;
                    })

        cache.put('getBiochem', p);
        return p;
    }

    this.getRxns = function(rxns) {
        if ( cache.get('getRxns') )
            return cache.get('getRxns');


        var p = $http.rpc('fba', 'get_reactions', {reactions: rxns})
                    .then(function(res) {
                        return res;
                    })

        cache.put('getRxns', p);
        return p;
    }

    this.getCpds = function(cpds) {
        if ( cache.get('getCpds') ) {
            return cache.get('getCpds')
        }

        var p = $http.rpc('fba', 'get_compounds', {compounds: cpds})
                    .then(function(res) {
                        return res;
                    })

        cache.put('getCpds', p);
        return p;
    }


    this.saveDirection = function(ws, name, rxn, direction) {
        return $http.rpc('fba', 'adjust_model_reaction',
                    {workspace: ws, model: name, reaction: [rxn], direction: [direction]})
                    .then(function(res) {
                        return res;
                    })
    }

    // @rxns : list of reaction objects
    this.rmRxns = function(ws, name, rxns) {
        var rxnIDs = [];
        for (var i=0; i<rxns.length; i++) rxnIDs.push(rxns[i].id);

        return $http.rpc('fba', 'adjust_model_reaction',
                    {workspace: ws, model: name, reaction: rxnIDs, removeReaction: true})
                    .then(function(res) {
                        console.log('removed reactions', res)
                        return res;
                    })
    }

    // @rxns : list of reaction objects
    this.addRxns = function(ws, name, rxns) {
        var rxnIDs = [];
        for (var i=0; i<rxns.length; i++) rxnIDs.push(rxns[i].id);

        return $http.rpc('fba', 'adjust_model_reaction',
                    {workspace: ws, model: name, reaction: rxnIDs, addReaction: true})
                    .then(function(res) {
                        console.log('added reactions', res)
                        return res;
                    })
    }

    this.sanitizeDir = function(dir) {
        if (dir === '=' || dir === '<=>') return '<=>';
        else if (dir === '>' || dir === '=>') return '=>';
        else if (dir === '<' || dir === '<=') return '<=';
    }


    this.splitEq = function(eq) {
        if (eq.indexOf('<=>') !== -1)
            return eq.split('<=>');
        else if (eq.indexOf('=>') !== -1)
            return eq.split('=>');
        else if (eq.indexOf('<=') !== -1)
            return eq.split('<=');
    }


}])