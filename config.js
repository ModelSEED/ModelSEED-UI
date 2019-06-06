
/* service endpoint and UI configuration settings */
angular.module('config', []).service('config', function() {

    this.releaseVersion = 'v2.5';

    // wether or not to include plants UI components
    // see app/ctrls/ctrls.js > "ViewOptions" for localstorage methods
    this.includePlants = true;

    this.services = {
        auth_url: "http://tutorial.theseed.org/Sessions/Login",
        app_url: "http://p3.theseed.org/services/app_service",
        ws_url: "http://p3.theseed.org/services/Workspace",
        // ms_url:  "http://p3c.theseed.org/dev1/services/ProbModelSEED", 
        ms_url: "http://p3.theseed.org/services/ProbModelSEED/",
        ms_rest_url: "http://api.modelseed.org/v0/",
        //ms_rest_url: "http://140.221.65.31:3000/v0/",
        //ms_rest_url: "http://0.0.0.0:3000/v0/",
        shock_url: "http://p3.theseed.org/services/shock_api",
        patric_auth_url: "https://user.patricbrc.org/authenticate",
        solr_url: "https://www.patricbrc.org/api/",
        local_solr_url: "http://0.0.0.0:8983/solr/",
        dev_solr_url: "http://140.221.65.31:8983/solr/",
        ms_support_url: "http://modelseed.org/services/ms_fba",
        ms_solr_url: "http://modelseed.theseed.org/solr/",
        cpd_img_url: "http://minedatabase.mcs.anl.gov/compound_images/ModelSEED/"
    };

    this.paths = {
        media: "/chenry/public/modelsupport/media",
        maps: "/nconrad/public/maps/",
        publicPlants: "/plantseed/plantseed/",
        plants: {
            models: '/plantseed/',
            genomes: '/plantseed/'
        }
    };
})
