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
                        console.log('response', res)

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
        console.log('calling login patric')
        return $http({method: "POST",
                      url: config.services.patric_auth_url,
                      data: $.param(data),
                  }).success(function(token) {
                        console.log('response', token)

                        var user_id = token.split('|')[0].replace('un=', '')
                        var obj = {user_id: user_id, token: token}

                        // store username/token
                        localStorage.setItem('auth', JSON.stringify(obj) )
                        self.user = obj.user_id;
                        self.token = JSON.stringify(obj.token);

                        return obj;
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

    this.loginMethod = function(method) {
        if (method === 'patric')
            return {name: 'PATRIC', newAccountURL: 'https://user.patricbrc.org/register/'}

        return {name: 'RAST', newAccountURL: 'http://rast.nmpdr.org/?page=Register'}
    }


}]);
