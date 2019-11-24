
angular.module('SubsystemSvc', [])
.service('SubsystemSvc', ['$http', '$q', 'config', '$log', 'MS', 'WS',
function($http, $q, config, $log, MS, WS) {
    "use strict";
    var self = this;

    this.listMySubsystems = function() {
        return MS.listMySubsystems()
        .then(function(subsys) {
            return subsys;
        }).catch(function(e) {
            console.log('Caught an error in listing mySubsystems: "' + 
                        (error.error.message).replace(/_ERROR_/gi, '') + '"');
            return null;
        })
    }

    // list all family trees under the subsystems/families folder
    this.listAllSubsysFamTrees = function() {
        return MS.listAllSubsysFamilyTrees()
        .then(function(subsysTrees) {
            return subsysTrees;
        }).catch(function(e) {
            console.log('Caught an error in listing family trees: "' + 
                        (error.error.message).replace(/_ERROR_/gi, '') + '"');
            return null;
        })
    }

    this.getSubsystemData = function(wsPath) {
        return WS.get(wsPath)
        .then(function(res) {
            return res.data;
        })
        .catch(function(error) {
            console.log('Caught an error while loading subsystem data: "' +
                        (error.error.message).replace(/_ERROR_/gi, '') + '"');
            return null;
        })
    }

    this.fetchDownloadURL = function(tree_name, fam_trees) {
        var fpath = '', downloadURL = '';
        for (var i=0; i<fam_trees.length; i++) {
            if (fam_trees[i]['treeName'] == tree_name) {
                fpath = fam_trees[i]['path'];
                break;
            }
        }
        if (fpath !== '') {
            return WS.getDownloadURL(fpath)
            .then(function(res) {
                downloadURL = res[0];
                return downloadURL;
            })
        }
        return downloadURL;
    }

    // loading the family tree data (in extendable phyloxml format) into an XMLDocument object
    this.loadPhyloXML = function (treeName, subsysPath) {
        var phyloxml_wsPath = subsysPath + '/families/' + treeName;

        return WS.get(phyloxml_wsPath)
        .then(function(res) {
            var xml_str = res.data,
                xmlMeta_str = res.meta;

            // DOMParser parses an xml string into a DOM tree and return a XMLDocument in memory
            // XMLSerializer will do the reverse of DOMParser
            // var oSerializer = new XMLSerializer();
            // var sXML = oSerializer.serializeToString(xmldoc);
            var p = new DOMParser();
            var phyloxmlDoc = p.parseFromString(xml_str, 'application/xml');
            console.log(phyloxmlDoc.documentElement.nodeName == "parsererror" ? "error while parsing"
                        : phyloxmlDoc.documentElement.nodeName);
            var xmlMeta = p.parseFromString(xmlMeta_str, 'text/xml');
            return {"meta": xmlMeta, "xmldoc": phyloxmlDoc};
        })
        .catch(function(error) {
            console.log('Caught an error in loading phyloXML: "' + error.error.message);
            return null;
        });
    }

    // Modify the XML data structure according to the annotations in column (col_id)
    this.updateAnnotationInTree = function(func, col_id, xmldoc, subsysData) {
        var dKeys = Object.keys(subsysData);
        for (var r=1; r<dKeys.length-1; r++) { // r=1 skip header
            var row_col = 'row' + r.toString() + '_col' + col_id.toString();
            var can_id = 'can_' + row_col, cur_id = 'cur_' + row_col, pre_id = 'pre_' + row_col;
            var can_arr = [], cur_arr = [], pre_arr = [];
            if (document.getElementById(can_id) !== null)
                can_arr = document.getElementById(can_id).options;
            if (document.getElementById(cur_id) !== null)
                cur_arr = document.getElementById(cur_id).options;
            if (document.getElementById(pre_id) !== null)
                pre_arr = document.getElementById(pre_id).options;

            if (can_arr != [])
                xmldoc = this.mapAnnotations(xmldoc, 'name', can_arr, cur_arr, pre_arr);
        }
        // After all annotations have been updated with new xml nodes added, append the last:
        var root_node = xmldoc.getElementsByTagName('phyloxml')[0];
        var lbls = xmldoc.createElement('labels', root_node.namespaceURI);
        var lbl1 = xmldoc.createElement('label', root_node.namespaceURI);
        var nm1 = xmldoc.createElement('name', root_node.namespaceURI);
        var txt1 = xmldoc.createTextNode('Percentage Score');
        nm1.appendChild(txt1);
        lbl1.appendChild(nm1);
        var dt1 = xmldoc.createElement('data', root_node.namespaceURI);
        dt1.setAttribute('tag', 'events');
        dt1.setAttribute('ref', 'speciations');
        lbl1.appendChild(dt1);
        lbl1.setAttribute('type', 'text');
        lbls.appendChild(lbl1);

        var lbl2 = xmldoc.createElement('label', root_node.namespaceURI);
        var nm2 = xmldoc.createElement('name', root_node.namespaceURI);
        var txt2 = xmldoc.createTextNode('Annotation');
        nm2.appendChild(txt2);
        lbl2.appendChild(nm2);
        var dt2 = xmldoc.createElement('data', root_node.namespaceURI);
        dt2.setAttribute('tag', 'colortag');
        // dt2.setAttribute('ref', 'resistance');
        lbl2.appendChild(dt2);
        lbl2.setAttribute('type', 'color');

        lbls.appendChild(lbl2);
        root_node.appendChild(lbls);

        //console.log(xmldoc.firstChild.innerHTML);
        return xmldoc;
    }

    // run through the annotation arrays to find gene_name matches
    // looping through these three arrays--if gene is in cur_arr, then green color
    // will be assigned to that the 'clade' node; if gene is in pre_arr, then blue
    // color will be assigned to that the 'clade' node; if gene is not in either
    // cur_arr or pre_arr, red color will be assigned to that the 'clade' node;
    // otherwise, black color will be assigned to that the 'clade' node.
    this.mapAnnotations = function(xmldoc, tagName, can_arr, cur_arr, pre_arr) {
        // get the `phylogeny` node as the root
        var tree = xmldoc.firstChild.childNodes[0];
        var namespc = tree.namespaceURI;
        if (tree.childElementCount > 0) {
            var can_genes = [], cur_genes = [], pre_genes = [];
            for (var k1=0; k1<can_arr.length; k1++) {
                can_genes[k1] = can_arr[k1].text;
            }
            for (var k2=0; k2<cur_arr.length; k2++) {
                cur_genes[k2] = cur_arr[k2].text;
            }
            for (var k3=0; k3<pre_arr.length; k3++) {
                pre_genes[k3] = pre_arr[k3].text;
            }
            var nodes = tree.getElementsByTagName(tagName);
            for (var i=0; i<nodes.length; i++) {
                if (nodes[i].childNodes.length > 0) {
                    var gene_name = nodes[i].innerHTML;
                    var parnt = nodes[i].parentNode;
                    var colr = '', score = 0;
                    for (var j=0; j<can_genes.length; j++) {
                        if (gene_name.indexOf(can_genes[j]) >= 0) {// found gene in annotation
                            colr = '0xFF0000';  // 'red'; // default color, not in curation or prediction
                            if (cur_genes.includes(can_genes[j])) colr = '0x00FF00';  // 'green';
                            else if (pre_genes.includes(can_genes[j])) colr = '0x0000FF';  // 'blue';
                            // Because `sepeciations` can only take nonNegativeInteger values
                            score = Number(can_arr[j]['value']).toFixed(2)*100;
                            break;
                        }
                    }
                    if (colr !== '') {
                        var ele1 = xmldoc.createElementNS(namespc, 'events');
                        var ele10 = xmldoc.createElementNS(namespc, 'speciations');
                        ele10.appendChild(xmldoc.createTextNode(score.toString()));
                        ele1.appendChild(ele10);
                        var ele2 = xmldoc.createElementNS(namespc, 'property');
                        ele2.setAttribute('ref', 'resistance');
                        ele2.setAttribute('datatype', 'xsd:string');
                        ele2.setAttribute('applies_to', 'clade');
                        var txt = xmldoc.createTextNode(colr);
                        ele2.appendChild(txt);
                        var ele3 = xmldoc.createElementNS(namespc, 'colortag');
                        ele3.appendChild(txt);
                        parnt.appendChild(ele1);
                        parnt.appendChild(ele2);
                        parnt.appendChild(ele3);
                    }
                }
            }
        }
        return xmldoc;
    }
}])