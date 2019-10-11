angular.module('ms-ctrls', [])
.controller('Login', ['$scope', '$state', '$stateParams', 'Auth', '$window',
/**
 * [Login contoller used on login/logout]
 * @param $scope
 * @param $state
 * @param Auth    [Auth Service]
 * @param $window [Used to do refresh of app state]
 */
function($scope, $state, $stateParams, Auth, $window) {

    // set login method
    if ($stateParams.login == 'partic')
        $scope.method = Auth.loginMethod('partic');
    else
        $scope.method = Auth.loginMethod('rast');

    // sets method and changes url param
    $scope.switchMethod = function(method) {
        $scope.method = Auth.loginMethod(method);
        //$state.go('main.home', {login: method});
    }

    $scope.loginUser = function(user, pass) {
        $scope.loading = true;

        if ($scope.method.name == 'PATRIC')
            var prom = Auth.loginPatric(user, pass)
        else
            var prom = Auth.login(user, pass)

        prom.success(function(data) {
            // see https://github.com/angular-ui/ui-router/issues/582

            // If coming from home page, go to genomes.
            // Otherwise go to current page.
            if ($state.current.name === 'main.home') {
                var p = $state.transitionTo('app.RefModels', {ref: 'Plants'}, {reload: true, inherit: true, notify: false});
            } else
                var p = $state.transitionTo($state.current.name, {}, {reload: true, inherit: true, notify: false});

            p.then(function() {
                setTimeout(function(){
                    $window.location.reload();
                }, 0);
            });
        }).error(function(e, status){
            console.error('LOGIN FAILED')
            $scope.loading = false;
            if (status == 401)
                $scope.inValid = true;
            else
                $scope.failMsg = "Could not reach authentication service: "+e.error_msg;
        })
    }

    $scope.logout = function() {
        Auth.logout();
    }
}])



.controller('FrontPage', ['$scope', '$stateParams', '$mdSidenav',
function($scope, $stateParams, $mdSidenav) {
	// TODO MODELSEED-59: KBASE trap
    $scope.toggleOperations = function(e, type) {
        var tar = e.target;
        e.stopPropagation();

        if (type === 'kbase') {
            if (!$mdSidenav('kbaseOpts').isOpen()) {
                $mdSidenav('kbaseOpts').open();

            // $document.bind('click', function(e) {
                // $mdSidenav('kbaseOpts').close();
                // $document.unbind(e)
                // $scope.selected = null;
            // })
            } else if ($mdSidenav('kbaseOpts').isOpen()) {
                $mdSidenav('kbaseOpts').close();
            }
        }
    }
 

}])




.controller('Home', ['$scope', '$stateParams',
function($scope, $stateParams) {

}])

.controller('Version', ['$scope', '$http', 'config', '$rootScope',
function($s, $http, config, $rootScope) {

    $s.release = config.releaseVersion;

    $http.get('version/version.txt')
         .then(function(res) {
             $s.commitHash = res.data.trim();
         })

    $http.get('version/branch.txt')
         .then(function(res) {
             $s.commitBranch = res.data.trim();
         })

   $http.get('version/deploy-date.txt')
        .then(function(res) {
            $s.deployDate = res.data.trim().split(' ').slice(0, 5).join(' ');
        })

    $s.urls = config.services;

    // system status sanity check
    $http.rpc('ms', 'list_models', {})
         .then(function(res) { $s.ms = true; })
         .catch(function() { $s.ms = false; })

    $http.rpc('ws', 'get', {objects: [config.paths.media+'/Carbon-D-Glucose']})
         .then(function(res) { $s.ws = true; })
         .catch(function() { $s.ws = false; })

    $http.get($s.urls.shock_url+'/node')
          .then(function(res) { $s.shock = true; })
          .catch(function() { $s.shock = false; })

    $http.get($s.urls.solr_url+'reactions/select?q=*')
         .then(function(res) { $s.solr = true; })
         .catch(function() { $s.solr = false; })

    $http.rpc('app', 'query_task_summary', [])
         .then(function(res) { $s.app = true; })
         .catch(function() { $s.app = false; })

    $http.rpc('msSupport', 'list_rast_jobs', {owner: $rootScope.user})
         .then(function(res) {
             console.log('res', res); $s.msSupport = true;
         })
         .catch(function(e) {
             console.error('error', e); $s.msSupport = false;
         })

    /*
    $http({method: "POST",
           url: config.services.patric_auth_url,
           data: 'username=test&password=test',
         }).then(function(res) { $s.patricAuth = true; })
           .catch(function() { $s.patricAuth = false; })
    */


}])


.controller('Jobs',
['$scope', '$document', 'uiTools', 'Jobs', '$timeout',
function($s, $document, uiTools, Jobs, $timeout) {

    $s.relativeTime = uiTools.relativeTime;
    $s.isPolling = Jobs.isPolling();
    
    // if initial jobs status isn't there, listen
    // otherwise, load from cache and listen
    if (Jobs.getStatus().allJobs !== null) setStatus();

    // listen and stop listening when context-menu is triggered.
    var stopListening = listen()

    $s.$on('$destroy', function(){
        $document.off('click', unselect);
    });

    // context-menu
    $s.openMenu = function($event, job) {
        $s.selectedJob = job;
        stopListening();
        $document.off('click', unselect);
        $document.on('click', unselect);
    }

    function unselect() {
        $s.selectedJob = null;
        $timeout(function() {
            setStatus()
            stopListening = listen();
        })
    }

    function setStatus() {
        var status = Jobs.getStatus()

        $s.jobs = status.allJobs,
        $s.queuedCount = status.queuedCount,
        $s.runningCount = status.runningCount,
        $s.completedCount = status.completedCount;

        if ('error' in status) $s.error = status.error.message;
    }

    function listen() {
        return $s.$on('Event.JobUpdate', setStatus);
    }
}])

.controller('JobCount',
['$scope', 'Jobs',
function($s, Jobs) {
    if (Jobs.getStatus().allJobs !== null) {
        var status = Jobs.getStatus();
        $s.remainingJobCount = status.queuedCount + status.runningCount;
    }

    function listener() {
        $s.$on('Event.JobUpdate', function() {
            var status = Jobs.getStatus();
            $s.remainingJobCount = status.queuedCount + status.runningCount;
        });
    }

    listener();
}])

.controller('Biochem',
['$scope', 'Biochem', '$state', '$stateParams', 'MS', 'Session',
/**
 * [Responsible for options, table specs,
 * 	and updating of reaction/compound tables ]
 * @param  {[type]} $scope  [description]
 * @param  {[type]} Biochem [Biochem Service]
 */
function($s, Biochem, $state, $stateParams, MS, Session) {

    $s.chem = $stateParams.chem;
    $s.enableColumnSearch = true;
    $s.advanceSearch = 'search in columns';
    $s.externalDBs = {
        BiGG_r: 'http://bigg.ucsd.edu/universal/reactions/',//e.g., http://bigg.ucsd.edu/universal/reactions/PPA
        BiGG_c: 'http://bigg.ucsd.edu/universal/metabolites/', //e.g., http://bigg.ucsd.edu/universal/metabolites/h2o
        KEGG: 'https://www.kegg.jp/entry/', //e.g., https://www.kegg.jp/entry/R00004 and https://www.kegg.jp/entry/C01328
        MetaCyc_c: 'https://biocyc.org/META/NEW-IMAGE?type=COMPOUND&object=', // e.g., https://biocyc.org/META/NEW-IMAGE?type=COMPOUND&object=ATP
        MetaCyc_r: 'https://biocyc.org/META/NEW-IMAGE?type=REACTION&object=' //e.g. https://biocyc.org/META/NEW-IMAGE?type=REACTION&object=INORGPYROPHOSPHAT-RXN
    }

    $s.tabs = {tabIndex: Session.getTab($state)};
    $s.$watch('tabs', function(value) { Session.setTab($state, value) }, true)

    // Reactions
    var rxn_sFields = ['id', 'name', 'status', 'synonyms', 'aliases', 'pathways', 'ontology', 'stoichiometry'];
    $s.rxnOpts = Session.getOpts($state, 'rxns') ||
                  {query: '', limit: 25, offset: 0, sort: {field: 'id'}, core: 'reactions', searchFields: rxn_sFields,
                  visible: ['name', 'id', 'definition', 'deltag', 'deltagerr', 'direction', 'stoichiometry', 'status',
                            'aliases', 'is_obsolete', 'is_transport', 'ontology', 'pathways'] };

    // Compounds
    var cpd_sFields = ['id', 'name', 'formula', 'synonyms', 'aliases', 'ontology'];
    $s.cpdOpts = Session.getOpts($state, 'cpds') ||
                  {query: '', limit: 25, offset: 0, sort: {field: 'id'}, core: 'compounds', searchFields: cpd_sFields,
                  visible: ['name', 'id', 'formula', 'mass', 'abbreviation', 'deltag', 'deltagerr',
                            'charge', 'aliases', 'ontology'] };

    $s.rxnHeader = [
        {label: 'ID', key: 'id', format: function(row) {
            var comment_str = '&nbsp;&nbsp;<md-button ng-disabled="false" aria-label="Comment" ng-click="leaveComment($event, \''+row.id+'\', \'rxn\')">';
            comment_str += '<md-tooltip>Add Comments</md-tooltip>';
            comment_str += '<md-icon class="material-icons">comment</md-icon></md-button>';
            return '<a ui-sref="app.rxn({id: \''+row.id+'\'})">'+row.id+'</a>'+comment_str;
        }},
        {label: 'Name', key: 'name'},
        {label: 'Equation', key: 'stoichiometry', format: function(r) {
            if (!r.stoichiometry) return "N/A";
            var stoich = r.stoichiometry.replace(/\"/g, '')
            return '<span style="white-space: wrap"'+'stoichiometry-to-eq="'+stoich+'" direction="'+r.direction+'"></span>';
        }},
        {label: 'deltaG', key: 'deltag'},
        {label: 'Status', key: 'status'},
        {label: 'Synonyms', key: 'synonyms', format: function(row){
            if(row.aliases===undefined || row.aliases.length==0) return "N/A";
            var synms = row.aliases[row.aliases.length -1];
            synms = synms.replace('Name:', '').replace(/\"/g, '');
            return '<span style="display: inline-block; width: 300px;">'+synms+'</span>';
        }},
        {label: 'Aliases', key: 'aliases', format: function(row){
            if(row.aliases===undefined || row.aliases.length==0) return "N/A";
            var als = row.aliases.slice(0, row.aliases.length -1);
            for (var i=0; i<als.length; i++) {
                als[i] = als[i].replace(/^([A-Za-z]+)(.*:)(.*)/,'<b>$1$2</b>$3');
                var arr = als[i].split('</b>')
                var arr1 = arr[1].split(';');
                for (var j=0; j<arr1.length; j++) {
                    if (als[i].indexOf('BiGG') != -1)
                        arr1[j] ='<a target="_blank" href="'+$s.externalDBs['BiGG_r']+arr1[j].trim()+'">'+arr1[j]+'</a>';
                    if (als[i].indexOf('KEGG') != -1)
                        arr1[j] ='<a target="_blank" href="'+$s.externalDBs['KEGG']+arr1[j].trim()+'">'+arr1[j]+'</a>';
                    if (als[i].indexOf('MetaCyc') != -1)
                        arr1[j] ='<a target="_blank" href="'+$s.externalDBs['MetaCyc_r']+arr1[j].trim()+'">'+arr1[j]+'</a>';
                }
                als[i] = arr[0] + "</b>" + arr1.join(';');
            }
            var als_str = als.join('<br>').replace(/\"/g, '');
            return '<span style="display: inline-block; width: 300px;">'+als_str+'</span>';
        }},
        {label: 'Pathways', key: 'pathways', format: function(row){
            if(row.pathways===undefined || row.pathways.length==0) return "N/A";
            var arr_pathways = row.pathways;
            if(arr_pathways.length==0) return "N/A";
            for (var i=0; i<arr_pathways.length; i++) {
                arr_pathways[i] = arr_pathways[i].replace(/^([A-Za-z]+)(.*:)(.*)/,'<b>$1$2</b>$3');
            }
            var pwy = arr_pathways.join('<br>');
            pwy = pwy.replace(/\"/g, '').replace(/\|/g, ';');
            return '<span style="display: inline-block; width: 300px;">'+pwy+'</span>';
        }},
        {label: 'Ontology', key: 'ontology', format: function(row){
            if(row.ontology===undefined || row.ontology==='class:null|context:null|step:null')
                return "N/A";
            return row.ontology;
        }}
    ];

    $s.cpdHeader = [
        {label: 'ID', key: 'id', format: function(row) {
            var comment_str = '&nbsp;&nbsp;<md-button ng-disabled="false" aria-label="Comment" ng-click="leaveComment($event, \''+row.id+'\', \'cpd\')">';
            comment_str += '<md-tooltip>Add your comment</md-tooltip>';
            comment_str += '<md-icon class="material-icons">comment</md-icon></md-button>';
            return '<a ui-sref="app.cpd({id: \''+row.id+'\'})">'+row.id+'</a>'+comment_str;
        }},
        {label: 'Name', key: 'name'},
        {label: 'Formula', key: 'formula', format: function(row) {
            return '<span pretty-formula='+row.formula+'></span>';
        }},
        {label: 'Mass', key: 'mass'},
        {label: 'Charge', key: 'charge'},
        {label: 'Synonyms', key: 'synonyms', format: function(row){
            if(row.aliases===undefined || row.aliases.length==0) return "N/A";
            var synms = row.aliases[0].replace('Name:', '').replace(/\"/g, '');
            return '<span style="display: inline-block; width: 300px;">'+synms+'</span>';
        }},
        {label: 'Aliases', key: 'aliases', format: function(row){
            if(row.aliases===undefined || row.aliases.length==0) return "N/A";
            var als = row.aliases.slice(1, row.aliases.length);
            for (var i=0; i<als.length; i++) {
                als[i] = als[i].replace(/^([A-Za-z]+)(.*:)(.*)/,'<b>$1$2</b>$3');
                var arr = als[i].split('</b>')
                var arr1 = arr[1].split(';');
                for (var j=0; j<arr1.length; j++) {
                    if (als[i].indexOf('BiGG') != -1)
                        arr1[j] ='<a target="_blank" href="'+$s.externalDBs['BiGG_c']+arr1[j].trim()+'">'+arr1[j]+'</a>';
                    if (als[i].indexOf('KEGG') != -1)
                        arr1[j] ='<a target="_blank" href="'+$s.externalDBs['KEGG']+arr1[j].trim()+'">'+arr1[j]+'</a>';
                    if (als[i].indexOf('MetaCyc') != -1)
                        arr1[j] ='<a target="_blank" href="'+$s.externalDBs['MetaCyc_c']+arr1[j].trim()+'">'+arr1[j]+'</a>';
                }
                als[i] = arr[0] + "</b>" + arr1.join(';');
            }
            var als_str = als.join('<br>').replace(/\"/g, '');
            return '<span style="display: inline-block; width: 300px;">'+als_str+'</span>';
        }},
        {label: 'Ontology', key: 'ontology', format: function(row){
            if(row.ontology===undefined || row.ontology==='class:null|context:null')
                return "N/A";
            return row.ontology;
        }}
    ];

    function updateRxns() {
        //Biochem.get('model_reaction', $s.rxnOpts)
        Biochem.get_solr('reactions', $s.rxnOpts)
               .then(function(res) {
                    docs = res['docs'];
                    docs.forEach(function(doc) {
                        if (doc['is_obsolete'] == "1") {
                            doc['status'] += " (and is obsolete)";
                        }
                    })
                    $s.rxns = res;
                    $s.loadingRxns = false;
               })
    }

    function updateCpds() {
        //Biochem.get('model_compound', $s.cpdOpts)
        Biochem.get_solr('compounds', $s.cpdOpts)
               .then(function(res) {
                    $s.cpds = res;
                    $s.loadingCpds = false;
               })
    }

    $s.$watch('rxnOpts', function(after, before) {
        console.log('after', after);
        $s.loadingRxns = true;
        updateRxns();
        Session.setOpts($state, 'rxns', after);
    }, true)

    $s.$watch('cpdOpts', function(after, before) {
        console.log('after', after);
        $s.loadingCpds = true;
        updateCpds();
        Session.setOpts($state, 'cpds', after);
    }, true)

    /* table row click (not used as of now)
    $s.rowClick = function(ev) {}
    */

    $s.getBiochemScope = function() {
        return $scope;
    }

}])


// WARNING: External resources depend on this.
.controller('Compound',['$scope', 'Biochem', '$stateParams',
function($s, Biochem, $stateParams) {
    $s.id = $stateParams.id;
    $s.getImagePath = Biochem.getImagePath;
    $s.externalDBs = {
        BiGG_r: 'http://bigg.ucsd.edu/universal/reactions/',//e.g., http://bigg.ucsd.edu/universal/reactions/PPA
        BiGG_c: 'http://bigg.ucsd.edu/universal/metabolites/', //e.g., http://bigg.ucsd.edu/universal/metabolites/h2o
        KEGG: 'https://www.kegg.jp/entry/', //e.g., https://www.kegg.jp/entry/R00004 and https://www.kegg.jp/entry/C01328
        MetaCyc_c: 'https://biocyc.org/META/NEW-IMAGE?type=COMPOUND&object=', // e.g., https://biocyc.org/META/NEW-IMAGE?type=COMPOUND&object=ATP
        MetaCyc_r: 'https://biocyc.org/META/NEW-IMAGE?type=REACTION&object=' //e.g. https://biocyc.org/META/NEW-IMAGE?type=REACTION&object=INORGPYROPHOSPHAT-RXN
    }
    // Reactions
    var cpd_rxn_sFields = ['id', 'name', 'status', 'aliases', 'pathways', 'ontology', 'stoichiometry'];
    $s.rxnOpts = {query: $s.id, limit: 25, offset: 0, sort: {field: 'id'}, core: 'reactions', searchFields: cpd_rxn_sFields,
                  visible: ['name', 'id', 'definition', 'deltag', 'deltagerr', 'direction', 'stoichiometry', 'status',
                            'inchikey', 'smiles', 'aliases', 'is_obsolete', 'ontology', 'pathways'] };

    $s.rxnHeader = [
        {label: 'ID', key: 'id', format: function(row) {
            var comment_str = '&nbsp;&nbsp;<md-button class="md-fab" ng-disabled="false" aria-label="Comment" ng-click="leaveComment($event, \''+row.id+'\', \'rxn\')">';
            comment_str += '<md-tooltip>Add Comments</md-tooltip>';
            comment_str += '<md-icon class="material-icons">comment</md-icon></md-button>';
            return '<a ui-sref="app.rxn({id: \''+row.id+'\'})">'+row.id+'</a>'+comment_str;
        }},
        {label: 'Name', key: 'name'},
        {label: 'Equation', key: 'stoichiometry', format: function(r) {
            if (!r.stoichiometry) return "N/A";
            var stoich = r.stoichiometry.replace(/\"/g, '')
            return '<span style="white-space: wrap;"'+'stoichiometry-to-eq="'+stoich+'" direction="'+r.direction+'"></span>';
        }},
        {label: 'deltaG', key: 'deltag'},
        {label: 'Status', key: 'status'},
        {label: 'Synonyms', key: 'synonyms', format: function(row){
            if(row.aliases===undefined || row.aliases.length==0) return "N/A";
            var synms= row.aliases[row.aliases.length -1];
            synms = synms.replace('Name:', '').replace(/\"/g, '');
            return '<span style="display: inline-block; width: 300px;">'+synms+'</span>';
        }},
        {label: 'Aliases', key: 'aliases', format: function(row){
            if(row.aliases===undefined || row.aliases.length==0) return "N/A";
            var als = row.aliases.slice(0, row.aliases.length -1);
            for (var i=0; i<als.length; i++) {
                als[i] = als[i].replace(/^([A-Za-z]+)(.*:)(.*)/,'<b>$1$2</b>$3');
                var arr = als[i].split('</b>')
                var arr1 = arr[1].split(';');
                for (var j=0; j<arr1.length; j++) {
                    if (als[i].indexOf('BiGG') != -1)
                        arr1[j] ='<a target="_blank" href="'+$s.externalDBs['BiGG_r']+arr1[j].trim()+'">'+arr1[j]+'</a>';
                    if (als[i].indexOf('KEGG') != -1)
                        arr1[j] ='<a target="_blank" href="'+$s.externalDBs['KEGG']+arr1[j].trim()+'">'+arr1[j]+'</a>';
                    if (als[i].indexOf('MetaCyc') != -1)
                        arr1[j] ='<a target="_blank" href="'+$s.externalDBs['MetaCyc_r']+arr1[j].trim()+'">'+arr1[j]+'</a>';
                }
                als[i] = arr[0] + "</b>" + arr1.join(';');
            }
            var als_str = als.join('<br>').replace(/\"/g, '');
            return '<span style="display: inline-block; width: 300px;">'+als_str+'</span>';
        }},
        {label: 'Pathways', key: 'pathways', format: function(row){
            if(row.pathways===undefined || row.pathways.length==0) return "N/A";
            var arr_pathways = row.pathways;
            if(arr_pathways.length==0) return "N/A";
            for (var i=0; i<arr_pathways.length; i++) {
                arr_pathways[i] = arr_pathways[i].replace(/^([A-Za-z]+)(.*:)(.*)/,'<b>$1$2</b>$3');
            }
            var pwy = arr_pathways.join('<br>');
            pwy = pwy.replace(/\"/g, '').replace(/\|/g, ';');
            return '<span style="display: inline-block; width: 300px;">'+pwy+'</span>';
        }},
        {label: 'Ontology', key: 'ontology', format: function(row){
            if(row.ontology===undefined || row.ontology==='class:null|context:null|step:null')
                return "N/A";
            return row.ontology;
        }}
    ];

    $s.loading = true;
    // Biochem.getCpd($s.id)
    Biochem.getCpd_solr($s.id)
        .then(function(data) {
            data.synm = data.aliases.shift().replace('Name:', '');
            if (data['pka'] != undefined) {
                data['pka_display'] = data['pka'][0].replace('"', '');
            }
            if (data['pkb'] != undefined) {
                data['pkb_display'] = data['pkb'][0].replace('"', '');
            }
            $s.cpd = data;
            $s.loading = false;
        })
    Biochem.get_solr('reactions', $s.rxnOpts)
        .then(function(res) {
            $s.rxns = res;
            $s.loadingRxns = false;
            $s.enableColumnSearch = false;
        })
}])

// WARNING: External resources depend on this.
.controller('Reaction',['$scope', 'Biochem', '$stateParams',
function($s, Biochem, $stateParams) {
    $s.id = $stateParams.id;
    $s.getImagePath = Biochem.getImagePath;

    $s.loading = true;
    // Biochem.getRxn($s.id)
    Biochem.getRxn_solr($s.id)
        .then(function(data) {
            if (data['is_obsolete'] == "1") {
                data['is_obsolete_display'] = true;
            }
            else {
                data['is_obsolete_display'] = false;
            }
            if (data['linked_reaction'] != undefined) {
                data['linked_rxn_ids'] = data['linked_reaction'].split(';');
                data['replace_rxn'] = data['linked_rxn_ids'].shift();
            }
            if (data['compound_ids'] != undefined) {
                data['cpd_ids'] = data['compound_ids'][0].split(';');
            }
            if (data['aliases'] != undefined) {
                var sn = data['aliases'].pop();
                data['synm'] = sn.replace('Name:', '');
            }
            if (data['ec_numbers'] != undefined) {
                data['ec_numbers_display'] = data['ec_numbers'][0].replace('"', '');
            }
            if (data['pathways'] != undefined) {
                data['pathways_display'] = data['pathways'][0].replace('"', '');
            }
            data['equation_display'] = data['equation'].replace(/\(1\)/g,'').replace(/\[0\]/g,'');
            data['definition_display'] = data['definition'].replace(/\(1\)/g,'').replace(/\[0\]/g,'');
            $s.rxn = data;
            $s.loading = false;
        })
}])



.controller('BiochemViewer',['$scope', 'Biochem', '$state', '$stateParams',
function($s, Biochem, $state, $stateParams) {
    $s.opts = {query: '', limit: 25, offset: 0, sort: {field: 'id'}};

    var cpdID = $stateParams.cpd;;

    // Biochem.get('model_compound', {query: cpdID})
    Biochem.get_solr('compounds', {query: cpdID})
       .then(function(res) {
           $s.totalFound = res.numFound;
           $s.cpd = res.docs[0];
       })

    $s.loading = true;
    Biochem.findReactions(cpdID)
       .then(function(res) {
           $s.reactionCount = res.numFound;
           $s.data = res.docs;
           stats($s.data);
           $s.loading = false;
       })

    function stats(rxns) {
        var leftCount = 0, rightCount = 0;
        var search = /(cpd\d*)/g;

        for (var i in rxns) {
            var rxn = rxns[i];

            var splitEq = rxn.equation.split('<=>'),
                substrates = splitEq[0].match(search),
                products = splitEq[1].match(search)

            if (substrates.indexOf(cpdID) !== -1)
                leftCount += 1;
            if (products.indexOf(cpdID) !== -1)
                rightCount += 1;
        }

        $s.substrateCount = leftCount;
        $s.productCount = rightCount;
    }

}])


.controller('Compare', ['$state', '$scope', '$timeout', 'VizOptions', 'Tabs', 'ModelViewer',
function($state, $scope, $timeout, VizOpts, Tabs, MV) {
    $scope.MV = MV;
    $scope.VizOpts = VizOpts;

    $scope.topLevelTabs = {selectedIndex: 0};

    // secondary tabs
    $scope.Tabs = Tabs;
    Tabs.totalTabCount = 2;

    $scope.mapOpts = {query: '', limit: 25, offset: 0, sort: {field: 'id'}};
    $scope.mapHeader = [
        {label: 'Name', key: 'name',
         click: function(item) {
             Tabs.addTab({name: item.name, mapID: item.id});
        }},
        {label: 'ID', key: 'id'},
        {label: 'Rxns', key: 'rxnCount'},
        {label: 'Cpds', key: 'cpdCount'}
    ]

    $scope.updateOptions = function() {
        // wait for radio animation
        $timeout(function() {
            $scope.$broadcast('Compare.event.absFlux', VizOpts.flux == 'absFlux')
        }, 100)
    }

    // fetch maps
    $scope.loadingMaps = true;
    MV.getMaps().then(function(d) {
        $scope.loadingMaps = false;
        $scope.maps = d;
    })

    function update() {
        $scope.loading = true;
        MV.updateData().then(function(d) {
            var models = d.modelfolder,
                fbas = d.fba;

            // regenerates heatmap and kegg maps
            $scope.heatmapData = parseData(models, fbas);
            $scope.models = models;
            $scope.fbas = fbas;
            $scope.loading = false;
        })
    }

    // update data (and rerender) when selected data changes
    update();
    $scope.$on('MV.event.change', function() {
        update()
    })

    function parseData(models, fbas) {
        console.log('models', models)

        // create heatmap data
        var rxnIDs = [],
            modelNames = [],
            data = [];

        // first, get union of reactions
        for (var i=0; i < models.length; i++) {
            var model = models[i];
            modelNames.push(model.name);

            var rxns = model.modelreactions;
            for (var j=0; j < rxns.length; j++) {
                var rxnID = rxns[j].id;
                if (rxnIDs.indexOf(rxnID) === -1) rxnIDs.push(rxnID);
            }
        }

        var rows = [];
        var allFluxes = []; //used for stats

        // for each model, get data for box, left to right
        for (var i=0; i < models.length; i++) {
            var rxns = models[i].modelreactions;

            // see if there is an fba result
            // if so, get create rxn hash
            var hasFBA = false,
                fbaRXNs = {};
            if (fbas && fbas[i]) {
                hasFBA = true;
                var fbaRxns = fbas[i].FBAReactionVariables;

                for (var j=0; j<fbaRxns.length; j++) {
                    // oh. man.
                    var rxnId = fbaRxns[j].modelreaction_ref.split('||')[1].split('/').pop();
                    fbaRXNs[rxnId] = fbaRxns[j];
                }
            }

            var row = [];
            // for each rxn in union of rxns, try to find rxn for that model
            for (var j=0; j < rxnIDs.length; j++) {
                var rxnID = rxnIDs[j];

                var found = false, flux;

                for (var k=0; k<rxns.length; k++) {
                    if (rxns[k].id === rxnID) {
                        found = true;
                        if (hasFBA && fbaRXNs[rxnID]) {
                            flux = fbaRXNs[rxnID].value;
                            allFluxes.push(flux);
                        }
                        break;
                    }
                }

                row.push({present: (found ? 1 : 0), flux: flux});
            }

            rows.push(row);
        }

        // rxn000001_c0 => rxn000001[c0]
        var i = rxnIDs.length;
        while (i--) rxnIDs[i] = rxnIDs[i].replace('_','[')+']'

        // update min/max for legend
        $scope.minFlux = Math.min.apply(null, allFluxes);
        $scope.maxFlux = Math.max.apply(null, allFluxes);

        return {x: rxnIDs, y: modelNames, data: rows};
    }
}])


.controller('PlantAnnotations',['$scope', 'WS',
function($s, WS) {
    var url = 'http://pubseed.theseed.org/SubsysEditor.cgi',
        subsystemUrl = url +'?page=ShowSubsystem&subsystem=',
        roleUrl = url + '?page=FunctionalRolePage&fr=',
        pathwayUrl = 'http://pmn.plantcyc.org/ARA/NEW-IMAGE?type=PATHWAY&object=',
        featurePath = '/feature/plantseed/Genomes/Athaliana-TAIR10/';

    var wsPath = '/plantseed/Data/annotation_overview';

    $s.annoOpts = {query: '', limit: 25, offset: 0, sort: {field: 'subsystems'}};

    $s.annoHeader = [
        {label: 'Role', key: 'role'},
        {label: 'Subsystems', key: 'subsystems',
        formatter: function(row) {
            var links = [];
            row.subsystems.forEach(function(name) {
                links.push('&middot; <a href="'+subsystemUrl+name+'" target="_blank">'+
                                        name.replace(/_/g, ' ')+
                                    '</a>');
            })

            return links.join('<br>') || '-';
        }},
        {label: 'Classes', key: 'classes',
        formatter: function(row) {
            return row.classes.join('<br>') || '-';
        }},
        {label: 'Pathways', key: 'pathways',
        formatter: function(row) {
            var links = [];
            row.pathways.forEach(function(name) {
                links.push('<a href="'+pathwayUrl+name+'" target="_blank">'+
                                name+
                            '</a>');
            })

            return links.join('<br>') || '-';
        }},
        {label: 'Reactions', key: 'reactions',
        formatter: function(row) {
            return row.reactions.join('<br>') || '-';
        }},
        {label: 'Features', key: 'features',
        formatter: function(row) {
            var links = [];
            row.features.forEach(function(name) {
                links.push('<a href="'+featurePath+name+'">'+name+'</a>');
            })

            return links.join('<br>') || '-';
        }},
    ];

    $s.loading = true;
    if (WS.cached.annotations) {
        $s.annoOverview = WS.cached.annotations;
        $s.loading = false;
    } else
        WS.get(wsPath)
          .then(function(res) {
              $s.annoOverview = parseOverview(res.data);
              WS.cached.annotations = $s.annoOverview;
              $s.loading = false;
          })


    // The annotation overview structure seems to consist of hashes with
    // values of "1", instead of flat arrays.  This should probably be fixed.
    // Note: the 'role' structure is correct
    function parseOverview(data) {
        for (var i=0; i<data.length; i++) {
            data[i].pathways = Object.keys(data[i].pathways);
            data[i].classes = Object.keys(data[i].classes);
            data[i].features = Object.keys(data[i].features);
            data[i].subsystems = Object.keys(data[i].subsystems);
            data[i].reactions = Object.keys(data[i].reactions);
        }

        return data;
    }
}])

.controller('ModelEditor',
['$scope', 'FBA', 'WS', '$mdDialog', '$sce',
/**
 * [Responsible for:
 *  	- table options/spec,
 *  	- updating state of table,
 *  	- adding, removing, updating things in table(s)]
 * @param  {[type]} $scope   [description]
 * @param  {[type]} FBA      [OLD FBA Service]
 * @param  {[type]} WS       [Workspace Service]
 * @param  {[type]} $dialog  [Material Dialog]
 * @param  {[type]} $sce     [Needed for altering of DOM]
 * @param  {[type]} $timeout [description]
 * @return {[type]}          [description]
 */
function($scope, FBA, WS, $dialog, $sce) {
    $scope.FBA = FBA;

    $scope.rxnOpts = {query: '', limit: 25, offset: 0, sort: {field: 'id'}};
    $scope.rxnHeader = [
        {label: 'ID', key: 'id'},
        {label: 'Name', key: 'name'},
        {label: 'Equation', key: 'equation'},
        {label: 'deltaG', key: 'deltaG'},
        {label: 'detalGErr', key: 'deltaGErr'}
    ];

    $scope.loadingRxns = true;
    var biochem = FBA.getBiochem()
       .then(function(res) {
            FBA.getRxns(res.reactions)
               .then(function(rxns) {
                    $scope.rxns = rxns;
                    $scope.loadingRxns = false;
               })
       })

    $scope.opts = {query: '', limit: 25, offset: 0, sort: {field: 'id'}};
    $scope.modelHeader = [
        {label: 'ID', key: 'id'},
        {label: 'Name', key: 'name'},
        {label: 'Equation', key: 'equation'}
    ];

    /**
     * [checkedRxns description]
     * @type {Array}
     */
    $scope.checkedRxns = []

    // get user's writable workspaces
    $scope.loading = true;
    WS.getMyWS()
      .then(function(wsList) {
          $scope.wsList = wsList;
          $scope.selectedWS = wsList[0]; // use first by default
          $scope.loading = false;
      })

    // update model dropdown on workspace dropdown change
    $scope.$watch('selectedWS', function(value) {
        if (!value) return;

        $scope.loading = true;
        $scope.selectedModel = {};
        WS.getMyModels(value.name)
          .then(function(models) {
              $scope.models = models;
              $scope.selectedModel = models[0];
              $scope.loading = false;
          })
    })

    // update model editor on model dropdown change
    $scope.$watch('selectedModel', function(value) {
        $scope.data = undefined;
        if (!value || angular.equals(value, {}))
            return;

        // clear any checked reactions
        $scope.checkedRxns = [];

        updateModel();
    })

    /**
     * [updateModel description]
     */
    function updateModel() {
        $scope.loadingModel = true;
        WS.getModel($scope.selectedWS.name, $scope.selectedModel.name )
          .then(function(data){
              $scope.data = data.modelreactions;
              $scope.loadingModel = false;
           })
    }

    $scope.addRxns = function(ev, item) {
        $dialog.show({
            templateUrl: 'app/views/dialogs/add-rxns.html',
            targetEvent: ev,
            scope: $scope.$new(),
            preserveScope: true,
            controller: ['$scope', '$http',
            function($scope, $http) {

                $scope.cancel = function(){
                    $dialog.hide();
                }

                $scope.addItems = function(items){
                    $dialog.hide();
                    var ws = $scope.selectedWS.name,
                        name = $scope.selectedModel.name;

                    $scope.loadingModel = true;
                    FBA.addRxns($scope.selectedWS.name, name, items)
                       .then(function(res) {
                            $scope.data = $scope.data.concat(items)
                            $scope.loadingModel = false;
                       })
                }
            }]
        })
    }

    $scope.rmRxns = function() {
        var ws = $scope.selectedWS.name,
            name = $scope.selectedModel.name;

        $scope.loadingModel = true;
        FBA.rmRxns(ws, name, $scope.checkedRxns)
           .then(function() {
                //fixme: fix if rxn ids are not unique?
                for (var i=0; i<$scope.data.length; i++) {
                    for (var j=0; j<$scope.checkedRxns.length; j++) {
                        if ($scope.data[i].id === $scope.checkedRxns[j].id) {
                            $scope.data.splice(i, 1)
                            break;
                        }
                    }
                }

                $scope.checkedRxns = [];
                $scope.loadingModel = false;
           })
    }

    $scope.editRxn = function(ev, item) {
        $dialog.show({
            templateUrl: 'app/views/dialogs/edit-rxn.html',
            targetEvent: ev, //fixme
            controller: ['$scope', '$http',
            function($scope, $http) {

                $scope.cancel = function(){
                    $dialog.hide();
                }

                $scope.select = function(item){
                }
            }]
        })
    }

    $scope.checkRxn = function(item) {
        item.checked = item.checked ? false : true;

        if (item.checked)
            $scope.checkedRxns.push(item)
        else {
            // remove from checked list
            for (var i=0; i<$scope.checkedRxns.length; i++) {
                if ( angular.equals($scope.checkedRxns[i], item) )
                    $scope.checkedRxns.splice(i, 1)
            }
        }
    }

    $scope.editDirection = function($event, item) {
        item.editable = true;
    }

    $scope.saveDirection = function(item, direction) {
        item.editable = false;
        var ws = $scope.selectedWS.name,
            name = $scope.selectedModel.name;

        $scope.loadingModel = true;
        FBA.saveDirection(ws, name, item.id, direction)
           .then(function(res) {
                var eq = item.equation;

                item.direction = direction;
                item.equation = FBA.splitEq(eq)[0] +
                                FBA.sanitizeDir(direction) +
                                FBA.splitEq(eq)[1];
                $scope.loadingModel = false;
           })
    }

    $scope.joinGenes = function(genes) {
        var ids = []
        for (var i in genes) ids.push(genes[i].id);
        return $sce.trustAsHtml(ids.join('<br>'));
    }

    $scope.editGenes = function(genes) {
        var ids = []
        for (var i in genes) ids.push(genes[i].id);
        return $sce.trustAsHtml(ids.join('<br>'));
    }
}])



.controller('Genomes',
['$scope', '$state', 'Patric', '$timeout', '$http', 'Upload', '$mdDialog',
 'Dialogs', 'ViewOptions', 'WS', 'Auth', 'uiTools', 'MS', 'Session', 'config',
function($scope, $state, Patric, $timeout, $http, Upload, $dialog,
 Dialogs, ViewOptions, WS, Auth, uiTools, MS, Session, config) {
    $scope.tabs = {tabIndex: Session.getTab($state)};
    $scope.$watch('tabs', function(value) { Session.setTab($state, value) }, true)

    // formatting time helper used in View
    $scope.uiTools = uiTools;

    // microbes / plants view
    $scope.view = ViewOptions.get('organismType');

    $scope.changeView = function(view, tab) {
        $scope.view = ViewOptions.set('organismType', view);
        if( tab ) {
         $scope.tabs.tabIndex = tab;
        }
    }

    $scope.showMenu = function() { $scope.menuVisible = true; }

    $scope.filters = {myGenomes: ViewOptions.get('viewMyGenomes')};

    $scope.opts = {
        query: '', limit: 25, offset: 0,
        sort: {field: 'genome_name'},
        visible: ['genome_name', 'genome_id', 'species', 'contigs']
    };

    $scope.myMicrobesOpts = {query: '', limit: 25,  offset: 0, sort: {field: 'timestamp'}};

    $scope.myPlantsOpts = {
        query: '',
        limit: 25,
        offset: 0,
        sort: {field: 'timestamp'}
    };

    $scope.columns = [
        {prop: 'genome_name', label: 'Name'},
        {prop: 'genome_id', label: 'ID'},
        {prop: 'species', label: 'Species'},
        {prop: 'contigs', label: 'Contigs'}
    ]

    $scope.myMicrobesSpec = [
        {prop: 'genome_name', label: 'Name'},
        {prop: 'genome_id', label: 'ID'},
        {prop: 'contigs', label: 'Contigs'}
    ]

    // public rast genome
    MS.listRastGenomes()
      .then(function(data) {
          $scope.myMicrobes = data;
          //console.log('myMicrobes (rast)', $scope.myMicrobes)
      })

    // public plants for genome view
    WS.listPublicPlants('/plantseed/plantseed/')
      .then(function(plants) { 
          console.log(plants)
          $scope.plants = plants;
      })

    // private plant genomes
    loadPrivatePlants();
    function loadPrivatePlants() {
        $scope.loadingMyPlants = true;        
        WS.list('/'+Auth.user+'/plantseed/')
            .then(function(res) {
                // ignore anything that isn't a modelfolder
                var plants = []
                res.forEach(function(obj) {
                    if (obj.type !== 'modelfolder') return;
                    obj.path =  obj.path + '/.plantseed_data/minimal_genome';
                    plants.push(obj);
                })

                $scope.myPlants = plants;
                $scope.loadingMyPlants = false;
            }).catch(function(e) {
                if (e.error.code === -32603)
                    $scope.error = 'Something seems to have went wrong. '+
                                'Please try logging out and back in again.';
                else
                    $scope.error = e.error.message;
                $scope.loadingMyPlants = false;
            })
    }

    $scope.getLabel = function(prop) {
        for (var i=0; i<$scope.columns.length; i++) {
            var col = $scope.columns[i];
            if (col.prop === prop) return col.label;
        }
        return '';
    }

    $scope.exists = function(item, visible) {
      return visible.indexOf(item) > -1;
    }

    $scope.toggle = function(item, visible) {
        var idx = visible.indexOf(item);
        if (idx > -1) visible.splice(idx, 1);
        else visible.push(item);
    };

    $scope.$watch('opts', function(value){
        update()
    }, true)

    $scope.toggleMyGenomes = function() {
        // timeout for prom
        $timeout(function() {
            ViewOptions.set('viewMyGenomes', $scope.filters.myGenomes);
            update()
        });
    }

    // update visible genomes
    function update() {
        $scope.loading = true;
        //Patric.getGenomes( $scope.opts, $scope.filters.myGenomes )
        Patric.listGenomes( $scope.opts )
              .then(function(genomes) {
                  $scope.genomes = genomes;
                  $timeout(function() {
                      $scope.loading = false;
                  })
              })
    }

    $scope.selectPublic = function(item) {
        $scope.selectedPublic = item;
    }

    $scope.selectPrivate = function(item) {
        $scope.selectedPrivate = item;
    }

    $scope.reconstruct = function(ev, item) {
        if ('genome_id' in item) {
            var name = item.genome_id,
                orgName = item.genome_name;
            var params = {path: 'PATRIC:'+item.genome_id, name: item.genome_name};
        } else {
            var name = item.name;
            var params = {path: item.path, name: name};
        }

        Dialogs.reconstruct(ev, params,
            function(jobId) {
                MS.submittedModel({
                    name: name,
                    orgName: orgName,
                    jobId: jobId
                });
            })
    }

    $scope.reconstructPlant = function(ev, item) {
        var path = item.path.split('/').slice(0,-2).join('/')+'/genome';
        var params = {path: path, name: item.name};
        $scope.selected = item;
        Dialogs.reconstructPlant(ev, params,
            function(res) {
                MS.addModel(res, 'plant')
            })
    }

    $scope.annotatePlant = function(ev, item) {
        Dialogs.annotatePlant(ev, item)
    }

    $scope.reconstructPrivate = function(ev, item) {
        var params = {path: 'RAST:'+item.genome_id, name: item.genome_name};
        Dialogs.reconstruct(ev, params,
            function(res) {
                console.log('done reconstructing', res)
                MS.addModel(res, 'microbe')
            })
    }

    $scope.copyInProgress = {};
    $scope.copy = function(i, path) {
        $scope.copyInProgress[i] = true;

        var name =  path.split('/').pop(),   
            destPath = '/'+Auth.user+'/plantseed/'+name;    

        Dialogs.showToast('Copying...', name, 2000);            
        copyModel(name, path, i)

        // old way
        //copyFolder(name, path, destPath)
        //    .then(function() {
        //        $scope.copyInProgress[i] = false;
        //    })               
    }

    function copyModel(name, path, i) {
        var prom = WS.getObjectMeta('/'+Auth.user+'/plantseed/'+name)
            .then(function(res) {
                Dialogs.showToast('Copy canceled: <i>'+name+'</i> already exists', null, 2000);  
                $scope.copyInProgress[i] = false;                 
            }).catch(function(e) {
                $http.rpc('ms', 'copy_model', {
                    source_model_path: path,
                    plantseed: 1
                }).then(function(res) {
                    Dialogs.showComplete('Copy complete', name);
                    
                    // go ahead and reload genomes and models
                    loadPrivatePlants();     
                    MS.listModels('/'+Auth.user+'/plantseed')                         

                    $scope.copyInProgress[i] = false;
                }).catch(function(e) {
                    Dialogs.showError('Copy '+name+ ' failed.')    
                    $scope.copyInProgress[i] = false;
                })                
            })

        return prom;

    }

    function copyFolder(name, path, destPath) {                       
        var args = {
            src: path,
            dest: destPath,
            recursive: true,
        }

        // first create modelfolder, then copy
        var prom = WS.createModelFolder('/'+Auth.user+'/plantseed/'+name)
            .then(function(res) {
                return WS.copy(args).then(function(res) {
                    Dialogs.showComplete('Copy complete', name, path);

                    // remove odd empty object
                    delete res[path];

                    // update cache
                    if (MS.myPlants) MS.addModel(res, 'plant');
                }).catch(function(e) {
                    // hack: if error is thrown, assume 
                    // it's because folder already exists.
                    Dialogs.saveAs('', function(newName) {
                        var destPath = '/'+Auth.user+'/plantseed/'+newName;  
                        copyFolder(newName, path, destPath) 
                    }, function() {
                        Dialogs.showToast('Copy Canceled', null, 100);      
                    }, name + ' already exists.  Please choose a new name.')
                })
            }).catch(function(e) {
                Dialogs.showError('Copy '+name+ ' failed.')           
            })    
        
        return prom;
    }    



    $scope.drop = function($event) {
        console.log('drop event', $event)
    }

    $scope.openUploader = function(ev) {
        $dialog.show({
            targetEvent: ev,
            scope: $scope.$new(),
            preserveScope: true,
            clickOutsideToClose: true,            
            templateUrl: 'app/views/genomes/upload-fasta.html',
            controller: ['$scope', function($scope) {
                var $this = $scope;

                // user inputed name and whatever
                $this.form = {};
                $this.selectedFiles; // file objects

                $scope.selectFile = function(files) {
                    // no ng binding suppose for file inputs
                    $scope.$apply(function() {
                        $this.selectedFiles = files;
                    })
                }

                $scope.startUpload = function() {
                    var name = $this.form.name;

                    // Ensure no overwrites
                    // Ideally, this would be handled by server responses.
                    console.log('attempting')
                    WS.getObjectMeta('/'+Auth.user+'/plantseed/'+name)
                        .then(function() {
                            alert('Genome name already exists!\n'+
                            'Please provide a new name or delete the existing genome');                           
                        }).catch(function(e) {
                            startUpload(name);
                        })
                }

                function startUpload(name) {
                    $dialog.hide();
                    Dialogs.showToast('Importing "'+name+'"', 
                        'please be patient', 10000000)

                    Upload.uploadFile($this.selectedFiles, null, function(node) {                        
                        MS.createGenomeFromShock(node, name)
                            .then(function(res) {
                                console.log('done importing', res)
                                Dialogs.showComplete('Import complete', name);
                                loadPrivatePlants();
                            }).catch(function(e) {
                                Dialogs.showError('something has gone wrong')
                                console.error(e.error.message)                                
                            })
                    }, function(error) {
                        console.log('shock error:', error)
                        Dialogs.showError('Upload to SHOCK failed (see console)')                        
                    })                    
                }     

                $scope.cancel = function() {
                    $dialog.hide();
                }
            }]
        })
    }

}])


/** TODO: Make new myMedia state/controller **/
.controller('MyMedia',
['$scope', '$stateParams', 'WS', 'MS', 'Auth',
 'Session', 'uiTools', 'Dialogs', '$state',
function($s, $sParams, WS, MS, Auth,
         Session, uiTools, Dialogs, $state) {

    $s.tabs = {tabIndex: Session.getTab($state)};
    $s.$watch('tabs', function(value) { Session.setTab($state, value) }, true)

    $s.myMediaOpts = {query: '', limit: 20, offset: 0, sort: {field: 'timestamp', desc: true}};

    $s.myMediaHeader = [
        {label: 'Media ID', key: 'name',
         link: {
            state: 'app.mediaPage',
            getOpts: function(row) {
                return {path: row.path};
            }
         }
        },
        //{label: 'Minimal?', key: 'isMinimal'},
        //{label: 'Defined?', key: 'isDefined'},
        //{label: 'Type', key: 'type'},
        {label: 'Modification Date', key: 'timestamp',
            formatter: function(row) {
                return uiTools.relativeTime(row.timestamp);
            }
        }
    ];
    $s.loadingMyMedia = true;
    
    MS.listMyMedia()
      .then(function(media) {
          $s.myMedia = media;
          $s.loadingMyMedia = false;
      }).catch(function(e) {
          $s.loadingMyMedia = false;
          $s.myMedia = [];
      })

    // copy media to my media
    $s.submit = function(items, cb) {
        copyMedia(items).then(cb)
    }

    // delete my media
    $s.deleteMedia = function(items, cb) {
        var paths = [];
        items.forEach(function(item) {
            paths.push(item.path)
        })

        WS.deleteObj(paths)
          .then(cb)
          .then(function() {
                Dialogs.showComplete('Deleted '+paths.length+' media formulation'+
                                     (paths.length>1 ? 's' : ''))
          })
    }

    // direct user to new media page
    $s.newMedia = function() {
        $state.go('app.mediaPage', {path: '/'+Auth.user+'/media/new-media'})
    }

    function copyMedia(items) {
        var paths = [];
        items.forEach(function(item) { paths.push(item.path); })

        var destination = '/'+Auth.user+'/media';
        return WS.createFolder(destination)
            .then(function(res) {
                WS.copyList(paths, destination)
                  .then(function(res) {
                    $s.myMedia = mergeObjects($s.myMedia, MS.sanitizeMediaObjs(res), 'path');
                    Dialogs.showComplete('Copied '+res.length+' media formulation'+
                                            (paths.length>1 ? 's' : ''))
                    $s.tabs.tabIndex = 1; // 'my media'
                }).catch(function(e) {
                    if (e.error.code === -32603)
                        Dialogs.error("Oh no!", "Can't overwrite your existing media names."+
                                      "Please consider renaming or deleting.")
                })
            })
    }

}])



.controller('Media',
['$scope', '$stateParams', 'WS', 'MS', 'Auth',
 'Session', 'uiTools', 'Dialogs', '$state',
function($s, $sParams, WS, MS, Auth,
         Session, uiTools, Dialogs, $state) {

    $s.tabs = {tabIndex: Session.getTab($state)};
    $s.$watch('tabs', function(value) { Session.setTab($state, value) }, true)

    /* Media --setting up for a solr-table like column search
    var med_sFields = ['name', 'isMinimal', 'isDefined', 'type'];
    $s.mediaOpts = Session.getOpts($state, 'media') ||
                   {query: '', limit: 20, offset: 0, sort: {field: 'name'}, core: 'media', searchFields: med_sFields};
    */
    $s.mediaOpts = {query: '', limit: 20, offset: 0, sort: {field: 'name'}};
    $s.myMediaOpts = {query: '', limit: 20, offset: 0, sort: {field: 'timestamp', desc: true}};

    $s.mediaHeader = [
        {label: 'Name', key: 'name',
         link: {
            state: 'app.mediaPage',
            getOpts: function(row) {
                return {path: row.path};
            }
          }
        },
        {label: 'Minimal?', key: 'isMinimal'},
        {label: 'Defined?', key: 'isDefined'},
        {label: 'Type', key: 'type'}
    ];

    $s.myMediaHeader = [
        {label: 'Name', key: 'name',
         link: {
            state: 'app.mediaPage',
            getOpts: function(row) {
                return {path: row.path};
            }
         }
        },
        {label: 'Minimal?', key: 'isMinimal'},
        {label: 'Defined?', key: 'isDefined'},
        {label: 'Type', key: 'type'},
        {label: 'Mod Date', key: 'timestamp',
            formatter: function(row) {
                return uiTools.relativeTime(row.timestamp);
            }
        }
    ];


    $s.loading = true;
    MS.listPublicMedia()
      .then(function(media) {
          $s.media = media;
          $s.loading = false;
      })


    $s.loadingMyMedia = true;
    MS.listMyMedia()
      .then(function(media) {
          $s.myMedia = media;
          $s.loadingMyMedia = false;
      }).catch(function(e) {
          $s.loadingMyMedia = false;
          $s.myMedia = [];
      })

    // copy media to my media
    $s.submit = function(items, cb) {
        copyMedia(items).then(cb)
    }

    // delete my media
    $s.deleteMedia = function(items, cb) {
        var paths = [];
        items.forEach(function(item) {
            paths.push(item.path)
        })

        WS.deleteObj(paths)
          .then(cb)
          .then(function() {
                Dialogs.showComplete('Deleted '+paths.length+' media formulation'+
                                     (paths.length>1 ? 's' : ''))
          })
    }

    // direct user to new media page
    $s.newMedia = function() {
        $state.go('app.mediaPage', {path: '/'+Auth.user+'/media/new-media'})
    }

    function copyMedia(items) {
        var paths = [];
        items.forEach(function(item) { paths.push(item.path); })

        var destination = '/'+Auth.user+'/media';
        return WS.createFolder(destination)
            .then(function(res) {
                WS.copyList(paths, destination)
                  .then(function(res) {
                    $s.myMedia = mergeObjects($s.myMedia, MS.sanitizeMediaObjs(res), 'path');
                    Dialogs.showComplete('Copied '+res.length+' media formulation'+
                                            (paths.length>1 ? 's' : ''))
                    $s.tabs.tabIndex = 1; // 'my media'
                }).catch(function(e) {
                    if (e.error.code === -32603)
                        Dialogs.error("Oh no!", "Can't overwrite your existing media names."+
                                      "Please consider renaming or deleting.")
                })
            })
    }

}])




.controller('RefModels',
['$scope', '$stateParams', 'Patric', 'WS', 'MS', 'uiTools', '$mdDialog', 'Dialogs', 'config',
 'ModelViewer', '$document', '$mdSidenav', '$q', '$timeout', 'ViewOptions', 'Auth', '$http',
function($scope, $stateParams, Patric, WS, MS, uiTools, $mdDialog, Dialogs, config,
MV, $document, $mdSidenav, $q, $timeout, ViewOptions, Auth, $http) {
	
    var $self = $scope;
    
    $scope.ref = ( $stateParams.ref )? $stateParams.ref: 'Plants';

    $scope.microbes = [];
    $scope.plants = [];
    
    $scope.MS = MS;
    $scope.MV = MV;
    $scope.uiTools = uiTools;
    
    MV.makePublic( true );
    
    $scope.relativeTime = uiTools.relativeTime;

    $scope.relTime = function(datetime) {
        return $scope.relativeTime(Date.parse(datetime));
    }

    // microbes / plants view
    $scope.view = ViewOptions.get('organismType');

    $scope.changeView = function(view) {
        $scope.view = ViewOptions.set('organismType', view);
    }

    $scope.showMenu = function() { $scope.menuVisible = true; }
    
    
    
    // FIXME: Revise following (opts...) per field names per santizeModel calle by listModels in MS
    $scope.opts = {
            query: '', limit: 25, offset: 0,
            sort: {field: 'genome_name'},
            visible: ['genome_name', 'species', 'species_domain', 'rxns', 'genes', 'fbas', 'gfs', 'mod_date']
        };

        $scope.columns = [
            {prop: 'genome_name', label: 'ModelID'},
            {prop: 'species', label: 'Species'},
            {prop: 'species_domain', label: 'SpeciesDomain'},
            {prop: 'rxns', label: 'Reactions'},
            {prop: 'genes', label: 'Genes'},
            {prop: 'fbas', label: 'FBA'},
            {prop: 'gfs', label: 'Gapfilling'},
            {prop: 'mod_date', label: 'ModificationDate'}
            
        ]

        
        
        $scope.microbesSpec = [
            {prop: 'genome_name', label: 'ModelID'},
            {prop: 'species', label: 'Species'},
            {prop: 'species_domain', label: 'SpeciesDomain'},
            {prop: 'rxns', label: 'Reactions'},
            {prop: 'genes', label: 'Genes'},
            {prop: 'fbas', label: 'FBA'},
            {prop: 'gfs', label: 'Gapfilling'},
            {prop: 'mod_date', label: 'ModificationDate'}

        ]
                
    // the selected item for operations such as download, delete.
    $scope.selected = null;
    
    $scope.copyInProgress = {};

    // Instead of below, fetch genomes from Patric:
       /*
        $scope.loadingMicrobes = true;
        MS.listModels( '/modelseed' + '/modelseed' ).then(function(res) {
            console.log('path res', res)

            $scope.microbes = res;
            $scope.loadingMicrobes = false;
        }).catch(function(e) {
            $scope.microbes = [];
            $scope.loadingMicrobes = false;
        })
        */

    

    $scope.loadingMicrobes = true;    
    Patric.listGenomes( $scope.opts )
    .then(function(genomes) {
        console.log('path res', genomes)

        $scope.microbes = genomes.docs;
        
        $scope.loadingMicrobes = false;
        /*
        $timeout(function() {
            $scope.loading = false;
        })
        */
    }).catch(function(e) {
        $scope.microbes = [];
        $scope.loadingMicrobes = false;
    })
    
    
    

    $scope.loadingPlants = true;
    MS.listModels( '/plantseed' + '/plantseed' ).
        then(function(res) {
        console.log('path res', res)
                   
        $scope.plants = res;
        $scope.loadingPlants = false;
    }).catch(function(e) {
        $scope.plants = [];
        $scope.loadingPlants = false;
    })


    
    
    $scope.getLabel = function(prop) {
        for (var i=0; i<$scope.columns.length; i++) {
            var col = $scope.columns[i];
            if (col.prop === prop) return col.label;
        }
        return '';
    }

    $scope.exists = function(item, visible) {
      return visible.indexOf(item) > -1;
    }

    $scope.toggle = function(item, visible) {
        var idx = visible.indexOf(item);
        if (idx > -1) visible.splice(idx, 1);
        else visible.push(item);
    };

    $scope.$watch('opts', function(value){
        update()
    }, true)

    $scope.toggleMyGenomes = function() {
        // timeout for prom
        $timeout(function() {
            ViewOptions.set('viewMyGenomes', $scope.filters.myGenomes);
            update()
        });
    }

    // update visible genomes
    function update() {
        $scope.loading = true;

/*        Patric.listGenomes( $scope.opts )
              .then(function(genomes) {
                  $scope.genomes = genomes;
                  $timeout(function() {
                      $scope.loading = false;
                  })
              })
*/
        $scope.loading = true;
    
    }

    $scope.selectPublic = function(item) {
        $scope.selectedPublic = item;
    }

    
    $scope.showRelatedData = function(item) {
        item.loading = true;
        var gapfillProm = showGapfills(item);
        var expressionProm = showExpression(item);

        var fbaProm;
        if (item.relatedFBAs) 
            delete item.relatedFBAs;
        else 
            fbaProm = updateFBAs(item)

        $q.all([fbaProm, gapfillProm, expressionProm])
            .then(function() {
                console.log('done')
                item.loading = false
            } )
    }
    

    function updateFBAs(item) {
        return MS.getModelFBAs(item.path)
            .then(function(fbas) {
                item.relatedFBAs = fbas;
            })
    }

    function showGapfills(item) {
        if (item.relatedGapfills) {
            delete item.relatedGapfills;
        } else {
            return updateGapfills(item);
        }
    }    

    function updateGapfills(item) {
        return MS.getModelGapfills(item.path)
            .then(function(gfs) {
                item.relatedGapfills = gfs;
            })
    }

    function showExpression(item) {
        return updateExpression(item);      
    }

    function updateExpression(item) {
        return WS.getObjectMeta(item.path)
            .then(function(res) {
                var expList = [],
                    dict = res[0][7].expression_data;
                
                for (key in dict) 
                    expList.push({name: key, ids: dict[key]});
                
                item.expression = expList;
            })        
    }


    $scope.runFBA = function(ev, item) {
        Dialogs.runFBA(ev, item, function() {
            updateFBAs(item).then(function() {
                item.fbaCount++;
            })
        })
    }

    
    $scope.runPlantFBA = function(ev, item) {
        Dialogs.runPlantFBA(ev, item, function() {
            updateFBAs(item).then(function() {
                item.fbaCount++;
            })
        })
    }

    $scope.gapfill = function(ev, item) {
        Dialogs.gapfill(ev, item, function() {
            updateGapfills(item).then(function() {
                item.gapfillCount++;
            })
        })
    }

    $scope.addFBA = function(e, fba, model) {
        e.preventDefault();
        e.stopPropagation();

        var data = {model: model.path,
                    fba: fba.path,
                    org: model.orgName,
                    media: fba.media};


        if (fba.checked) {
            MV.rm(data, true);
            fba.checked = false;
        } else {
            MV.add(data);
            fba.checked = true;
        }
    }

    
    $scope.copy = function(i, path) {
        $scope.copyInProgress[i] = true;
        
        
        // TODO: Fix this path:
        // But it might be ok as is (is copy destination path)
        var name =  path.split('/').pop(),   
            destPath = '/'+Auth.user+'/plantseed/'+name;    

        Dialogs.showToast('Copying...', name, 2000);            
        copyModel(name, path, i)

        // old way
        //copyFolder(name, path, destPath)
        //    .then(function() {
        //        $scope.copyInProgress[i] = false;
        //    })               
    }

    function copyModel(name, path, i) {
        var prom = WS.getObjectMeta('/'+Auth.user+'/plantseed/'+name)
            .then(function(res) {
                Dialogs.showToast('Copy canceled: <i>'+name+'</i> already exists', null, 2000);  
                $scope.copyInProgress[i] = false;                 
            }).catch(function(e) {
                $http.rpc('ms', 'copy_model', {
                    model: path,
                    plantseed: 1
                }).then(function(res) {
                    Dialogs.showComplete('Copy complete', name);
                    
                    // go ahead and reload genomes and models
                    // loadPrivatePlants();     
                    // MS.listModels('/'+Auth.user+'/plantseed')                         

                    $scope.copyInProgress[i] = false;
                }).catch(function(e) {
                    Dialogs.showError('Copy '+name+ ' failed.')    
                    $scope.copyInProgress[i] = false;
                })                
            })

        return prom;

    }

    function copyFolder(name, path, destPath) {                       
        var args = {
            src: path,
            dest: destPath,
            recursive: true,
        }

        // first create modelfolder, then copy
        var prom = WS.createModelFolder('/'+Auth.user+'/plantseed/'+name)
            .then(function(res) {
                return WS.copy(args).then(function(res) {
                    Dialogs.showComplete('Copy complete', name, path);

                    // remove odd empty object
                    delete res[path];

                    // update cache
                    if (MS.myPlants) MS.addModel(res, 'plant');
                }).catch(function(e) {
                    // hack: if error is thrown, assume 
                    // it's because folder already exists.
                    Dialogs.saveAs('', function(newName) {
                        var destPath = '/'+Auth.user+'/plantseed/'+newName;  
                        copyFolder(newName, path, destPath) 
                    }, function() {
                        Dialogs.showToast('Copy Canceled', null, 100);      
                    }, name + ' already exists.  Please choose a new name.')
                })
            }).catch(function(e) {
                Dialogs.showError('Copy '+name+ ' failed.')           
            })    
        
        return prom;
    }
    
    
    $scope.toggleOperations = function(e, type, item) {
        var tar = e.target;
        e.stopPropagation();

        // set selected item
        $scope.selected = item;

        $scope.loadingDownloads = true;
        MS.getDownloads(item.path)
          .then(function(dls) {
              console.log('dls', dls)
              $scope.selected.downloads = dls;
              $scope.loadingDownloads = false;
          })

        if (type === 'download') {
            if (!$mdSidenav('downloadOpts').isOpen())
                $mdSidenav('downloadOpts').open();

            $document.bind('click', function(e) {
                $mdSidenav('downloadOpts').close()
                $document.unbind(e)
                $scope.selected = null;
            })
        } else if ($mdSidenav('downloadOpts').isOpen()) {
            $mdSidenav('downloadOpts').close()
        }
    }
    

    
} ] )    
    
    
.controller('MyModels',
['$scope', '$state', 'WS', 'MS', 'uiTools', '$mdDialog', 'Dialogs', 'config',
 'ModelViewer', '$document', '$mdSidenav', '$q', '$timeout', 'ViewOptions', 'Auth',
function($scope, $state, WS, MS, uiTools, $mdDialog, Dialogs, config,
MV, $document, $mdSidenav, $q, $timeout, ViewOptions, Auth) {
	
    var $self = $scope;

    $scope.myPlants = [];
    $scope.myMicrobes = [];
    $scope.myModels = [];

    $scope.MS = MS;
    $scope.MV = MV;
    $scope.uiTools = uiTools;
    
    MV.makePublic( false );
    
    $scope.relativeTime = uiTools.relativeTime;

    $scope.relTime = function(datetime) {
        return $scope.relativeTime(Date.parse(datetime));
    }
    
    $scope.isPlant = function( modelPath ) {
    	var domain = modelPath?modelPath.split('/')[ 2 ]:"";
    	var speciesDomain = ( domain == 'plantseed' ) ? 'Plant' : 'Microbe';
    	return speciesDomain;
    }

    // microbes / plants view
    $scope.view = ViewOptions.get('organismType');

    $scope.changeView = function(view) {
        $scope.view = ViewOptions.set('organismType', view);
    }

    $scope.showMenu = function() { $scope.menuVisible = true; }
    
    
    $scope.opts = {
            query: '', limit: 25, offset: 0,
            
            // MODELSEED-67:
            sort: {field: 'mod_date'},
            // sort: {field: 'genome_name'},

            visible: ['genome_name', 'species', 'species_domain', 'rxns', 'genes', 'fbas', 'gfs', 'mod_date']
        };

        $scope.columns = [
            {prop: 'genome_name', label: 'ModelID'},
            {prop: 'species', label: 'Species'},
            {prop: 'species_domain', label: 'SpeciesDomain'},
            {prop: 'rxns', label: 'Reactions'},
            {prop: 'genes', label: 'Genes'},
            {prop: 'fbas', label: 'FBA'},
            {prop: 'gfs', label: 'Gapfilling'},
            {prop: 'mod_date', label: 'ModificationDate'}
            
        ]

        
        
        $scope.myModelsSpec = [
            {prop: 'genome_name', label: 'ModelID'},
            {prop: 'species', label: 'Species'},
            {prop: 'species_domain', label: 'SpeciesDomain'},
            {prop: 'rxns', label: 'Reactions'},
            {prop: 'genes', label: 'Genes'},
            {prop: 'fbas', label: 'FBA'},
            {prop: 'gfs', label: 'Gapfilling'},
            {prop: 'mod_date', label: 'ModificationDate'}

        ]
        
        
        
    // the selected item for operations such as download, delete.
    $scope.selected = null;

    // load models
    // if (MS.myModels) {
        // $scope.myMicrobes = MS.myModels;
    // } else {
        $scope.loadingMicrobes = true;
        $scope.loadingPlants = true;

        MS.listModels('/'+Auth.user+'/modelseed').
            then(function(resMicrobes) {
            $scope.myMicrobes = resMicrobes;
            $scope.loadingMicrobes = false;
        }).then(function(){
        	MS.listModels('/'+Auth.user+'/plantseed').
            then(function(resPlants) {
                $scope.myPlants = resPlants;
                $scope.loadingPlants = false;
                
                $scope.myModels = $scope.myPlants.concat( $scope.myMicrobes );    	                
            } )
        }).catch(function(e) {
            $scope.myMicrobes = [];
            $scope.loadingMicrobes = false;
            $scope.myPlants = [];
            $scope.loadingPlants = false;
            $scope.myModels = [];
        })
    // }
        

    // private plant models
    // if (MS.myPlants) {
        // $scope.myPlants = MS.myPlants;
    // } else {
        /*
        $scope.loadingPlants = true;
        MS.listModels('/'+Auth.user+'/plantseed').
            then(function(res) {
                console.log('path res', res)
                $scope.myPlants = res;                
                $scope.myModels = $scope.myPlants.concat( $scope.myMicrobes )
                $scope.loadingPlants = false;
        }).catch(function(e) {
                $scope.myPlants = [];
                $scope.loadingPlants = false;
        })
        */
    // }

        $scope.getLabel = function(prop) {
            for (var i=0; i<$scope.columns.length; i++) {
                var col = $scope.columns[i];
                if (col.prop === prop) return col.label;
            }
            return '';
        }

        $scope.exists = function(item, visible) {
            return visible.indexOf(item) > -1;
          }

          $scope.toggle = function(item, visible) {
              var idx = visible.indexOf(item);
              if (idx > -1) visible.splice(idx, 1);
              else visible.push(item);
          };

          $scope.$watch('opts', function(value){
              update()
          }, true)

          $scope.toggleMyGenomes = function() {
              // timeout for prom
              $timeout(function() {
                  ViewOptions.set('viewMyGenomes', $scope.filters.myGenomes);
                  update()
              });
          }

          // update visible genomes
          function update() {
              $scope.loading = true;
              
/*              Patric.listGenomes( $scope.opts )
                    .then(function(genomes) {
                        $scope.genomes = genomes;
                        $timeout(function() {
                            $scope.loading = false;
                        })
                    })*/
              $scope.loading = false;
          }

          $scope.selectPublic = function(item) {
              $scope.selectedPublic = item;
          }

          
          
    $scope.showRelatedData = function(item) {
        item.loading = true;
        var gapfillProm = showGapfills(item);
        var expressionProm = showExpression(item);

        var fbaProm;
        if (item.relatedFBAs) 
            delete item.relatedFBAs;
        else 
            fbaProm = updateFBAs(item)

        $q.all([fbaProm, gapfillProm, expressionProm])
            .then(function() {
                console.log('done')
                item.loading = false
            })
    }

    function updateFBAs(item) {
        return MS.getModelFBAs(item.path)
            .then(function(fbas) {
                item.relatedFBAs = fbas;
            })
    }

    function showGapfills(item) {
        if (item.relatedGapfills) {
            delete item.relatedGapfills;
        } else {
            return updateGapfills(item);
        }
    }    

    function updateGapfills(item) {
        return MS.getModelGapfills(item.path)
            .then(function(gfs) {
                item.relatedGapfills = gfs;
            })
    }

    function showExpression(item) {
        return updateExpression(item);      
    }

    function updateExpression(item) {
        return WS.getObjectMeta(item.path)
            .then(function(res) {
                var expList = [],
                    dict = res[0][7].expression_data;
                
                for (key in dict) 
                    expList.push({name: key, ids: dict[key]});
                
                item.expression = expList;
            })        
    }


    $scope.runFBA = function(ev, item) {
        Dialogs.runFBA(ev, item, function() {
            updateFBAs(item).then(function() {
                item.fbaCount++;
            })
        })
    }

    
    $scope.runPlantFBA = function(ev, item) {
        Dialogs.runPlantFBA(ev, item, function() {
            updateFBAs(item).then(function() {
                item.fbaCount++;
            })
        })
    }

    $scope.gapfill = function(ev, item) {
        Dialogs.gapfill(ev, item, function() {
            updateGapfills(item).then(function() {
                item.gapfillCount++;
            })
        })
    }

    $scope.addFBA = function(e, fba, model) {
        e.preventDefault();
        e.stopPropagation();

        var data = {model: model.path,
                    fba: fba.path,
                    org: model.orgName,
                    media: fba.media};


        if (fba.checked) {
            MV.rm(data, true);
            fba.checked = false;
        } else {
            MV.add(data);
            fba.checked = true;
        }
    }

    // fixme: use MV service and refs, organize plants/microbes
    $scope.$on('MV.event.change', function(e, item) {
        // if added to MV
        if (!item) return;

        if (item === 'clear') {
            clearSelected($scope.myMicrobes)
            clearSelected($scope.myPlants)
        } else {
            updateSelected($scope.myMicrobes, item);
            updateSelected($scope.myPlants, item);
        }
    })

    function clearSelected(data) {
        for (var i in data) {
            var model = data[i];

            for (var j in model.relatedFBAs) {
                var fba = model.relatedFBAs[j];
                fba.checked = false;
            }
        }
    }

    function updateSelected(data, item) {
        for (var i in data) {
            var model = data[i];
            if (!model.relatedFBAs) continue;

            for (var j in model.relatedFBAs) {
                var fba = model.relatedFBAs[j];

                if (item.model === model.path && item.fba === fba.path)
                    fba.checked = false;
            }
        }
    }

    // general operations
    $scope.deleteFBA = function(e, i, model) {
        e.stopPropagation();
        WS.deleteObj(model.relatedFBAs[i].ref)
          .then(function(res) {
              model.relatedFBAs.splice(i, 1);
              model.fbaCount -= 1;
          })
    }

    $scope.integrateGapfill = function(isIntegrated, model, gapfill) {
        // if not integrated, integrate
        // if integrated, unintegrate
        gapfill.loading = true;
        MS.manageGapfills(model.path, gapfill.id, isIntegrated ? 'U' : 'I')
          .then(function(res) {
              delete gapfill.loading;
              for (var i=0; i < model.relatedGapfills.length; i++) {
                  var gf = model.relatedGapfills[i];
                  if (gf.id == gapfill.id) {
                      model.relatedGapfills[i] = res
                      break;
                  }
              }
          })
    }

    $scope.deleteGapfill = function(i, model, gapfill) {
        gapfill.loading = true;
        MS.manageGapfills(model.path, gapfill.id, 'D')
          .then(function(res) {
              model.relatedGapfills.splice(i, 1)
              model.gapfillCount -= 1;
          })
    }

    $scope.toggleOperations = function(e, type, item) {
        var tar = e.target;
        e.stopPropagation();

        // set selected item
        $scope.selected = item;

        $scope.loadingDownloads = true;
        MS.getDownloads(item.path)
          .then(function(dls) {
              console.log('dls', dls)
              $scope.selected.downloads = dls;
              $scope.loadingDownloads = false;
          })

        if (type === 'download') {
            if (!$mdSidenav('downloadOpts').isOpen())
                $mdSidenav('downloadOpts').open();

            $document.bind('click', function(e) {
                $mdSidenav('downloadOpts').close()
                $document.unbind(e)
                $scope.selected = null;
            })
        } else if ($mdSidenav('downloadOpts').isOpen()) {
            $mdSidenav('downloadOpts').close()
        }
    }

    $scope.rmModel = function(ev, i, item, type) {
        ev.stopPropagation();

        var confirm = $mdDialog.confirm()
            .title('WARNING')
            .content('Are you sure you want to delete '+item.name+' and all associated data?')
            .ariaLabel('Are you sure you want to delete '+item.name+' and all associated data?')
            .ok('Delete it all!')
            .cancel('No')
            .clickOutsideToClose(true)
            .targetEvent(ev);

        $mdDialog.show(confirm).then(function() {
            WS.deleteFolder(item.path)
              .then(function(one, two) {
                if (type.toLowerCase() === 'plant')
                    MS.myPlants.splice(i, 1)
                else if (type.toLowerCase() === 'microbe')
                    MS.myModels.splice(i, 1)
                Dialogs.showComplete('Deleted', item.name)
                
                $state.reload();                                    
            })
        }, function() {
            console.log('not deleting')
        });
    }


    $scope.uploadExpression = function(ev, item) {
        Dialogs.uploadExpression(ev, item, function() {
            updateExpression(item);
        })
    }

}])


// Begin add-subsystem control
.controller('Subsystem',['$scope', 'WS', '$stateParams',
function($s, WS, $stateParams) {
    $s.subsysOpts = {query: '', limit: 20, offset: 0};
    $s.subsysHeader = []; // dynamically filled later
    $s.subsysDataClone = [];

    // workspace path and name of object
    var wsPath = $stateParams.path;
    if( wsPath == '' ) {
        console.log('Please specify the correct user name and path to the subsystem.');
        return false;
    }

    var captions = [];

    $s.loading = true;
    if (WS.cached.subsystems) {
        $s.subsysData = WS.cached.subsystems;
        $s.subsysHeader = WS.cached.subsysHeader;
        $s.subsysDataClone = Object.assign({}, $s.subsysData);
        $s.loading = false;
    } else {
        WS.get(wsPath)
        .then(function(res) {
            $s.subsysName = res.data.name;
            $s.subsysData = parseSubsysData(res.data.data);
            $s.subsysDataClone = Object.assign({}, $s.subsysData);
            WS.cached.subsystems = $s.subsysData;
            $s.subsysData = buildHtmlContent($s.subsysData);

            captions = res.data.data[0];
            $s.subsysHeader[0] = {label: captions[0], key: captions[0]};
            for (var k=1; k<captions.length; k++) {
                $s.subsysHeader[k] = {label: captions[k], key: captions[k], formatter: function(row) {
                    return '<span>'+row+'</span>';
            }}}
            WS.cached.subsysHeader = $s.subsysHeader;
            $s.loading = false;
        })
        .catch(function(error) {
            console.log('Caught an error: "' + (error.error.message).replace(/_ERROR_/gi, '') + '"');
            $s.loading = false;
        });
    }

    // Parse the given data for the subsystem data structure
    function parseSubsysData(obj_data) {
        var caps = obj_data[0];

        // convert the subsystem data into an array of objects from an array of arrays
        var data = [];
        for (var i=1; i<obj_data.length; i++) {
            data[i-1] = {};
            for (var j=0; j<caps.length; j++) {
                data[i-1][caps[j]] = obj_data[i][j];
            }
        }
        return data;
    }

    // With the given data from the NEW subsystem data structure, build the html content for table cells
    function buildHtmlContent(input_data) {
        /*
        input_data: has a structure of an array of objects, i.e.,
            [{"col_caption1": col_val1}, {"col_caption2": col_val2}, ...]
        return: the input_data with its original object subdata replaces with the html masked data.
        */
        var curation_roles = [], prediction_roles = []; candidate_roles = [];
        for (var i=1; i<input_data.length; i++) {
            curation_roles[i] = {};
            prediction_roles[i] = {};
            candidate_roles[i] = {};
            var indata = input_data[i];
            var key_arr =Object.keys(indata);
            for (var k = 1; k<key_arr.length; k++) {
                key = key_arr[k];
                curation_roles[i][key] = [];
                prediction_roles[i][key] = [];
                candidate_roles[i][key] = [];
                var val = indata[key];
                if (typeof val === 'object' && key != 'Genome') {
                    Object.keys(val).forEach(function(sub_key) {
                        switch(sub_key) {
                            case 'curation':
                              // curation roles
                              Object.keys(val[sub_key]).forEach(function(ssubK) {
                                var cur_arr = Object.keys(val[sub_key][ssubK]);
                                curation_roles[i][key] = curation_roles[i][key].concat(cur_arr);
                              });
                              break;
                            case 'prediction':
                              // prediction roles
                              Object.keys(val[sub_key]).forEach(function(ssubK) {
                                var pred_arr = Object.keys(val[sub_key][ssubK]);
                                prediction_roles[i][key] = prediction_roles[i][key].concat(pred_arr);
                              });
                              break;
                            case 'candidates':
                              // candidate roles
                              Object.keys(val[sub_key]).forEach(function(ssubK) {
                                var can_arr = Object.keys(val[sub_key][ssubK]);
                                candidate_roles[i][key] = candidate_roles[i][key].concat(can_arr);
                              });
                              break;
                            default:
                              // do nothing
                              break;
                        }
                    });
                    indata[key] = buildCellHtml(curation_roles[i][key], candidate_roles[i][key], prediction_roles[i][key], i, k);
                }
            }
            input_data[i] = indata;
        }
        return input_data;
    }

    function buildCellHtml(cur_arr, can_arr, pre_arr, row_id, col_id) {
        /*
        cur_arr: an array of curation gene_ids (string)
        can_arr: an array of candidate gene_ids (string)
        pre_arr: an array of prediction gene_ids (string)
        row_id: the cell's row id (int)
        col_id: the cell's columm id (int)
        return: the html string that mask the data for a table cell at (row_id, col_id).
        */
        cur_arr = cur_arr.sort();
        can_arr = can_arr.sort();
        pre_arr = pre_arr.sort();
        var cur_str = '', pre_str = '', can_str = '',
        gene_id_str = '<section layout="row" layout-sm="column" layout-align="center center">';

        var row_col = 'row'+row_id.toString(10)+'_col'+col_id.toString(10);
        cur_str = '<div style="color: green;">Curations:<br><select id="cur_'+row_col+'" style="width:130px;" multiple=yes>';
        for (var j = 0; j < cur_arr.length; j++) {
            cur_str += '<option value ="' + cur_arr[j] + '">';
            cur_str += cur_arr[j] + '</option>';
        }
        cur_str += '</select></div>';
        gene_id_str += cur_str;

        var btn10_str ='<div><br><md-button class="md-raised" aria-label="Add to curations" ng-click="addSelected($event, \'can_'+row_col+'\', \'cur_'+row_col+'\', \'\')">';
        btn10_str += '<md-tooltip>Add to curations</md-tooltip><=</md-button><br>';
        var btn11_str ='<md-button class="md-raised" aria-label="Remove from Curations" ng-click="removeSelected($event, \'cur_'+row_col+'\', \'can_'+row_col+'\', \'\')">';
        btn11_str += '<md-tooltip>Remove from Curations</md-tooltip>=></md-button></div>';
        gene_id_str += btn10_str + btn11_str;

        can_str = '<div>Candidates:<br><select id="can_'+row_col+'" style="width:130px;" multiple=yes>';
        for (var j = 0; j < can_arr.length; j++) {
            can_str += '<option value="';
            can_str += can_arr[j] + '"';
            if (!pre_arr.includes(can_arr[j])) can_str += ' style="color: red;"';
            can_str += '>' + can_arr[j] + '</option>';
        }
        can_str += '</select></div>';
        gene_id_str += can_str;

        var btn20_str ='<div><br><md-button class="md-raised" aria-label="Add to predictions" ng-click="addSelected($event, \'can_'+row_col+'\', \'pre_'+row_col+'\', \'\')">';
        btn20_str += '<md-tooltip>Add to predictions</md-tooltip>=></md-button><br>';
        var btn21_str ='<md-button class="md-raised" aria-label="Remove from Predictions" ng-click="removeSelected($event, \'pre_'+row_col+'\', \'can_'+row_col+'\', \'\')">';
        btn21_str += '<md-tooltip>Remove from Predictions</md-tooltip><=</md-button></div>';
        gene_id_str += btn20_str + btn21_str;

        pre_str = '<div>Predictions:<br><select id="pre_'+row_col+'" style="width:130px;" multiple=yes>';
        for (var j = 0; j < pre_arr.length; j++) {
            pre_str += '<option value ="' + pre_arr[j] + '">';
            pre_str += pre_arr[j] + '</option>';
        }
        pre_str += '</select></div></section>';
        gene_id_str += pre_str;
        return gene_id_str + buildSaveCancelHtml();
    }

    function buildSaveCancelHtml() {
        var save_cancel_str = '<section layout="row" layout-sm="column" layout-align="center center">';
        save_cancel_str += '<div>' +
            '<!--md-button ng-if="operations.length" class="icon-button" ng-click="undo()">' +
            '    <i class="material-icons">undo</i>' +
            '    <md-tooltip>Undo last change</md-tooltip>' +
            '</md-button-->' +
            '<!--md-button ng-if="onSaveAs" class="md-secondary" ng-click="save($event)" ng-disabled="saveInProgress">' +
            '    {{saveInProgress ? saveInProgressText : \'Save as...\'}}' +
            '</md-button-->' +
            '<md-button class="md-raised" style="right: 7px;" ng-click="save($event)" ng-disabled="saveInProgress">' +
            '    {{saveAsInProgress ? saveInProgressText : \'Save\'}}' +
            '    <md-tooltip>Save change(s)</md-tooltip>' +
            '</md-button>' +
            '<md-button  class="md-raised" ng-click="undo()">' +
            '    <md-tooltip>Discard change(s)</md-tooltip>Cancel' +
            '</md-button>' +
            '<!--a ng-click="cancel($event)" class="no-link">Cancel</a-->';
        save_cancel_str += '</div></section>';
        return save_cancel_str;
    }

}])
// End add-subsystem control

// Begin Spreadsheet control
.controller('Spreadsheet',['$scope', 'WS', '$stateParams',
function($s, WS, $stateParams) {
    $s.genericOpts = {query: '', limit: 20, offset: 0};
    $s.genericHeader = []; // dynamically filled later

    // workspace path and name of object
    var wsPath = $stateParams.path;
    if( wsPath == '' ) {
        console.log('Please specify the correct path to the data.');
        return false;
    }

    var captions = [];

    $s.loading = true;
    if (WS.cached.genericData) {
        $s.genericData = WS.cached.genericData;
        $s.genericHeader = WS.cached.genericHeader;
        $s.loading = false;
    } else {
        WS.get(wsPath)
        .then(function(res) {
            $s.genericName = res.data.name;
            $s.genericData = parseGenericData($s.genericName, res.data.data);
            captions = res.data.data[0];
            WS.cached.gnericData = $s.genericData;
            for (var k=0; k<captions.length; k++) {
                $s.genericHeader[k] = {label: captions[k], key: captions[k]};
            }
            WS.cached.genericHeader = $s.genericHeader;
            $s.loading = false;
        })
        .catch(function(error) {
            console.log('Caught an error: "' + (error.error.message).replace(/_ERROR_/gi, '') + '"');
            $s.loading = false;
        });
    }

    // Parse the given data for the subsystem data structure
    function parseGenericData(obj_name, obj_data) {
        var caps = obj_data[0];

        // convert the subsystem data into an array of objects from an array of arrays
        data = [];
        for (var i=1; i<obj_data.length; i++) {
            data[i-1] = {};
            for (var j=0; j<caps.length; j++) {
                data[i-1][caps[j]] = obj_data[i][j];
            }
        }
        return data;
    }
}])

// End Spreadsheet control



//var merged = objs1.concat(objs2);
function mergeObjects(objs1, objs2, key) {
    var ref = objs1.slice(0);

    var result = []
    for (var i=0; i<objs1.length; i++) {
        if (isFound(objs1[i][key], objs2, key)) {
            ref.splice(i, 1);
            continue;
        }
    }

    function isFound(value, objs, key) {
        for (var i=0; i<objs.length; i++) {

            if (objs[i][key] == value) return true;
        }
        return false;
    }

    return ref.concat(objs2);
}
