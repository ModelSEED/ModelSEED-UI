

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
            controller: 'Biochem'
        }).state('app.reconstruct', {
            url: "/reconstruct/",
            templateUrl: 'app/views/reconstruct.html',
            controller: 'Reconstruct'
        }).state('app.myModels', {
            url: "/my-models/",
            templateUrl: 'app/views/my-models.html',
        }).state('app.publicModels', {
            url: "/models/",
            templateUrl: 'app/views/public-models.html',
            controller: 'Public'
        }).state('app.modelEditor', {
            url: "/model-editor/",
            templateUrl: 'app/views/editor/model-editor.html',
            controller: 'ModelEditor'
        })


        // object views
        .state('app.modelPage', {
            url: "/models/:ws/:name",
            templateUrl: 'app/views/data/model.html',
            controller: 'DataPage'
        }).state('app.mediaPage', {
            url: "/media/:ws/:name",
            templateUrl: 'app/views/data/media.html',
            controller: 'DataPage'
        }).state('app.fbaPage', {
            url: "/fba/:ws/:name",
            templateUrl: 'app/views/data/fba.html',
            controller: 'DataPage'
        })

        .state('app.proto', {
            url: "/proto",
            templateUrl: 'app/views/proto.html'
        })

        .state('app.compare', {
            url: "/compare",
            templateUrl: 'app/views/compare.html',
            controller: 'Compare',
        })

        .state('app.api', {
            url: "/help/api",
            templateUrl: 'app/views/docs/api.html',
            controller: 'Help',
        })


    $urlRouterProvider.when('', '/home/')
                      .when('/', '/home/')
                      .when('#', '/home/');

}])

.config(['$mdThemingProvider', function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .primaryPalette('cyan')
        .accentPalette('light-blue');
}])

.run(['$rootScope', '$state', '$stateParams', '$location', 'authService',
    function($rootScope, $state, $sParams, $location, authService) {
    $rootScope.$state = $state;
    $rootScope.$stateParams = $sParams;


    $rootScope.user = authService.user;
    $rootScope.token = authService.token;

}]);
