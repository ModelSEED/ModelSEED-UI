

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
 'kbase-auth',
 'dd-filter',
 'ngMaterial',
 'FBA',
 'ModelViewer',
 'Patric',
 'WS'
 ])
.config(['$locationProvider', '$stateProvider', '$httpProvider', '$urlRouterProvider',
    function($locationProvider, $stateProvider, $httpProvider, $urlRouterProvider) {

    $locationProvider.html5Mode(false);


    $stateProvider
        .state('home', {
            url: "/home/",
            templateUrl: 'app/views/home.html',
        }).state('app', {
            templateUrl: 'app/views/app.html',
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
            authenticate: true
        }).state('app.publicModels', {
            url: "/models/",
            templateUrl: 'app/views/public-models.html',
            controller: 'Public'
        }).state('app.modelEditor', {
            url: "/model-editor/",
            templateUrl: 'app/views/editor/model-editor.html',
            controller: 'ModelEditor',
            authenticate: true
        })


        // object views
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
        })

        .state('app.proto', {
            url: "/proto",
            templateUrl: 'app/views/proto.html',
        })

        .state('app.compare', {
            url: "/compare",
            templateUrl: 'app/views/compare.html',
            controller: 'Compare',
            authenticate: true
        })

        .state('app.api', {
            url: "/help/api",
            templateUrl: 'app/views/docs/api.html',
            controller: 'Help',
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

.run(['$rootScope', '$state', '$stateParams', '$location', 'authService', '$timeout',
    function($rootScope, $state, $sParams, $location, auth, $timeout) {

    $rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams){

        // if first load on home and user is authenticated,
        // forward to application page [good UX!]
        if (fromState.name === '' && toState.name === "home" && auth.isAuthenticated()) {
            // wait for state set
            $timeout(function() {
                $state.transitionTo('app.publicModels')
                event.preventDefault();
            })
        }

        // else, if not authenticated and url is private, go to home
        else if (toState.authenticate && !auth.isAuthenticated()) {
            $state.transitionTo('home');
            event.preventDefault();

        }
    })

    $rootScope.$state = $state;
    $rootScope.$stateParams = $sParams;

    $rootScope.user = auth.user;
    $rootScope.token = auth.token;
}]);
