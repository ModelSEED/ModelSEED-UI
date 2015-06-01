

angular.module('ModelSEED',
['config',
 'core-directives',
 'ctrls',
 'ms-ctrls',
 'help-ctrls',
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
 'Regulons'
 ])
.config(['$locationProvider', '$stateProvider', '$httpProvider',
         '$urlRouterProvider', '$urlMatcherFactoryProvider',
function($locationProvider, $stateProvider, $httpProvider,
         $urlRouterProvider, $urlMatcherFactoryProvider) {

    $locationProvider.html5Mode(false);

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
            url: "/home/?login",
            templateUrl: 'app/views/home.html',
        }).state('app', {
            templateUrl: 'app/views/app.html',
        })

        // data browser
        .state('app.modelPage', {
            url: "/model{path:nonURIEncoded}",
            templateUrl: 'app/views/data/model.html',
            controller: 'DataPage',
            authenticate: true
        })
        .state('app.myData', {
            url: "/data{dir:nonURIEncoded}",
            templateUrl: 'app/components/browser/browser.html',
            controller: 'MyData',
            authenticate: true
        })

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
        }).state('app.modelEditor', {
            url: "/model-editor/",
            templateUrl: 'app/views/editor/model-editor.html',
            controller: 'ModelEditor',
            authenticate: true
        })


        // object views
        /*
        .state('app.modelPage', {
            url: "/models/:ws/:name",
            templateUrl: 'app/views/data/model.html',
            controller: 'DataPage',
            authenticate: true
        }).state('app.mediaPage', {
            url: "/media/:ws/:name",
            templateUrl: 'app/views/data/media.html',
            controller: 'DataPage',
            authenticate: true
        }).state('app.fbaPage', {
            url: "/fba/:ws/:name",
            templateUrl: 'app/views/data/fba.html',
            controller: 'DataPage',
            authenticate: true
        })*/

        .state('app.proto', {
            url: "/proto",
            templateUrl: 'app/views/proto.html',
            controller: 'Proto',
        })

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


        /* only used for testing analysis forms */
        .state('app.run', {
            url: "/run",
            templateUrl: 'app/views/run/run.html',
        }).state('app.runReconstruct', {
            url: "/run/reconstruct",
            templateUrl: 'app/views/run/reconstruct.html',
            controller: 'RunReconstruct',
        }).state('app.runFBA', {
            url: "/run/fba",
            templateUrl: 'app/views/run/fba.html',
            controller: 'RunFBA',
        }).state('app.runGapfill', {
            url: "/run/gapfill",
            templateUrl: 'app/views/run/gapfill.html',
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

.run(['$rootScope', '$state', '$stateParams', '$location', 'Auth', '$timeout',
function($rootScope, $state, $sParams, $location, auth, $timeout) {

    $rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams){

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
            $state.transitionTo('home');
            event.preventDefault();
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
