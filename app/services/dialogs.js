/**
 * [module Dialogs]
 *
 * Set of dialogs and toast notifications.
 *
 */

angular.module('Dialogs', [])

.service('Dialogs',
['MS', 'WS', '$mdDialog', '$mdToast', 'uiTools', '$timeout', 'Upload', 'Auth', 'ModelViewer', 'config', '$http',
function(MS, WS, $dialog, $mdToast, uiTools, $timeout, Upload, Auth, MV, config, $http) {
    var self = this;

    this.showMeta = function(ev, path) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/show-meta.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($s, $http) {
                $self = $s;
                $s.editMeta = false;
                $s.edit = {userMeta: '', autoMeta: ''};
                $s.validJSON = true;

                $s.loading = true;

                WS.getObjectMeta(path)
                  .then(function(meta) {
                      $s.meta = meta[0];

                      if ( Object.keys($s.meta[7]).length === 0 ) $s.userMeta = null;
                      else $s.userMeta = JSON.stringify($s.meta[7], null, 4);

                      if ( Object.keys($s.meta[8]).length === 0 ) $s.autoMeta = null;
                      else $s.autoMeta = JSON.stringify($s.meta[8], null, 4);

                      $s.loading = false;
                  })

                $s.editUserMeta = function() {
                    $s.editMeta = !$s.editMeta;
                }

                $s.saveMeta = function(meta) {
                    $s.savingMeta = true;
                    WS.saveMeta($s.meta[2] + $s.meta[0], meta)
                      .then(function(newMeta) {
                          $s.userMeta = JSON.stringify(newMeta, null, 4);;
                          $s.editMeta = false, $s.savingMeta = false;
                      })
                }

                WS.getPermissions(path)
                  .then(function(blah) {

                  })

                $s.tidy = function(text) {
                    $s.edit.userMeta = JSON.stringify(JSON.parse(text), null, 4)
                }

                $s.validateJSON = function(text) {
                    try {
                        var meta = JSON.parse(text);
                        $s.validJSON = true;
                    } catch(err) { $s.validJSON = false }
                }

                $s.cancel = function(){
                    $dialog.hide();
                }
            }]
        })
    }

    this.showGene = function(ev, geneObj, cb) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/show-gene.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($s, $http) {
                $self = $s;
                $s.editingScore = false;
                $s.updatingScore = false;
                $s.validNumber = true;
                // for scratch area to hold the user edits
                $s.edit = {score: '', evidence_codes: ''};
                //$s.validJSON = true;
                $s.gene = geneObj; // the selected dropdown item
                $s.geneId = Object.keys(geneObj)[0];
                $s.score = geneObj[$s.geneId]['score'] || '';
                var evd_codes = geneObj[$s.geneId]['evidence_codes'] ? geneObj[$s.geneId]['evidence_codes'] : [];
                $s.evidence_codes = (evd_codes.length>0) ? evd_codes : [];

                $s.annotated_date = geneObj[$s.geneId]['annotated_date'] || '';
                $s.is_annotated = $s.annotated_date ? true : false;
                $s.mod_history = geneObj[$s.geneId]['mod_history'] || [];

                $s.addEvdCode = function(ec_id, cm_id) {
                    var ec = document.getElementById(ec_id),
                        cm = document.getElementById(cm_id);
                    var edit_gene = {};
                    var ansr1 = false, ansr2 = false;
                    $s.annotated_date = new Date().toISOString().slice(0, 10);
                    var new_ec_hist = {
                        "evidence_code": ec.value,
                        "user": Auth.user,
                        "comment": cm.value,
                        "annotated_date": $s.annotated_date
                    };
                    for (var i=0; i<$s.mod_history.length; i++) {
                        if ($s.mod_history[i]['evidence_code']===new_ec_hist['evidence_code']
                            && $s.mod_history[i]['comment']===new_ec_hist['comment']
                            && $s.mod_history[i]['annotated_date']===new_ec_hist['annotated_date']
                            && $s.mod_history[i]['user']===new_ec_hist['user']) {
                            ansr1 = true;
                            break;
                        }
                    }
                    if (!$s.evidence_codes.includes(ec.value)) {
                        ansr2 = true;
                        $s.evidence_codes.push(ec.value);
                    }
                    if (!ansr1 || ansr2) {
                        $s.mod_history.push(new_ec_hist);
                        edit_gene[$s.geneId] = {"evidence_codes": $s.evidence_codes,
                                            "score": $s.score,
                                            "annotated_date": $s.annotated_date,
                                            "mod_history": $s.mod_history};
                        cb(edit_gene);
                        $s.is_annotated = true;
                    }
                }

                $s.editScore = function() {
                    $s.editingScore = !$s.editingScore;
                    $s.edit.score = $s.score || '';
                }

                $s.updateScore = function(s) {
                    $s.updatingScore = true;
                    var edit_gene = {};
                    edit_gene[$s.geneId]= {"evidence_code": $s.evidence_code.split('\n'),
                                           "score": s};
                    cb(edit_gene);
                    $s.score = s;
                    $s.updatingScore = false, $s.editingScore = false;
                }

                $s.validateNumber = function(text) {
                    // If text is Not a Number or less than 0 or greater than 1.0
                    if (isNaN(text) || text < 0 || text > 1) {
                        $s.validNumber = false;
                    } else {
                      $s.validNumber = true;
                    }
                }

                $s.cancel = function(){
                    $dialog.hide();
                }

            }]
        })
    }

    this.showFuncFamTree = function(ev, func, cb) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/show-famTree.html',
            //templateUrl: 'app/components/proteinFam/htmls/tree-labels.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($s, $http) {
                $self = $s;
                $s.functionName = func;

                jQuery.noConflict();
                (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
                    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
                    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
                })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
                ga('create', 'UA-61194136-8', 'auto');
                ga('send', 'pageview');

                var opts = {
                    dynamicHide: true,
                    height: 800,
                    invertColors: false,
                    lineupNodes: true,
                    showDomains: true,
                    showDomainNames: false,
                    showDomainColors: true,
                    showGraphs: true,
                    showGraphLegend: true,
                    showLength: false,
                    showNodeNames: true,
                    showNodesType: "only leaf",
                    showPhylogram: false,
                    showTaxonomy: true,
                    showFullTaxonomy: false,
                    showSequences: false,
                    showTaxonomyColors: true,
                    backgroundColor: "#f5f5f5",
                    foregroundColor: "#000000",
                    nanColor: "#f5f5f5",
                };

                // function load() -- the tree part
                jQuery('#foregroundColor').val(opts.foregroundColor);
                jQuery('#backgroundColor').val(opts.backgroundColor);
                jQuery('#foregroundColorButton').colorpicker({color: opts.foregroundColor});
                jQuery('#backgroundColorButton').colorpicker({color: opts.backgroundColor});
                d3.select("#phyd3").text("Loading...");
                d3.xml("/app/components/proteinFam/xmls/labels.xml", "application/xml",
                function(xml) {
                    d3.select("#phyd3").text(null);
                    var tree = phyd3.phyloxml.parse(xml);
                    phyd3.phylogram.build("#phyd3", tree, opts);
                });

                $s.cancel = function(){
                    cb(func + ' tree displayed');
                    $dialog.hide();
                }
            }]
        })
    }

    this.selectMedia = function(ev, cb) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/selectMedia.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
              function($scope, $http) {
                $scope.select = function(){
                    // Simply use whatever media set to MV.selectedMedium
                    cb(MV.selectedMedium);
                    $dialog.hide();
                };
                $scope.setDefault = function(){
                    // Set MV.selectedMedium back to 'Complete'
                    MV.selectedMedium = 'Complete';
                    cb(MV.selectedMedium);
                    $dialog.hide();
                };
                $scope.cancel = function(){ // reverse setting of MV.selectedMedium
                    MV.selectedMedium = MV.pre_Medium;
                    cb(MV.selectedMedium);
                    $dialog.hide();
                };
              }]
        });
    }

    this.reconstruct = function(ev, item, cb) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/reconstruct.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
              function($scope, $http) {
                $scope.item = item;
                $scope.form = {genome: item.path};

            	$scope.selectedKingdom = []; // Plants or Microbes
            	$scope.selectedSeqType = []; // protein or DNA
            	$scope.selectedTaxa = []; // genome_type: features or contigs
            	$scope.selectedTemplate = [];
            	
                // Kingdom dropdown options
                $scope.kingdomOptions = [{
            	   name: 'plants', 
            	   value: 'Plants'
            	}, {
                   name: 'microbes', 
                   value: 'Microbial'                    	
            	}];

                // Sequence Type dropdown options
                $scope.seqTypeOptions = [{
                	name: 'dna', 
                    value: 'DNA'
            	}, {
            		name: 'protein', 
            		value: 'Protein'                           	
            	}];
                
                // Genome Type dropdown options
                $scope.taxaOptions = [{
                	   name: 'microbial_contigs',
                	   value: 'Contigs'
                	}, {
                       name: 'microbial_features', 
                       value: 'Microbial feature or Protein sequences'            
                        	
                	}];
                
                // Template dropdown options
                $scope.options = [{
                	   name: 'plant', 
                	   value: 'Plant template'
                	}, {
                	   name: 'auto',
                	   value: 'Automatically select'
                	}, {
                       name: 'core', 
                       value: 'Core template'            
                	}, {
                        name: 'grampos', 
                        value: 'Gram positive template'
                	}, {
                        name: 'gramneg', 
                        value: 'Gram negative template'            	
                	}];
                            	
            	

                $scope.reconstruct = function(){
                    self.showToast('Reconstructing', item.name, 5000)
                    
                    
                    /*
		         	var kingdom = "";
		            if( this.selectedKingdom && this.selectedKingdom.length==0 ) {
		            	// Set the default:
		            	this.selectedKingdom["name"] = "plants";
		                kingdom = this.selectedKingdom["name"];
		            } else {
		                kingdom = this.selectedKingdom["name"];
		            }
		                        
		          	var seq_type = "";
		            if( this.selectedSeqType && this.selectedSeqType.length==0 ) {
		            	// Set the default:
		            	this.selectedSeqType["name"] = "dna";
		                seq_type = this.selectedSeqType["name"];
		            } else {
		                seq_type = this.selectedSeqType["name"];
		            }
		            */        	
		          	var genome_type = "";
		            if( this.selectedTaxa && this.selectedTaxa.length==0 ) {
		            	// Set the default:
		            	this.selectedTaxa["name"] = "microbial_contigs";
		                genome_type = this.selectedTaxa["name"];
		            } else {
		                genome_type = this.selectedTaxa["name"];
		            }
		                    	
		          	var template = "";
		            if( this.selectedTemplate && this.selectedTemplate.length==0 ) {
		            	// Set the default:
		            	this.selectedTemplate["name"] = "auto";
		            	template = this.selectedTemplate["name"];
		            } else {
		            	template = this.selectedTemplate["name"];
		            }

		        	var name = $scope.form.output_file || "";
                    if( name.length == 0 ) {
		        		
		                var parameters = { genome: item.path, genome_type: genome_type }; // Is Ok to omit the output_file arg


		        		// Gets: _ERROR_Object name PATRIC:1123738.3 contains forbidden characters!_ERROR_:
		                // var parameters = { genome: item.path, output_file: item.path, genome_type: genome_type };
		        	} else {
		        		// Enable entering the optional model name
		            	// Validate name to assign to the new model
		                var regex = /[^\w]/gi;
		                if( regex.test( name ) == true ) {

                            $scope.form.output_file = "Invalid Model Name, using the default!";

			                var parameters = { genome: item.path, genome_type: genome_type }; // Is Ok to omit the output_file arg
			                
			        		// Gets: _ERROR_Object name PATRIC:1123738.3 contains forbidden characters!_ERROR_:
			                // var parameters = { genome: item.path, output_file: item.path, genome_type: genome_type };
		                } else {
		                	
		                	// Assert: Optional name was entered and was validated
		                    var parameters = { genome: item.path, genome_type: genome_type, output_file: name };
		                }
                    }
                    
                    MS.reconstruct( parameters )
                    // MS.reconstruct($scope.form)
                      .then(function(jobId) {
                           cb(jobId);
                      }).catch(function(e) {
                          self.showError('Reconstruct Error', e.error.message.slice(0,30)+'...')
                      })

                    $dialog.hide();
                };

                $scope.cancel = function(){
                    $dialog.hide();
                };
              }]
        });
    }

    this.reconstructPlant = function(ev, item, cb) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/reconstruct-plant.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
              function($scope, $http) {
                console.log('Construct Dialog controller function item:', item);
                $scope.item = item;
                $scope.form = {genome: item.path};
            
                $scope.reconstruct = function(){
                    var newName = $scope.form.output_file;
                    var modelfolder = newName ? newName : item.name; 

                    self.showToast('Reconstructing', item.name, 5000);
                    MS.reconstruct($scope.form, {gapfill: 0, plant: 1, output_file: modelfolder})
                      .then(function(r) {
                           if (cb) cb(r);
                           self.showComplete('Reconstruct Complete', item.name, r[2]+r[0])
                      }).catch(function(e) {
                          self.showError('Reconstruct Error', e.error.message.slice(0,30)+'...')
                      })

                    $dialog.hide();
                };

                $scope.cancel = function(){
                    $dialog.hide();
                };
              }]
        })
    }

    /**
     * [function runFBA]
     * @param  {[type]}   ev   [$event object]
     * @param  {[type]}   item [describes model fba is being ran on]
     * @param  {Function} cb   [callback function for when operation is complete]
     * @return {[type]}        [undefined]
     */
    this.runFBA = function(ev, item, cb) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/runFBA.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                //$scope.isPlant = item.path.split('/')[2] === 'plantseed' ? true : false;
                $scope.form = {model: item.path, media_supplement: []};

                $scope.runFBA = function(){
                    self.showToast('Running Flux Balance Analysis', item.name, 5000)
                    MS.runFBA($scope.form)
                      .then(function(res) {
                          console.log('fba job started: ', res)
                          /* self.showComplete('FBA Complete',
                                       res.id+' '+res.media_ref.split('/').pop()) */
                          if (cb) cb();
                      }).catch(function(e) {
                          self.showError('Run FBA Error', e.error.message.slice(0,30)+'...')
                      })
                    $dialog.hide();
                }

                $scope.cancel = function(){
                    $dialog.hide();
                }

            }]
        })
    }

    this.runPlantFBA = function(ev, item, isPlant, cb) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/fba-plant.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                $scope.item = item;
                $scope.isPlant = isPlant;
                $scope.form = {
                    model: item.path, 
                    media_supplement: []
                };

                $scope.runFBA = function(){
                    // use default media if none
                    if (isPlant) {
                        $scope.form.media = $scope.form.media ? $scope.form.media :
                            "/chenry/public/modelsupport/media/PlantHeterotrophicMedia";
                    }
                    else {
                        $scope.form.media = $scope.form.media ? $scope.form.media : "Complete";
                    }
                    MS.runFBA($scope.form)
                      .then(function(res) {
                          console.log('fba job started: ', res)
                          self.showToast('Running Flux Balance Analysis ', item.path.split('/').pop(), 5000);
                          if (cb) cb();
                          // self.showComplete('FBA Complete', res.id)
                      }).catch(function(e) {
                          self.showError('Run FBA Error', e.error.message.slice(0,30)+'...')
                      })
                    $dialog.hide();
                }

                $scope.cancel = function(){
                    $dialog.hide();
                }

            }]
        })
    }    

    this.gapfill = function(ev, item, cb) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/gapfill.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                $scope.isPlant = item.path.split('/')[2] === 'plantseed' ? true : false;
                $scope.form = {model: item.path};

                $scope.gapfill = function(){
                    // use default media if none
                    if ($scope.isPlant) {
                        $scope.form.media = $scope.form.media ? $scope.form.media :
                            "/chenry/public/modelsupport/media/PlantHeterotrophicMedia";
                    }
                    else {
                        $scope.form.media = $scope.form.media ? $scope.form.media : "Complete";
                    }
                    MS.gapfill($scope.form)
                      .then(function(res) {
                          self.showToast('Running gapfilling...', item.path.split('/').pop(), 5000);
                          console.log('gapfill job started: ', res)
                          if (cb) cb();
                      }).catch(function(e) {
                          self.showError('Gapfill Error', e.error.message.slice(0,30)+'...')
                      })
                    $dialog.hide();
                }

                $scope.cancel = function(){
                    $dialog.hide();
                }

            }]
        })
    }

    this.saveAs = function(ev, saveCB, cancelCB, subtext) {
        if (ev) ev.stopPropagation();
        return $dialog.show({
            templateUrl: 'app/views/dialogs/save-as.html',
            targetEvent: ev || null,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                $scope.subtext = subtext

                $scope.save = function(name){
                    saveCB(name);
                    $dialog.hide();
                }

                $scope.cancel = function($event){
                    console.log('calling cancel')
                    $event.preventDefault();
                    if (cancelCB) cancelCB();
                    $dialog.hide();
                }
            }]
        })
    }

    this.error = function(title, msg) {
        return $dialog.show({
            templateUrl: 'app/views/dialogs/error-prompt.html',
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($s, $http) {
                $s.title = title;
                $s.msg = msg;

                $s.ok = function(){
                    $dialog.hide();
                }

                $s.cancel = function(){
                    $dialog.hide();
                }
            }]
        })
    }

    this.showToast = function(title, name, duration) {
      $mdToast.show({
        controller: 'ToastCtrl',
        parent: angular.element('.sidebar'),
        //templateUrl:'app/views/dialogs/notify.html',
        template: '<md-toast>'+
                      '<span flex style="margin-right: 30px;">'+
                         '<span class="ms-color">'+title+'</span><br>'+
                         (name ? name.slice(0,20)+'...' : '')+'</span>'+
                      '<!--<md-button offset="33" ng-click="closeToast()">'+
                        'Hide'+
                      '</md-button>-->'+
                    '</md-toast>',
        hideDelay: duration,
      });

    };

    this.showComplete = function(title, name, path) {
        $mdToast.show({
         controller: 'ToastCtrl',
         parent: angular.element('.sidebar'),
         //templateUrl:'app/views/dialogs/notify.html',
         template: '<md-toast>'+
                     '<span flex style="margin-right: 30px; width: 200px;">'+
                       '<span class="ms-color-complete">'+title+'</span>'+
                       (name ?
                          '<br>'+(name.length > 19 ? name.slice(0,20) +'...' : name)
                          : '')+
                      '</span>'+
                      (path ?
                          '<md-button offset="33" ng-click="closeToast()" ui-sref="app.modelPage({path:\''+path +'\'})">'+
                          'View'+
                          '</md-button>' : '')+
                 '</md-toast>',
         hideDelay: 10000
       });
    }

    this.showError = function(msg) {
       $mdToast.show({
        controller: 'ToastCtrl',
        parent: angular.element('.sidebar'),
        //templateUrl:'app/views/dialogs/notify.html',
        template: '<md-toast>'+
                        '<span flex style="margin-right: 30px;">'+
                          '<span class="ms-color-error">Error</span><br>'+
                          msg+
                         '</span>'+
                    '</md-toast>',
        hideDelay: 10000
      });
    }

    this.showError = function(msg) {
        $mdToast.show({
            controller: 'ToastCtrl',
            parent: angular.element('.sidebar'),
            //templateUrl:'app/views/dialogs/notify.html',
            template: '<md-toast>'+
                            '<span flex style="margin-right: 30px;">'+
                              '<span class="ms-color-error">Error</span><br>'+
                              msg+
                             '</span>'+
                        '</md-toast>',
            hideDelay: 10000
        });
    }

    this.download = function(ev, cols, tbody, filename) {
        ev.stopPropagation();
        return $dialog.show({
            templateUrl: 'app/views/dialogs/download.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                var csvData = uiTools.JSONToCSV(cols, tbody);
                var tabData = uiTools.JSONToTabTable(cols, tbody);

                $scope.filename = filename;

                $timeout(function () {
                    document.getElementById('download-csv')
                            .setAttribute("href", "data:text/csv;charset=utf-8,"+encodeURI(csvData));

                    document.getElementById('download-tab')
                            .setAttribute("href", "data:text/plain;charset=utf-8,"+encodeURI(tabData));

                })

                $scope.cancel = function($event){
                    $event.preventDefault();
                    $dialog.hide();
                }
            }]
        })
    }

    this.solrDownload = function(ev, core, csvUrl) {
        ev.stopPropagation();
        return $dialog.show({
            templateUrl: 'app/views/dialogs/solr-download.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                $scope.csvUrl = csvUrl;
                $scope.filename = core+'.csv';

                $scope.cancel = function($event){
                    $event.preventDefault();
                    $dialog.hide();
                }
            }]
        })
    }

    this.uploadExpression = function(ev, item, cb) {
        ev.stopPropagation();        
        $dialog.show({
            targetEvent: ev,
            clickOutsideToClose: true,            
            templateUrl: 'app/views/dialogs/upload-expression.html',
            controller: ['$scope', function($scope) {
                var $this = $scope;

                console.log('ITEM!', item)

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
                	var name = "";
                	if( ! item.name ) {
                		var name = item.path.split('/').slice( -1 )[ 0 ]; 
                	} else {
                		var name = item.name;
                	}
                    startUpload( name );
                }

                function startUpload(name) {
                    $dialog.hide();
                    self.showToast('Importing expression data', 
                        'please be patient', 10000000)

                    Upload.uploadFile($this.selectedFiles, null, function(node) {                        
                        MS.createExpressionFromShock(node, name, $scope.form.name)
                            .then(function(res) {
                                console.log('done importing', res)
                                self.showComplete('Import complete', name);
                                if (cb) cb();
                            }).catch(function(e) {
                                self.showError('something has gone wrong')
                                console.error(e.error.message)                                
                            })
                    }, function(error) {
                        console.log('shock error:', error)
                        self.showError('Upload to SHOCK failed (see console)')                        
                    })                    
                }     

                $scope.cancel = function() {
                    $dialog.hide();
                }
            }]
        })    
    }

   this.annotatePlant = function(ev, item, cb) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/annotate-plant.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            preserveScope: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                $scope.form = {
                    kmers: false,
                    blast: false
                };

                $scope.annotate = function(){
                    self.showToast('Annotating', item.name, 5000)

                    console.log('anno form:', $scope.form)
        
                    var path = item.path.split('/').slice(0, -2).join('/')
                    $scope.form.name = item.name
                    MS.annotatePlant($scope.form)
                      .then(function(res) {
                           if (cb) cb();
                           // fixme: add name
                           self.showComplete('Annotation Complete')
                      }).catch(function(e) {
                          self.showError('Annotation Error', e.error.message.slice(0,30)+'...')
                      })
                    $dialog.hide();
                }

                $scope.cancel = function(){
                    $dialog.hide();
                }
            }]
        })
    }    

    this.leaveComment = function(ev, rowId, item_list, userinfo, cb) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/leaveComment.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
              function($scope, $http) {
                if( item_list == undefined || item_list.length == 0) {
                    item_list = ['incorrect abbreviation', 'incorrect database mapping'];
                }
                $scope.items = item_list;
                $scope.selected = [];
                $scope.row_id = rowId;
                if (userinfo == undefined) {
                    userinfo = {username: Auth.user};
                }
                else{
                    console.log('Commenting from user: ', userinfo);
                }
                $scope.user = userinfo;

                $scope.submit = function() {
                    if ($scope.selected.length != 0 || $scope.user['remarks']) {
                        var ms_rest_endpoint = config.services.ms_rest_url+'comments';
                        var comments = {user: $scope.user,
                            rowId: $scope.row_id,
                            comments: $scope.selected};
                        var data = {comment: JSON.stringify(comments)};
                        /* use $http to post the comments JSON object to the ms_rest_url endpoint
                        var comm_headers = {
                                Authentication: Auth.token,
                                'Content-Type': 'application/x-www-form-urlencoded'
                            }
                        console.log('headers', comm_headers);
                        var req = $http({
                            method: 'POST',
                            url: ms_rest_endpoint,
                            headers: comm_headers,
                            data: data
                        });
                        req.then( onSuccess, onError );
                        */
                        $.ajax({
                            url: ms_rest_endpoint,
                            dataType: 'json',
                            type: 'POST',
                            data: data,
                            success: function(response){
                                console.log( "Successfully POST-ed data:\n", comments);
                                swal('User comments', response.msg);
                            },
                            error: function(response) {
                                if(response.msg) {
                                    console.log("POST-ing of data failed:\n", comments);
                                    swal('User comments', response.msg);
                                }
                                else {
                                    var cm_msg = "POST-ing of data failed with unknown error.";
                                    console.log(cm_msg + "\n", comments);
                                    swal('User comments', cm_msg);
                                }
                            }
                        });
                        cb(comments);
                    }
                    $dialog.hide();
                }

                $scope.cancel = function(){
                    $dialog.hide();
                }

                $scope.toggle = function (item, list) {
                  var idx = list.indexOf(item);
                  if (idx > -1) {
                    list.splice(idx, 1);
                  }
                  else {
                    list.push(item);
                  }
                }
                $scope.exists = function (item, list) {
                  return list.indexOf(item) > -1;
                }
            }]
        })
    }
}])

.service('AuthDialog',
['$rootScope', '$mdDialog', '$window', '$timeout', 'Auth', '$stateParams',
function($rootScope, $dialog, $window, $timeout, Auth, $stateParams) {

    this.signIn = function() {
        return $dialog.show({
            templateUrl: 'app/views/dialogs/auth.html',
            clickOutsideToClose: false,
            controller: ['$scope', '$state', '$http',
            function($s, $state, $http) {
                // set login method
                if ($rootScope.$stateParams.login == 'patric')
                    $s.method = Auth.loginMethod('patric');
                else
                    $s.method = Auth.loginMethod('rast');

                $s.creds = {};

                // sets method and changes url param
                $s.switchMethod = function(method) {
                    $s.method = Auth.loginMethod(method);
                    $state.go($state.current.name, {login: method});
                }

                $s.ok = function(){
                    $s.loading = true;

                    if ($stateParams.login == 'patric')
                        var prom = Auth.loginPatric($s.creds.user, $s.creds.pass)
                    else
                        var prom = Auth.login($s.creds.user, $s.creds.pass)

                    prom.success(function(data) {
                        $dialog.hide();
                        $state.transitionTo($state.current.name, {}, {reload: true, inherit: true, notify: false})
                            .then(function() {
                                setTimeout(function(){
                                    $window.location.reload();
                                }, 0);
                            });

                    }).error(function(e, status){
                        $s.loading = false;
                        if (status == 401)
                            $s.inValid = true;
                        else
                            $s.failMsg = "Could not reach authentication service: "+e.error_msg;
                    })
                }

                $s.cancel = function(){
                    $dialog.hide();
                }
            }]
        })
    }
}])

.service('FBDialog',
['$mdDialog', 'Auth', 'config', function($dialog, Auth, config) {

    this.leaveFeedback = function() {
        return $dialog.show({
            templateUrl: 'app/views/dialogs/user_feedback.html',
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
              function($scope, $http) {
                $scope.user = {'username': Auth.user,
                               'name': '',
                               'email': ''};
                $scope.remarks = '';
                console.log('Feedback from user: ', $scope.user.username);

                $scope.submit = function() {
                    if ($scope.remarks && $scope.remarks.toLowerCase() != 'feedback') {
                        var ms_rest_endpoint = config.services.ms_rest_url+'feedback';
                        var comments = {user: $scope.user,
                                        comments: $scope.remarks};
                        var data = {comment: JSON.stringify(comments)};
                        $.ajax({
                            url: ms_rest_endpoint,
                            dataType: 'json',
                            type: 'POST',
                            data: data,
                            success: function(response){
                                console.log( "Successfully POST-ed data:\n", comments);
                                swal('User feedback', response.msg);
                            },
                            error: function(response) {
                                if(response.msg) {
                                    console.log("POST-ing of data failed:\n", comments);
                                    swal('User feedback', response.msg);
                                }
                                else {
                                    var cm_msg = "POST-ing of data failed with unknown error.";
                                    console.log(cm_msg + "\n", comments);
                                    swal('User feedback', cm_msg);
                                }
                            }
                        });
                    }
                    $dialog.hide();
                }

                $scope.cancel = function(){
                    $dialog.hide();
                }
            }]
        })
    }
}])

.controller('ToastCtrl', ['$scope', '$mdToast', '$timeout', function($scope, $mdToast, $timeout) {
  $scope.closeToast = function() {
    $mdToast.hide();
  };
}])

.controller('AppCtrl', ['$scope', '$mdToast', '$timeout',
function($scope, $mdToast, $timeout) {
  $scope.closeToast = function() {
    $mdToast.hide();
  };
}])
