
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
            //var query = opts.query ? encodeURI(opts.query).replace(/\(/g, '%28') : null,
              var query = opts.query ? opts.query.replace(/\(/g, '%28') : null,
                limit = opts.limit ? opts.limit : null,
                offset = opts.offset ? opts.offset : null,
                sort = opts.sort ? (opts.sort.desc ? '-': '+') : null,
                sortField = opts.sort ? opts.sort.field : '',
                cols = opts.visible ? opts.visible : [];
        }

        if (cols && cols.length) {
            var set = [];
            for (var i=0; i<cols.length; i++) {
                set.push(cols[i]);
            }
            url += '&select('+set.join(',')+')';
        }

        if (query && cols.length) {
            query = query.trim();
            query = query.replace(/\:/g, ''); // SOLR does not like ':' in the query

            var set = [];
            for (var i=0; i<cols.length; i++) {
                if (query.indexOf(' ') != -1 || query.indexOf('%20') != -1) {
                    query = query.replace(/'20%'/g, '*').replace(/\s/g, '*');
                }
                set.push('eq('+cols[i]+',*'+query+'*)');
            }
            url += '&or('+set.join(',')+')';
        } else if (query) {
            query = query.trim();
            query = query.replace(/\:/g, ''); // SOLR does not like ':' in the query
            if (query.indexOf(' ') != -1 || query.indexOf('%20') != -1) {
                query = query.replace(/'20%'/g, '*').replace(/\s/g, '*');
            }
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

        if (!offset) cache = true;

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

        console.log('caching?', cache)
        return $http.get(url, {cache: cache, timeout: liveReq.promise})
                    .then(function(res) {
                        rxnReq = false, cpdReq = false; geneReq = false;
                        return res.data.response;
                    })
    }
    this.getRxn = function(id, opts) {
        var url = endpoint+'model_reaction/?http_accept=application/json';

        if (opts && 'select' in opts) {
            if (Array.isArray(opts.select)) url += '&select('+String(opts.select)+')';
            else                            url += '&select('+opts.select+')';
        }

        if (Array.isArray(id)) url += '&in(id,('+String(id)+'))&limit('+id.length+')';
        else                   url += '&eq(id,'+id+')';

        return $http.get(url)
                    .then(function(res) {
                        return Array.isArray(id) ? res.data : res.data[0];
                    })
    }
    this.getCpd = function(id) {
        var url = endpoint+'model_compound/?http_accept=application/json&eq(id,'+id+')'
        return $http.get(url)
                    .then(function(res) {
                        return res.data[0];
                    })
    }
    this.findReactions = function(cpd) {
        var url = endpoint+'model_reaction/?http_accept=application/solr+json',
            url = url+'&eq(equation,*'+cpd+'*)&limit(10000)&select(id,equation,name,definition)'
        return $http.get(url)
                    .then(function(res) {

                        return res.data.response;
                    })
    }

    /*************Begin translating the RQL syntax to Solr query syntax******************/
    this.get_solr = function(collection, opts) {
        var cache = true;
        var url = endpoint+collection+'/select?wt=json'

        if (opts) {
            var query = opts.query ? opts.query.replace(/\(/g, '%28') : null,
                limit = opts.limit ? opts.limit : null,
                offset = opts.offset ? opts.offset : 0,
                sort = opts.sort ? (opts.sort.desc ? '-': '+') : null,
                sortField = opts.sort ? opts.sort.field : '',
                searchFields = 'searchFields' in opts ? opts.searchFields : null, // fields to query against
                queryColumn = 'queryColumn' in opts ? opts.queryColumn : null, // query individual columns
                cols = opts.visible ? opts.visible : [];
        }
        if (cols && cols.length) {
            var set = [];
            for (var i=0; i<cols.length; i++) {
                set.push(cols[i]);
            }
            url += '&fl='+set.join(',');
        }

        if (query || queryColumn) {
            if (queryColumn) {
                var f = [];
                for (var field in queryColumn) {
                    queryColumn[field] = queryColumn[field].replace(/\'/g, "\'"); // reserve primes (')
                    queryColumn[field] = queryColumn[field].replace(/(;|,|\:|\"|\+|\.|\-)/g, ""); // get rid of these symbols with blanks
                    if (field == 'synonyms')
                        f.push('aliases'+':(*'+queryColumn[field]+'*)');
                    else
                        f.push(field+':(*'+queryColumn[field]+'*)');
                }
                url += '&q='+f.join(' AND ')
            } else if (searchFields) {
                var f = [];
                for (var i=0; i<searchFields.length; i++) {
                    if (searchFields[i] == 'synonyms')
                        searchFields[i] = 'aliases';
                    f.push(searchFields[i]+':(*'+query+'*)');
                }
                url += '&q='+f.join(' OR ')
            } else if (query) {
                query = query.trim();
                query = query.replace(/\'/g, "\'"); // reserve primes (')
                query = query.replace(/(;|,|\:|\"|\+\.\-)/g, ""); // get rid of these symbols with blanks
                if (query.indexOf(' ') != -1 || query.indexOf('%20') != -1) {
                    query = query.replace(/'20%'/g, '*').replace(/\s/g, '*');
                }
                url += '&q=*'+query+'*';
            }
        } else {
            url += '&q=*';
            cache = false;
        }

        url += limit ? '&rows='+limit : '';
        url += offset ? '&start='+offset : '';

        if (sort) {
            sort = sort=='-' ? 'desc' : 'asc';
            url += '&sort='+ sortField + ' ' + sort;
            cache = false;
        }

        if (!offset) cache = true;

        // cancel any previous request using defer
        if (rxnReq && collection === 'reactions') rxnReq.resolve();
        if (cpdReq && collection === 'compounds') cpdReq.resolve();
        if (geneReq && collection === 'gene') geneReq.resolve();

        var liveReq = $q.defer();

        // save defer for later use
        if (collection === 'reactions')
            rxnReq = liveReq;
        else if (collection === 'compounds')
            cpdReq = liveReq;
        else if (collection === 'gene')
            geneReq = liveReq;

        console.log("Solr query:", url);
        console.log('caching?', cache)
        return $http.get(url, {cache: cache, timeout: liveReq.promise})
                    .then(function(res) {
                        rxnReq = false, cpdReq = false; geneReq = false;
                        return res.data.response;
                    })
    }
    this.getRxn_solr = function(ids, opts) {
        var url = endpoint+'reactions/select?wt=json';

        if (opts && 'select' in opts) {
            if (Array.isArray(opts.select))
                url += '&fl='+opts.select.join(',');
            else
                url += '&fl='+opts.select;
        }

        if (Array.isArray(ids))
            url += '&q=id:('+ids.join(' OR ')+ ')';
        else
            url += '&q=id:'+ids;
        return $http.get(url)
                    .then(function(res) {
                        return Array.isArray(ids) ? res.data.response.docs : res.data.response.docs[0];
                    })
    }
    this.getCpd_solr = function(ids) {
        var url = endpoint+'compounds/select?wt=json';

        if (Array.isArray(ids))
            url += '&q=id:('+ids.join(' OR ')+ ')';
        else
            url += '&q=id:'+ids;
        return $http.get(url)
                    .then(function(res) {
                        return Array.isArray(ids) ? res.data.response.docs : res.data.response.docs[0];
                    })
    }
    this.findReactions_solr = function(cpd, flds='id,equation,name,definition', r_limit=10) {
        var url = endpoint+'reactions/select?wt=json';
            url += '&q=equation:*'+cpd+'*&rows='+r_limit+'&fl='+flds;
        return $http.get(url)
                    .then(function(res) {
                        return res.data.response.docs;
                    })
    }
    /*************End translating the RQL syntax to Solr query syntax******************/
        this.getImagePath = function (id) {
            if (id) {
                var img_root = config.services.cpd_img_url;
                var dir_depth = 0;
                var ext = '.png';
                for (var i = 0; i < dir_depth; i++) {
                    img_root += id[i] + "/";
                }
                return img_root + id + ext
            }
    }
}])

.filter('reverse', function() {
  return function(input, uppercase) {
    input = input || '';
    var out = '';
    for (var i = 0; i < input.length; i++) {
      out = input.charAt(i) + out;
    }
    // conditional based on optional argument
    if (uppercase) {
      out = out.toUpperCase();
    }
    return out;
  };
})
.filter('rmquotes', function() {
  return function(input) {
    input = input || '';
    var out = '';
    if (input != '') {
        out = input.replace(/\"/g, '').replace(/\'/g, '').replace(/\;/g, ', ');
    }
    return out;
  };
})
