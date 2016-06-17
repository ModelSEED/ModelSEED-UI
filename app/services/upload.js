
/*
 * Upload module
 *
*/

angular.module('Upload', [])
.service('Upload', ['Auth', 'config', 'WS', '$timeout',
    function(auth, config, WS, $timeout) {

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
        return WS.createNode(params, overwrite).then(function(res){
                    var nodeURL = res[0][11];
                    console.log('created upload node:', nodeURL)
                    self.uploadFile(files, nodeURL);
                })
    }

    this.uploadFile = function(files, nodeURL, cb) {
        console.log('uploading...', files, nodeURL)

        self.status.count = 1;
        self.status.complete = false;

        var form = new FormData($('#upload-form')[0]);
        $.ajax({
            url: nodeURL ? nodeURL : shockURL+'/node',
            type: nodeURL ? 'PUT' : 'POST',
            headers: authObj,
            xhr: function() {
                var myXhr = $.ajaxSettings.xhr();
                if(myXhr.upload){
                    myXhr.upload.addEventListener('progress', updateProgress, false);
                }
                return myXhr;
            },
            success: function(res) {
                console.log('upload success.  id:', res.data.id)                
                if (cb) cb(res.data.id);
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

    // Store as file on Server

    // Check for the various File API support.
    /*
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        // Great success! All the File APIs are supported.
    } else {
        alert('The File APIs are not fully supported in this browser.');
    }

    var file = files[0]

    var reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = loadedFile;
    reader.onerror = errorHandler;

    function loadedFile(event) {
        $dialog.hide();

        var data = event.target.result;
        WS.uploadData({path: path+'/'+files[0].name,
                       type: $scope.type,
                       data: data})
          .then(function(res) {
              $this.updateDir();
              console.log('res', res)
          })
    }*/


}]);
