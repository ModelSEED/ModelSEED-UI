

angular.module('ModelSEED',
['config',          // config file for urls, workspace paths, etc
 'core-directives', // a large set of directives.  probably should be broken into components
 'ctrls',           // general controllers
 'ms-ctrls',        // controllers more specific to the ModelSEED site
 'ms-tour',         // controllers related to interactive tour
 'help-ctrls',      // controllers related to help docs.  probably obsolete.
 'DataViewCtrls',   // controllers related to rendering of workspace objects
 'duScroll',        // plugin for hash based scrolling
 'ui.router',       // router for all urls
 'ngMaterial',      // angular material.  main dependency for layout/css, "widgets", etc
 'ngAnimate',       // angular animate.  ngMaterial dependency.
 'ms-rpc',          // module for simplifying with the KBase type compilier RPC requests
 'Auth',            // module for Auth-related requests and state
 'mega-dropdown',   // custom module for hover-over dropdowns
 'ng-context-menu', // module for right-click menus (see workspace browser)
 'FBA',
 'ModelViewer',
 'MSSolr',
 'Patric',
 'WS',
 'MS',
 'Upload',
 'Biochem',
 'Browser',
 'Regulons',
 'Fusions',
 'Dialogs',
 'docs-directives',
 'Socket',
 'Jobs'
 ])
.config(['$locationProvider', '$stateProvider', '$httpProvider',
         '$urlRouterProvider', '$urlMatcherFactoryProvider', '$sceProvider',
function($locationProvider, $stateProvider, $httpProvider,
         $urlRouterProvider, $urlMatcherFactoryProvider, $sceProvider) {

    $locationProvider.html5Mode(true);
    $sceProvider.enabled(false);
    $urlMatcherFactoryProvider.strictMode(false);

    function valToString(val) {
        return val !== null ? decodeURI(val) : val;
    }

    $urlMatcherFactoryProvider.type('nonURIEncoded', {
        encode: valToString,
        decode: valToString,
        is: function () { return true; }
    });

    $stateProvider
        .state('main', {
        	
            templateUrl: 'app/views/main.html',
            
            
            controller: "FrontPage"
            	
            	
            	
        }).state('main.home', {
            url: "/?login&redirect",
            templateUrl: 'app/views/home.html',
            controller: 'Home',
        }).state('main.team', {
            url: "/team",
            templateUrl: 'app/views/docs/team.html',
        }).state('main.teamMember', {
            url: "/team/:name",
            templateUrl: function ($stateParams){
                return 'app/views/docs/team/'+$stateParams.name+'.html';
            },
        }).state('main.publications', {
            url: "/publications",
            templateUrl: 'app/views/docs/publications.html',
            controller: 'Publications'
        })

        // ModelSEED Projects
        .state('main.projects', {
            url: '/projects',
            templateUrl: '/ms-projects/home.html'
        }).state('main.projects.regulons', {
            url: '/regulons?q',
            templateUrl: '/ms-projects/regulons/overview.html',
            controller: 'Regulons'
        })

        .state('main.projects.fusions', {
            url: '/fusions',
            templateUrl: '/ms-projects/fusions/overview.html',
            controller: 'Fusions'
        }).state('main.projects.trainingGene', {
            url: '/fusions/training-gene/:gene',
            templateUrl: '/ms-projects/fusions/training-gene.html',
            controller: 'TrainingGene'
        }).state('main.projects.fusionGene', {
            url: '/fusions/fusion-gene/:gene',
            templateUrl: '/ms-projects/fusions/fusion-gene.html',
            controller: 'FusionGene'
        }).state('main.projects.fusionRole', {
            url: '/fusions/role/:role',
            templateUrl: '/ms-projects/fusions/fusion-role.html',
            controller: 'FusionRole'
        }).state('main.projects.fusionCdd', {
            url: '/fusions/cdd/:cdd',
            templateUrl: '/ms-projects/fusions/fusion-cdd.html',
            controller: 'FusionCDD'
        }).state('main.projects.fusionCddSets', {
            url: '/fusions/cdd-sets/:cdd',
            templateUrl: '/ms-projects/fusions/fusion-cdd-sets.html',
            controller: 'FusionCDDSets'
        }).state('main.projects.fusionGenomeStats', {
            url: '/fusions/genome-stats/:id',
            templateUrl: '/ms-projects/fusions/fusion-genome-stats.html',
            controller: 'FusionGenomeStats'
        }).state('main.projects.fusionReactions', {
            url: '/fusions/reactions/:id',
            templateUrl: '/ms-projects/fusions/fusion-reactions.html',
            controller: 'FusionReactions'
        }).state('main.projects.fusionSubsystems', {
            url: '/fusions/subsystems/:id',
            templateUrl: '/ms-projects/fusions/fusion-subsystems.html',
            controller: 'FusionSubsystems'
        })

        // event pages
        .state('main.events', {
            url: '/events',
            templateUrl: '/ms-projects/events/events.html',
        }).state('main.events.plantseed2016', {
            url: '/plantseed2016',
            templateUrl: '/ms-projects/events/plantseed2016/home.html',
        })


        // about pages
        .state('main.about', {
            url: '/about',
            templateUrl: 'app/views/about.html',
        }).state('main.about.version', {
            url: "/version",
            templateUrl: 'app/views/version.html',
            controller: 'Version'
        }).state('main.about.faq', {
            url: "/faq",
            templateUrl: 'app/views/docs/faq.html',
        }).state('main.about.data', {
            url: "/data-sources",
            templateUrl: 'app/views/docs/sources.html',
        }).state('main.api', {
            url: "/about/api",
            templateUrl: 'app/views/docs/api.html',
            controller: 'API'
        })

        // main application template
        .state('app', {
            templateUrl: 'app/views/app.html',
        })

        // main views
        .state('app.biochem', {
            url: "/biochem/:chem",
            templateUrl: 'app/views/biochem/biochem.html',
            controller: 'Biochem'
        }).state('app.cpd', {
            // WARNING: external services depend on this URL.
            url: "/biochem/compounds/:id",
            templateUrl: 'app/views/biochem/compound.html',
            controller: 'Compound'
        }).state('app.rxn', {
            // WARNING: external services depend on this URL.
            url: "/biochem/reactions/:id",
            templateUrl: 'app/views/biochem/reaction.html',
            controller: 'Reaction'
        })

        .state('app.plantAnnotations', {
            url: "/plant-annotations/",
            templateUrl: 'app/views/annotations.html',
            controller: 'PlantAnnotations',
            authenticate: true
            
            
            
        }).state('app.RefModels', {
            url: "/genomes/:ref",
            templateUrl: 'app/views/genomes/genomes.html',
            controller: 'RefModels',
            authenticate: true



        /*    
        }).state('app.genomes', {
            url: "/genomes/",
            templateUrl: 'app/views/genomes/genomes.html',
            controller: 'Genomes',
            authenticate: true
        */    
            
        }).state('app.media', {
            url: "/list-media/?tab",
            templateUrl: 'app/views/media.html',
            controller: 'Media',
            authenticate: true
            
            
            }).state('app.myMedia', {
            url: "/myMedia/?tab",
            templateUrl: 'app/views/my-media.html',
            controller: 'MyMedia',
            authenticate: true
            
        }).state('app.myModels', {
            url: "/my-models/",
            templateUrl: 'app/views/my-models.html',
            controller: 'MyModels',
            authenticate: true
        }).state('app.jobs', {
            url: "/my-jobs/",
            templateUrl: 'app/views/my-jobs.html',
            controller: 'Jobs',
            authenticate: true,
            /*resolve: {
                getStatus: function(Jobs) {
                    return Jobs.getStatus()
                }
            }*/
        })

        // data browser
        .state('app.myData', {
            url: "/data{dir:nonURIEncoded}",
            templateUrl: 'app/components/browser/browser.html',
            controller: 'MyData',
            authenticate: true
            
        }).state('app.modelPage', {
            url: "/model{path:nonURIEncoded}?login",
            
            // TEST TEST TEST:
            // templateUrl: 'app/views/data/test_calls.html',
            
            templateUrl: 'app/views/data/model.html',
            controller: 'ModelDataView',
            authenticate: true
        }).state('app.fbaPage', {
            url: "/fba{path:nonURIEncoded}",
            templateUrl: 'app/views/data/fba.html',
            controller: 'FBADataView',
            authenticate: true
        /*    
        }).state('app.genomePage', {
            url: "/genome{path:nonURIEncoded}",
            templateUrl: 'app/views/data/genome.html',
            controller: 'GenomeDataView',
            authenticate: true
        
        }).state('app.genomePage--', {
            url: "/genome{path:nonURIEncoded}",
            templateUrl: 'app/views/genomes/genome.html',
            controller: 'GenomeDataView--',
            authenticate: true
        */

            
            
            
        // Build New Model     
        } ).state('app.plantPage', {
            url: "/plant",       
            // url: "/plant{path:nonURIEncoded}",

            templateUrl: 'app/views/data/plant.html',
            
            controller: 'BuildPlant',
            
            authenticate: true


            
        } ).state('app.featurePage', {
            url: "/feature{genome:nonURIEncoded}/{feature:nonURIEncoded}",
            templateUrl: 'app/views/data/feature.html',
            controller: 'FeatureDataView',
            authenticate: true
        }).state('app.mediaPage', {
            url: "/media{path:nonURIEncoded}",
            templateUrl: 'app/views/data/media.html',
            controller: 'MediaDataView',
            authenticate: true
        }).state('app.gfPage', {
            url: "/gapfill{path:nonURIEncoded}",
            templateUrl: 'app/views/data/gapfill.html',
            controller: 'GapfillDataView',
            authenticate: true
        })

        // object editors (for media editor, see media view)
        .state('app.modelEditor', {
            url: "/model-editor/",
            templateUrl: 'app/views/editor/model-editor.html',
            controller: 'ModelEditor',
            authenticate: true
        })

        // comparative analysis
        .state('app.compare', {
            url: "/compare",
            templateUrl: 'app/views/compare.html',
            controller: 'Compare',
            authenticate: true
        })


        // prototype page
        .state('app.proto', {
            url: "/proto",
            templateUrl: 'app/views/proto.html',
            /*controller: 'Proto',*/
            authenticate: true            
        }).state('app.maps', {
            url: "/maps",
            templateUrl: 'app/views/maps.html',
            controller: 'Maps',
        }).state('app.map', {
            url: "/maps{path:nonURIEncoded}",
            templateUrl: 'app/views/data/map.html',
            controller: 'Map',
        }).state('app.json', {
            url: "/json{path:nonURIEncoded}",
            templateUrl: 'app/views/data/json.html',
            controller: 'Json',
        }).state('app.image', {
            url: "/image{path:nonURIEncoded}",
            templateUrl: 'app/views/data/image.html',
            controller: 'Image',
        })


        .state('app.userStatus', {
            url: "/user-status",
            templateUrl: 'app/views/docs/user-status.html',
            controller: 'UserStatus',
            authenticate: true
        })

        /* only used for testing analysis forms */
        .state('app.run', {
            url: "/run",
            templateUrl: 'app/views/run/run.html',
        }).state('app.runReconstruct', {
            url: "/run/reconstruct",
            templateUrl: 'app/views/apps/reconstruct.html',
            controller: 'RunReconstruct',
        }).state('app.runFBA', {
            url: "/run/fba",
            templateUrl: 'app/views/apps/runFBA.html',
            controller: 'RunFBA',
        }).state('app.runGapfill', {
            url: "/run/gapfill",
            templateUrl: 'app/views/apps/gapfill.html',
            controller: 'RunGapfill',
        })

    // default redirects (when not already authenticated)
    $urlRouterProvider.when('', '/home/')
                      .when('/', '/home/')
                      .when('#', '/home/');

}])

.config(['$mdThemingProvider', function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .primaryPalette('cyan')
        .accentPalette('light-blue');
}])


.run(['$rootScope', '$state', '$stateParams', '$window',
      '$location', 'Auth', '$timeout', 'config', 'AuthDialog',
function($rootScope, $state, $sParams, $window,
         $location, auth, $timeout, config, AuthDialog) {

    $rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams){
        // if first load on home and user is authenticated,
        // forward to application page.
        // if not authenticated and url is private, force login.
        if (fromState.name === '' && toState.name === "main.home" && auth.isAuthenticated()) {
            // wait for state digest
            $timeout(function() {
                $state.transitionTo('app.RefModels')
                event.preventDefault();
            })
        } else if (toState.authenticate && !auth.isAuthenticated()) {
            // wait for state digest
            $timeout(function() {
                AuthDialog.signIn();
            })
        }

        // google analytics
        $window.ga('send', 'pageview', $location.path());
    })

    $rootScope.$state = $state;
    $rootScope.$stateParams = $sParams;

    $rootScope.user = auth.user;
    $rootScope.token = auth.token;

    $rootScope.includePlants = config.includePlants;


    // instantiate user feedback plugin
    $.feedback({
        ajaxURL: config.services.ms_rest_url+'/feedback',
        html2canvasURL: 'components/html2canvas/build/html2canvas.js'
    });
}])

.run(['Jobs', function(Jobs) {

    // Note: the jobs service is invoked here (services/jobs.js)
    // which kicks of polling if needed.
    // Order is important so that auth is finished.

}])
