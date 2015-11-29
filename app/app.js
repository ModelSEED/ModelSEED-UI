

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
 'dd-filter',       // custom module for creating searchable dropdowns.
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
 'docs-directives'
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
        }).state('main.home', {
            url: "/?login&redirect",
            templateUrl: 'app/views/home.html',
            controller: 'Home',
        }).state('main.team', {
            url: "/team",
            templateUrl: 'app/views/docs/team.html',
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
            url: '/regulons',
            templateUrl: '/ms-projects/regulons/overview.html',
        }).state('main.projects.regulons.genes', {
            url: '/genes?q',
            templateUrl: '/ms-projects/regulons/genes.html',
            controller: 'Regulons'
        }).state('main.projects.regulons.regulators', {
            url: '/regulators?q',
            templateUrl: '/ms-projects/regulons/regulators.html',
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
        })
        .state('main.api', {
            url: "/api",
            templateUrl: 'app/views/docs/api.html',
            controller: 'API'
        })

        /*
        .state('main.about.api', {
            url: "/api",
            templateUrl: 'app/views/docs/old-api.html',
            controller: 'Help',
        })*/

        // main application template
        .state('app', {
            templateUrl: 'app/views/app.html',
        })


        .state('app.biochem', {
            url: "/biochem/?tab",
            templateUrl: 'app/views/biochem/biochem.html',
            controller: 'Biochem',
            authenticate: true,
            //reloadOnSearch: false
        }).state('app.biochemViewer', {
            url: "/biochem-viewer/?cpd?tab",
            templateUrl: 'app/views/biochem/biochem-viewer.html',
            controller: 'BiochemViewer',
            authenticate: true
        }).state('app.plantAnnotations', {
            url: "/plant-annotations/",
            templateUrl: 'app/views/annotations.html',
            controller: 'PlantAnnotations',
            authenticate: true
        }).state('app.genomes', {
            url: "/genomes/",
            templateUrl: 'app/views/genomes/genomes.html',
            controller: 'Genomes',
            authenticate: true
        }).state('app.media', {
            url: "/list-media/?tab",
            templateUrl: 'app/views/media.html',
            controller: 'Media',
            authenticate: true
        }).state('app.myModels', {
            url: "/my-models/",
            templateUrl: 'app/views/my-models.html',
            controller: 'MyModels',
            authenticate: true
        })


        // data browser
        .state('app.myData', {
            url: "/data{dir:nonURIEncoded}",
            templateUrl: 'app/components/browser/browser.html',
            controller: 'MyData',
            authenticate: true
        }).state('app.modelPage', {
            url: "/model{path:nonURIEncoded}?login",
            templateUrl: 'app/views/data/model.html',
            controller: 'ModelDataView',
            authenticate: true
        }).state('app.fbaPage', {
            url: "/fba{path:nonURIEncoded}",
            templateUrl: 'app/views/data/fba.html',
            controller: 'FBADataView',
            authenticate: true
        }).state('app.genomePage', {
            url: "/genome{path:nonURIEncoded}",
            templateUrl: 'app/views/data/genome.html',
            controller: 'GenomeDataView',
            authenticate: true
        }).state('app.featurePage', {
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


        // Object Editors
        .state('app.modelEditor', {
            url: "/model-editor/",
            templateUrl: 'app/views/editor/model-editor.html',
            controller: 'ModelEditor',
            authenticate: true
        })/*.state('app.media', {
            url: "/media-editor/",
            templateUrl: 'app/views/editor/media-editor.html',
            controller: 'MediaEditor',
            authenticate: true
        })*/

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
            controller: 'Proto',
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
        //9FA1DE
        //


}])


.run(['$rootScope', '$state', '$stateParams', '$window',
      '$location', 'Auth', '$timeout', '$templateCache', 'config', 'AuthDialog',
function($rootScope, $state, $sParams, $window,
         $location, auth, $timeout, $templateCache, config, AuthDialog) {

    $rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams){
        //$templateCache.removeAll();

        // if first load on home and user is authenticated,
        // forward to application page [good UX!]
        if (fromState.name === '' && toState.name === "main.home" && auth.isAuthenticated()) {
            // wait for state set
            $timeout(function() {
            $state.transitionTo('app.genomes')
                event.preventDefault();
            })
        }

        // else, if not authenticated and url is private, force login
        else if (toState.authenticate && !auth.isAuthenticated()) {
            AuthDialog.signIn();
        }

        // google analytics
        $window.ga('send', 'pageview', $location.path());
    })

    $rootScope.$state = $state;
    $rootScope.$stateParams = $sParams;

    $rootScope.user = auth.user;
    $rootScope.token = auth.token;

    $rootScope.includePlants = config.includePlants;
}]);
