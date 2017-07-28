
angular.module('DataViewCtrls', [])
.controller('Json',
['$scope', '$stateParams', 'WS',
function($s, $sParams, WS) {
    $s.loading = true;
    WS.get($sParams.path)
      .then(function(json) {
          $s.json = JSON.stringify(json, null, 4);
          $s.loading = false;
      })
}])

.controller('Map',
['$scope', '$stateParams', 'WS',
function($s, $sParams, WS) {
    var name = $sParams.path.split('/').pop();
    $s.name = name;
}])

.controller('Image',
['$scope', '$stateParams', 'WS',
function($s, $sParams, WS) {
    $s.name = $sParams.path.split('/').pop();

    $s.loading = true;
    WS.get($sParams.path)
      .then(function(res) {
          $s.data = res.data;
          $s.loading = false;
      })
}])

.controller('GenomeDataView',
['$scope', '$stateParams', 'WS', '$http',
function($scope, $sParams, WS, $http) {

    // path and name of object
    var path = $sParams.path;
    $scope.name = path.split('/').pop()

    $scope.tabs = {tabIndex : 0};

    $scope.featureOpts = {query: '', limit: 20, offset: 0, sort: null };
    $scope.annotationOpts = {query: '', limit: 10, offset: 0, sort: {field: 'role'}};

    $scope.featureHeader = [
        {label: 'Feature', key: 'id',
         link: {
            state: 'app.featurePage',
            getOpts: function(row) {
                return {feature: row.id, genome: path};
            }}
        },
        {label: 'Function', key: 'function',
            formatter: function(row) {
                return row.function || '-';
            }},
        {label: 'Subsystems', key: 'subsystems',
         formatter: function(row) {
            return row.subsystems.length ?
                    row.subsystems.join('<br>') : '-';
        }}
    ];

    $scope.annotationHeader = [
        {label: 'PlantSEED Role', key: 'role'},
        {label: 'Features', key: 'kmerFeatures',
            formatter: function(row) {
                var links = [];
                row.kmerFeatures.forEach(function(name, i) {
                    var match = row.blastFeatures.indexOf(name);
                    links.push('<a href="/feature'+path+'/'+name+'" '+
                                    'class="'+(match > 0 ? 'feature-highlight' : '')+'">'+
                                    name+
                                '</a>');
                })

                return links.join('<br>') || '-';
            }},
        {label: 'Exemplar Hits', key: 'blastFeatures',
         formatter: function(row) {
            var links = [];
            row.blastFeatures.forEach(function(name, i) {
                var match = row.kmerFeatures.indexOf(name);
                links.push('<a href="/feature'+path+'/'+name+'" '+
                                'class="'+(match > 0 ? 'feature-highlight' : '')+'">'+
                                name+
                            '</a>');
            })

            return links.join('<br>') || '-';
        }},
    ]

    $scope.loadingFeatures = true;
    WS.get(path)
      .then(function(res) {
          var objs = res.data.features,
              data = [];

          for (var i=0; i<objs.length; i++) {
              data.push({id: objs[i].id,
                         function: objs[i].function})
          }

          $scope.features = objs;
      }).catch(function(error){
          $scope.error = error;      
      }).then(function() { 
          $scope.loadingFeatures = false;
      })

    // get genome object path for annotation overview
    var genomePath = path.split('/').slice(0, -2).join('/')+'/genome'

    $scope.loadingAnnotations = true;
    $http.rpc('ms', 'plant_annotation_overview', {genome: genomePath})
         .then(function(res) {
             var d = [];
             for (var key in res) {
                 d.push({role: key,
                         blastFeatures: res[key]['blast-features'],
                         kmerFeatures: res[key]['kmer-features']})
             }

             $scope.annotations = d;
             $scope.loadingAnnotations = false;
         }).catch(function(e) {
             $scope.error = e;
             $scope.loadingAnnotations = false;
         })
}])



<!-- Build New Model -->
.controller('BuildPlant',
['$scope', '$state', 'Patric', '$timeout', '$http', 'Upload', '$mdDialog',
 'Dialogs', 'ViewOptions', 'WS', 'Auth', 'uiTools', 'MS', 'Session', 'config',
function($scope, $state, Patric, $timeout, $http, Upload, $dialog,
 Dialogs, ViewOptions, WS, Auth, uiTools, MS, Session, config) {

    // path and name of object
    // var path = $sParams.path;
    
    $scope.myPlants = [];
    $scope.myMedia = [];
    
    $scope.selectedFiles = [];
    
    $scope.genomeNameBox = "";
    
    // the selected item for the build operations (not used yet)
    $scope.selected = null;
    
    $scope.copyInProgress = {};
    
    $scope.columns = [
        {prop: 'genome_name', label: 'ModelID'}
        
    ]    
    $scope.opts = {
            query: '', limit: 3, offset: 0,
            sort: {},
            visible: ['genome_name']
        };
    
    

    // public rast genome
    // Below needs to get refactored with a new call appropriate with the new app arch
    MS.listRastGenomes()
      .then(function(data) {
          $scope.rastMicrobes = data;
          //console.log('myMicrobes (rast)', $scope.myMicrobes)
      })

      
      

    // For constructing models based on Patric genomes:
    MS.listModels( '/modelseed' + '/modelseed' ).then(function(res) {
        console.log('path res', res)

        $scope.microbes = res;
        $scope.loadingMicrobes = false;
    }).catch(function(e) {
        $scope.microbes = [];
        $scope.loadingMicrobes = false;
    })

        
        $scope.loadingPlants = true;
        MS.listModels('/'+Auth.user+'/plantseed').

            then(function(res) {
                console.log('path res', res)
            
                $scope.myPlants = res;
            
                $scope.loadingPlants = false;
        }).catch(function(e) {
                $scope.myPlants = [];
                $scope.loadingPlants = false;
        })
                
    $scope.loadingMyMedia = true;    
    MS.listMyMedia()
      .then(function(media) {
          $scope.myMedia = media;
          $scope.loadingMyMedia = false;
      }).catch(function(e) {
          $scope.loadingMyMedia = false;
          $scope.myMedia = [];
      })

        $scope.droppedObjects1 = [];
        $scope.droppedObjects2= [];
            
        $scope.onDropComplete1=function(data,evt){
            var index = $scope.droppedObjects1.indexOf(data);
            if (index == -1)
            $scope.droppedObjects1.push(data);
        }
        $scope.onDragSuccess1=function(data,evt){
            console.log("133","$scope","onDragSuccess1", "", evt);
            var index = $scope.droppedObjects1.indexOf(data);
            if (index > -1) {
                $scope.droppedObjects1.splice(index, 1);
            }
        }
        $scope.onDragSuccess2=function(data,evt){
            var index = $scope.droppedObjects2.indexOf(data);
            if (index > -1) {
                $scope.droppedObjects2.splice(index, 1);
            }
        }
        $scope.onDropComplete2=function(data,evt){
            var index = $scope.droppedObjects2.indexOf(data);
            if (index == -1) {
                $scope.droppedObjects2.push(data);
            }
        }
        var inArray = function(array, obj) {
            var index = array.indexOf(obj);
        }

    $scope.reconstruct = function(ev, item) {
    
        // Temp:  method parm item is not wired (came from selectedPublic from Ref Genomes page)
        // XXX: Hard coded:  Always Selects the head of the list of myPlants (method parm 'item' is ignored):        
        // TODO:  Make it selectable instead of always $scope.myPlants[ 0 ]:
             
        // console.log( "TODO Build New Model for \n", $scope.genomeNameBox );         

    	if( $scope.myPlants.length > 0 ) {
    		item = $scope.myPlants[ 0 ];
    		var name = $scope.myPlants[ 0 ].name;
    		var path = $scope.myPlants[ 0 ].path;
    		$scope.genomeNameBox = $scope.myPlants[ 0 ].name;
            Dialogs.showToast('Creating Model...', name, 2000);
    	}
        
        if ('genome_id' in item) {
            var name = item.genome_id,
                orgName = item.genome_name;
            var params = {path: 'PATRIC:'+item.genome_id, name: item.genome_name};
        } else {
            var name = item.name;
            var params = {path: item.path, name: name};
        }

        ev.stopPropagation();
        
        $scope.form = {genome: item.path};

        // self.showToast('Reconstructing', item.name, 5000)
        $scope.loadingPlants = true;
        
        var reconstructpromise =             
        	MS.reconstruct($scope.form)
                      .then(function(r) {
                    	  // This block will be executed at callback
                    	  //   Whether success or not...
                    	  // redirect page to parent from right here
                          $state.go('app.myModels');
                          
                          // Next call was Jobs related?
                          // cb(r);
                      }).catch(function(e) {
                    	  console.log( 'BuildPlant ctrls Reconstruct Error', e.error.message );
                          // self.showError('Reconstruct Error', e.error.message.slice(0,30)+'...')
                      })
        
    }
    
    $scope.templateSelected = function( ) {
    	if( $scope.myPlants.length > 0 ) {
            $scope.genomeNameBox = $scope.myPlants[ 0 ].name;
            
    	}
    }        
    
    $scope.startUpload = function() {
    	var name = "";
        if( $scope.form ) {
           name = $scope.form.name;        	
        }
        if( name.length > 0 ) {
        
            var taxonomy = $scope.form.selectedTaxa;

            // Ensure no overwrites
            // TODO: Add function to ms.js such that makes the below checks and balances like MS.modelExists('/'+Auth.user+'/plantseed/'+name)
            console.log('attempting upload')
            WS.getObjectMeta('/'+Auth.user+'/plantseed/'+name)
                .then(function() {
                    alert('Genome name already exists!\n'+
                    'Please provide a new name or delete the existing genome');                           
            }).catch(function(e) {
                startUpload(name);
            })
        }
    }

    function startUpload(name) {

        Upload.uploadFile($scope.selectedFiles, null, function(node) {
        	
            Dialogs.showComplete('Import in progress...');

            MS.createGenomeFromShock(node, name)
                .then(function(res) {
                    console.log('done importing', res);
                    
              	  // This block will be executed at callback
              	  //   Whether success or not...
              	  // redirect page to parent from right here
                  $state.go('app.myModels');                    
                    
                    Dialogs.showComplete('Import complete', name);
                                                    
                    // loadPrivatePlants( res );
                    
                }).catch(function(e) {
                    // Dialogs.showError('something has gone wrong')
                    console.error(e.error.message)                                
                })
        }, function(error) {
            console.log('shock error:', error)
            // Dialogs.showError('Upload to SHOCK failed (see console)')                        
        })                    
    }     
    
    // Deferred Functionality for Uploading a FASTA file (no longer called):
    // Redirected to Parent now
    function loadPrivatePlants( res ) {
        $scope.loadingMyPlants = true;
        $scope.myPlants = [];
        $scope.loadingPlants = true;
        MS.listModels('/'+Auth.user+'/plantseed').

            then(function(res) {
                console.log('path res', res)
            
                $scope.myPlants = res;
            	if( $scope.myPlants.length > 0 ) {
                    $scope.genomeNameBox = $scope.myPlants[ 0 ].name;
                    
            	}
                $scope.loadingPlants = false;
            }).catch(function(e) {
                $scope.myPlants = [];
                $scope.loadingPlants = false;
            })
                  
            $scope.loadingMyPlants = false;
        
    }
        
    $scope.selectFile = function(files) {

        $scope.$apply(function() {
            $scope.selectedFiles = files;
        })
    }
    
    
    
    // Next functions in this controller are deprecated:
    $scope.openUploader = function(ev) {
        // $dialog.show({
            // targetEvent: ev,
            // scope: $scope.$new(),
            // preserveScope: true,
            // clickOutsideToClose: true,            
            // templateUrl: 'app/views/genomes/upload-fasta.html',
            // controller: ['$scope', function($scope) {
                
                var $this = $scope;
                
                // 'form' to contain user inputed name and selected file from this dialog, as per the markup
                // XXX: Beware of scope collision for 'form' ('form' is also used in reconstruct)
                // Appears we are resetting $scope.form in the next line
                $this.form = {};
                
                // $this.selectedFiles;
                /*
                $scope.selectFile = function(files) {

                    $scope.$apply(function() {
                        $this.selectedFiles = files;
                    })
                }
                */
                
                /*
                $scope.startUpload = function() {
 
                    var name = $this.form.name;
                    
                    var taxonomy = $this.form.selectedTaxa;

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
                    // $dialog.hide();
                    // Dialogs.showToast('Importing "'+name+'"', 'please be patient', 10000000)

                    Upload.uploadFile($this.selectedFiles, null, function(node) {                        
                        MS.createGenomeFromShock(node, name)
                            .then(function(res) {
                                console.log('done importing', res)
                                Dialogs.showComplete('Import complete', name);
                                                                
                                loadPrivatePlants( res );
                                // loadPrivatePlants();
                                
                            }).catch(function(e) {
                                // Dialogs.showError('something has gone wrong')
                                console.error(e.error.message)                                
                            })
                    }, function(error) {
                        console.log('shock error:', error)
                        // Dialogs.showError('Upload to SHOCK failed (see console)')                        
                    })                    
                }     
                */
                // $scope.cancel = function() {
                    // $dialog.hide();
                // }
                
            // }]
        // })
    }
    
} ] )



<!-- TODO: ReBuild New Model -->
.controller('ReBuildPlant',
['$scope', '$state', '$stateParams', 'Patric', '$timeout', '$http', 'Upload', '$mdDialog',
 'Dialogs', 'ViewOptions', 'WS', 'Auth', 'uiTools', 'MS', 'Session', 'config',
function($scope, $state, $sParams, Patric, $timeout, $http, Upload, $dialog,
 Dialogs, ViewOptions, WS, Auth, uiTools, MS, Session, config) {
	
    var path = $sParams.path;
    
    $scope.name = path.split('/').pop()
    
    $scope.genomeNameBox = $scope.name;
    
    $scope.myPlants = [];
    $scope.myMedia = [];
    
    $scope.selectedFiles = [];
    
    // the selected item for the build operations (not used yet)
    // $scope.selected = null;
    
    // $scope.copyInProgress = {};
    /*    
        $scope.loadingPlants = true;
        MS.listModels('/'+Auth.user+'/plantseed').
            then(function(res) {
                console.log('path res', res)
                $scope.myPlants = res;
                $scope.loadingPlants = false;
        }).catch(function(e) {
                $scope.myPlants = [];
                $scope.loadingPlants = false;
        })
    */    
    $scope.loadingMyMedia = true;    
    MS.listMyMedia()
      .then(function(media) {
          $scope.myMedia = media;
          $scope.loadingMyMedia = false;
      }).catch(function(e) {
          $scope.loadingMyMedia = false;
          $scope.myMedia = [];
      })

    var inArray = function(array, obj) {
            var index = array.indexOf(obj);
        }

    $scope.reconstruct = function(ev, item) {
    
        // Temp:  method parm item is not wired (came from selectedPublic from Ref Genomes page)
        // XXX: Hard coded:  Always Selects the head of the list of myPlants (method parm 'item' is ignored):        
        // TODO:  Make it selectable instead of always $scope.myPlants[ 0 ]:
             
        // console.log( "TODO Build New Model for \n", $scope.genomeNameBox );         

    	if( $scope.myPlants.length > 0 ) {
    		item = $scope.myPlants[ 0 ];
    		var name = $scope.myPlants[ 0 ].name;
    		var path = $scope.myPlants[ 0 ].path;
    		$scope.genomeNameBox = $scope.myPlants[ 0 ].name;
            Dialogs.showToast('Creating Model...', name, 2000);
    	}
        
        if ('genome_id' in item) {
            var name = item.genome_id,
                orgName = item.genome_name;
            var params = {path: 'PATRIC:'+item.genome_id, name: item.genome_name};
        } else {
            var name = item.name;
            var params = {path: item.path, name: name};
        }

        ev.stopPropagation();
        
        $scope.form = {genome: item.path};

        // self.showToast('Reconstructing', item.name, 5000)
        $scope.loadingPlants = true;
                
        var reconstructpromise =             
        	MS.reconstruct($scope.form)
                      .then(function(r) {
                    	  // This block will be executed at callback
                    	  //   Wether success or not...
                    	  // TODO: redirect page to parent from right here
                    	  // $http.
                    	  app.myModels();
                           cb(r);
                      }).catch(function(e) {
                    	  console.log( 'BuildPlant ctrls Reconstruct Error', e.error.message );
                          // self.showError('Reconstruct Error', e.error.message.slice(0,30)+'...')
                      })
        
    }


    
    $scope.templateSelected = function( ) {
    	if( $scope.myPlants.length > 0 ) {
            $scope.genomeNameBox = $scope.myPlants[ 0 ].name;
            
    	}
    }    
    
    
    
    $scope.startUpload = function() {
    	var name = "";
        if( $scope.form ) {
           name = $scope.form.name;        	
        }
        if( name.length > 0 ) {
        
            var taxonomy = $scope.form.selectedTaxa;

            // Ensure no overwrites
            console.log('attempting upload')
            WS.getObjectMeta('/'+Auth.user+'/plantseed/'+name)
                .then(function() {
                    alert('Genome name already exists!\n'+
                    'Please provide a new name or delete the existing genome');                           
            }).catch(function(e) {
                startUpload(name);
            })
        }
    }

    function startUpload(name) {

        Upload.uploadFile($scope.selectedFiles, null, function(node) {                        
            MS.createGenomeFromShock(node, name)
                .then(function(res) {
                    console.log('done importing', res)
                    Dialogs.showComplete('Import complete', name);
                                                    
                    loadPrivatePlants( res );
                    // loadPrivatePlants();
                    
                }).catch(function(e) {
                    // Dialogs.showError('something has gone wrong')
                    console.error(e.error.message)                                
                })
        }, function(error) {
            console.log('shock error:', error)
            // Dialogs.showError('Upload to SHOCK failed (see console)')                        
        })                    
    }     
    
    // Deferred Functionality for Uploading a FASTA file: 
    function loadPrivatePlants( res ) {
        $scope.loadingMyPlants = true;
        $scope.myPlants = [];
        $scope.loadingPlants = true;
        MS.listModels('/'+Auth.user+'/plantseed').

            then(function(res) {
                console.log('path res', res)
            
                $scope.myPlants = res;
            	if( $scope.myPlants.length > 0 ) {
                    $scope.genomeNameBox = $scope.myPlants[ 0 ].name;
                    
            	}
                $scope.loadingPlants = false;
            }).catch(function(e) {
                $scope.myPlants = [];
                $scope.loadingPlants = false;
            })
                  
            $scope.loadingMyPlants = false;
        
        /*                
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
            */
    }
        
    $scope.selectFile = function(files) {

        $scope.$apply(function() {
            $scope.selectedFiles = files;
        })
    }
    
    
    
} ] )




.controller('FeatureDataView',
['$scope', '$stateParams', 'MS', '$http', 'config', 'Auth',
function($s, $sParams, MS, $http, config, Auth) {

    // path and name of object
    var featureID = $sParams.feature,
        genome = $sParams.genome.split('/').slice(0,-2).join('/');

    if (genome.split('/')[1] === Auth.user) $s.canEdit = true;

    $s.featureID = featureID;
    $s.tabs = {tabIndex : 0};

    // url for SEED feature links in prokaryotic sim table
    var seedFeatureUrl = 'http://pubseed.theseed.org/seedviewer.cgi?page=Annotation&feature=';
    $s.seedFeatureUrl = seedFeatureUrl;

    // table settings
    $s.plantSimOpts = {
        query: '', limit: 20, offset: 0,
        visible: ['hit_id', 'e_value', 'bit_score', 'percent_id']
    };
    $s.prokaryoticSimOpts = angular.copy($s.plantSimOpts);

    // table specs
    //ID Genome Function Percent Identity//
    $s.plantSimSpec = [
        {label: 'Hit ID', key: 'hit_id',
         link: {
            state: 'app.featurePage',
            getOpts: function(row) {
                return {
                    feature: row.hit_id,
                    genome: config.paths.plants.genomes+row.genome+
                        '/.plantseed_data/minimal_genome'
                };
            }},
        },
        {label: 'Genome', key: 'genome'},
        {label: 'Function', key: 'function'},
        {label: 'Percent ID', key: 'percent_id'}
    ];

    $s.prokaryoticSimSpec = [
        {label: 'Hit ID', key: 'hit_id',
         formatter: function(row) {
            return '<a href="'+seedFeatureUrl+row.hit_id+'" target="_blank">'+
                        row.hit_id+
                    '</a>';
        }
        },
        {label: 'Genome', key: 'genome'},
        {label: 'Function', key: 'function'},
        {label: 'Percent ID', key: 'percent_id'}
    ];


    $s.loading = true;
    MS.getFeature(genome, featureID)
      .then(function(res) {
          //$s.roles = res.function.split(';');
          $s.featureFunction = res.function;
          $s.proteinSequence = res.protein_translation;
          $s.subsystems = res.subsystems;
          $s.aliases = parseAliases(res.aliases);

          $s.plantSims = res.plant_similarities;
          $s.prokaryoticSims = res.prokaryotic_similarities;
          $s.loading = false;
      }).catch(function(error) {
          $s.error = error;
          $s.loading = false;
      })

    // this takes a hash of aliases and creates a new list of
    // hashes ordered alphabetically by the key
    function parseAliases(aliases) {
        var a = [];
        for (key in aliases) {
            var obj = {label: key, alias: aliases[key]};
            if (key == "SEED") obj.url = seedFeatureUrl+aliases[key];
            a.push(obj)
        }

        a.sort(function(a, b) {
            if (a.label.toLowerCase() < b.label.toLowerCase()) return -1;
            if (a.label.toLowerCase() > b.label.toLowerCase()) return 1;
            return 0;
        });

        return a;
    }

    /*
    $s.editable = {};
    $s.editRole = function(i) {
        // cancel all other editing
        $s.editable = {};
        $s.editable[i] = true;
    }

    $s.editedRole = {};
    $s.saveRole = function(i) {
        $s.saving = true;

        $s.roles[i] = $s.editedRole[i]
        var newFunction = $s.roles.join('; ')

        console.log('saving new function ', newFunction)
        var params = {genome: genome, feature: featureID, function: newFunction};
        $http.rpc('ms', 'save_feature_function', params)
             .then(function(res) {
                 console.log('save response', res)
                 $s.saving = false;
                 $s.editable[i] = false;
             })

    }*/


    $s.editable = false;
    $s.editFunction = function() {
        $s.editable = !$s.editable;
    }

    $s.edited = {function: ''};
    $s.saveFunction = function(i) {
        $s.saving = true;

        var newFunction = $s.edited.function;

        console.log('saving new function', newFunction)
        var params = {genome: genome, feature: featureID, function: newFunction};
        $http.rpc('ms', 'save_feature_function', params)
             .then(function(res) {
                 console.log('save response', res)
                 $s.saving = false;
                 $s.editable = false;
                 $s.featureFunction = $s.edited.function;
             })

    }

}])

.controller('MediaDataView',
['$scope', '$state', '$stateParams', 'WS', 'MS', 'uiTools',
 '$http', 'Auth', '$filter', '$mdDialog', 'Biochem', 'Dialogs',
function($s, $state, $sParams, WS, MS, tools,
         $http, Auth, $filter, $dialog, Biochem, Dialogs) {

    // path and name of object
    var path = $sParams.path;

    // determine if user can copy this media to their workspace
    if (path.split('/')[1] !== Auth.user) $s.canCopy = true;

    $s.name = path.split('/').pop()

    $s.mediaOpts = {query: '', offset: 0, sort: {field: 'id'}};
    $s.mediaHeader = [
        {label: 'Name', key: 'name'},
        {label: 'ID', key: 'id'},
        {label: 'Concentration', key: 'concentration', editable: true},
        {label: 'Max Flux', key: 'minflux', editable: true},
        {label: 'Min Flux', key: 'maxflux', editable: true}
    ];

    $s.toggleEdit = function() {
        $s.editInProgress = !$s.editInProgress;
        $s.editableData = $filter('orderBy')($s.media, $s.mediaOpts.sort.field,  $s.mediaOpts.sort.desc  );
    }

    if ($s.name === 'new-media') {
        $s.media = [];
        $s.toggleEdit();
    } else {
        $s.loading = true;
        WS.get(path).then(function(res) {
            $s.media = tools.tableToJSON(res.data).rows;
            $s.mediaMeta = res.meta[7];
            $s.loading = false;
        }).catch(function(e) {
            $s.error = e;
            $s.loading = false;
        })
    }

    $s.copyMedia = function() {
        $s.copyInProgress = true;

        var destination = '/'+Auth.user+'/media/';
        WS.createFolder(destination)
            .then(function(res) {

                WS.copy(path, destination+$s.name, true)
                    .then(function(res) {
                        $s.copyInProgress = false;
                        $state.go('app.media', {tab: 'mine'})
                    })
            })
    }

    var head = ['id', 'name', 'concentration', 'minflux', 'maxflux'];

    // only allow save if not new-media
    if ($s.name !== 'new-media') {
        $s.save = function(data) {
            var table = tools.JSONToTable(head, angular.copy(data));

            return WS.save(path, table, {overwrite: true, userMeta: $s.mediaMeta, type: 'media'})
                     .then(function() {
                         $s.media = data;
                         Dialogs.showComplete('Saved media', $s.name)
                     })
        }
    }

    $s.saveAs = function(data, newName) {
        var table = tools.JSONToTable(head, angular.copy(data));

        var folder = '/'+Auth.user+'/media/';
        return WS.save(folder+newName, table, {
            userMeta: {
                name: newName,
                isMinimal: 0,
                isDefined: 0,
            }, overwrite: true, type: 'media'})
            .then(function(res) {
                MS.addMyMedia(res);
                Dialogs.showComplete('Saved media', newName);
                $state.go('app.mediaPage', {path: folder+newName})
            }).catch(function(e) {
                console.log('error', e)
                self.showError('Save error', e.error.message.slice(0,30)+'...')
            })
    }

    $s.addCpds = function(ev) {
        $dialog.show({
            templateUrl: 'app/views/dialogs/add-cpds.html',
            targetEvent: ev,
            scope: $s.$new(),
            preserveScope: true,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                $scope.cancel = function(){
                    $dialog.hide();
                }

                $scope.addItems = function(items){
                    $dialog.hide();

                    // add items to media
                    var newItems = [];
                    for (var i=0; i<items.length; i++) {
                        var cpd = items[i]
                        newItems.push({
                            id: cpd.id,
                            name: cpd.name,
                            concentration: 0.001,
                            minflux: -100,
                            maxflux: 100
                        })
                    }

                    $s.editableData = newItems.concat($s.editableData);

                    var opItems = [];
                    for (var i=0; i<newItems.length; i++) {
                        opItems.push( {index: i, item: newItems[i]} );
                    }

                    // add operation to undo
                    $s.$broadcast('Events.commandOperation', {op: 'add', items: opItems});
                }

                $s.cpdOpts = {
                    query: '', limit: 10, offset: 0, sort: {field: 'id'},
                    visible: ['name', 'id', 'formula', 'abbreviation',
                            'deltag', 'deltagerr', 'charge']
                };

                $s.cpdHeader = [
                    {label: 'Name', key: 'name'},
                    {label: 'ID', key: 'id'},
                    {label: 'Formula', key: 'formula'},
                    {label: 'Abbrev', key: 'abbreviation'},
                    {label: 'deltaG', key: 'deltag'},
                    {label: 'detalGErr', key: 'deltagerr'},
                    {label: 'Charge', key: 'charge'}
                ];


                function updateCpds() {
                    Biochem.get('model_compound', $s.cpdOpts)
                           .then(function(res) {
                                $s.cpds = res;
                                $s.loadingCpds = false;
                           })
                }

                $s.$watch('cpdOpts', function(opts) {
                    $s.loadingCpds = true;
                    updateCpds();
                }, true)
            }]
        })
    }

}])



.controller('ModelDataView',
['$scope', '$state', '$stateParams', 'Auth', 'MS', 'WS', 'Biochem', '$mdDialog', 'Dialogs', 'GenomeParser',
 'ModelParser', 'FBAParser', 'uiTools', 'Tabs', '$mdSidenav', '$document', '$http', 'ModelViewer', 'config',
function($scope, $state, $sParams, Auth, MS, WS, Biochem, $mdDialog, Dialogs, GenomeParser,
         ModelParser, FBAParser, uiTools, Tabs, $mdSidenav, $document, $http, MV, config) {        

    $scope.Tabs = Tabs;
    Tabs.totalTabCount = 6;
    
    // path and name of "modelfolder"
    var path = $sParams.path;  
    $scope.name = path.split('/').pop();
    
    $scope.selected;    
    $scope.selectedFBA = "";
    
      
    
    $scope.showRelatedData = function( item ) {
        $scope.item = item;
        // item.loading = true;        
        
        var gapfillProm = showGapfills();
        var expressionProm = showExpression();

        var fbaProm;
        
        if (item.relatedFBAs) 
            delete item.relatedFBAs;
        else         
            fbaProm = updateFBAs();
            

        // Set reaction fluxes for the selected FBA (thanks to the "addFBA" method):
        $scope.getRxnFluxes();
        $scope.getCpdFluxes();               
        
        

        // TODO July 24: Consider ALL the genes
        $scope.getAllGenesForGenome();       

        

        /*
        $q.all([fbaProm, gapfillProm, expressionProm])
            .then(function() {
                console.log('done')
                item.loading = false
            } );
        */
            
    }

    function updateFBAs() {
        return MS.getModelFBAs(path)
            .then(function(fbas) {
                $scope.relatedFBAs = fbas;               
                
                // Tabs.selectedIndex = 0;
            })
    }
    
    function showExpression() {
        return updateExpression();      
    }

    function updateExpression() {
    	// Tabs.selectedIndex = 2;                    
           
        return WS.getObjectMeta(path)
            .then(function(res) {
                var expList = [],
                    dict = res[0][7].expression_data;
                
                for (key in dict) 
                    expList.push({name: key, ids: dict[key]});
                
                $scope.expression = expList;
            })
            
    }
    
    $scope.uploadExpression = function(ev, item) {
        Dialogs.uploadExpression(ev, item, function() {
            updateExpression(item);
        })
    }
        
    $scope.runPlantFBA = function(ev, item) {
        // var item = {path: path, name: $scope.name, fbaCount: $scope.fbaCount};

        Dialogs.runPlantFBA(ev, item, function() {
            updateFBAs().then(function() {
                item.fbaCount++;
            })
        })
    }   
    
    // FBA selection for data viewing (enables determine which FBA is selected via check boxes)
    $scope.addFBA = function(e, fba, model) {
        e.preventDefault();
        e.stopPropagation();
        
        // $scope.selectedFBA = fba.path.split( "/").slice( -1 );

        var data = {model: model.path,
                    fba: fba.path,
                    org: model.orgName,
                    media: fba.media};


        if (fba.checked) {
            MV.rm(data, true);
            
            $scope.selectedFBA = "";

            fba.checked = false;
        } else {
            MV.add(data);
            
            $scope.selectedFBA = fba.path.split( "/").slice( -1 );
            
            // Call functions to set selected fba fluxes:
            $scope.getRxnFluxes();
            $scope.getCpdFluxes();

            fba.checked = true;
        }
    }    
           
    $scope.gapfill = function(ev) {
        var item = {path: path, name: $scope.name, gapfillCount: $scope.gapfillCount};
    
        Dialogs.gapfill(ev, item, function() {
            updateGapfills(item).then(function() {
                item.gapfillCount++;
            })
        })
    }    
    
    function showGapfills() {
        if ($scope.relatedGapfills) {
            delete $scope.relatedGapfills;
        } else {
            return updateGapfills();
        }
    }    

    function updateGapfills() {
        return MS.getModelGapfills(path)
            .then(function(gfs) {
                $scope.relatedGapfills = gfs;
                // Tabs.selectedIndex = 0;
            })
    }
        
    $scope.deleteFBA = function(e, i, model) {
        e.stopPropagation();

        WS.deleteObj($scope.relatedFBAs[i].ref)
          .then(function(res) {
          
              $scope.relatedFBAs.splice(i, 1);
              // model.relatedFBAs.splice(i, 1);
              
              $scope.fbaCount -= 1;
          })
    }    

    // For the Download operation (-->)
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
        // var item = {path: path, name: $scope.name};
    
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
            })
        }, function() {
            console.log('not deleting', item.name, type);
        });
    }
    
    

    // TODO July 24: Consider ALL the genes
    $scope.getAllGenesForGenome = function( ) {

        var genomePath = path + '/genome';
        
        var dictionary = {};
        var genomeGenes = [];
 
        WS.get( genomePath ).then(function(obj) {
        	dictionary = GenomeParser.parse(obj.data).dictionary;
        	genomeGenes = GenomeParser.parse(obj.data).genomeGenes;
        	
        	$scope.geneFunctions = dictionary;
        	
            // Merge Functions and Genes without reactions:
            if( $scope.geneFunctions ){
                var foundGenes = [];
                var gene;
                
                $scope.data.genes.forEach(function(item) {
                    foundGenes.push(item.id)
                })
                

                for ( var i = 0; i <  genomeGenes.length; i++ ) {
                	gene = genomeGenes[ i ];
                	// If gene is not in foundGenes then add gene to $scope.data.genes
                    if (foundGenes.indexOf(gene) == -1) {
                    	$scope.data.genes.push( { id: gene, reactions: [] } );
                    	console.log( "gene ", gene, " was in parsed data from GenomeParser, but not from ModelParser; therefore addeds to latter")
                    }
                    // else
                        // modelGenes[foundGenes.indexOf(gene)].reactions.push(id);

                }        	
            	
            }        	
        	
        	
        });
        
        
    }
    
    
    

    // External urls used for features (deprecated)
    var featureUrl;
    var patricGeneUrl = "https://www.patricbrc.org/portal/portal/patric/Feature?cType=feature&cId=",
        rastGeneUrl = "http://rast.nmpdr.org/seedviewer.cgi?page=Annotation&feature=",
        pubSEEDUrl = "http://pubseed.theseed.org/seedviewer.cgi?page=Annotation&feature=",
        modelSEEDURL = "http:/modelseed.org/feature/";

    $scope.relativeTime = uiTools.relativeTime;

    $scope.relTime = function(datetime) {
        return $scope.relativeTime(Date.parse(datetime));
    }

    // table options
    $scope.rxnOpts = {query: '', limit: 20, offset: 0, sort: {field: 'id'}};
    $scope.cpdOpts = {query: '', limit: 20, offset: 0, sort: {field: 'id'}};
    $scope.geneOpts = {query: '', limit: 20, offset: 0, sort: null};
    $scope.compartmentOpts = {query: '', limit: 20, offset: 0, sort: null};
    $scope.biomassOpts = {query: '', limit: 20, offset: 0, sort: {field: 'id'}};
    $scope.mapOpts = {query: '', limit: 20, offset: 0, sort: {field: 'id'}};
    
    // converge orthogonal Flux data:        
    // $scope.rxnFluxesOpts = {query: '', limit: 20, offset: 0, sort: {field: 'id'}};
    $scope.getRxnFluxes = function( ) {
        // var fbaId = MV.models[0]["fba"].split( "/").slice( -1 );
    	if( $scope.selectedFBA.length>0 ) {
        var fbaPath = path + '/fba/' + $scope.selectedFBA; 
        WS.get( fbaPath ).then(function(obj) {
            FBAParser.parse(obj.data)
                     .then(function(parsed) {
                        $scope.fbas = [parsed.data];
                        $scope.models = [parsed.rawModel];
                        $scope.rxnFluxes = parsed.fba.reaction_fluxes;
                        
                        $scope.rxnFluxHash = parsed.fba.rxnhash;
                        
                        // $scope.exchangeFluxes = parsed.fba.exchange_fluxes;

                        $scope.loading = false;
                     });
        })
      }
    }
    
    $scope.getCpdFluxes = function( ) {
        // var fbaId = MV.models[0]["fba"].split( "/").slice( -1 );
    	if( $scope.selectedFBA.length>0 ) {
        var fbaPath = path + '/fba/' + $scope.selectedFBA; 
        WS.get( fbaPath ).then(function(obj) {
            FBAParser.parse(obj.data)
                     .then(function(parsed) {
                        $scope.fbas = [parsed.data];
                        $scope.models = [parsed.rawModel];
                        // $scope.cpdFluxes = parsed.fba.compoundFluxes;
                        
                        $scope.cpdFluxHash = parsed.fba.cpdhash;

                        $scope.loading = false;
                     });
        })
      }
    }
    
    // reaction table spec
    $scope.rxnHeader = [
        {label: 'ID', key: 'id', newTab: 'rxn',
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
                	 
                     links.push('<a href="/feature' + path + 
             		        '/.plantseed_data/minimal_genome/' +
                             item[i] + '" >'
                          + item[i] + ' </a>' );                	 
                     /*
                     links.push('<a href="http:/modelseed.org/feature' + path + 
                    		        '/.plantseed_data/minimal_genome/' +
                                    item[i] + '" target="_blank" class="nowrap" >'
                                 +item[i]+' <i class="fa fa-external-link text-muted"></i></a>')
                	 
                     links.push('<a href="'+
                                    featureUrl+item[i]+'" target="_blank" class="nowrap" >'
                                 +item[i]+' <i class="fa fa-external-link text-muted"></i></a>')
                                 */
                 }
                 return links.join('<br>');
             }
        } ,
        
        
        
        // converge orthogonal Flux data:
        {label: 'Flux', key: 'id',

            formatter: function( row ) {

                var fbas = [];
                var fba = "";
                var fbaPath = "";
                
                
                if( $scope.relatedFBAs && $scope.selectedFBA.length>0 ) {
                	
                    fbas.push( $scope.selectedFBA );
                        
                        if( $scope.rxnFluxes ) {
                            if( $scope.rxnFluxHash ) {
                                fbas.push( $scope.rxnFluxHash[ row ].value );
                            }
                        }
                }
                return fbas.join('<br>');
            }

        },
        {label: 'Min', key: 'id',

            formatter: function( row ) {

                var fbas = [];
                var fba = "";
                var fbaPath = "";
                
                
                if( $scope.relatedFBAs && $scope.selectedFBA.length>0 ) {
                	
                    fbas.push( $scope.selectedFBA );
                        
                        if( $scope.rxnFluxes ) {
                            if( $scope.rxnFluxHash ) {
                                fbas.push( $scope.rxnFluxHash[ row ].min );
                            }
                        }
                }
                return fbas.join('<br>');
            }

        },
        {label: 'Max', key: 'id',

            formatter: function( row ) {

                var fbas = [];
                var fba = "";
                var fbaPath = "";
                
                
                if( $scope.relatedFBAs && $scope.selectedFBA.length>0 ) {
                	
                    fbas.push( $scope.selectedFBA );
                        
                        if( $scope.rxnFluxes ) {
                            if( $scope.rxnFluxHash ) {
                                fbas.push( $scope.rxnFluxHash[ row ].max );
                            }
                        }
                }
                return fbas.join('<br>');
            }

        },
        {label: 'Class', key: 'id',

            formatter: function( row ) {

                var fbas = [];
                var fba = "";
                var fbaPath = "";
                
                
                if( $scope.relatedFBAs && $scope.selectedFBA.length>0 ) {
                	
                    fbas.push( $scope.selectedFBA );
                        
                        if( $scope.rxnFluxes ) {
                            if( $scope.rxnFluxHash ) {
                                fbas.push( $scope.rxnFluxHash[ row ].class );
                            }
                        }
                }
                return fbas.join('<br>');
            }

        }        
        /* 
        {label: 'Gapfill', key: 'gapfill',
            formatter: function(item) {
                return item.summary || '-';
            }
        }
        */ 
        ];

    $scope.cpdHeader = [{
        label: 'ID', key: 'id', newTab: 'cpd',
        call: function(e, item) {
            $scope.toggleView(e, 'cpd', item );
        }},
        {label: 'Name', key: 'name'},
        {label: 'Formula', key: 'formula'},
        {label: 'Charge', key: 'charge'},
        {label: 'Compartment', key: 'compartment'},
        
        // converge orthogonal Flux data:
        {label: 'Flux', key: 'id',

            formatter: function( row ) {
                var fbas = [];
                var fba = "";
                var fbaPath = "";                                
                if( $scope.relatedFBAs && $scope.selectedFBA.length>0 ) {                	
                    fbas.push( $scope.selectedFBA );                        
                        // if( $scope.cpdFluxes ) {
                            if( $scope.cpdFluxHash ) {
                            	if( $scope.cpdFluxHash[ row ] ){
                                    fbas.push( $scope.cpdFluxHash[ row ].value );
                            	}
                            }
                        // }
                }
                return fbas.join('<br>');
            }

        },
        {label: 'Min', key: 'id',
            formatter: function( row ) {
                var fbas = [];
                var fba = "";
                var fbaPath = "";               
                if( $scope.relatedFBAs && $scope.selectedFBA.length>0 ) {                	
                    fbas.push( $scope.selectedFBA );                       
                        // if( $scope.cpdFluxes ) {
                            if( $scope.cpdFluxHash ) {
                            	if( $scope.cpdFluxHash[ row ] ){
                                    fbas.push( $scope.cpdFluxHash[ row ].min );
                            	}
                            }
                        // }
                }
                return fbas.join('<br>');
            }

        },
        {label: 'Max', key: 'id',
            formatter: function( row ) {
                var fbas = [];
                var fba = "";
                var fbaPath = "";                
                if( $scope.relatedFBAs && $scope.selectedFBA.length>0 ) {                	
                    fbas.push( $scope.selectedFBA );
                        
                        // if( $scope.cpdFluxes ) {
                            if( $scope.cpdFluxHash ) {
                            	if( $scope.cpdFluxHash[ row ] ){
                                    fbas.push( $scope.cpdFluxHash[ row ].max );
                            	}
                            }
                        // }
                }
                return fbas.join('<br>');
            }
        },
        {label: 'Class', key: 'id',
            formatter: function( row ) {
                var fbas = [];
                var fba = "";
                var fbaPath = "";                
                if( $scope.relatedFBAs && $scope.selectedFBA.length>0 ) {               	
                    fbas.push( $scope.selectedFBA );                       
                        // if( $scope.cpdFluxes ) {
                            if( $scope.cpdFluxHash ) {
                            	if( $scope.cpdFluxHash[ row ] ){
                                    fbas.push( $scope.cpdFluxHash[ row ].class );
                            	}
                            }
                        // }
                }
                return fbas.join('<br>');
            }
        }
        
    ];


    $scope.geneHeader = [
        {label: 'Gene', key: 'id',

        	formatter: function(item) {
                if (!item.length) return '-';

                var links = [];
                // for (var i=0; i<item.length; i++) {
               	 
                    links.push('<a href="/feature' + path + 
            		        '/.plantseed_data/minimal_genome/' +
                            item + '">'
                         + item + ' </a>' );                	 

                //}
                // return links;
                return links.join('<br>');
            }
                
        },
        {label: 'Reactions', key: 'reactions', newTabList: true,
        call: function(e, item) {
          $scope.toggleView(e, 'rxn', item );
            }
        },
                
        {label: 'Functions', key: 'id',
            formatter: function( item ) {
                var fncns = [];

            	if( $scope.geneFunctions ){
                
            		fncns.push( $scope.geneFunctions[ item ] );
	
            	}                
                return fncns.join('<br>');

            }
        }
    ];

    $scope.compartmentHeader = [
        {label: 'Compartment', key: 'id'},
        {label: 'Name', key: 'name'},
        {label: 'pH', key: 'pH'},
        {label: 'Potential', key: 'potential'}
    ]

    $scope.biomassHeader = [
        {label: 'Biomass', key: 'id'},
        {label: 'Compound', key: 'cpdID'},
        {label: 'Name', key: 'name'},
        {label: 'Coefficient', key: 'coefficient'},
        {label: 'Compartment', key: 'compartment'}
    ]

    $scope.mapHeader = [
        {label: 'Name', key: 'name',
        click: function(item) {
           Tabs.addTab({name: item.name, mapID: item.id});
        }},
        {label: 'ID', key: 'id'},
        {label: 'Rxns', key: 'rxnCount'},
        {label: 'Cpds', key: 'cpdCount'}
    ]


    var modelPath = path;
    // if path is of form '<user>/home/models/'', use old paths
    var parts = path.split('/');
    if (parts[2] === 'home' && parts[3] === 'models')  {
        var modelPath = path;
    } else {
        var modelPath = path+'/model';
    }

    // fetch object data and parse it.
    $scope.loading = true;
    WS.get(modelPath).then(function(res) {
        $scope.meta = res.meta;
        setFeatureUrl(res.meta.autoMeta.source);

        $scope.models = [res.data];
        $scope.orgName = res.data.name;

        $scope.data = ModelParser.parse(res.data);
                
        $scope.loading = false;
    }).catch(function(e) {
        $scope.error = e;
        $scope.loading = false;
    })


    /* testing
    MS.getModel(path).then(function(res) {
        console.log('res',res)
        $scope.data = res.data;

        $scope.loading = false;
        var end = performance.now();
        var duration = end - start;
        console.log('time:', duration)
    })
    */

    $scope.loadingMaps = true;
    MV.getMaps()
        .then(function(maps) {
            $scope.maps = maps;
            $scope.loadingMaps = false;
        }).catch(function(e) {
            $scope.error = e;
            $scope.loading = false;
        })

    MS.getModelGapfills(path).then(function(res) {
        $scope.item = {
            relatedGapfills: res,
            path: path
        };
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
            $scope.selected = {
                id: id,
                modelCpd: ModelParser.cpdhash[item]};

            Biochem.getCpd(id)
                .then(function(cpd) {
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


    // edit stuff
    $scope.editRxnHeader = [{label: 'ID', key: 'id', newTab: 'rxn'},
                         {label: 'Name', key: 'name'},
                         {label: 'EQ', key: 'eq'},
                         {label: 'Genes', key: 'genes',
                             formatter: function(row) {
                                 if (!row.genes.length) return '-';

                                 var links = [];
                                 for (var i=0; i<row.genes.length; i++) {
                                     links.push('<a href="' +
                                                    featureUrl + row.genes[i] + '" target="_blank">'
                                                 +row.genes[i]+'</a>')
                                 }

                                 return links.join('<br>');
                             }
                        }];

    $scope.toggleEdit = function() {
        $scope.editInProgress = !$scope.editInProgress;

        $scope.editableRxns = angular.copy($scope.data.reactions)
        console.log('editable', $scope.editableRxns)
    }


    $scope.addRxns = function(ev) {
        var $self = $scope;
        $dialog.show({
            templateUrl: 'app/views/dialogs/add-rxns.html',
            targetEvent: ev,
            scope: $scope.$new(),
            preserveScope: true,
            clickOutsideToClose: true,
            controller: ['$scope', '$http',
            function($scope, $http) {
                console.log('scope', $scope)
                $scope.cancel = function(){
                    $dialog.hide();
                }

                $scope.addItems = function(items){
                    $dialog.hide();

                    console.log('add these items', items)
                    // add items to media
                    var newItems = [];
                    for (var i=0; i<items.length; i++) {
                        var rxn = items[i]
                        newItems.push({id: rxn.id+'_c0', // use default compartment for now
                                       name: rxn.name,
                                       eq: rxn.definition,
                                       compartment: 'c0',
                                       genes: []  // no genes for now.  can have have lookup?
                                      })
                    }
                    console.log('newitems', newItems)

                    console.log('before', $scope.editableRxns)
                    $self.editableRxns = newItems.concat($scope.editableRxns);
                    console.log('after', $scope.editableRxns)

                    var opItems = [];
                    for (var i=0; i<newItems.length; i++) {
                        opItems.push( {index: i, item: items[i]} );
                    }

                    // add operation to undo
                    $self.$broadcast('Events.commandOperation', {op: 'add', items: opItems});
                }

                $scope.bioRxnOpts = {query: '', limit: 10, offset: 0, sort: {field: 'id'},
                              visible: ['name', 'id', 'definition', 'deltag', 'deltagerr', 'direction'] };

                $scope.bioRxnHeader = [{label: 'Name', key: 'name'},
                                {label: 'ID', key: 'id'},
                                {label: 'EQ', key: 'definition'},
                                {label: 'deltaG', key: 'deltag'},
                                {label: 'detalGErr', key: 'deltagerr'}];


                function updateRxns() {
                    Biochem.get('model_reaction', $scope.rxnOpts)
                           .then(function(res) {
                                $scope.bioRxns = res;
                                $scope.loadingRxns = false;
                           })
                }


                $scope.$watch('bioRxnOpts', function(after, before) {
                    $scope.loadingRxns = true;
                    updateRxns();
                }, true)
            }]
        })
    }

    // Deprecated:
    function setFeatureUrl(source) {
    	/*
        if (source === 'RAST')
            featureUrl = rastGeneUrl;
        else if (source === 'PubSEED')
            featureUrl = pubSEEDUrl;
        else if (source === 'PATRIC')
            featureUrl = patricGeneUrl;
        else
            featureUrl = patricGeneUrl;
        */
    	featureURL = modelSEEDURL;
    }
}])

.controller('FBADataView',
['$scope', '$state', '$stateParams', 'Auth', 'WS', 'Biochem',
 'FBAParser', '$compile', '$timeout', 'uiTools', 'Tabs', '$mdSidenav', 'config',
function($scope, $state, $sParams, Auth, WS, Biochem,
         FBAParser, $compile, $timeout, uiTools, Tabs, $mdSidenav, config) {

    //var featureUrl = "https://www.patricbrc.org/portal/portal/patric/Feature?cType=feature&cId=";

    $scope.Tabs = Tabs;
    Tabs.totalTabCount = 3;

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
    $scope.rxnFluxesOpts = {query: '', limit: 20, offset: 0, sort: {field: 'id'}};
    $scope.exchangeFluxOpts =  {query: '', limit: 20, offset: 0, sort: null};
    $scope.mapOpts =  {query: '', limit: 20, offset: 0, sort: {field: 'id'}};


    $scope.rxnFluxesHeader = [{label: 'ID', key: 'id'},
                              {label: 'Name', key: 'name'},
                              {label: 'Flux', key: 'flux'},
                              {label: 'Min', key: 'min'},
                              {label: 'Max', key: 'max'},
                              {label: 'Class', key: 'class'},
                              {label: 'Lower Bound', key: 'lower_bound'},
                              {label: 'Upper Bound', key: 'upper_bound'}]

    $scope.exchangeFluxHeader = [{label: 'ID', key: 'id'},
                                 {label: 'Name', key: 'name'},
                                 {label: 'Flux', key: 'flux'},
                                 {label: 'Min', key: 'min'},
                                 {label: 'Max', key: 'max'},
                                 {label: 'Lower Bound', key: 'lower_bound'},
                                 {label: 'Upper Bound', key: 'upper_bound'},
                                 {label: 'Charge', key: 'charge'}]

    $scope.mapHeader = [{label: 'Name', key: 'name',
                         click: function(item) {
                             Tabs.addTab({name: item.name, mapID: item.id});
                        }},
                        {label: 'ID', key: 'id',
                        },
                        {label: 'Rxns', key: 'rxnCount'},
                        {label: 'Cpds', key: 'cpdCount'}
                        ]

    // fetch object data and parse it.
    $scope.loading = true;
    WS.get(path).then(function(obj) {
        FBAParser.parse(obj.data)
                 .then(function(parsed) {
                    $scope.fbas = [parsed.data];
                    $scope.models = [parsed.rawModel];
                    $scope.rxnFluxes = parsed.fba.reaction_fluxes;
                    $scope.exchangeFluxes = parsed.fba.exchange_fluxes;

                    $scope.loading = false;
                 });
    })


    $scope.loadingMaps = true;
    WS.listL(config.paths.maps)
      .then(function(d) {
            var maps = [];
            for (var i=0; i < d.length; i++) {
                maps.push({id: d[i][0],
                            name: d[i][7].name,
                            rxnCount: d[i][7].reaction_ids.split(',').length,
                            cpdCount: d[i][7].compound_ids.split(',').length
                            })
            }
            $scope.maps = maps;
            $scope.loadingMaps = false;
    }).catch(function(e) {
        $scope.error = e;
        $scope.loading = false;
    })


}])

.service('Tabs', ['$timeout', 'MS', '$stateParams', 'uiTools', 'ModelParser',
function ($timeout, MS, $sParams, uiTools, ModelParser) {
    var self = this;
    /**
     * tabs = [
     *    { name: 'new tab', otherData: 'foo'},
     *    { name: 'new tab 2', otherData: 'bar'}];
     */
    var tabs = [];
    this.tabs = tabs;
    this.totalTabCount = 0;
    this.selectedIndex = 0;
    this.addTab = function (tab) {
        // if is already open, go to it
        for (var i=0; i<tabs.length; i++) {
            if (tabs[i].name === tab.name) {
                this.selectedIndex = i
                return;
            }
        }

        tabs.push(angular.extend(tab, {removable: true}));

        $timeout(function() {
            for (var i=0; i<tabs.length; i++) {
                if (tabs[i].name === tab.name) {
                    self.selectedIndex = i + self.totalTabCount;
                }
            }
        })
    };

    this.removeTab = function (tab) {
        for (var j = 0; j < tabs.length; j++) {
            if (tab.name === tabs[j].name) {
                tabs.splice(j, 1);
                break;
            }
        }
    };
    this.clearTabs = function() {
        self.tabs = [];
    }

}])




.service('GenomeParser', ['MS', function(MS) {
    var self = this;
    
    // this.genehash = {};
    
    this.parse = function (data) {    	
        var modelGenes = { };
        var genomeGenes = [];

        for (var i=0; i< data.features.length; i++) {
            var ftr = data.features[ i ];
            
            genomeGenes.push( ftr.id );
	        modelGenes[ ftr.id ] = ftr.function;
            /*
	        modelGenes.push( {
                id: ftr.id,
                function: ftr.function
            } );
	        */
	    }
	return {
        genomeGenes: genomeGenes,
        dictionary: modelGenes
	};
        /*
        var modelTables =  {
            genes: modelGenes
        };        
        return modelTables;
        */	
    }
        
    return {parse: this.parse}
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
	"j":"Mitochondrial intermembrane space"
    };

    this.cpdhash = {};
    this.biohash = {};
    this.rxnhash = {};
    this.cmphash = {};
    this.genehash = {};
    this.gfhash = {};

    this.parse = function (data) {

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

        var gapfills= []
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

		    //Can we add a new column to the genes table: "function"?
                if (foundGenes.indexOf(gene) == -1)
                    modelGenes.push( { id: gene, reactions: [id] } );
                else
                    modelGenes[foundGenes.indexOf(gene)].reactions.push(id)
            }

            // add computed data to hash for viewing rxn overview
            rxn.eq = eq;
            rxn.compartment = compartNameMapping[compartment[0]]+' '+compartment[1];
            this.rxnhash[rxn.id] = rxn;

            //  gapfill stuff
            var gfData = rxn.gapfill_data;

            var gapfill = null;
            var added = false,
                reversed = false,
                summary = null;

            if (gfData && Object.keys(gfData).length > 0) {
                for (var key in gfData) {
                    if (gfData[key].indexOf('added') !== -1)
                        added = true;
                    if (gfData[key].indexOf('reversed') !== -1) {
                        reversed = true;
                    }
                }

                if (added && reversed) {
                    summary = 'added, reversed';
                } else if (added) {
                    summary = 'added';
                } else if (reversed) {
                    summary = 'reversed';
                }
                gapfill = {solutions: Object.keys(gfData),
                           summary: summary}
            }

            reactions.push({name: name,
                            id: id,
                            compartment: compartment,
                            eq: eq,
                            genes: rxn.genes,
                            gapfill: gapfill || false
                          })
        }

        var modelTables =  {reactions: reactions,
                            compounds: compounds,
                            genes: modelGenes, // doesn't this over-ride line 2010?
                            compartments: compartments,
                            biomass: biomasses};

        return modelTables;
    };

    return {cpdhash: this.cpdhash,
            biohash: this.biohash,
            rxnhash: this.rxnhash,
            cmphash: this.cmphash,
            genehash: this.genehash,
            gfhash: this.gfhash,
            parse: this.parse}


}])



.service('FBAParser',
['WS', 'ModelParser',
function(WS, ModelParser) {
    var self = this;

    this.parse = function (fbaObj) {
        self.fba = fbaObj;

        var modelRef = fbaObj.fbamodel_ref.replace(/\|\|/g, '');

        return WS.get(modelRef+'/model').then(function(res) {
                    this.modelData = res;
                    this.model = ModelParser;
                    var modelObj =  this.model.parse(res.data);
                    return {rawModel: res.data, fba: fbaData(modelObj) };
                })
    }

    function fbaData (modelObj) {
        var modelreactions = modelObj.reactions;
        var modelcompounds = modelObj.compounds;
        var biomasses = modelObj.biomass;
        var biomasscpds = modelObj.biomasscpds;
        var modelgenes = modelObj.genes;

        var reaction_fluxes = [],
            exchange_fluxes = [],
            genes = [],
            biomass = [];

        var FBAConstraints = self.fba.FBAConstraints;
        var FBAMinimalMediaResults = self.fba.FBAMinimalMediaResults;
        var FBAReactionVariables = self.fba.FBAReactionVariables;
        var FBACompoundVariables = self.fba.FBACompoundVariables;
        var FBAMinimalReactionsResults = self.fba.FBAMinimalReactionsResults;
        var FBAMetaboliteProductionResults = self.fba.FBAMetaboliteProductionResults;
        var FBADeletionResults = self.fba.FBADeletionResults;
        var FBACompoundBounds = self.fba.FBACompoundBounds;
        var FBAReactionBounds = self.fba.FBAReactionBounds;
        this.rxnhash = {};
        for (var i=0; i < FBAReactionVariables.length; i++) {
            var rxn = FBAReactionVariables[i];
            var rxnid = rxn.modelreaction_ref.split("/").pop();
            FBAReactionVariables[i].ko = 0;   // huh?!  leaving this here for now
            this.rxnhash[rxnid] = FBAReactionVariables[i];

            reaction_fluxes.push({name: model.rxnhash[rxnid]? model.rxnhash[rxnid].name : 'not found',
                                 id: rxnid,
                                 ko: rxn.ko,
                                 min: rxn.min,
                                 max: rxn.max,
                                 lower_bound: rxn.lowerBound,
                                 upper_bound: rxn.upperBound,
                                 flux: rxn.value,
                                 class: rxn.class
                                })
        }

        for (var i=0; i < self.fba.reactionKO_refs.length; i++) {
            var rxnid = self.fba.reactionKO_refs[i].split("/").pop();
            this.rxnhash[rxnid].ko = 1;
        }

        this.cpdhash = {};
        for (var i=0; i < FBACompoundVariables.length; i++) {
            var cpd = FBACompoundVariables[i];
            var cpdid = cpd.modelcompound_ref.split("/").pop();
            var modelcpd = model.cpdhash[cpdid];
            cpd.additionalcpd = 0;

            this.cpdhash[cpdid] = cpd;
            exchange_fluxes.push({name: modelcpd ? modelcpd.name : 'not found',
                                 charge: modelcpd ? modelcpd.charge : 'not found',
                                 charge: modelcpd ? modelcpd.formula : 'not found',
                                 id: cpdid,
                                 min: cpd.min,
                                 max: cpd.max,
                                 lower_bound: cpd.lowerBound,
                                 upper_bound: cpd.upperBound,
                                 flux: cpd.value,
                                 class: cpd.class
                                })
        }
        for (var i=0; i < self.fba.additionalCpd_refs.length; i++) {
            var cpdid = self.fba.additionalCpd_refs[i].split("/").pop();
            this.cpdhash[cpdid].additionalcpd = 1;
        }
        this.biohash = {};
        for (var i=0; i < self.fba.FBABiomassVariables.length; i++) {
            var bioid = self.fba.FBABiomassVariables[i].biomass_ref.split("/").pop();
            this.biohash[bioid] = self.fba.FBABiomassVariables[i];
        }
        this.maxpod = 0;
        this.metprodhash = {};
        for (var i=0; i < FBAMetaboliteProductionResults.length; i++) {
            this.tabList[4].columns[5].visible = 1;
            var metprod = FBAMetaboliteProductionResults[i];
            var cpdid = metprod.modelcompound_ref.split("/").pop();
            this.metprodhash[cpdid] = metprod;
        }
        this.genehash = {};
        for (var i=0; i < modelgenes.length; i++) {
            this.genehash[modelgenes[i].id] = modelgenes[i];
            this.genehash[modelgenes[i].id].ko = 0;
        }
        /*
        for (var i=0; i < self.data.geneKO_refs.length; i++) {
            var geneid = self.data.geneKO_refs[i].split("/").pop();
            this.genehash[geneid].ko = 1;
        }*/
        this.delhash = {};
        for (var i=0; i < FBADeletionResults.length; i++) {
            var geneid = FBADeletionResults[i].feature_refs[0].split("/").pop();
            this.delhash[geneid] = FBADeletionResults[i];
        }
        this.cpdboundhash = {};
        for (var i=0; i < FBACompoundBounds.length; i++) {
            var cpdid = FBACompoundBounds[i].modelcompound_ref.split("/").pop();
            this.cpdboundhash[cpdid] = self.fba.FBACompoundBounds[i];
        }
        this.rxnboundhash = {};
        for (var i=0; i < FBAReactionBounds.length; i++) {
            var rxnid = FBAReactionBounds[i].modelreaction_ref.split("/").pop();
            this.rxnboundhash[rxnid] = self.fba.FBAReactionBounds[i];
        }
        for (var i=0; i< modelgenes.length; i++) {
            var mdlgene = modelgenes[i];
            if (this.genehash[mdlgene.id]) {
                mdlgene.ko = this.genehash[mdlgene.id].ko;
            }
            if (this.delhash[mdlgene.id]) {
                mdlgene.growthFraction = this.delhash[mdlgene.id].growthFraction;
            }
        }
        for (var i=0; i< modelreactions.length; i++) {
            var mdlrxn = modelreactions[i];
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
        for (var i=0; i< modelcompounds.length; i++) {
            var mdlcpd = modelcompounds[i];
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
        for (var i=0; i< biomasses.length; i++) {
            var bio = biomasses[i];
            if (this.biohash[bio.id]) {
                bio.upperFluxBound = this.biohash[bio.id].upperBound;
                bio.lowerFluxBound = this.biohash[bio.id].lowerBound;
                bio.fluxMin = this.biohash[bio.id].min;
                bio.fluxMax = this.biohash[bio.id].max;
                bio.flux = this.biohash[bio.id].value;
                bio.fluxClass = this.biohash[bio.id].class;
                modelreactions.push(bio);
            } else {
                this.biohash[bio.id] = bio;
                bio.upperFluxBound = 1000;
                bio.lowerFluxBound = 0;
                bio.fluxMin = 0;
                bio.fluxMax = 1000;
                bio.flux = 0;
                bio.fluxClass = "Blocked";
                modelreactions.push(bio);
            }
            bio.disp_low_flux = bio.fluxMin + "<br>(" + bio.lowerFluxBound + ")";
            bio.disp_high_flux = bio.fluxMax + "<br>(" + bio.upperFluxBound + ")";
        }

        var fbaObj = {reaction_fluxes: reaction_fluxes,
                      exchange_fluxes: exchange_fluxes,
                      genes: genes,
                      
                      
                      cpdhash: cpdhash,
                     
                      rxnhash: rxnhash,
                      
                      
                      biomass: biomass}

        return fbaObj
        /*
        for (var i=0; i < this.biomasscpds.length; i++) {
            var biocpd = this.biomasscpds[i];
            if (this.biohash[biocpd.biomass]) {
                biocpd.bioflux = this.biohash[biocpd.biomass].flux;
            }
            if (this.metprodhash[biocpd.id]) {
                biocpd.maxprod = this.metprodhash[biocpd.id].maximumProduction;
            }
        }*/
    }

    return {parse: this.parse}

}])


.controller('GapfillDataView',
['$scope', '$stateParams', 'WS', '$http', 'Biochem',
function($scope, $sParams, WS, $http, Biochem) {

    // path and name of object
    var path = $sParams.path;
    $scope.name = path.split('/').pop()

    var modelDirA = path.split('/').slice(0, path.split('/').length-2),
        modelName = modelDirA.pop().slice(1);
    $scope.modelPath = modelDirA.join('/')+'/'+modelName;

    $scope.tabs = {tabIndex : 0};

    $scope.gfOpts = {query: '', limit: 20, offset: 0, sort: {} };

    $scope.gfHeader = [{label: 'Reaction', key: 'rxn'},
                       {label: 'Equation', key: 'eq'},
                       {label: 'Compartment', key: 'compartment'}];

    $scope.loading = true;
    WS.getObjectMeta(path)
      .then(function(res) {
          var meta = res[0][7];
          $scope.meta = meta;

          parseSolution(JSON.parse(meta.solutiondata)).then(function(data) {
              $scope.gfData = data
              $scope.loading = false;
          })
      })

    var data = []

    function parseSolution(solutionData) {
        var data = [], ids = [];

      if( solutionData ) {  
        for (var i=0; i<solutionData[0].length; i++) {
            var rxn = solutionData[0][i],
                id = rxn.reaction_ref.split('/').pop();

            console.log('solution', solutionData)
            data.push({rxn: id,
                       compartment: rxn.compartment_ref.split('/').pop()+rxn.compartmentIndex,
                       direction: rxn.direction
                   });

            ids.push(id.split('_')[0]);
        }
      }

        // add equation from biochem
        return Biochem.getRxn(ids, {select: 'definition'}).then(function(res) {
            for (var i=0; i<ids.length; i++) {
                var d = data[i].direction, dir;

                if (d === '>' ) dir = '=>';
                else if (d === '<' ) dir = '<=';
                else if (d === '=' ) dir = '<=>';
                else dir = '???';

                data[i].eq = res[i].definition.replace('<=>', dir);
            }
            return data;
        })
    }

}])


// New Test Service Calls Page (experimental test harness only):
.controller('TestServiceCall',
['$scope', '$stateParams', 'WS', 'MS',
function TestServiceCall($s, $sParams, WS, MS) {
    
    $s.submit = function( ){
        var serviceName = $s.selectedService;
        var parameters = $s.parminput;
        var methodName = $s.$$childHead.selectedMethod;
        
        var returnoutput = "";
        
        var call = "";

        if( serviceName=="WS" ) {
          call += "WS.";   
          switch(methodName) {
            case "list":           
              returnoutput = WS.list(parameters);
              document.getElementById(13).value = returnoutput;
              call += "list(";
              break;
            case "listL":
              returnoutput = WS.listL(parameters);
              document.getElementById(13).value = returnoutput;
              call += "listL(";
              break;              
            case "listPublicPlants":
              returnoutput = WS.listPublicPlants(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "listPublicPlants(";
              break;              
            case "sanitizeMeta":
              returnoutput = WS.sanitizeMeta(parameters);
              document.getElementById(13).value = returnoutput;
              call += "sanitizeMeta(";
              break;
            case "get":
              returnoutput = WS.get(parameters);
              document.getElementById(13).value = returnoutput;
              call += "get(";
              break;
            case "getObjects":
              returnoutput = WS.getObjects(parameters);
              document.getElementById(13).value = returnoutput;
              call += "getObjects(";
              break;
            case "getObjectsMeta":            
              returnoutput = WS.getObjectsMeta(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "getObjectsMeta(";
              break;
            case "getObjectsMetas":            
              returnoutput = WS.getObjectsMetas(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "getObjectsMetas(";
              break;
            case "saveMeta":            
              returnoutput = WS.saveMeta(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "saveMeta(";
              break;              
            case "mv":            
              returnoutput = WS.mv(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "mv(";
              break; 
            case "copy":            
              returnoutput = WS.copy(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "copy(";
              break; 
            case "deleteObj":            
              returnoutput = WS.deleteObj(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "deleteObj(";
            break; 
            case "deleteFolder":            
              returnoutput = WS.deleteFolder(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "deleteFolder(";
            break;               
            case "uploadData":            
              returnoutput = WS.uploadData(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "uploadData(";
            break;              
            case "createFolder":            
              returnoutput = WS.createFolder(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "createFolder(";
            break;
            case "createModelFolder":            
              returnoutput = WS.createModelFolder(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "createModelFolder(";
            break;
            case "getModel":            
              returnoutput = WS.getModel(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "getModel(";
            break;  
            case "createNode":            
              returnoutput = WS.createNode(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "createNode(";
            break;                        
           case "getDownloadURL":            
              returnoutput = WS.getDownloadURL(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "getDownloadURL(";
            break;            
           case "getPermissions":            
              returnoutput = WS.getPermissions(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "getPermissions(";
            break; 
           case "save":            
              returnoutput = WS.save(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "save(";
            break; 

            default:
              // text = "Error: Test Service Call";
              break;  
            }
            
        }
        else {
          call += "MS.";               
          switch(methodName) {
            case "listRastGenomes":
              returnoutput = MS.listRastGenomes(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "listRastGenomes(";
              break;
            case "getDownloads":
              returnoutput = MS.getDownloads(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "getDownloads(";
                            break;
            case "reconstruct":
              returnoutput = MS.reconstruct(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "reconstruct(";
              break;
            case "runFBA":
              returnoutput = MS.runFBA(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "runFBA(";
              break;
            case "gapfill":
              returnoutput = MS.gapfill(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "gapfill(";
              break;              
            case "createGenomeFromShock":
              returnoutput = MS.createGenomeFromShock(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "createGenomeFromShock(";
              break;              
            case "createExpressionFromShock":
              returnoutput = MS.createExpressionFromShock(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "createExpressionFromShock(";
              break;                           
            case "annotatePlant":
              returnoutput = MS.annotatePlant(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "annotatePlant(";
              break;              
            case "getObjectMetas":
              returnoutput = MS.getObjectMetas(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "getObjectMetas(";
              break;                                                  
            case "listModels":
              returnoutput = MS.listModels(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "listModels(";
              break;             
            case "sanitizeModel":
              returnoutput = MS.sanitizeModel(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "sanitizeModel(";
              break;
            case "listMyMedia":
              returnoutput = MS.listMyMedia(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "listMyMedia(";
              break;
            case "addMyMedia":
              returnoutput = MS.addMyMedia(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "addMyMedia(";
              break;
            case "listPublicMedia":
              returnoutput = MS.listPublicMedia(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "listPublicMedia(";
              break;
            case "sanitizeMedia":
              returnoutput = MS.sanitizeMedia(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "sanitizeMedia(";
              break;
            case "sanitizeMediaObjs":
              returnoutput = MS.sanitizeMediaObjs(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "sanitizeMediaObjs(";
              break;           
            case "getModelFBAs":
              returnoutput = MS.getModelFBAs(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "getModelFBAs(";
              break;
            case "manageGapfills":
              returnoutput = MS.manageGapfills(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "manageGapfills(";
              break;
            case "getModelEdits":
              returnoutput = MS.getModelEdits(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "getModelEdits(";
              break;
            case "getFeature":
              returnoutput = MS.getFeature(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "getFeature(";
              break;
            case "addModel":
              returnoutput = MS.addModel(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "addModel(";
              break;
            case "submittedModel":
              returnoutput = MS.submittedModel(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "submittedModel(";
              break;              
            case "getModel":
              returnoutput = MS.getModel(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "getModel(";
              break;
          
          
          
            case "getModel":
              returnoutput = MS.getModel(parameters);
              document.getElementById(13).value = returnoutput;              
              call += "getModel(";
              break;
          
            default:
              // text = "Error: Test Service Call";
              break;  
            }
        }
        call += parameters + ")"; 
        console.log('Test Called TestServiceCall', serviceName, methodName, parameters);
        
        console.log("Call: ", call);
    
        // TODO: Switch to map to service calls:
    
    };
    
}])

