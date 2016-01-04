/*
 * auth.js
 * Angular.js module for using authentication services
 *
 * Authors:
 *  https://github.com/nconrad
 *
 * Notes:
 * 	$rootScope is used soley to communicate with the socket service,
 * 	logging the user out of other connnections
 *
 *
*/

angular.module('Auth', [])
.service('Auth', ['$rootScope', '$http', 'config', 'Socket', '$window',
function($rootScope, $http, config, Socket, $window) {
    var self = this;

    var auth = JSON.parse( localStorage.getItem('auth') );

    // if previously authenticated, set user/token
    if (auth) {
        this.user = auth.user_id;
        this.token = auth.token;
    } else {
        this.user;
        this.token;
    }

    console.log(this.token)
    console.log('using service:', config.services.auth_url)

    /**
     * [Authentication against RAST]
     * @param  {[string]} user [rast username]
     * @param  {[string]} pass [rast password]
     * @return {[object]}      [rast auth object]
     */
    this.login = function(user, pass) {
        var data = {user_id: user,
                    password: pass,
                    status: 1,
                    cookie:1,
                    fields: "name,user_id,token"};

        return $http({method: "POST",
                      url: config.services.auth_url,
                      data: $.param(data),
                    }).success(function(res) {

                        // store auth object
                        localStorage.setItem('auth', JSON.stringify(res));
                        self.user = res.user_id;
                        self.token = res.token;

                        return res;
                    });
    }

    /**
     * [Authentication against PATRIC]
     * @param  {[string]} user [patric username]
     * @param  {[string]} pass [patric password]
     * @return {[object]}      [patric user/pass token]
     */
    this.loginPatric = function(user, pass) {
        var data = {username: user, password: pass};
        return $http({method: "POST",
                      url: config.services.patric_auth_url,
                      data: $.param(data),
                  }).success(function(token) {
                        var user_id = token.split('|')[0].replace('un=', '');
                        var obj = {user_id: user_id, token: token};

                        // store username/token
                        localStorage.setItem('auth', JSON.stringify(obj) );
                        self.user = obj.user_id;
                        self.token = JSON.stringify(obj.token);

                        return obj;
                    });
    }

    this.logout = function() {
        // order is important here.
        // once the token is removed, an event refreshes other connections,
        // effectively notifiying the user that they logged out of other tabs.
        localStorage.removeItem('auth');
        self.userLogout(self.user);
    }

    this.isAuthenticated = function() {
        return (self.user && getSession()) ? true : false;
    }

    function getSession() {
        return JSON.parse( localStorage.getItem('auth') );
    }

    this.loginMethod = function(method) {
        if (method === 'patric')
            return {name: 'PATRIC', newAccountURL: 'https://user.patricbrc.org/register/'};

        return {name: 'RAST', newAccountURL: 'http://rast.nmpdr.org/?page=Register'};
    }


    // listen for logout event on root and refresh page when one tab logs out
    /*
    $rootScope.$on('logout', function() {
        console.log('attempting to reload')
        $window.location.reload();
    })*/


    if (self.token) {
        var tokenString = self.token.split('|');

        var token = {};
        var i = tokenString.length;
        while (i--) {
            token[tokenString[i].split('=')[0]] = tokenString[i].split('=')[1];
        }
    }
    /*
    var socket = io.connect('http://0.0.0.0:3000');

    socket.on('connect', function (data) {
        console.log('connected as', $rootScope.user)
        self.userConnect($rootScope.user);

        socket.emit('jobs', $rootScope.token, function(data) {
            console.log('data', data)
        })
    })


    // tell all the things to "logout"
    socket.on('logout', function() {
        //$rootScope.$emit('logout');
        $window.location.reload();
    })


    // this is not a login method, it is a "connection" method.
    this.userConnect = function(user) {
        socket.emit('user connect', user);
    }

    // this method tells the server to log the user out of all other connections.
    this.userLogout = function(user) {
        socket.emit('user logout', user);
    }
    */



}]);
