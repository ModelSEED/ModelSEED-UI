
angular.module('Fusions', [])
.controller('Fusions',
['$scope', '$http', '$state', 'uiTools', 'Dialogs', 'Session', 'MSSolr', '$compile',
function($s, $http, $state, uiTools, Dialogs, Session, MSSolr, $compile) {

    $s.tabs = {tabIndex: Session.getTab($state)};
    $s.$watch('tabs', function(value) { Session.setTab($state, value) }, true)

    $s.opts = {size: 'condensed', border: false};

    // training table

    var sFields = ['id', 'species', 'function', 'fusion_class', 'contig']; // fixme: 'cdds' (still needed?)
    $s.trainingOpts = Session.getOpts($state, 'training') ||
        {query: '', limit: 25, offset: 0, sort: {}, searchFields: sFields, core: 'fusion-training'};

    $s.trainingHeader = [
        {label: 'Gene', key: 'id', format: function(row) {
            return '<a ui-sref="main.projects.trainingGene({gene: \''+row.id+'\'})">'+row.id+'</a>'
        }},
        {label: 'Species', key: 'species'},
        {label: 'Fuction', key: 'function'},
        {label: 'Fusion Class', key: 'fusion_class'},
        {label: 'Uncertain', key: 'uncertain'},
        {label: 'Length', key: 'length'},
        {label: 'Genpro', key: 'genpro'},
        {label: 'Seed', key: 'seed'},
        {label: 'Img', key: 'img'},
        {label: 'Curation', key: 'curation'},
        //{label: 'Contig', key: 'contig'},
        /*{label: 'Direction', key: 'direction'},
        {label: 'Start', key: 'start'},
        {label: 'Stop', key: 'stop'},
        {label: 'Sequence', key: 'sequence'},*/
    ];

    function updateTraining() {
        MSSolr.search('fusion-training', $s.trainingOpts)
            .then(function(data) {
                $s.training = data;
                $s.loadingTraining = false;
            })
    }

    $s.$watch('trainingOpts', function(after, before) {
        $s.loadingTraining = true;
        updateTraining();
        Session.setOpts($state, 'training', after);
    }, true)


    // fusions
    var sFields = ['gene', 'function', 'species', 'contig', 'cdds'];
    $s.fusionsOpts = Session.getOpts($state, 'fusions') ||
        {query: '', limit: 25, offset: 0, sort: {}, searchFields: sFields, core: 'fusions'};


    $s.fusionsHeader = [
        {label: 'Gene', key: 'gene', format: function(row) {
            return '<a ui-sref="main.projects.fusionGene({gene: \''+row.gene+'\'})">'+row.gene+'</a>'
        }},
        {label: 'Species', key: 'species'},
        {label: 'Function', key: 'function'},
        {label: 'Length', key: 'length'},
        {label: 'Left SG', key: 'left_sg'},
        {label: 'Right SG', key: 'right_sg'},
        {label: 'Overlap SG', key: 'overlap_sg'},
        {label: 'Best Left', key: 'best_left'},
        {label: 'Best Right', key: 'best_right'},

        /*{label: 'Divide', key: 'divide'},
        {label: 'Score', key: 'score'},
        {label: 'Left', key: 'left'},
        {label: 'Right', key: 'right'},
        {label: 'Overlap', key: 'overlap'},
        {label: 'Matches', key: 'matches'},
        {label: 'Best Left', key: 'best_left'},
        {label: 'Best Right', key: 'best_right'},
        {label: 'Best Left Align', key: 'best_left_align'},
        {label: 'Left Links', key: 'left_links'},
        {label: 'Right Links', key: 'right_links'},
        {label: 'Set Count', key: 'set_count'},
        {label: 'Contig', key: 'contig'},
        {label: 'Direction', key: 'direction'},
        {label: 'Start', key: 'start'},
        {label: 'Stop', key: 'stop'},
        {label: 'Sequence', key: 'sequence'},
        {label: 'CDDs', key: 'cdds'},*/
    ];

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
        Session.setOpts($state, 'fusions', after);
    }, true)

    // roles table

    var sFields = ['role'];
    $s.rolesOpts = Session.getOpts($state, 'roles') ||
        {query: '', limit: 25, offset: 0, sort: {}, searchFields: sFields, core: 'fusion-roles'};

    $s.rolesHeader = [
        {label: 'Role', key: 'role', format: function(row) {
            return '<a ui-sref="main.projects.fusionRole({role: \''+row.role+'\'})">'+row.role+'</a>'
        }},
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
        /*{label: 'Frequently Fused Count', key: 'frequently_fused_function_count'},
        {label: 'Frequently used', key: 'frequently_fused_function_genomes'},*/
    ];

    function updateRoles() {
        MSSolr.search('fusion-roles', $s.rolesOpts)
            .then(function(data) {
                $s.roles = data;
                $s.loadingRoles = false;
            })
    }

    $s.$watch('rolesOpts', function(after, before) {
        $s.loadingRoles = true;
        updateRoles();
        Session.setOpts($state, 'roles', after);
    }, true)


    // cdd table
    var indexUrl = 'http://www.ncbi.nlm.nih.gov/Structure/cdd/cddsrv.cgi?uid=', //ex: 198330
        setUrl = 'http://www.ncbi.nlm.nih.gov/Structure/cdd/cddsrv.cgi?uid=';

    var sFields = ['id', 'accession', 'name', 'set', 'set_name', 'description'];
    $s.cddOpts = Session.getOpts($state, 'cdd') ||
        {query: '', limit: 25, offset: 0, sort: {}, searchFields: sFields, core: 'fusion-cdd'};

    $s.cddHeader = [
        {label: 'CDD', key: 'name', format: function(row) {
            return '<a ui-sref="main.projects.fusionCdd({cdd: \''+row.name+'\'})">'+row.name+'</a>'
        }},
        {label: 'Index', key: 'id', format: function(row) {
            return '<a href="'+indexUrl+row.id+'" target="_blank">'+row.id+'</a>';
        }},
        {label: 'Accession', key: 'accession'},
        {label: 'Length', key: 'length'},
        //{label: 'Genes', key: 'genes'},
        //{label: 'Gene Count', key: 'gene_count'},
        {label: 'Full Genes', key: 'fullgenes'},
        //{label: 'Is Full Gene?', key: 'is_full_gene'},
        {label: 'Long Genes', key: 'longgenes'},
        {label: 'Set', key: 'set', format: function(row) {
            if (!row.set) return '-';
            return '<a href="'+setUrl+row.set+'" target="_blank">'+row.set+'</a>';
        }},
        {label: 'Description', key: 'description'},
    ];


    function updateCdds() {
        MSSolr.search('fusion-cdd', $s.cddOpts)
            .then(function(data) {
                $s.cdds = data;
                $s.loadingCdds = false;
            })
    }

    $s.$watch('cddOpts', function(after, before) {
        $s.loadingCdds = true;
        updateCdds();
        Session.setOpts($state, 'cdd', after);
    }, true)


    // cdd sets

    var sFields = ['id', 'accession', 'name', 'description', 'cddlist'];
    $s.cddSetOpts = Session.getOpts($state, 'cddSet') ||
        {query: '', limit: 25, offset: 0, sort: {}, searchFields: sFields, core: 'fusion-cdd-sets'};

    $s.cddSetHeader = [
        {label: 'CDD', key: 'name', format: function(row) {
            return '<a ui-sref="main.projects.fusionCddSets({cdd: \''+row.name+'\'})">'+row.name+'</a>'
        }},
        {label: 'Index', key: 'id', format: function(row){
            return '<a href="'+indexUrl+row.id+'" target="_blank">'+row.id+'</a>';
        }},
        {label: 'Accession', key: 'accession'},
        {label: 'Length', key: 'length'},
        {label: 'Gene Count', key: 'gene_count'},
        {label: 'Full Genes', key: 'fullgenes'},
        {label: 'Is Full Gene?', key: 'is_full_gene'},
        {label: 'CDDs', key: 'cdds'},
        {label: 'CDD List', key: 'cddlist',
            format: function(row) {
                return row.cddlist.split(';').join('<br>')
            }
        },
        {label: 'Links', key: 'links'},
        /*{label: 'Linked sets', key: 'linkedsets',
            format: function(row) {
                return row.linkedsets[0].split(';').join('<br>');
            }
        }
        {label: 'Description', key: 'description'},*/
    ];

    function updateCddSets() {
        MSSolr.search('fusion-cdd-sets', $s.cddSetOpts)
            .then(function(data) {
                $s.cddSet = data;
                $s.loadingCddSet = false;
            })
    }

    $s.$watch('cddSetOpts', function(after, before) {
        $s.loadingCddSet = true;
        updateCddSets();
        Session.setOpts($state, 'cddSet', after);
    }, true)


    // genome stats
    var sFields = ['id', 'name', 'taxonomy', 'domain', 'md5'];
    $s.genomeStatsOpts = Session.getOpts($state, 'genomeStats') ||
        {query: '', limit: 25, offset: 0, sort: {}, searchFields: sFields, core: 'fusion-genome-stats'};

    $s.genomeStatsHeader = [
        {label: 'Gene', key: 'id', format: function(row) {
            return '<a ui-sref="main.projects.fusionGenomeStats({id: \''+row.id+'\'})">'+row.id+'</a>'
        }},
        {label: 'Name', key: 'name'},
        {label: 'Taxonomy', key: 'taxonomy', format: function(row) {
            return row.taxonomy.join('<br>');
        }},
        {label: 'Genes', key: 'genes'},
        {label: 'DNA Size', key: 'dna-size'},
        {label: 'contigs', key: 'contigs'},
        {label: 'Complete', key: 'complete'},
        {label: 'Genetic Code', key: 'genetic-code'},
        {label: 'Final Predicted Fusions', key: 'final_predicted_fusions'},
        {label: 'Fraction of Final Fusioin Predictions', key: 'fraction_final_fusion_predictions'},

        /*{label: 'Genes With CDDs', key: 'genes_with_cdds'},
        {label: 'Total CDD Hits', key: 'total_cdd_hits'},
        {label: 'Genes With No Overlapping CDDs', key: 'genes_with_nonoverlapping_cdds'},
        {label: 'Full Genes CDD Hists', key: 'full_genes_cdd_hits'},
        {label: 'Genes With No Overlapping Full Gene CDDs', key: 'genes_with_nonoverlapping_full_gene_cdds'},
        {label: 'GC Content', key: 'gc-content'},
        {label: 'MD5', key: 'md5'},
        {label: 'RNAs', key: 'rnas'}*/
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
        Session.setOpts($state, 'genomeStats', after);
    }, true)



    // reactions table
    var sFields = ['reaction', 'direction', 'equation', 'max_genome_role', 'max_fusion_fraction_role'];
    $s.reactionOpts = Session.getOpts($state, 'reaction') ||
        {query: '', limit: 25, offset: 0, sort: {}, searchFields: sFields, core: 'fusion-reactions'};

    $s.reactionHeader = [
        {label: 'Reaction', key: 'reaction', format: function(row) {
            return '<a ui-sref="main.projects.fusionReactions({id: \''+row.reaction+'\'})">'+row.reaction+'</a>'
        }},
        {label: 'Dir', key: 'direction'},
        {label: 'EQ', key: 'equation'},
        //{label: 'Active', key: 'active'},
        //{label: 'Essential', key: 'essential'},
        //{label: 'Active Models', key: 'active_models'},
        {label: 'Essential Models', key: 'essential_models'},
        {label: 'Active Side Paths', key: 'active_side_pathways'},
        {label: 'Essential Side Paths', key: 'essential_side_pathways'},
        {label: 'Avg Essential Flux', key: 'average_essential_flux'},
        //{label: 'Avg Active Flux', key: 'average_active_flux'},
        {label: 'Damage Prone Rxns', key: 'damage_prone_reactants'},
        /*{label: 'Role Count', key: 'role_count'},
        {label: 'Max Genomes', key: 'max_genomes'},
        {label: 'Max Genome Role', key: 'max_genome_role'},
        {label: 'RNAs', key: 'max_fusions'},
        {label: 'Max Fussion Role', key: 'max_fusion_role'},
        {label: 'Max Fussion Fraction', key: 'max_fusion_fraction'},
        {label: 'Max Fussion Fraction Role', key: 'max_fusion_fraction_role'},
        {label: 'Is Complex', key: 'is_complex'},
        {label: 'Is Transport', key: 'is_transport'},
        {label: 'Models', key: 'models'},*/
        {label: 'Delta G', key: 'deltaG'},
        /*{label: 'Is Essential', key: 'is_essential'},
        {label: 'Is Active', key: 'is_active'},*/
        {label: 'Fequently Fused', key: 'frequently_fused'},
        {label: 'Hypothesized Reason for Fusion', key: 'hypothesized_reason_for_fusion'}
    ];

    function updateReaction() {
        MSSolr.search('fusion-reactions', $s.reactionOpts)
            .then(function(data) {
                $s.reaction = data;
                $s.loadingReaction = false;
            })
    }

    $s.$watch('reactionOpts', function(after, before) {
        $s.loadingReaction = true;
        updateReaction();
        Session.setOpts($state, 'reaction', after);
    }, true)


    // subsystem table
    var sFields = ['subsystem', 'class_one', 'class_two'];
    $s.subsystemOpts = Session.getOpts($state, 'subsystem') ||
        {query: '', limit: 25, offset: 0, sort: {}, searchFields: sFields, core: 'fusion-subsystems'};

    $s.subsystemHeader = [
        {label: 'Subsystem', key: 'subsystem', format: function(row) {
            return '<a ui-sref="main.projects.fusionSubsystems({id: \''+row.subsystem+'\'})">'+row.subsystem+'</a>'
        }},
        {label: 'Class One', key: 'class_one'},
        {label: 'Class Two', key: 'class_two'},
        {label: 'Function Count', key: 'function_count'},
        {label: 'Frequently Fused Function Count', key: 'frequently_fused_function_count'},
        {label: 'Fraction Fusions', key: 'fraction_fusions'},
        {label: 'Fused Function Genome Count', key: 'fused_function_genome_count'},
        {label: 'Function Genome Count', key: 'function_genome_count'},
        {label: 'Fraction Genomes With Fusions', key: 'fraction_genomes_with_fusions'},
    ];

    function updateSubsystem() {
        MSSolr.search('fusion-subsystems', $s.subsystemOpts)
            .then(function(data) {
                $s.subsystem = data;
                $s.loadingSubsystem = false;
            })
    }

    $s.$watch('subsystemOpts', function(after, before) {
        $s.loadingSubsystem = true;
        updateSubsystem();
        Session.setOpts($state, 'subsystem', after);
    }, true)


    $s.download = function($ev, opts) {
        var csvUrl = MSSolr.getDownloadUrl(opts.core, opts);
        Dialogs.solrDownload($ev, opts.core, csvUrl);
    }
}])

.controller('TrainingGene',
['$scope', '$stateParams', 'MSSolr',
function($s, $stateParams, MSSolr) {
    $s.gene = $stateParams.gene;

    $s.featureUrl = 'http://pubseed.theseed.org/?page=Annotation&feature=';

    $s.info =  [
        {label: 'Species', key: 'species'},
        {label: 'Fuction', key: 'function'},
        {label: 'Fusion Class', key: 'fusion_class'},
        {label: 'Uncertain', key: 'uncertain'},
        {label: 'Length', key: 'length'},
        {label: 'Genpro', key: 'genpro'},
        {label: 'Seed', key: 'seed'},
        {label: 'Img', key: 'img'},
        {label: 'Curation', key: 'curation'},
        {label: 'Contig', key: 'contig'},
        {label: 'Direction', key: 'direction'},
        {label: 'Start', key: 'start'},
        {label: 'Stop', key: 'stop'},
        //{label: 'Sequence', key: 'sequence'}
    ];

    $s.loading = true;
    MSSolr.search('fusion-training', {query: $s.gene, searchFields: ['id']})
        .then(function(data) {
            $s.result = data.docs[0];
            $s.loading = false;
        })
}])


.controller('FusionGene',
['$scope', '$stateParams', 'MSSolr',
function($s, $stateParams, MSSolr) {
    $s.gene = $stateParams.gene;

    $s.featureUrl = 'http://pubseed.theseed.org/?page=Annotation&feature=';

    $s.info = [
        //{label: 'Gene', key: 'gene'},
        {label: 'Species', key: 'species'},
        {label: 'Function', key: 'function'},
        {label: 'Length', key: 'length'},
        {label: 'Left SG', key: 'left_sg'},
        {label: 'Right SG', key: 'right_sg'},
        {label: 'Overlap SG', key: 'overlap_sg'},
        {label: 'Best Left', key: 'best_left'},
        {label: 'Best Right', key: 'best_right'},

        {label: 'Divide', key: 'divide'},
        {label: 'Score', key: 'score'},
        {label: 'Left', key: 'left'},
        {label: 'Right', key: 'right'},
        {label: 'Overlap', key: 'overlap'},
        {label: 'Matches', key: 'matches'},
        {label: 'Best Left', key: 'best_left'},
        {label: 'Best Right', key: 'best_right'},
        {label: 'Best Left Align', key: 'best_left_align'},
        {label: 'Left Links', key: 'left_links'},
        {label: 'Right Links', key: 'right_links'},
        {label: 'Set Count', key: 'set_count'},
        {label: 'Contig', key: 'contig'},
        {label: 'Direction', key: 'direction'},
        {label: 'Start', key: 'start'},
        {label: 'Stop', key: 'stop'},
        //{label: 'Sequence', key: 'sequence'},
        //{label: 'CDDs', key: 'cdds'},
    ];

    $s.loading = true;
    MSSolr.search('fusions', {query: $s.gene, searchFields: ['gene']})
        .then(function(data) {
            $s.result = data.docs[0];
            $s.loading = false;
        })
}])



.controller('FusionRole',
['$scope', '$stateParams', 'MSSolr',
function($s, $stateParams, MSSolr) {
    $s.role = $stateParams.role;

    $s.info = [
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

    $s.loading = true;
    MSSolr.search('fusion-roles', {query: $s.role, searchFields: ['role']})
        .then(function(data) {
            $s.result = data.docs[0];
            $s.loading = false;
        })
}])


.controller('FusionCDD',
['$scope', '$stateParams', 'MSSolr',
function($s, $stateParams, MSSolr) {
    $s.cdd = $stateParams.cdd;

    $s.indexUrl = 'http://www.ncbi.nlm.nih.gov/Structure/cdd/cddsrv.cgi?uid='; //ex: 198330
    $s.setUrl = 'http://www.ncbi.nlm.nih.gov/Structure/cdd/cddsrv.cgi?uid=';

    $s.geneOpts = {query: '', limit: 10, offset: 0, sort: {field: 'id'}};
    $s.geneHeader = [{label: 'Gene', key: 'id'}];

    // table is defined in template

    $s.loading = true;
    MSSolr.search('fusion-cdd', {query: $s.cdd, searchFields: ['name']})
        .then(function(data) {
            $s.result = data.docs[0];
            for (var i=0; i< $s.result.genes.length; i++) {
                $s.result.genes[i] = {id: $s.result.genes[i]}
            }
            $s.loading = false;
        })
}])



.controller('FusionCDDSets',
['$scope', '$stateParams', 'MSSolr',
function($s, $stateParams, MSSolr) {
    $s.cdd = $stateParams.cdd;

    $s.indexUrl = 'http://www.ncbi.nlm.nih.gov/Structure/cdd/cddsrv.cgi?uid='; //ex: 198330
    $s.setUrl = 'http://www.ncbi.nlm.nih.gov/Structure/cdd/cddsrv.cgi?uid=';

    // table is defined in template

    $s.loading = true;
    MSSolr.search('fusion-cdd-sets', {query: $s.cdd, searchFields: ['name']})
        .then(function(data) {
            $s.result = data.docs[0];
            //for (var i=0; i< $s.result.genes.length; i++) {
            //    $s.result.genes[i] = {id: $s.result.genes[i]}
            //}
            $s.loading = false;
        })
}])



.controller('FusionGenomeStats',
['$scope', '$stateParams', 'MSSolr',
function($s, $stateParams, MSSolr) {
    $s.gene = $stateParams.id;

    $s.featureUrl = 'http://pubseed.theseed.org/?page=Annotation&feature=';

    // table is defined in template
    $s.info = [
        /*{label: 'ID', key: 'id'},   // in template
        {label: 'Name', key: 'name'},
        {label: 'Taxonomy', key: 'taxonomy', format: function(row) {
            return row.taxonomy.join('<br>');
        }},*/
        {label: 'Genes', key: 'genes'},
        {label: 'DNA Size', key: 'dna-size'},
        {label: 'contigs', key: 'contigs'},
        {label: 'Complete', key: 'complete'},
        {label: 'Genetic Code', key: 'genetic-code'},
        {label: 'Final Predicted Fusions', key: 'final_predicted_fusions'},
        {label: 'Fraction of Final Fusioin Predictions', key: 'fraction_final_fusion_predictions'},

        {label: 'Genes With CDDs', key: 'genes_with_cdds'},
        {label: 'Total CDD Hits', key: 'total_cdd_hits'},
        {label: 'Genes With No Overlapping CDDs', key: 'genes_with_nonoverlapping_cdds'},
        {label: 'Full Genes CDD Hists', key: 'full_genes_cdd_hits'},
        {label: 'Genes With No Overlapping Full Gene CDDs', key: 'genes_with_nonoverlapping_full_gene_cdds'},
        {label: 'GC Content', key: 'gc-content'},
        {label: 'MD5', key: 'md5'},
        {label: 'RNAs', key: 'rnas'}
    ];

    $s.loading = true;
    MSSolr.search('fusion-genome-stats', {query: $s.gene, searchFields: ['id']})
        .then(function(data) {
            $s.result = data.docs[0];
            $s.loading = false;
        })
}])

.controller('FusionReactions',
['$scope', '$stateParams', 'MSSolr',
function($s, $stateParams, MSSolr) {
    $s.id = $stateParams.id;

    $s.info = [
        {label: 'Reaction', key: 'reaction'},
        {label: 'Dir', key: 'direction'},
        {label: 'EQ', key: 'equation'},
        {label: 'Active', key: 'active'},
        {label: 'Essential', key: 'essential'},
        {label: 'Active Models', key: 'active_models'},
        {label: 'Essential Models', key: 'essential_models'},
        {label: 'Active Side Paths', key: 'active_side_pathways'},
        {label: 'Essential Side Paths', key: 'essential_side_pathways'},
        {label: 'Avg Essential Flux', key: 'average_essential_flux'},
        {label: 'Avg Active Flux', key: 'average_active_flux'},
        {label: 'Damage Prone Rxns', key: 'damage_prone_reactants'},
        {label: 'Role Count', key: 'role_count'},
        {label: 'Max Genomes', key: 'max_genomes'},
        {label: 'Max Genome Role', key: 'max_genome_role'},
        {label: 'RNAs', key: 'max_fusions'},
        {label: 'Max Fussion Role', key: 'max_fusion_role'},
        {label: 'Max Fussion Fraction', key: 'max_fusion_fraction'},
        {label: 'Max Fussion Fraction Role', key: 'max_fusion_fraction_role'},
        {label: 'Is Complex', key: 'is_complex'},
        {label: 'Is Transport', key: 'is_transport'},
        //{label: 'Models', key: 'models'},
        {label: 'Delta G', key: 'deltaG'},
        {label: 'Is Essential', key: 'is_essential'},
        {label: 'Is Active', key: 'is_active'},
        {label: 'Fequently Fused', key: 'frequently_fused'},
        {label: 'Hypothesized Reason for Fusion', key: 'hypothesized_reason_for_fusion'}
    ]

    $s.loading = true;
    MSSolr.search('fusion-reactions', {query: $s.id, searchFields: ['reaction']})
        .then(function(data) {
            $s.result = data.docs[0];
            $s.loading = false;
        })
}])


.controller('FusionSubsystems',
['$scope', '$stateParams', 'MSSolr',
function($s, $stateParams, MSSolr) {
    $s.id = $stateParams.id;

    $s.info = [
        {label: 'Subsystem', key: 'subsystem'},
        {label: 'Class One', key: 'class_one'},
        {label: 'Class Two', key: 'class_two'},
        {label: 'Function Count', key: 'function_count'},
        {label: 'Frequently Fused Function Count', key: 'frequently_fused_function_count'},
        {label: 'Fraction Fusions', key: 'fraction_fusions'},
        {label: 'Fused Function Genome Count', key: 'fused_function_genome_count'},
        {label: 'Function Genome Count', key: 'function_genome_count'},
        {label: 'Fraction Genomes With Fusions', key: 'fraction_genomes_with_fusions'}
    ]

    $s.loading = true;
    MSSolr.search('fusion-subsystems', {query: $s.id, searchFields: ['subsystem']})
        .then(function(data) {
            $s.result = data.docs[0];
            $s.loading = false;
        })

}])
