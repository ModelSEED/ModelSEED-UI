
/* service configuration settings for UI */
angular.module('config', []).service('config', function() {

    this.ui = {name: "Core Mdoel Viewer"};

    this.services = {app_url: "http://140.221.66.219:7124",
                     ws_url: "https://kbase.us/services/ws",
                     fba_url: "https://kbase.us/services/KBaseFBAModeling",
                     auth_url: "https://kbase.us/services/authorization/Sessions/Login",
                     //auth_url: "http://tutorial.theseed.org/Sessions/Login",
                     shock_url: "http://140.221.67.190:7078"};

})