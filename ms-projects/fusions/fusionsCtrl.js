
angular.module('Fusions', [])
.controller('Fusions',
['$scope', '$http', '$state', 'uiTools', 'Dialogs', 'Session', 'MSSolr',
function($s, $http, $state, uiTools, Dialogs, Session, MSSolr) {

    //var solr = "http://branch.mcs.anl.gov:8983/solr/"
    var solr = "http://localhost:8983/solr/"

    $s.tabs = {tabIndex: Session.getTab($state)};
    $s.$watch('tabs', function(value) { Session.setTab($state, value) }, true)

    $s.opts = {size: 'condensed', border: false};

    // roles table

    $s.rolesOpts = {query: '', limit: 25, offset: 0, sort: {}, searchField: 'role'};

    $s.rolesHeader = [
        {label: 'Role', key: 'role'},
        {label: 'Count', key: 'count'},
        {label: 'Genome Count', key: 'genome_cout'},
        {label: 'Fuction Count', key: 'fusion_count'},
        {label: 'Fused Genome Count', key: 'fused_genome_count'},
        {label: 'Fraction of Genes Fused', key: 'fraction_of_genes_fused'},
        {label: 'Fraction of Genomes Fused', key: 'fraction_of_genomes_fused'},
        {label: 'Score', key: 'score'},
        {label: 'Subsystem', key: 'subsystem'},
        {label: 'class 1', key: 'class_one'},
        {label: 'Class 2', key: 'class_two'},
        {label: 'Frequently Fused Count', key: 'frequently_fused_function_count'},
        {label: 'Frequently used', key: 'frequently_fused_function_genomes'},
    ];

    function updateRoles() {
        MSSolr.search('fusion-roles', $s.rolesOpts)
            .then(function(data) {
                $s.roles = data;
                console.log('res', $s.roles)
                $s.loadingRoles = false;
            })
    }

    $s.$watch('rolesOpts', function(after, before) {
        $s.loadingRoles = true;
        updateRoles();
    }, true)


    // cdd table

    $s.cddOpts = {query: '', limit: 25, offset: 0, sort: {}, searchField: 'id'};

    $s.cddHeader = [
        {label: 'ID', key: 'id'},
        {label: 'Accession', key: 'accession'},
        {label: 'Name', key: 'name'},
        {label: 'Length', key: 'length'},
        {label: 'Gene Count', key: 'gene_count'},
        {label: 'Full Genes', key: 'fullgenes'},
        {label: 'Is Full Gene?', key: 'is_full_gene'},
        {label: 'Long Genes', key: 'longgenes'},
        {label: 'Set', key: 'set'},
        {label: 'Genes', key: 'genes'},
        //{label: 'Description', key: 'description'},
    ];


    function updateCdds() {
        MSSolr.search('fusion-cdd', $s.cddOpts)
            .then(function(data) {
                $s.cdds = data;
                console.log('res', $s.roles)
                $s.loadingCdds = false;
            })
    }

    $s.$watch('cddOpts', function(after, before) {
        $s.loading = true;
        updateCdds();
    }, true)


    // cdd sets

    $s.cddSetsOpts = {query: '', limit: 25, offset: 0, sort: {}, searchField: 'id'};

    $s.cddSetsHeader = [
        {label: 'ID', key: 'id'},
        {label: 'Accession', key: 'accession'},
        {label: 'Name', key: 'name'},
        {label: 'Length', key: 'length'},
        {label: 'Gene Count', key: 'genes'},
        {label: 'Full Genes', key: 'fullgenes'},
        {label: 'Is Full Gene?', key: 'is_full_gene'},
        {label: 'CDDs', key: 'cdds'},
        {label: 'CDD List', key: 'cddlist'},
        {label: 'Links', key: 'links'},
        {label: 'Linked sets', key: 'linkedsets'},
        //{label: 'Description', key: 'description'},
    ];

    function updateCddSets() {
        MSSolr.search('fusion-cdd-sets', $s.cddSetsOpts)
            .then(function(data) {
                $s.cddSets = data;
                $s.loadingCddSets = false;
            })
    }

    $s.$watch('cddSetOpts', function(after, before) {
        $s.loadingCddSets = true;
        updateCddSets();
    }, true)


    // genome stats

    $s.genomeStatsOpts = {query: '', limit: 25, offset: 0, sort: {}, searchField: 'id'};

    $s.genomeStatsHeader = [
        {label: 'ID', key: 'id'},
        {label: 'Accession', key: 'name'},
        {label: 'Name', key: 'genes'},
        {label: 'Genes With CDDs', key: 'genes_with_cdds'},
        {label: 'Total CDD Hits', key: 'total_cdd_hits'},
        {label: 'Genes With No Overlapping CDDs', key: 'genes_with_nonoverlapping_cdds'},
        {label: 'Full Genes CDD Hists', key: 'full_genes_cdd_hits'},
        {label: 'Genes With No Overlapping Full Gene CDDs', key: 'genes_with_nonoverlapping_full_gene_cdds'},
        {label: 'Final Predicted Fusions', key: 'final_predicted_fusions'},
        {label: 'Fraction of Final Fusioin Predictions', key: 'fraction_final_fusion_predictions'},
        {label: 'DNA Size', key: 'dna-size'},
        {label: 'contigs', key: 'contigs'},
        {label: 'Complete', key: 'complete'},
        {label: 'GC Content', key: 'gc-content'},
        {label: 'Taxonomy', key: 'taxonomy'},
        {label: 'MD5', key: 'md5'},
        {label: 'RNAs', key: 'rnas'},
        {label: 'Genetic Code', key: 'genetic-code'},
    ];


    function updateGenomeStats() {
        MSSolr.search('fusion-genome-stats', $s.genomeStatsOpts)
            .then(function(data) {
                $s.genomeStats = data;
                $s.loadingGenomeStats = false;
            })
    }

    $s.$watch('genomeStatsOpts', function(after, before) {
        $s.loadingGenomeStats = true;
        updateGenomeStats();
    }, true)


    // fusions

    $s.fusionsOpts = {query: '', limit: 25, offset: 0, sort: {}, searchField: 'gene'};

    $s.fusionsHeader = [
        {label: 'Gene', key: 'gene'},
        {label: 'Function', key: 'contig_function'},
        {label: 'Length', key: 'length'},
        {label: 'Divide', key: 'divide'},
        {label: 'Score', key: 'score'},
        {label: 'Left', key: 'left'},
        {label: 'Right', key: 'right'},
        {label: 'Overlap', key: 'overlap'},
        {label: 'Left SG', key: 'left_sg'},
        {label: 'Right SG', key: 'right_sg'},
        {label: 'Overlap SG', key: 'overlap_sg'},
        {label: 'Matches', key: 'matches'},
        {label: 'Best Left', key: 'best_left'},
        {label: 'Best Right', key: 'best_right'},
        {label: 'Best Left Align', key: 'best_left_align'},
        {label: 'Left Links', key: 'left_links'},
        {label: 'Right Links', key: 'right_links'},
        {label: 'Set Count', key: 'set_count'},
        {label: 'Contig Length?', key: 'contig_length'},
        {label: 'Contig', key: 'contig'},
        {label: 'Direction', key: 'direction'},
        {label: 'Start', key: 'start'},
        {label: 'Stop', key: 'stop'},
        {label: 'Species', key: 'species'},
        {label: 'Sequence', key: 'sequence'},
        {label: 'CDDs', key: 'cdds'},
    ];


    /*

    gene: "fig|443144.3.peg.472",
    length: 1218,
    function: "Dihydrolipoamide acyltransferase component of branched-chain alpha-keto acid dehydrogenase complex (EC 2.3.1.168)",
    divide: 77,
    score: 375,
    left: 26,
    right: 5,
    overlap: 5,
    left_sg: 6,
    right_sg: 3,
    overlap_sg: 5,
    matches: 0,
    best_left: 48.65,
    best_right: 49.3,
    best_left_align: 74,
    best_right_align: 301,
    left_links: 619,
    right_links: 459,
    set_count: 8,
    contig_function: "Dihydrolipoamide acyltransferase component of branched-chain alpha-keto acid dehydrogenase complex (EC 2.3.1.168)",
    contig_length: 1218,
    contig: "443144.3:NC_012918",
    direction: "+",
    start: 585384,
    stop: 586602,
    species: "Geobacter sp. M21",
    sequence: "MSIDFKLPDLGEGIAEVELRRWLVAEGDAVAEHQPLVEVETDKAVVEVPSPRSGVVARLHRKEGETVQVGATLVTFAEAKEAGRREEPEGERRPAQRPPSVGIVGSLPEPEAATQAPPAGFEGLATPMVRKMARERGIDLKSVRGTGPRGCIKPEDLDQIPQSAQKAKPAPQDGERVPLRGLRRTIARNVLASQKTTAFVTSMEEVDITDIWEMRGREQGEVESRGAHLTFLPFFIKAVQHALREHPLLNGSIDDEAQELVLKKQYHFGIAVDTPEGLMVPVIRDVDKKSIIELAQAVQELGRKARERSISLEELRGSSFTITNYGHFGGTFATPIINWPDVAIMGFGRIVERPWVHRGQIAIRKILPLSLTFDHRATDGADAARFLGKVLRYLEDPALLFLDSA",
    cdds: [
     */

    function updateFusions() {
        MSSolr.search('fusions', $s.fusionsOpts)
            .then(function(data) {
                $s.fusions = data;
                $s.loadingFusions = false;
            })
    }

    $s.$watch('fusionsOpts', function(after, before) {
        $s.loadingFusions = true;
        updateFusions();
    }, true)



    /*
    $s.doSomething = function($e, row) {
        $state.go('app.biochem', {tab: 'compounds'})
              .then(function() {
                  $state.go('app.biochemViewer', {cpd: row.id})
              })
    }*/


}])
