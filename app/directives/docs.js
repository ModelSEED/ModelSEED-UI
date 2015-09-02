
angular.module('docs-directives', []);
angular.module('docs-directives')

.directive('msDoc', ['$http', function($http) {
   return {
        template: '<div id="docs" ng-bind-html="data"></div>'+
                  '<a ng-if="editable" class="edit-docs-btn no-href" href="{{githubURL}}" target="_blank">'+
                        '<i class="icon-pencil2"></i> Edit on Github'+
                  '</a>',
        link: function(scope, elem, attr) {
            var url = 'docs/'+attr.msDoc

            if (attr.editable == 'false') scope.editable = false;
            else scope.editable = true;

            $http.get(url)
                 .then(function(res) {
                    var text = res.data;
                    scope.githubURL =
                        'https://github.com/ModelSEED/Documentation/blob/master/'
                        +attr.msDoc;

                    var converter = new showdown.Converter(),
                        html = converter.makeHtml(text);

                     scope.data = html;
                 })
        }
   };
}])
