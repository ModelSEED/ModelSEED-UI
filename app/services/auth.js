/*
 * kbase-auth.js
 * Angular.js module for using KBase authentication services
 *
 * Authors:
 *  https://github.com/nconrad
 *
*/

angular.module('Auth', [])
.service('Auth', ['$http', 'config', function($http, config) {
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

    this.login = function(user, pass) {
        var data = {user_id: user,
                    password: pass,
                    status: 1,
                    cookie:1,
                    fields: "name,kbase_sessionid,user_id,token"};

        return $http({method: "POST",
                      url: config.services.auth_url,
                      data: $.param(data),
                    }).success(function(data) {
                        // store token
                        localStorage.setItem('auth', JSON.stringify(data));
                        self.user = data.user_id;
                        self.token = data.token;

                        return data;
                    });
    }

    this.logout = function() {
        localStorage.removeItem('auth');
    }

    this.isAuthenticated = function() {
        return (self.user && getSession()) ? true : false;
    }

    function getSession() {
        return JSON.parse( localStorage.getItem('auth') );
    }

}]);
