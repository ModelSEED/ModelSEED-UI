

angular.module('coreModelViewer',
['config',
 'core-directives',
 'mv-controllers',
 'ms-controllers',
 'ui.router',
 'ngAnimate',
 'kbase-rpc',
 'ngMaterial',
 'FBA',
 'ModelViewer',
 'Patric'
 ])
.config(['$locationProvider', '$stateProvider', '$httpProvider', '$urlRouterProvider',
    function($locationProvider, $stateProvider, $httpProvider, $urlRouterProvider) {

    $locationProvider.html5Mode(false);

    $stateProvider
        .state('home', {
            url: "/",
            templateUrl: 'views/home.html'
        })

        .state('biochem', {
            url: "/biochem/",
            templateUrl: 'views/biochem/biochem.html',
            controller: 'Biochem'
        }).state('reconstruct', {
            url: "/reconstruct/",
            templateUrl: 'views/reconstruct.html',
            controller: 'Reconstruct'
        })


        .state('myModels', {
            url: "/my-models/",
            templateUrl: 'views/my-models.html',
        }).state('publicModels', {
            url: "/models/",
            templateUrl: 'views/public-models.html',
        }).state('modelEditor', {
            url: "/model-editor/",
            templateUrl: 'views/editor/model-editor.html',
        })

        /*
        .state('genomes', {
            url: "/genomes/",
            templateUrl: 'views/genomes.html',
        })*/

        .state('media', {
            url: "/media/",
            templateUrl: 'views/media.html',
        }).state('fba', {
            url: "/fba/",
            templateUrl: 'views/fbas.html',
        })
        .state('fbaByWS', {
            url: "/fba/:ws",
            templateUrl: 'views/fbaws.html',
            controller: 'FBAByWS'
        })

        // object views
        .state('modelPage', {
            url: "/models/:ws/:name",
            templateUrl: 'views/modelPage.html',
            controller: 'ObjectPage'
        }).state('mediaPage', {
            url: "/media/:ws/:name",
            templateUrl: 'views/mediaPage.html',
            controller: 'ObjectPage'
        }).state('fbaPage', {
            url: "/fba/:ws/:name",
            templateUrl: 'views/fbaPage.html',
            controller: 'ObjectPage'
        }).state('genome', {
            url: "/genomes/:ws/:name/:tab",
            templateUrl: 'views/genomePage.html',
            controller: 'ObjectPage'
        })

        .state('proto', {
            url: "/proto",
            templateUrl: 'views/proto.html'
        })

        .state('compare', {
            url: "/compare",
            templateUrl: 'views/compare.html',
            controller: 'Compare',
        })


    $urlRouterProvider.when('', '/models/')
                      .when('#', '/models/');

}])

.config(['$mdThemingProvider', function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .primaryPalette('cyan')
        .accentPalette('light-blue');
}])

.run(['$rootScope', '$state', '$stateParams', '$location',
    function($rootScope, $state, $sParams, $location) {
    $rootScope.$state = $state;
    $rootScope.$stateParams = $sParams;

    $rootScope.$on('$stateChangeSuccess',
        function(event, toState, toParams, fromState, fromParams){
            $rootScope.$subURL = toState.url.split('/')[1]
        })

    // global method for active styling
    $rootScope.isActive = function(ws, name) {
        if (ws === $sParams.ws && name === $sParams.name) return true;
        return false;
    }

    //kb = new KBCacheClient();
}]);
