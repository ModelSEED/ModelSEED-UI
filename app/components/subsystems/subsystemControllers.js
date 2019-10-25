
// Begin add-subsystem controller
angular.module('Subsystems', ['uiTools'])
.controller('Subsystem',
['$scope', '$state', 'WS', '$stateParams',
 'uiTools', 'Dialogs', '$http', 'Auth',
function($s, $state, WS, $stateParams, tools, Dialogs, $http, Auth) {
    $s.subsysOpts = {query: '', limit: 10, offset: 0, sort: {field: 'Genome'}};
    $s.subsysHeader = []; // dynamically filled later
    $s.subsysData = [];
    $s.subsysDataClone = [];

    // workspace path and name of object
    var wsPath = $stateParams.path;
    if( wsPath == '' ) {
        console.log('Please specify the correct user name and path to the subsystem.');
        return false;
    }

    var captions = [];

    $s.loading = true;
    if (WS.cached.subsystems) {
        $s.subsysData = WS.cached.subsystems;
        $s.subsysDataClone = WS.cached.subsystemsClone;
        $s.subsysHeader = WS.cached.subsysHeader;
        $s.loading = false;
    } else {
        WS.get(wsPath)
        .then(function(res) {
            $s.subsysName = res.data.name;
            $s.subsysMeta = res.meta;

            // unmasked data
            $s.subsysDataClone = Object.assign({}, res.data.data);
            WS.cached.subsystemsClone = $s.subsysDataClone;

            // html-masked data
            $s.subsysData = parseSubsysData(res.data.data);
            $s.subsysData = buildHtmlContent($s.subsysData);
            WS.cached.subsystems = $s.subsysData;

            // table header
            captions = res.data.data[0];
            $s.subsysHeader[0] = {label: captions[0], key: captions[0]};
            for (var k=1; k<captions.length; k++) {
                $s.subsysHeader[k] = {label: captions[k], key: captions[k], formatter: function(row) {
                    return '<span>'+row+'</span>';
            }}}
            WS.cached.subsysHeader = $s.subsysHeader;
            $s.loading = false;
        })
        .catch(function(error) {
            console.log('Caught an error: "' + (error.error.message).replace(/_ERROR_/gi, '') + '"');
            $s.loading = false;
        });
    }

    $s.save = function(data) {
        var data_obj = {"name": $s.subsysName, "data": data};
        return WS.save(wsPath, data_obj, {overwrite: true, userMeta: {}, type: 'unspecified'})
            .then(function() {
                $s.subsysDataClone = Object.assign({}, data);
                Dialogs.showComplete('Saved subsystems', $s.subsysName);
                $state.go('app.subsystem', wsPath);
            }).catch(function(e) {
                console.log('error', e)
                self.showError('Save error', e.error.message.slice(0,30)+'...')
            })
    }

    $s.saveAs = function(data, newName) {
        var folder = '/'+Auth.user+'/subsystems/';
        data = {"name": $s.subsysName, "data": data};
        return WS.save(folder+newName, data, {userMeta: {}, overwrite: true, type: 'unspecified'})
            .then(function(res) {
                Dialogs.showComplete('Saved subsystem data to ', newName);
                $state.go('app.subsystem', {path: folder+newName});
            }).catch(function(e) {
                console.log('error', e)
                self.showError('Save error', e.error.message.slice(0,30)+'...')
            })
    }

    // Parse the given data for the subsystem data structure
    function parseSubsysData(obj_data) {
        // convert the subsystem data into an array of objects from an array of arrays
        var caps = obj_data[0];
        var data = [];
        for (var i=1; i<obj_data.length; i++) {
            data[i-1] = {};
            for (var j=0; j<caps.length; j++) {
                data[i-1][caps[j]] = obj_data[i][j];
            }
        }
        return data;
    }

    // With the given data from the NEW subsystem data structure, build the html content for table cells
    function buildHtmlContent(input_data) {
        /*
        input_data: has a structure of an array of objects, i.e.,
            [{"col_caption1": col_val1}, {"col_caption2": col_val2}, ...]
        return: the input_data with its original object subdata replaces with the html masked data.
        */
        var curation_roles = [], prediction_roles = []; candidate_roles = [];
        var curation_scores = [], prediction_scores = []; candidate_scores = [];
        input_data[0] = rxnRow(input_data[0]);

        for (var i=1; i<input_data.length; i++) { // i=1 to skip masking the reaction row
            curation_roles[i] = {};
            prediction_roles[i] = {};
            candidate_roles[i] = {};
            curation_scores[i] = {};
            prediction_scores[i] = {};
            candidate_scores[i] = {};
            var indata = input_data[i];
            var key_arr = Object.keys(indata);
            for (var k = 1; k<key_arr.length; k++) { // k=1 to skip masking the genome column
                key = key_arr[k];
                curation_roles[i][key] = [];
                prediction_roles[i][key] = [];
                candidate_roles[i][key] = [];
                curation_scores[i][key] = [];
                prediction_scores[i][key] = [];
                candidate_scores[i][key] = [];
                var val = indata[key];
                if (typeof val === 'object' && key != 'Genome') {
                    Object.keys(val).forEach(function(sub_key) {
                        switch(sub_key) {
                            case 'curation':
                              // curation roles
                              Object.keys(val[sub_key]).forEach(function(ssubK) {
                                var curk_arr = Object.keys(val[sub_key][ssubK]);
                                var curv_arr = Object.values(val[sub_key][ssubK]); 
                                curation_roles[i][key] = curation_roles[i][key].concat(curk_arr);
                                curation_scores[i][key] = curation_roles[i][key].concat(curv_arr);
                              });
                              break;
                            case 'prediction':
                              // prediction roles
                              Object.keys(val[sub_key]).forEach(function(ssubK) {
                                var prek_arr = Object.keys(val[sub_key][ssubK]);
                                var prev_arr = Object.values(val[sub_key][ssubK]);
                                prediction_roles[i][key] = prediction_roles[i][key].concat(prek_arr);
                                prediction_scores[i][key] = prediction_scores[i][key].concat(prev_arr);
                              });
                              break;
                            case 'candidates':
                              // candidate roles
                              Object.keys(val[sub_key]).forEach(function(ssubK) {
                                var cank_arr = Object.keys(val[sub_key][ssubK]);
                                var canv_arr = Object.values(val[sub_key][ssubK]);
                                candidate_roles[i][key] = candidate_roles[i][key].concat(cank_arr);
                                candidate_scores[i][key] = candidate_scores[i][key].concat(canv_arr);
                              });
                              break;
                            default:
                              // do nothing
                              break;
                        }
                    });
                    indata[key] = buildCellHtml(curation_roles[i][key], candidate_roles[i][key], prediction_roles[i][key],
                                                curation_scores[i][key], candidate_scores[i][key], prediction_scores[i][key], i, k);
                }
            }
            input_data[i] = indata;
        }
        return input_data;
    }

    function rxnRow(indata0) {
        // re-write the reaction row by adding the anchor links
        var key_arr = Object.keys(indata0);
        for (var k = 1; k<key_arr.length; k++) {
            var key = key_arr[k],
                val = indata0[key];
            var lnk_arr = [];
            if (key != 'Genome') {
                val.split(',').forEach(function(item, index) {
                    lnk_arr.push('<a ui-sref="app.rxn({id: \''+item+'\'})" target="_blank">'+item+'</a>');
                })
                indata0[key] = lnk_arr.join(',');
            }
        }
        return indata0;
    }

    function buildCellHtml(curk_arr, cank_arr, prek_arr, curv_arr, canv_arr, prev_arr, row_id, col_id) {
        /*
        curk_arr: an array of curation gene_ids (string)
        cank_arr: an array of candidate gene_ids (string)
        prek_arr: an array of prediction gene_ids (string)
        curv_arr: an array of curation gene scores(string)
        canv_arr: an array of candidate gene scores (string)
        prev_arr: an array of prediction gene scores (string)
        row_id: the cell's row id (int)
        col_id: the cell's columm id (int)
        return: the html string that mask the data for a table cell at (row_id, col_id).
        */
        curk_arr = curk_arr.sort();
        cank_arr = cank_arr.sort();
        prek_arr = prek_arr.sort();
        var curk_str = '', prek_str = '', cank_str = '',
            row_col = 'row'+row_id.toString(10)+'_col'+col_id.toString(10),
            gene_id_str = '<section layout="row" layout-sm="column" layout-align="center center">';

        curk_str = '<div style="color: green;">Curations:<br><select id="cur_'+row_col+'" style="width:130px;" multiple=yes>';
        for (var j = 0; j < curk_arr.length; j++) {
            curk_str += '<option value="' + curv_arr[j]["score"] + '">';
            curk_str += curk_arr[j] + '</option>';
        }
        curk_str += '</select></div>';
        gene_id_str += curk_str;

        var btn10_str ='<div><br><md-button class="md-raised" aria-label="Add to curations" ng-click="addSelected($event, \'can_'+row_col+'\', \'cur_'+row_col+'\', \'\')">';
        btn10_str += '<md-tooltip>Add to curations</md-tooltip><=</md-button><br>';
        var btn11_str ='<md-button class="md-raised" aria-label="Remove from Curations" ng-click="removeSelected($event, \'cur_'+row_col+'\', \'can_'+row_col+'\', \'\')">';
        btn11_str += '<md-tooltip>Remove from Curations</md-tooltip>=></md-button></div>';
        gene_id_str += btn10_str + btn11_str;

        cank_str = '<div>Candidates:<br><select id="can_'+row_col+'" style="width:130px;" multiple=yes ng-dblclick="cellClick($event, \''+row_col+'\', \'\')">';
        for (var j = 0; j < cank_arr.length; j++) {
            cank_str += '<option value="';
            cank_str += canv_arr[j]["score"] + '"';
            if (!prek_arr.includes(cank_arr[j]) && !curk_arr.includes(cank_arr[j])) cank_str += ' style="color: red;"';
            cank_str += ' title="Double click for more...">' + cank_arr[j] + '</option>';
        }
        cank_str += '</select></div>';
        gene_id_str += cank_str;

        var btn20_str ='<div><br><md-button class="md-raised" aria-label="Add to predictions" ng-click="addSelected($event, \'can_'+row_col+'\', \'pre_'+row_col+'\', \'\')">';
        btn20_str += '<md-tooltip>Add to predictions</md-tooltip>=></md-button><br>';
        var btn21_str ='<md-button class="md-raised" aria-label="Remove from Predictions" ng-click="removeSelected($event, \'pre_'+row_col+'\', \'can_'+row_col+'\', \'\')">';
        btn21_str += '<md-tooltip>Remove from Predictions</md-tooltip><=</md-button></div>';
        gene_id_str += btn20_str + btn21_str;

        prek_str = '<div style="color: blue;">Predictions:<br><select id="pre_'+row_col+'" style="width:130px;" multiple=yes>';
        for (var j = 0; j < prek_arr.length; j++) {
            prek_str += '<option value ="' + prev_arr[j]["score"] + '">';
            prek_str += prek_arr[j] + '</option>';
        }
        prek_str += '</select></div></section>';
        gene_id_str += prek_str;
        return gene_id_str;
    }

    function buildSaveCancelHtml(cell_id) {
        var gene_list_ids = '\'cur_' + cell_id + '\', \'can_' + cell_id + '\', \'pre_' + cell_id + '\'';
        var save_cancel_str = '<section layout="row" layout-sm="column" layout-align="center center">';
        save_cancel_str += '<div>' +
            '<md-button id="save_'+cell_id+'" class="md-raised" style="right: 7px;" ng-click="save($event,'+gene_list_ids+', \'\')" ng-disabled="saveInProgress">' +
            '    {{saveAsInProgress ? saveInProgressText : \'Save\'}}' +
            '    <md-tooltip>Save change(s)</md-tooltip>' +
            '</md-button>' +
            '<md-button id="cancel_'+cell_id+'" class="md-raised" ng-click="cancel($event,'+gene_list_ids+', \'\')">' +
            '    <md-tooltip>Discard change(s)</md-tooltip>Cancel' +
            '</md-button>' +
            '<!--a ng-click="cancel($event)" class="no-link">Cancel</a-->';
        save_cancel_str += '</div></section>';
        return save_cancel_str;
    }

}])
// End add-subsystem control

// Begin Spreadsheet control
.controller('Spreadsheet',['$scope', 'WS', '$stateParams',
function($s, WS, $stateParams) {
    $s.genericOpts = {query: '', limit: 20, offset: 0};
    $s.genericHeader = []; // dynamically filled later

    // workspace path and name of object
    var wsPath = $stateParams.path;
    if( wsPath == '' ) {
        console.log('Please specify the correct path to the data.');
        return false;
    }

    var captions = [];

    $s.loading = true;
    if (WS.cached.genericData) {
        $s.genericData = WS.cached.genericData;
        $s.genericHeader = WS.cached.genericHeader;
        $s.loading = false;
    } else {
        WS.get(wsPath)
        .then(function(res) {
            $s.genericName = res.data.name;
            $s.genericData = parseGenericData($s.genericName, res.data.data);
            captions = res.data.data[0];
            WS.cached.gnericData = $s.genericData;
            for (var k=0; k<captions.length; k++) {
                $s.genericHeader[k] = {label: captions[k], key: captions[k]};
            }
            WS.cached.genericHeader = $s.genericHeader;
            $s.loading = false;
        })
        .catch(function(error) {
            console.log('Caught an error: "' + (error.error.message).replace(/_ERROR_/gi, '') + '"');
            $s.loading = false;
        });
    }

    // Parse the given data for the subsystem data structure
    function parseGenericData(obj_name, obj_data) {
        var caps = obj_data[0];

        // convert the subsystem data into an array of objects from an array of arrays
        data = [];
        for (var i=1; i<obj_data.length; i++) {
            data[i-1] = {};
            for (var j=0; j<caps.length; j++) {
                data[i-1][caps[j]] = obj_data[i][j];
            }
        }
        return data;
    }
}])

// End Spreadsheet control