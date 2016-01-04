
angular.module('UploadCtrl', [])
.controller('UploadCtrl',
['$scope', '$http', 'uiTools', 'config', 'Auth',
function($scope, $http, uiTools, config, auth) {
    var shockURL = config.services.shock_url;
    var nodeURL= shockURL+'/node';
    var authObj = {Authorization: 'OAuth ' + auth.token};
    var header = {headers:  auth }

    $scope.uploadFile = function(files) {
        $scope.$apply( function() {
            $scope.uploadingCount = 1;
            $scope.uploadComplete = false;
        })

        var form = new FormData($('#upload-form')[0]);
        $.ajax({
            url: nodeURL,
            type: 'POST',
            xhr: function() {
                var myXhr = $.ajaxSettings.xhr();
                if(myXhr.upload){
                    myXhr.upload.addEventListener('progress', updateProgress, false);
                }
                return myXhr;
            },
            headers: auth,
            success: function(data) {
                console.log('upload success', data)
                $scope.$apply(function() {
                    $scope.uploadingCount = 0;
                    $scope.uploadProgress = 0;
                    $scope.uploadComplete = true;
                })
            },
            error: function(e){
                console.error('failed upload', e)
            },
            data: form,
            contentType: false,
            processData: false
        });

        function updateProgress (oEvent) {
            if (oEvent.lengthComputable) {
                var percent = oEvent.loaded / files[0].size;
                $scope.$apply(function() {
                    $scope.uploadProgress = Math.floor(percent*100);
                })
            }
        }
    }

    $scope.getUploads = function() {
        $http.get(nodeURL+'?querynode&owner='+auth.user+'&limit=10000', header)
            .success(function(data) {
                $scope.uploads = data;
                $scope.uploadCount = data.total_count;
                $scope.loading = false;
            }).error(function(e){
                console.log('fail', e)
            })
    }

    $scope.getUploads()

    //$scope.shock = shock;
    $scope.loading = true;

    $scope.nodeURL = nodeURL;
    $scope.relativeTime = uiTools.relativeTime;
    $scope.readableSize = uiTools.readableSize;
}])
