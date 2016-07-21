
/* service endpoint and UI configuration settings */
angular.module('config', []).service('config', function() {

    this.releaseVersion = 'vBeta-1.4.0';

    // wether or not to include plants UI components
    // see app/ctrls/ctrls.js > "ViewOptions" for localstorage methods
    this.includePlants = true;

    this.services = {
        auth_url: "http://tutorial.theseed.org/Sessions/Login",
        app_url: "http://p3.theseed.org/services/app_service",
        ws_url: "http://p3.theseed.org/services/Workspace",
        ms_url: "https://p3.theseed.org/services/ProbModelSEED/",
        ms_rest_url: "http://api.modelseed.org/v0",
        shock_url: "http://p3.theseed.org/services/shock_api",
        patric_auth_url: "https://user.patricbrc.org/authenticate",
        solr_url: "https://www.patricbrc.org/api/",
        ms_support_url: "http://bio-data-1.mcs.anl.gov/services/ms_fba",
        ms_solr_url: "http://modelseed.theseed.org/solr/"
    }

    this.paths = {
        media: "/chenry/public/modelsupport/media",
        maps: "/nconrad/public/maps/",
        publicPlants: "/plantseed/plantseed/",
        plants: {
            models: '/plantseed/Models/',
            genomes: '/plantseed/Genomes/'
        }
    }
})
