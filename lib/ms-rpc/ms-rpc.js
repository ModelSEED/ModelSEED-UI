/*
 * ms-rpc.js
 * Angular.js module for using ModelSEED JSON-RPC services
 *
 * Authors:
 *   https://github.com/nconrad
 *
 * Todo:
 *   - delegate directly to service names
 *
*/

angular.module('ms-rpc', [])
    .config([ '$provide', '$httpProvider',
    function($provide, $httpProvider) {

    $httpProvider.defaults.headers.post['Content-Type'] = "application/x-www-form-urlencoded";
    $httpProvider.defaults.headers.put['Content-Type'] = "application/x-www-form-urlencoded";

    return $provide.decorator('$http', ['$delegate', '$rootScope', '$q', 'config',
        function($delegate, $rootScope, $q, $config) {

            $delegate.rpc = function(service, method, parameters, isOrdered){
                var deferred = $q.defer();

                // short hand service names
                if (service == 'ws') {
                    var url = $config.services.ws_url;
                    var method = 'Workspace.'+method;
                } else if (service == 'ms') {
                    var url = $config.services.ms_url;
                    var method = 'ProbModelSEED.'+method;
                } else if (service == 'app') {
                    var url = $config.services.app_url;
                    var method = 'AppService.'+method;
                } else if (service == 'msSupport') {
                    var url = $config.services.ms_support_url;
                    var method = 'MSSeedSupportServer.'+method;
                }

                var data = {version: "1.1",
                            method: method,
                            id: String(Math.random()).slice(2)};

                if (isOrdered)
                    data.params = parameters;
                else
                    data.params = [parameters];
                /*added if-else by qz
                if (service == 'ms' && method == 'ProbModelSEED.list_models'
                                    && parameters['path'] == '/plantseed/plantseed')
                    var config = angular.extend({'headers': undefined}, config);
                else*/
                    var config = angular.extend({'headers':
                                                {'Authorization': $rootScope.token}
                                            }, config);

                $delegate.post(url, data, config)
                     .then(function(response) {
                        // only handle actual data
                        return deferred.resolve(response.data.result ? response.data.result[0] : null);
                     }).catch(function(error) {
                        console.log('rpc post failed', JSON.stringify(error));
                        return deferred.reject(error.data);
                     })

                return deferred.promise;
            };

            return $delegate;
        }]);
}]);
