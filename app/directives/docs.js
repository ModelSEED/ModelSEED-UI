
angular.module('docs-directives', []);
angular.module('docs-directives')

.directive('msFaq', ['$http', function($http) {
   return {
        template: '<div id="docs" ng-bind-html="data"></div>'+
                  '<a class="edit-docs-btn no-href" href="{{githubURL}}" target="_blank">'+
                        '<i class="icon-pencil2"></i> Edit on Github'+
                  '</a>',
        link: function(scope, elem, attr) {
            var url = attr.msFaq;
            $http.get(url)
                 .then(function(res) {
                    var text = window.atob(res.data.content);
                    scope.githubURL = res.data.html_url;

                    var converter = new showdown.Converter(),
                        html = converter.makeHtml(text);

                     scope.data = html;
                 })
        }
   };
}])
