/*
 * socket.js
 * Angular.js module for dealing with socket.io
 *
 * Authors:
 *  https://github.com/nconrad
 *
*/

angular.module('Socket', [])
.service('Socket', ['$rootScope', '$http', 'config', '$timeout',
function($rootScope, $http, config, $timeout) {
    var self = this;

    /*
    var socket = io.connect('http://0.0.0.0:3000', { query: "token="+$rootScope.token });

    socket.on('connect', function (data) {
        console.log('connected as', $rootScope.user)
        self.userConnect($rootScope.user);



        console.log('$rootscope', $rootScope.token)
        socket.emit('jobs', $rootScope.token, function(data) {
            console.log('data', data)
        })
    })

    // this is not a login method, it is a "connection" method.
    this.userConnect = function(user) {
        socket.emit('user connect', user);
    }

    // this method tells the server to log the user out of all other connections.
    this.userLogout = function(user) {
        socket.emit('user logout', user);
    }

    // tell all the things to "logout"
    socket.on('logout', function() {
        $rootScope.$emit('logout');
    })*/

}]);
