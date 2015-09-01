
angular.module('mega-dropdown', []);
angular.module('mega-dropdown')
.directive('megaDropdown', ['$timeout', '$state', function($timeout, $state) {
    return {
        restrict: 'EA',
        template: '',
        link: function(scope, elem, attrs) {
            /*
            elem.bind('mouseover', function() {
                if ($state.current.name !== 'app.compare')
                    angular.element('body').find('.background-shade-out')
                                           .css('visibility', 'visible');

            });


            elem.bind('mouseout', function() {
                // always hide background, avoiding race condition
                angular.element('body').find('.background-shade-out')
                                       .css('visibility', 'hidden');
            });
            */


            /*
            elem.bind('click', function(ele) {
                angular.element('body').find('.background-shade-out')
                                       .css('visibility', 'hidden');
            })
            */

        }
    }
}])
