angular.module('Regulons', [])
.controller('Regulons',
['$scope', '$state', '$stateParams', 'Dialogs', 'Session', '$timeout',
function($s, $state, $stateParams, Dialogs, Session, $timeout) {

    $s.tabs = {tabIndex: Session.getTab($state)};
    $s.$watch('tabs', function(value) { Session.setTab($state, value) }, true)

    if ($stateParams.q) $s.tabs.tabIndex = 1

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

    var regPreciseMapping = {
        "*YydK*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=10859",
        "*YybA*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=13294",
        "*YwrC*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=11138",
        "*YwbI*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=11459",
        "*YvfU*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=12450",
        "*YvbF/YvaV*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=32149",
        "*YtcD*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=13124",
        "*YrkD*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=41474",
        "*YisR*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=12885",
        "*YhgD*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=13346",
        "*YhdI/YdeL*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=61947",
        "*YhcF*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=12068",
        "*YdfL*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=12300",
        "*YdfF*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=13283",
        "*YdeP*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=13174",
        "*YczG*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=12941",
        "*YcxD*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=63873",
        "*YbzH*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=41367",
        "*YbfI*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=45443",
        "*RplS*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=25121",
        "*RplM*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=25004",
        "*RplJ*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=24887",
        "*RNA - yybP-ykoY*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=23590",
        "*RNA - ylbH*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=23473",
        "*RNA - ykkC-yxkD*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=23824",
        "*RNA - Cobalamin*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=14072",
        "*RmgR*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=12311",
        "*RhaR*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=12748",
        "*RbsR*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=10815",
        "*NrdR*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=10804",
        "*MurR*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=10083",
        "*MsmR*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=10793",
        "*MdxR*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=10848",
        "*LytT*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=45261",
        "*L21_leader*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=25355",
        "*HisR*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=10988",
        "*GlcR*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=12726",
        "*degA*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=12874",
        "*BglZ*": "http://regprecise.lbl.gov/RegPrecise/regulon.jsp?regulon_id=11329",
    }

    $s.formatRegPreciseName = function(name) {
        return name.replace(/\*/g, '')
    }

    $s.getRegPreciseUrl = function(name) {
        return regPreciseMapping[name];
    }
}])
