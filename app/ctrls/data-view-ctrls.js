
angular.module('DataViewCtrls', [])
.controller('ModelDataView',
['$scope', '$state', '$stateParams', 'Auth', 'MS', 'Biochem',
 'ModelParser', '$compile', '$timeout', 'uiTools', 'Tabs', '$mdSidenav', '$document',
function($scope, $state, $sParams, Auth, MS, Biochem,
         ModelParser, $compile, $timeout, uiTools, Tabs, $mdSidenav, $document) {

    // redirect stuff for patric auth
    if ($sParams.login === 'patric' && !Auth.isAuthenticated()) {
        $state.transitionTo('home', {redirect: $sParams.path, login: 'patric'});
    }

    var featureUrl = "https://www.patricbrc.org/portal/portal/patric/Feature?cType=feature&cId=";

    $scope.Tabs = Tabs;
    Tabs.totalTabCount = 6;

    $scope.relativeTime = uiTools.relativeTime;

    $scope.relTime = function(datetime) {
        return $scope.relativeTime(Date.parse(datetime));
    }

    // path and name of object
    var path = $sParams.path;
    $scope.name = path.toName();


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
     MS.getObject(path).then(function(res) {
         var data = ModelParser.parse(res.data);

         $scope.rxns = data.reactions;
         $scope.cpds = data.compounds;
         $scope.genes = data.genes;
         $scope.compartments = data.compartments;
         $scope.biomass = data.biomass;
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

.service('ModelParser', ['$sce', 'MS', function($sce, MS) {
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
