
/* service endpoint and UI configuration settings */
angular.module('config', []).service('config', function() {

    this.releaseVersion = 'v2.5.1';

    // wether or not to include plants UI components
    // see app/ctrls/ctrls.js > "ViewOptions" for localstorage methods
    this.includePlants = true;

    this.services = {
        auth_url: "https://p3.theseed.org/Sessions/Login",
        app_url: "https://p3.theseed.org/services/app_service",
        svc_test_url: "https://modelseed.org/api/test-service",
        ws_url: "https://p3.theseed.org/services/Workspace",
        ms_url: "https://p3.theseed.org/services/ProbModelSEED/",
	// Versioning is hard-coded into ModelSEED-REST API calls, want to get rid of it
        ms_rest_url: "https://modelseed.org/api/v0/",
        shock_url: "https://p3.theseed.org/services/shock_api",
        patric_auth_url: "https://user.patricbrc.org/authenticate",
        ms_support_url: "https://modelseed.org/services/ms_fba",
        solr_url: "https://modelseed.org/solr/",
        patric_solr_url: "https://www.patricbrc.org/api/",
        cpd_img_url: "https://minedatabase.mcs.anl.gov/compound_images/ModelSEED/"
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
