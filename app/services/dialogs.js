/**
 * [module Dialogs]
 *
 * Set of dialogs and toast notifications.
 *
 */

angular.module('Dialogs', []).service('Dialogs', 
['MS', 'WS', '$mdDialog', '$mdToast', 'uiTools', '$timeout', 'Upload', 'Auth',
function(MS, WS, $dialog, $mdToast, uiTools, $timeout, Upload, Auth) {
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
    
    
    
    this.selectMedia = function(ev) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/selectMedia.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
              function($scope, $http) {
                // $scope.item = item;
                // $scope.form = {genome: item.path};            	

                $scope.select = function( media ){
                    // self.showToast('Reconstructing', item.name, 5000)                	
                    // $scope.media = media;
                	
                    $dialog.hide();
                    
                };

                $scope.cancel = function(){
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
                           cb(r);
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
                          console.log('run fba response', res)
                          cb();
                          self.showComplete('FBA Complete',
                                       res.id+' '+res.media_ref.split('/').pop())
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

    this.runPlantFBA = function(ev, item, cb) {
        ev.stopPropagation();
        $dialog.show({
            templateUrl: 'app/views/dialogs/fba-plant.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                $scope.item = item;
                $scope.form = {
                    model: item.path, 
                    media_supplement: []
                };

                $scope.runFBA = function(){
                    self.showToast('Running Flux Balance Analysis', item.name, 5000)          
                    
                    // use default media if none
                    $scope.form.media = $scope.form.media ? $scope.form.media :
                         "/chenry/public/modelsupport/media/PlantHeterotrophicMedia";
                    MS.runFBA($scope.form)
                      .then(function(res) {
                          console.log('run fba response', res)
                          cb();
                          self.showComplete('FBA Complete', res.id)
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
                    self.showToast('Gapfilling', item.name, 5000)

                    MS.gapfill($scope.form)
                      .then(function(res) {
                           cb();
                           self.showComplete('Gapfill Complete', res[0])
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
