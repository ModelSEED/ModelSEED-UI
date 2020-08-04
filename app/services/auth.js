/*
 * auth.js
 * Angular.js module for using authentication services
 *
 * Authors:
 * 		https://github.com/nconrad
 *
*/

angular.module('Auth', [])
.service('Auth', ['$state', '$http', 'config', '$window',
function($state, $http, config, $window) {
    var self = this;

    this.user;
    this.token;

    var auth = getAuthStatus();

    // if previously authenticated, set user/token
    if (auth) {
        this.user = auth.user_id;
        this.token = auth.token;

        // set auth method used
        if (this.token.indexOf('rast.nmpdr.org') !== -1)
            this.method == 'rast';
        else if (this.token.indexOf('user.patric.org') !== -1)
            this.method == 'patric';
    }


    console.log('token', this.token);
    console.log('using service:', config.services.auth_url)

    /**
     * [Authentication against RAST]
     * @param  {[string]} user [rast username]
     * @param  {[string]} pass [rast password]
     * @return {[object]}      [rast auth object]
     */
    this.login = function(user, pass) {
        var data = {
            user_id: user,
            password: pass,
            status: 1,
            cookie:1,
            fields: "name,user_id,token"
        };

        return $http({method: "POST",
                      url: config.services.auth_url,
                      data: $.param(data),
                    }).success(function(res) {

                        // store auth object
                        $window.localStorage.setItem('auth', JSON.stringify(res));
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
                        $window.localStorage.setItem('auth', JSON.stringify(obj) );
                        self.user = obj.user_id;
                        self.token = JSON.stringify(obj.token);

                        return obj;
                    });
    }

    this.logout = function() {
        $window.localStorage.removeItem('auth');
        $state.transitionTo('main.home', {}, { reload: true, inherit: true, notify: false })
              .then(function() {
                  var to_url = window.location.protocol + '//' + window.location.host+'/genomes/Plants';
                  $window.location.replace(to_url);
              });
    }

    this.isAuthenticated = function() {
        return (self.user && getAuthStatus()) ? true : false;
    }

    this.loginMethod = function(method) {
        if (method === 'patric')
            return {
                name: 'PATRIC',
                newAccountURL: 'https://user.patricbrc.org/register/',
                forgotPasswordUrl: 'https://user.patricbrc.org/reset_password'
            };
        return {
            name: 'RAST',
            newAccountURL: 'http://rast.nmpdr.org/?page=Register',
            forgotPasswordUrl: 'http://rast.nmpdr.org/?page=RequestNewPassword'
        };
    }

    function getAuthStatus() {
        return JSON.parse( localStorage.getItem('auth') );
    }

    function storageEventHandler(e) {
        // if logout has happened, logout every tab.
        if (e.key === 'auth' && !e.newValue) self.logout()
    }

    // listen for storage change across tabs/windows
    $window.addEventListener('storage', storageEventHandler);

}]);
