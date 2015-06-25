

angular.module('ModelSEED',
['config',
 'core-directives',
 'ctrls',
 'ms-ctrls',
 'help-ctrls',
 'DataViewCtrls',
 'duScroll',
 'ui.router',
 'ngAnimate',
 'kbase-rpc',
 'Auth',
 'dd-filter',
 'ngMaterial',
 'FBA',
 'ModelViewer',
 'Patric',
 'WS',
 'MS',
 'Upload',
 'Biochem',
 'Browser',
 'Regulons',
 'Dialogs'
 ])
.config(['$locationProvider', '$stateProvider', '$httpProvider',
         '$urlRouterProvider', '$urlMatcherFactoryProvider', '$sceProvider',
function($locationProvider, $stateProvider, $httpProvider,
         $urlRouterProvider, $urlMatcherFactoryProvider, $sceProvider) {

    $locationProvider.html5Mode(false);
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
        .state('home', {
            url: "/home/?login&redirect",
            templateUrl: 'app/views/home.html',
            controller: 'Home',
        }).state('app', {
            templateUrl: 'app/views/app.html',
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
        })

        // The good stuff
        .state('app.biochem', {
            url: "/biochem/",
            templateUrl: 'app/views/biochem/biochem.html',
            controller: 'Biochem',
            authenticate: true
        }).state('app.reconstruct', {
            url: "/reconstruct/",
            templateUrl: 'app/views/reconstruct.html',
            controller: 'Reconstruct',
            authenticate: true
        }).state('app.myModels', {
            url: "/my-models/",
            templateUrl: 'app/views/my-models.html',
            controller: 'MyModels',
            authenticate: true
        }).state('app.publicModels', {
            url: "/models/",
            templateUrl: 'app/views/public-models.html',
            controller: 'Public',
            authenticate: true
        })

        // Object Editors
        .state('app.modelEditor', {
            url: "/model-editor/",
            templateUrl: 'app/views/editor/model-editor.html',
            controller: 'ModelEditor',
            authenticate: true
        }).state('app.media', {
            url: "/media-editor/",
            templateUrl: 'app/views/editor/media-editor.html',
            controller: 'MediaEditor',
            authenticate: true
        })

        // comparative analysis
        .state('app.compare', {
            url: "/compare",
            templateUrl: 'app/views/compare.html',
            controller: 'Compare',
            authenticate: true
        })

        // ModelSEED Projects
        .state('projects', {
            templateUrl: 'projects/projects.html',
        }).state('projects.home', {
            url: '/projects',
            templateUrl: 'projects/home.html',
        }).state('regulons', {
            url: '/regulons',
            templateUrl: 'projects/regulons/overview.html',
        }).state('regulons.genes', {
            url: '/genes',
            templateUrl: 'projects/regulons/genes.html',
            controller: 'Regulons'
        })

        .state('app.api', {
            url: "/help/api",
            templateUrl: 'app/views/docs/api.html',
            controller: 'Help',
        })

        // prototype page
        .state('app.proto', {
            url: "/proto",
            templateUrl: 'app/views/proto.html',
            controller: 'Proto',
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
        //rgb(38, 198, 218);
        //.accentPalette('light-blue');
}])

.run(['$rootScope', '$state', '$stateParams', '$location', 'Auth', '$timeout', '$templateCache',
function($rootScope, $state, $sParams, $location, auth, $timeout, $templateCache) {

    $rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams){
        $templateCache.removeAll();

        // if first load on home and user is authenticated,
        // forward to application page [good UX!]
        if (fromState.name === '' && toState.name === "home" && auth.isAuthenticated()) {
            // wait for state set
            $timeout(function() {
                $state.transitionTo('app.reconstruct')
                event.preventDefault();
            })
        }

        // else, if not authenticated and url is private, go to home
        else if (toState.authenticate && !auth.isAuthenticated()) {
            //$state.transitionTo('home', $sParams, false);
            //event.preventDefault();
        }


        // fixme
        if (['modelPage', 'fbaPage'].indexOf(toState.name) === -1 ) {
            angular.element('#selected-models').find('.active').removeClass('active')
        }
    })


    $rootScope.$state = $state;
    $rootScope.$stateParams = $sParams;

    $rootScope.user = auth.user;
    $rootScope.token = auth.token;
}]);

// parse name from workspace path
String.prototype.toName = function() {
    return this.split('/').pop();
}
