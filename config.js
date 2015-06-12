
/* service configuration settings for UI */
angular.module('config', []).service('config', function() {

    this.services = {
                        auth_url: "http://tutorial.theseed.org/Sessions/Login",
                        app_url: "http://p3.theseed.org/services/app_service",
                        ws_url: "http://p3.theseed.org/services/Workspace",
                        ms_url: "https://p3.theseed.org/services/ProbModelSEED/",
                        shock_url: "http://p3.theseed.org/services/shock_api",
                        patric_auth_url: "https://user.patricbrc.org/authenticate",
                        solr_url: "https://www.patricbrc.org/api/"
                        //fba_url: "https://kbase.us/services/KBaseFBAModeling",
                        //ws_url: "https://kbase.us/services/ws",
                        //auth_url: "https://p3.theseed.org/Sessions/Login",
                        //auth_url: "https://kbase.us/services/authorization/Sessions/Login",
                    };
})
