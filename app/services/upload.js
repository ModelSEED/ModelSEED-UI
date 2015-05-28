
/*
 * Upload module
 *
*/

angular.module('Upload', [])
.service('Upload', ['Auth', 'config', 'MS', '$timeout',
    function(auth, config, ms, $timeout) {

    var self = this;

    // model for status of uploads;  one file for now
    self.status = {count: 0, complete: false, progress: 0}

    var shockURL = config.services.shock_url;
    var authObj = {Authorization: 'OAuth ' + auth.token};
    var header = {headers:  authObj }

    this.createNode = function(path, files, overwrite) {
        var params = {objects: [[path+'/'+files[0].name, 'String']],
                      createUploadNodes: 1,
                      overwrite: overwrite ? true : false};
        return ms.createNode(params, overwrite).then(function(res){
                    var nodeURL = res[0][11];
                    console.log('created upload node:', nodeURL)
                    self.uploadFile(files, nodeURL);
                })
    }

    this.uploadFile = function(files, nodeURL) {
        console.log('uploading...', files, nodeURL)

        self.status.count = 1;
        self.status.complete = false;

        var form = new FormData($('#upload-form')[0]);

        console.log('form', form)
        $.ajax({
            url: nodeURL,
            type: 'PUT',
            headers: authObj,
            xhr: function() {
                var myXhr = $.ajaxSettings.xhr();
                if(myXhr.upload){
                    myXhr.upload.addEventListener('progress', updateProgress, false);
                }
                return myXhr;
            },
            success: function(data) {
                console.log('upload success', data)
                $timeout(function() {
                    self.status.count = 0;
                    self.status.progress = 0;
                    self.status.complete = true;
                })
            },
            error: function(e){
                console.log('failed upload', e)
            },
            data: form,
            contentType: false,
            processData: false
        });

        function updateProgress (oEvent) {
            if (oEvent.lengthComputable) {
                var percent = oEvent.loaded / files[0].size;

                $timeout(function() {
                    self.status.progress = Math.floor(percent*100);
                })
            }
        }


}

    /*
    $scope.uploadFile = function(files, nodeURL) {
        var node = nodeURL.split('/')[6]
        console.log('node!', node)
        SHOCK.init({ token: authObj.token, url: config.services.shock_url })
        //var form = new FormData($('#upload-form')[0]);
        SHOCK.upload(files, node, 'name', function(blah){
            console.log('response', blah)
        })
    }*/

}]);
