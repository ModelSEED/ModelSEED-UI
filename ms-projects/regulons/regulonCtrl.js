
angular.module('Regulons', [])
.controller('Regulons',
['$scope', '$state', '$stateParams', 'Dialogs', 'Session', '$timeout',
function($s, $state, $stateParams, Dialogs, Session, $timeout) {

    $s.tabs = {tabIndex: Session.getTab($state)};
    $s.$watch('tabs', function(value) { Session.setTab($state, value) }, true)

    if ($stateParams.q) $s.tabs.tabIndex = 2

}])

.controller('RegulonsGenes',
['$scope', '$http', '$state', 'Dialogs',
function($s, $http, $state, Dialogs) {
    //var table;

    $s.opts = {query: '', limit: 25, offset: 0, sort: {field: 'bsu_number'}};

    $http.get('ms-projects/regulons/data/genes.json')
         .then(function(d) {
            table = d.data
            $s.header = table.thead;
            $s.data = table.tbody;
        })

    $s.format = function(item) {
        if (item === '-') return '-';

        var items = item.split('|');
        items.pop();
        return items.join('<br>')
    }

    $s.download = function($ev) {
        Dialogs.download($ev, table.cols, table.tbody, $state.current.name.split('.').pop() );
    }

}]).controller('RegulonsRegulators',
['$scope', '$http', '$state', 'Dialogs',
function($s, $http, $state, Dialogs) {
    var table;

    $s.subtiwikiUrl = 'http://subtiwiki.uni-goettingen.de/bank/index.php?gene=';
    $s.dbtbsUrl = 'http://dbtbs.hgc.jp/COG/tfac/';

    var query = $state.params.q ? $state.params.q: '';

    $s.opts = {query: query, limit: 25, offset: 0, sort: {field: 'regulator_name'}};
    $http.get('ms-projects/regulons/data/regulators.json')
         .then(function(data) {
            table = data.data
            $s.header = data.data[0];
            $s.data = data.data.slice(1);
         })

    if (query !== '') {
        $s.$watch('opts.query', function(newQ, oldQ) {
            if (newQ !== oldQ) {
                console.log('change')
                $state.transitionTo($state.current.name, {}, {notify: false})
            }
        })
    }

    $s.showLinks = function($ev, name) {
        var links = '<a href="'+$s.subtiwikiUrl+name+'" target="_blank">Subtiwiki'+
                        ' <i class="fa fa-external-link text-muted"></i></a><br>'+
                    '<a href="'+$s.dbtbsUrl+name+'.html" target="_blank">DBTBS'+
                        ' <i class="fa fa-external-link text-muted"></i></a>';
        var popover = angular.element($ev.target).popover({
            title: name,
            content: links,
            html: true,
            container: 'body',
            trigger: 'manual'
        }).popover('toggle')
          .on('shown.bs.popover', function () {
              angular.element('body').click(function() {
                  popover.popover('hide');
                  angular.element(this).unbind('click')
              })
        })
    }

    $s.download = function($ev) {
        Dialogs.download($ev, table.cols, table.tbody, $state.current.name.split('.').pop() );
    }
}])
