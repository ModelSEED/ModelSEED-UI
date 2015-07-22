
angular.module('DataViewCtrls', [])



.controller('GenomeDataView',
['$scope', '$stateParams', 'WS',
function($scope, $sParams, WS) {

    // path and name of object
    var path = $sParams.path;
    $scope.name = path.split('/').pop()

    $scope.opts = {query: '', limit: 20, offset: 0, sort: null};

    $scope.header = [{label: 'Feature', key: 'id',
                        link: {
                            state: 'app.featurePage',
                            getOpts: function(row) {
                                return {feature: row.id, genome: path};
                            }}
                     },
                     {label: 'Function', key: 'function',
                         formatter: function(item) {
                            if (item.length)
                                return item;
                            else
                                return '-';
                         }},
                     {label: 'Subsystems', key: 'subsystems',
                         formatter: function(item) {
                            if (item.length)
                                return item.join('<br>');
                            else
                                return '-';
                         }},
                     ];


    var obj = path.slice(0, path.lastIndexOf('/'))+'/.'+$scope.name+'/minimal_genome'

    $scope.loading = true;
    WS.get(obj)
      .then(function(res) {
          var objs = res.data.features,
              data = [];

          for (var i=0; i<objs.length; i++) {
              data.push({id: objs[i].id,
                         function: objs[i].function})
          }

          $scope.features = objs;
          $scope.loading = false;
      })

}])

.controller('FeatureDataView',
['$scope', '$stateParams', 'MS',
function($scope, $sParams, MS) {

    // path and name of object
    var featureID = $sParams.feature,
        genome = $sParams.genome;

    $scope.featureID = featureID;

    $scope.loading = true;
    MS.getFeature(genome, featureID)
      .then(function(res) {

          $scope.features = objs;
          $scope.loading = false;
      })
}])


.controller('ModelDataView',
['$scope', '$state', '$stateParams', 'Auth', 'MS', 'WS', 'Biochem',
 'ModelParser', '$compile', '$timeout', 'uiTools', 'Tabs', '$mdSidenav', '$document',
function($scope, $state, $sParams, Auth, MS, WS, Biochem,
         ModelParser, $compile, $timeout, uiTools, Tabs, $mdSidenav, $document) {

    // redirect stuff for patric auth
    if ($sParams.login === 'patric' && !Auth.isAuthenticated()) {
        $state.transitionTo('home', {redirect: $sParams.path, login: 'patric'});
    }

    // path and name of object
    var path = $sParams.path;
    $scope.name = path.split('/').pop()

    // selected compound, reaction, etc.
    $scope.selected;

    // url used for features
    var featureUrl = "https://www.patricbrc.org/portal/portal/patric/Feature?cType=feature&cId=";

    $scope.Tabs = Tabs;
    Tabs.totalTabCount = 6;

    $scope.relativeTime = uiTools.relativeTime;

    $scope.relTime = function(datetime) {
        return $scope.relativeTime(Date.parse(datetime));
    }

    // table options
    $scope.rxnOpts = {query: '', limit: 10, offset: 0, sort: {field: 'id'}};
    $scope.cpdOpts = {query: '', limit: 10, offset: 0, sort: null};
    $scope.geneOpts = {query: '', limit: 10, offset: 0, sort: null};
    $scope.compartmentOpts = {query: '', limit: 10, offset: 0, sort: null};
    $scope.biomassOpts = {query: '', limit: 10, offset: 0, sort: null};

    // reaction table spec
    $scope.rxnHeader = [{label: 'ID', key: 'id', newTab: 'rxn',
                            call: function(e, item) {
                                $scope.toggleView(e, 'rxn', item );
                            }},
                         {label: 'Name', key: 'name'},
                         {label: 'EQ', key: 'eq'},
                         {label: 'Genes', key: 'genes',
                             formatter: function(item) {
                                 if (!item.length) return '-';

                                 var links = [];
                                 for (var i=0; i<item.length; i++) {
                                     links.push('<a href="'+
                                                    featureUrl+item[i]+'" target="_blank">'
                                                 +item[i]+'</a>')
                                 }

                                 return links.join('<br>');
                             }
                        }];

    $scope.cpdHeader = [{label: 'ID', key: 'id', newTab: 'cpd',
                            call: function(e, item) {
                                $scope.toggleView(e, 'cpd', item );
                            }},
                         {label: 'Name', key: 'name'},
                         {label: 'Formula', key: 'formula'},
                         {label: 'Charge', key: 'charge'},
                         {label: 'Compartment', key: 'compartment'}];


     $scope.geneHeader = [{label: 'Gene', key: 'id'},
                          {label: 'Reactions', key: 'reactions', newTabList: true,
                              call: function(e, item) {
                                  $scope.toggleView(e, 'rxn', item );
                              }
                          }];

     $scope.compartmentHeader = [{label: 'Compartment', key: 'id'},
                                 {label: 'Name', key: 'id'},
                                 {label: 'pH', key: 'pH'},
                                 {label: 'Potential', key: 'potential'}]

     $scope.biomassHeader = [{label: 'Biomass', key: 'id'},
                             {label: 'Compound', key: 'cpdID'},
                             {label: 'Name', key: 'name'},
                             {label: 'Coefficient', key: 'coefficient'},
                             {label: 'Compartment', key: 'compartment'}]


     // fetch object data and parse it.
     $scope.loading = true;
     WS.get(path).then(function(res) {
         var data = ModelParser.parse(res.data);

         $scope.rxns = data.reactions;
         $scope.cpds = data.compounds;
         $scope.genes = data.genes;
         $scope.compartments = data.compartments;
         $scope.biomass = data.biomass;
         $scope.loading = false;
     }).catch(function(e) {
         console.log('the error', e)
         $scope.error = e;
         $scope.loading = false;
     })

     MS.getModelGapfills(path).then(function(res) {
         $scope.item = {relatedGapfills: res,
                        path: path};
     })

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
           })
     }

     $scope.toggleView = function(e, type, item) {
        e.stopPropagation();

        if (type === 'rxn') {
            var id = item.split('_')[0];
            $scope.selected = {id: id,
                               modelRxn: ModelParser.rxnhash[item]};

            Biochem.getRxn(id)
                   .then(function(rxn) {
                        $scope.selected.rxn = rxn;
                    })

            if (!$mdSidenav('rxnView').isOpen())
                $mdSidenav('rxnView').open();

            $document.bind('click', function(e) {
                $mdSidenav('rxnView').close()
                $document.unbind(e)
                $scope.selected = null;
            })
         } else if ($mdSidenav('rxnView').isOpen()) {
             $mdSidenav('rxnView').close()
         }


         if (type === 'cpd') {
             var id = item.split('_')[0];
             $scope.selected = {id: id,
                                modelCpd: ModelParser.cpdhash[item]};

             Biochem.getCpd(id)
                    .then(function(cpd) {
                        console.log('bio cpd', cpd)
                         $scope.selected.cpd = cpd;
                     })

             if (!$mdSidenav('cpdView').isOpen())
                 $mdSidenav('cpdView').open();

             $document.bind('click', function(e) {
                 $mdSidenav('cpdView').close()
                 $document.unbind(e)
                 $scope.selected = null;
             })
         } else if ($mdSidenav('cpdView').isOpen()) {
              $mdSidenav('cpdView').close()
          }
    }

}])

.controller('FBADataView',
['$scope', '$state', '$stateParams', 'Auth', 'MS', 'Biochem',
 'FBAParser', '$compile', '$timeout', 'uiTools', 'Tabs', '$mdSidenav', '$document',
function($scope, $state, $sParams, Auth, MS, Biochem,
         FBAParser, $compile, $timeout, uiTools, Tabs, $mdSidenav, $document) {

    //var featureUrl = "https://www.patricbrc.org/portal/portal/patric/Feature?cType=feature&cId=";

    $scope.Tabs = Tabs;
    //Tabs.totalTabCount = 6;

    $scope.relativeTime = uiTools.relativeTime;

    $scope.relTime = function(datetime) {
        return $scope.relativeTime(Date.parse(datetime));
    }

    // path and name of object
    var path = $sParams.path;
    $scope.name = path.split('/').pop()


    // selected compound, reaction, etc.
    $scope.selected;

    // table options
    $scope.rxnOpts = {query: '', limit: 10, offset: 0, sort: {field: 'id'}};
    $scope.cpdOpts = {query: '', limit: 10, offset: 0, sort: null};
    $scope.geneOpts = {query: '', limit: 10, offset: 0, sort: null};
    $scope.compartmentOpts = {query: '', limit: 10, offset: 0, sort: null};
    $scope.biomassOpts = {query: '', limit: 10, offset: 0, sort: null};


    $scope.rxnHeader = [{label: 'ID', key: 'id', newTab: 'rxn',
                            call: function(e, item) {
                                $scope.toggleView(e, 'rxn', item );
                            }},
                         {label: 'Name', key: 'name'},
                         {label: 'EQ', key: 'eq'},
                         {label: 'Genes', key: 'genes',
                             formatter: function(item) {
                                 if (!item.length) return '-';

                                 var links = [];
                                 for (var i=0; i<item.length; i++) {
                                     links.push('<a href="'+
                                                    featureUrl+item[i]+'" target="_blank">'
                                                 +item[i]+'</a>')
                                 }

                                 return links.join('<br>');
                             }
                        }];

    $scope.cpdHeader = [{label: 'ID', key: 'id', newTab: 'cpd',
                            call: function(e, item) {
                                $scope.toggleView(e, 'cpd', item );
                            }},
                         {label: 'Name', key: 'name'},
                         {label: 'Formula', key: 'formula'},
                         {label: 'Charge', key: 'charge'},
                         {label: 'Compartment', key: 'compartment'}];


     $scope.geneHeader = [{label: 'Gene', key: 'id'},
                          {label: 'Reactions', key: 'reactions', newTabList: true,
                              call: function(e, item) {
                                  $scope.toggleView(e, 'rxn', item );
                              }
                          }];

     $scope.compartmentHeader = [{label: 'Compartment', key: 'id'},
                                 {label: 'Name', key: 'id'},
                                 {label: 'pH', key: 'pH'},
                                 {label: 'Potential', key: 'potential'}]

     $scope.biomassHeader = [{label: 'Biomass', key: 'id'},
                             {label: 'Compound', key: 'cpdID'},
                             {label: 'Name', key: 'name'},
                             {label: 'Coefficient', key: 'coefficient'},
                             {label: 'Compartment', key: 'compartment'}]


     // fetch object data and parse it.
     $scope.loading = true;
     MS.get(path).then(function(res) {
         console.log('fba res', res)

         var data = FBAParser.parse(res.data);
         /*$scope.rxns = data.reactions;
         $scope.cpds = data.compounds;
         $scope.genes = data.genes;
         $scope.compartments = data.compartments;
         $scope.biomass = data.biomass;
         $scope.loading = false;*/
     })
}])

.service('Tabs', ['$timeout', 'MS', '$stateParams', 'uiTools', 'ModelParser',
function ($timeout, MS, $sParams, uiTools, ModelParser) {
    var self = this;

    /**
     * tabs = [
     *    { title: 'new tab'},
     *    { title: 'new tab 2'}];
     */
    var tabs = [];
    this.tabs = tabs;

    this.totalTabCount = 0;

    this.selectedIndex = 0;


    this.addTab = function (item) {
        // if is already open, go to it
        for (var i=0; i<tabs.length; i++) {
            if (tabs[i].title === item) {
                this.selectedIndex = i
                return;
            }
        }

        tabs.push({ title: item, removable: true });

        $timeout(function() {
            for (var i=0; i<tabs.length; i++) {
                if (tabs[i].title === item) {
                    self.selectedIndex = i + self.totalTabCount;
                }
            }
        })
    };

    this.removeTab = function (tab) {
        for (var j = 0; j < tabs.length; j++) {
            if (tab.title === tabs[j].title) {
                tabs.splice(j, 1);
                break;
            }
        }
    };

}])

.controller('RxnPage', ['$scope', '$timeout', function($scope, $timeout) {
    $scope.rxn;

    $timeout(function() {
        console.log('rxn', $scope.rxn )
    })

}])

.service('ModelParser', ['MS', function(MS) {
    var self = this;

    var compartNameMapping = {
		"c":"Cytosol",
		"p":"Periplasm",
		"g":"Golgi apparatus",
		"e":"Extracellular",
		"r":"Endoplasmic reticulum",
		"l":"Lysosome",
		"n":"Nucleus",
		"d":"Plastid",
		"m":"Mitochondria",
		"x":"Peroxisome",
		"v":"Vacuole",
		"w":"Cell wall",
	};

    this.cpdhash = {};
    this.biohash = {};
    this.rxnhash = {};
    this.cmphash = {};
    this.genehash = {};
    this.gfhash = {};

    this.parse = function (data) {
        // this.modelreactions = data.modelreactions;
        // this.modelcompounds = data.modelcompounds;
        // this.modelcompartments = data.modelcompartments;

        var reactions = [],
            compounds = [],
            modelGenes = [],
            compartments = [],
            biomasses = [],
            gapfilling = [];

        this.biomasses = data.biomasses;
        this.biomasscpds = [];
        this.gapfillings = data.gapfillings;

        // create gapfilling hash
        for (var i=0; i < this.gapfillings.length; i++) {

        	this.gapfillings[i].simpid = "gf."+(i+1);
        	this.gfhash[this.gapfillings[i].simpid] = this.gapfillings[i];
            //gappfillings.push({integrated: })
        }

        for (var i=0; i< data.modelcompartments.length; i++) {
            var cmp = data.modelcompartments[i];
            cmp.cmpkbid = cmp.compartment_ref.split("/").pop();
            cmp.name = compartNameMapping[cmp.cmpkbid];
            this.cmphash[cmp.id] = cmp;

            compartments.push({
                                id: cmp.id,
                                name: cmp.name,
                                pH: cmp.pH,
                                potential: cmp.potential
                             })
        }

        for (var i=0; i< data.modelcompounds.length; i++) {
            var cpd = data.modelcompounds[i];
            //cpd.cmpid = cpd.modelcompartment_ref.split("/").pop();
            cpd.cpdID = cpd.compound_ref.split("/").pop();

            var id = cpd.id, //idarray[0]+"["+idarray[1]+"]",
                compartment = cpd.modelcompartment_ref.split("/").pop(),
                name = cpd.name.replace(/_[a-zA-z]\d+$/, '');

            var obj = {id: id,
                       name: name,
                       formula: cpd.formula,
                       charge: cpd.charge,
                       compartment: compartment}

            cpd.name = name;
            cpd.compartName = compartNameMapping[compartment[0]]+' '+compartment[1];
            cpd.compartment = compartment;
            this.cpdhash[cpd.id] = cpd;
            compounds.push(obj);
        }

        for (var i=0; i < this.biomasses.length; i++) {
        	var biomass = this.biomasses[i];

        	this.biohash[biomass.id] = biomass;
        	biomass.dispid = biomass.id;
        	var reactants = "";
            var products = "";
        	for(var j=0; j < biomass.biomasscompounds.length; j++) {
        		var biocpd = biomass.biomasscompounds[j];
        		biocpd.id = biocpd.modelcompound_ref.split("/").pop();

        		//var idarray = biocpd.id.split('_');
        		biocpd.dispid = biocpd.id//idarray[0]+"["+idarray[1]+"]";

        		biocpd.name = this.cpdhash[biocpd.id].name;
        		biocpd.formula = this.cpdhash[biocpd.id].formula;
        		biocpd.charge = this.cpdhash[biocpd.id].charge;
        		biocpd.cmpkbid = this.cpdhash[biocpd.id].compartment;
        		biocpd.biomass = biomass.id;
        		this.biomasscpds.push(biocpd);
        		if (biocpd.coefficient < 0) {
                    if (reactants.length > 0) {
                        reactants += " + ";
                    }
                    if (biocpd.coefficient != -1) {
                        var abscoef = Math.round(-1*100*biocpd.coefficient)/100;
                        reactants += "("+abscoef+") ";
                    }
                    reactants += biocpd.name+"["+biocpd.cmpkbid+"]";
                } else {
                    if (products.length > 0) {
                        products += " + ";
                    }
                    if (biocpd.coefficient != 1) {
                        var abscoef = Math.round(100*biocpd.coefficient)/100;
                        products += "("+abscoef+") ";
                    }
                    products += biocpd.name+"["+biocpd.cmpkbid+"]";
                }

                var compartment = this.cpdhash[biocpd.id].compartment;

                biomasses.push({
                                id: biomass.id,
                                cpdID: biocpd.id,
                                name: biocpd.name,
                                coefficient: biocpd.coefficient,
                                compartment: compartment
                               })
        	}
        	biomass.equation = reactants + " => " + products;
        }

        for (var i=0; i < data.modelreactions.length; i++) {
            var rxn = data.modelreactions[i];
            rxn.gpr = "";

            var reactants = "",
                products = "";

            if (rxn.direction == ">")
                var sign = "=>";
            else if (rxn.direction == "<")
                var sign = "<=";
            else
                var sign = "<=>";

            // huh?
            if (rxn.modelReactionProteins > 0) {
            	rxn.gpr = "";
            }
            for (var j=0; j< rxn.modelReactionReagents.length; j++) {
                var rgt = rxn.modelReactionReagents[j];
                rgt.cpdID = rgt.modelcompound_ref.split("/").pop();

                if (rgt.coefficient < 0) {
                    if (reactants.length > 0) {
                        reactants += " + ";
                    }
                    if (rgt.coefficient != -1) {
                        var abscoef = Math.round(-1*100*rgt.coefficient)/100;

                        reactants += "("+abscoef+") ";
                    }
                    reactants += this.cpdhash[rgt.cpdID].name+"["+this.cpdhash[rgt.cpdID].compartment+"]";

                } else {
                    if (products.length > 0) {
                        products += " + ";
                    }
                    if (rgt.coefficient != 1) {
                        var abscoef = Math.round(100*rgt.coefficient)/100;
                        products += "("+abscoef+") ";
                    }
                    products += this.cpdhash[rgt.cpdID].name+"["+this.cpdhash[rgt.cpdID].compartment+"]";
                }
            }
            rxn.ftrhash = {};
            for (var j=0; j< rxn.modelReactionProteins.length; j++) {
                var prot = rxn.modelReactionProteins[j];

                if (j > 0) {
                   	rxn.gpr += " or ";
                }
                //rxn.gpr += "(";
                for (var k=0; k< prot.modelReactionProteinSubunits.length; k++) {
                    var subunit = prot.modelReactionProteinSubunits[k];
                    if (k > 0) {
                    	rxn.gpr += " and ";
                    }
                    rxn.gpr += "(";
                    if (subunit.feature_refs.length == 0) {
                    	rxn.gpr += "Unknown";
                    }
                    for (var m=0; m< subunit.feature_refs.length; m++) {
                    	var ftrid = subunit.feature_refs[m].split("/").pop();
                        rxn.ftrhash[ftrid] = 1;
                        if (m > 0) {
                    		rxn.gpr += " or ";
                    	}
                    	rxn.gpr += ftrid;
                    }
                    rxn.gpr += ")";
                }
                //rxn.gpr += ")";
            }

            //rxn.dispfeatures = "";

            // create reaction row for table
            var compartment = rxn.modelcompartment_ref.split("/").pop(),
                id = rxn.id
                name = rxn.name.replace(/_[a-zA-z]\d+$/, ''),
                eq = reactants+" "+sign+" "+products; //fixme: names have compartments in them

            // get genes and also add to hash for gene table
            rxn.genes = [];
            for (var gene in rxn.ftrhash) {
                rxn.genes.push(gene);

                var foundGenes = [];
                modelGenes.forEach(function(item) {
                    foundGenes.push(item.id)
                })

                if (foundGenes.indexOf(gene) == -1)
                    modelGenes.push( { id: gene, reactions: [id] } );
                else
                    modelGenes[foundGenes.indexOf(gene)].reactions.push(id)
            }

            // add computed data to hash for viewing rxn overview
            rxn.eq = eq;
            rxn.compartment = compartNameMapping[compartment[0]]+' '+compartment[1];
            this.rxnhash[rxn.id] = rxn;

            reactions.push({name: name,
                            id: id,
                            compartment: compartment,
                            eq: eq,
                            genes: rxn.genes
                          })
        }

        var modelTables =  {reactions: reactions,
                            compounds: compounds,
                            genes: modelGenes,
                            compartments: compartments,
                            biomass: biomasses};

        return modelTables;
    };

}])



.service('FBAParser', ['MS', 'ModelParser', function(MS, ModelParser) {
    var self = this;

    this.parse = function (data) {
        console.log('parsing', data)

        var modelRef = data.fbamodel_ref.replace(/\|\|/g, '');

        MS.get(modelRef).then(function(res) {
            console.log('modelobject', res)
        })

        ModelParser.parse()

        this.modelreactions = this.model.modelreactions;
        this.modelcompounds = this.model.modelcompounds;
        this.biomasses = this.model.biomasses;
        this.biomasscpds = this.model.biomasscpds;
        this.modelgenes = this.model.modelgenes;


        this.FBAConstraints = self.data.FBAConstraints;
        this.FBAMinimalMediaResults = self.data.FBAMinimalMediaResults;
        this.FBAMinimalReactionsResults = self.data.FBAMinimalReactionsResults;
        this.FBAMetaboliteProductionResults = self.data.FBAMetaboliteProductionResults;
        this.rxnhash = {};
        for (var i=0; i < self.data.FBAReactionVariables.length; i++) {
            var rxnid = self.data.FBAReactionVariables[i].modelreaction_ref.split("/").pop();
            self.data.FBAReactionVariables[i].ko = 0;
            this.rxnhash[rxnid] = self.data.FBAReactionVariables[i];
        }
        for (var i=0; i < self.data.reactionKO_refs.length; i++) {
            var rxnid = self.data.reactionKO_refs[i].split("/").pop();
            this.rxnhash[rxnid].ko = 1;
        }
        this.cpdhash = {};
        for (var i=0; i < self.data.FBACompoundVariables.length; i++) {
            var cpdid = self.data.FBACompoundVariables[i].modelcompound_ref.split("/").pop();
            self.data.FBACompoundVariables[i].additionalcpd = 0;
            this.cpdhash[cpdid] = self.data.FBACompoundVariables[i];
        }
        for (var i=0; i < self.data.additionalCpd_refs.length; i++) {
            var cpdid = self.data.additionalCpd_refs[i].split("/").pop();
            this.cpdhash[cpdid].additionalcpd = 1;
        }
        this.biohash = {};
        for (var i=0; i < self.data.FBABiomassVariables.length; i++) {
            var bioid = self.data.FBABiomassVariables[i].biomass_ref.split("/").pop();
            this.biohash[bioid] = self.data.FBABiomassVariables[i];
        }
        this.maxpod = 0;
        this.metprodhash = {};
        for (var i=0; i < this.FBAMetaboliteProductionResults.length; i++) {
            this.tabList[4].columns[5].visible = 1;
            var metprod = self.data.FBAMetaboliteProductionResults[i];
            var cpdid = metprod.modelcompound_ref.split("/").pop();
            this.metprodhash[cpdid] = metprod;
        }
        this.genehash = {};
        for (var i=0; i < this.modelgenes.length; i++) {
            this.genehash[this.modelgenes[i].id] = this.modelgenes[i];
            this.genehash[this.modelgenes[i].id].ko = 0;
        }
        /*
        for (var i=0; i < self.data.geneKO_refs.length; i++) {
            var geneid = self.data.geneKO_refs[i].split("/").pop();
            this.genehash[geneid].ko = 1;
        }*/
        this.delhash = {};
        for (var i=0; i < self.data.FBADeletionResults.length; i++) {
            var geneid = self.data.FBADeletionResults[i].feature_refs[0].split("/").pop();
            this.delhash[geneid] = self.data.FBADeletionResults[i];
        }
        this.cpdboundhash = {};
        for (var i=0; i < self.data.FBACompoundBounds.length; i++) {
            var cpdid = self.data.FBACompoundBounds[i].modelcompound_ref.split("/").pop();
            this.cpdboundhash[cpdid] = self.data.FBACompoundBounds[i];
        }
        this.rxnboundhash = {};
        for (var i=0; i < self.data.FBAReactionBounds.length; i++) {
            var rxnid = self.data.FBAReactionBounds[i].modelreaction_ref.split("/").pop();
            this.rxnboundhash[rxnid] = self.data.FBAReactionBounds[i];
        }
        for (var i=0; i< this.modelgenes.length; i++) {
            var mdlgene = this.modelgenes[i];
            if (this.genehash[mdlgene.id]) {
                mdlgene.ko = this.genehash[mdlgene.id].ko;
            }
            if (this.delhash[mdlgene.id]) {
                mdlgene.growthFraction = this.delhash[mdlgene.id].growthFraction;
            }
        }
        for (var i=0; i< this.modelreactions.length; i++) {
            var mdlrxn = this.modelreactions[i];
            if (this.rxnhash[mdlrxn.id]) {
                mdlrxn.upperFluxBound = this.rxnhash[mdlrxn.id].upperBound;
                mdlrxn.lowerFluxBound = this.rxnhash[mdlrxn.id].lowerBound;
                mdlrxn.fluxMin = this.rxnhash[mdlrxn.id].min;
                mdlrxn.fluxMax = this.rxnhash[mdlrxn.id].max;
                mdlrxn.flux = this.rxnhash[mdlrxn.id].value;
                mdlrxn.fluxClass = this.rxnhash[mdlrxn.id].class;
                mdlrxn.disp_low_flux = mdlrxn.fluxMin + "<br>(" + mdlrxn.lowerFluxBound + ")";
                mdlrxn.disp_high_flux = mdlrxn.fluxMax + "<br>(" + mdlrxn.upperFluxBound + ")";
            }
            if (this.rxnboundhash[mdlrxn.id]) {
                mdlrxn.customUpperBound = this.rxnboundhash[mdlrxn.id].upperBound;
                mdlrxn.customLowerBound = this.rxnboundhash[mdlrxn.id].lowerBound;
            }
        }
        this.compoundFluxes = [];
        this.cpdfluxhash = {};
        for (var i=0; i< this.modelcompounds.length; i++) {
            var mdlcpd = this.modelcompounds[i];
            if (this.cpdhash[mdlcpd.id]) {
                mdlcpd.exchangerxn = " => "+mdlcpd.name+"[e]";
                mdlcpd.upperFluxBound = this.cpdhash[mdlcpd.id].upperBound;
                mdlcpd.lowerFluxBound = this.cpdhash[mdlcpd.id].lowerBound;
                mdlcpd.fluxMin = this.cpdhash[mdlcpd.id].min;
                mdlcpd.fluxMax = this.cpdhash[mdlcpd.id].max;
                mdlcpd.uptake = this.cpdhash[mdlcpd.id].value;
                mdlcpd.fluxClass = this.cpdhash[mdlcpd.id].class;
                mdlcpd.disp_low_flux = mdlcpd.fluxMin + "<br>(" + mdlcpd.lowerFluxBound + ")";
                mdlcpd.disp_high_flux = mdlcpd.fluxMax + "<br>(" + mdlcpd.upperFluxBound + ")";
                this.cpdfluxhash[mdlcpd.id] = mdlcpd;
                this.compoundFluxes.push(mdlcpd);
            }
            if (this.metprodhash[mdlcpd.id]) {
                mdlcpd.maxProd = this.metprodhash[mdlcpd.id].maximumProduction;
                //if (!this.cpdfluxhash[mdlcpd.id]) {
                //  this.compoundFluxes.push(mdlcpd);
                //}
            }
            if (this.cpdboundhash[mdlcpd.id]) {
                mdlcpd.customUpperBound = this.cpdboundhash[mdlcpd.id].upperBound;
                mdlcpd.customLowerBound = this.cpdboundhash[mdlcpd.id].lowerBound;
                if (!this.cpdfluxhash[mdlcpd.id]) {
                    this.compoundFluxes.push(mdlcpd);
                }
            }
        }
        for (var i=0; i< this.biomasses.length; i++) {
            var bio = this.biomasses[i];
            if (this.biohash[bio.id]) {
                bio.upperFluxBound = this.biohash[bio.id].upperBound;
                bio.lowerFluxBound = this.biohash[bio.id].lowerBound;
                bio.fluxMin = this.biohash[bio.id].min;
                bio.fluxMax = this.biohash[bio.id].max;
                bio.flux = this.biohash[bio.id].value;
                bio.fluxClass = this.biohash[bio.id].class;
                this.modelreactions.push(bio);
            } else {
                this.biohash[bio.id] = bio;
                bio.upperFluxBound = 1000;
                bio.lowerFluxBound = 0;
                bio.fluxMin = 0;
                bio.fluxMax = 1000;
                bio.flux = 0;
                bio.fluxClass = "Blocked";
                this.modelreactions.push(bio);
            }
            bio.disp_low_flux = bio.fluxMin + "<br>(" + bio.lowerFluxBound + ")";
            bio.disp_high_flux = bio.fluxMax + "<br>(" + bio.upperFluxBound + ")";
        }
        for (var i=0; i < this.biomasscpds.length; i++) {
            var biocpd = this.biomasscpds[i];
            if (this.biohash[biocpd.biomass]) {
                biocpd.bioflux = this.biohash[biocpd.biomass].flux;
            }
            if (this.metprodhash[biocpd.id]) {
                biocpd.maxprod = this.metprodhash[biocpd.id].maximumProduction;
            }
        }
    }

}])
