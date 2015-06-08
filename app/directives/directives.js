
angular.module('core-directives', []);
angular.module('core-directives')
.directive('msTables', ['MS', function(MS) {
    return {
        link: function(scope, elem, attrs) {
            var path = attrs.objPath,
                type = attrs.type;

            MS.getObject(path)
              .then(function(data) {
                  console.log('parsed', data)

                  var params = {type: type,
                                obj: data.data,
                                meta: data.meta,
                                options: {showETC: true, urlRouter: urlRouter}
                               };

                  // used to support various apps with different frameworks
                  function urlRouter(type, ws, name) {
                      if (type === "KBaseFBA.FBAModel")
                          return '#/models/'+ws+'/'+name;
                      else if (type === "KBaseFBA.FBA")
                          return '#/fba/'+ws+'/'+name;
                      else if (type === "KBaseBiochem.Media")
                          return '#/media/'+ws+'/'+name;

                      return;
                  }
                  $(elem).kbaseTabTable(params);
              })
        }
    }
}])


.directive('kbTables', function() {
    return {
        link: function(scope, elem, attrs) {
            var type = attrs.kbTables,
                ws = attrs.kbTablesWs,
                obj = attrs.kbTablesObj;

            var params = {type: type,
                          ws: ws,
                          obj: obj,
                          options: {showETC: true, urlRouter: urlRouter}
                         };

            // used to support various apps with different frameworks
            function urlRouter(type, ws, name) {
                if (type === "KBaseFBA.FBAModel")
                    return '#/models/'+ws+'/'+name;
                else if (type === "KBaseFBA.FBA")
                    return '#/fba/'+ws+'/'+name;
                else if (type === "KBaseBiochem.Media")
                    return '#/media/'+ws+'/'+name;

                return;
            }


            $(elem).kbaseTabTable(params);
        }
    }
 })

.directive('fixedHeader', ['$window', '$timeout', function($window, $timeout) {
   return function(scope, elem, attr) {

        var header_id = '#'+attr.fixedHeader;
        var table_id = '#'+attr.fixedTable;

        var w = angular.element($window);
        w.bind('resize', function() {
            adjustHeader();
        })

        function adjustHeader() {
            var headers = elem.find('th');
            var orig_headers = angular.element(table_id).find('th');

            angular.forEach(orig_headers, function(v, k) {
                // .css is the jquery
                $(headers[k]).css({width: orig_headers[k].clientWidth});
            })
        }

        scope.$watch('loading', function() {
            $timeout(function() {
                adjustHeader();
            });
        });
   };
}])


.directive('email', function() {
    return {
        link: function(scope, elem, attrs) {
            var emailList = ['nealconrad@gmail.com'];
            var emailSubject = attrs.emailSubject ? attrs.emailSubject : 'Inquiry';

            var link = '<a href="mailto:'+emailList.join(',')+'">'+
                            (attrs.text? attrs.text : 'Send email')+
                       '</a>'

            angular.element(elem).append(link);
        }
    }
 })


.directive('pathTest', function() {
    return {
        link: function(scope, elem, attrs) {
            angular.element(elem).kbasePathway({model_ws: 'janakakbase:CoreModels-VR-GP',
                                                model_name: 'core_1000565.3_GP',
                                                map_name: 'map00010',
                                                map_ws: 'nconrad:paths'});
        }
    }
 })


.directive('mediaTable', ['$compile', '$http', function($compile, $http) {
    return {
        link: function(scope, elem, attr) {
            var table;

            scope.tableOptions = {columns: [
                                      { title: 'Name', data: function(d) {
                                        var path = "app.mediaPage({ws: '"+d[7]+"', name: '"+d[1]+"'})";
                                        return '<a ui-sref="'+path+'" >'+d[1]+'</a>';
                                      }}
                                  ],
                                  language: {search: "_INPUT_",
                                             searchPlaceholder: 'Search media'}
                                 }

            elem.loading('', true);
            var prom = $http.rpc('ws', 'list_objects', {workspaces: ['coremodels_media'], includeMetadata: 1})
            prom.then(function(data) {
                elem.rmLoading();

                scope.tableOptions.data = data;
                scope.tableOptions.drawCallback = events;

                var t = $('<table class="table table-hover">');
                $(elem).append(t);
                table = t.dataTable(scope.tableOptions);
                $compile(table)(scope);
            })

            function events() {
                $compile(table)(scope);
            }
        }
    }
}])
.directive('fbaTable',
['$compile', '$stateParams',
function($compile, $stateParams) {
    return {
        link: function(scope, element, attr) {
            var table;

            scope.tableOptions = {columns: [
                                      { title: 'Name', data: function(d) {
                                        var path = "app.fbaPage({ws: '"+d[7]+"', name: '"+d[1]+"'})";
                                        return '<a ui-sref="'+path+'" >'+d[1]+'</a>';
                                       }},
                                   ]}


            element.loading('', true);
            var prom = kb.ws.list_objects({workspaces: [$stateParams.ws]})
            $.when(prom).done(function(data) {
                element.rmLoading();

                scope.tableOptions.data = data;
                scope.tableOptions.drawCallback = scope.events;

                var t = $('<table class="table table-hover">');
                $(element).append(t);
                table = t.dataTable(scope.tableOptions);
                $compile(table)(scope);
            })

            scope.events = function() {
                // compile template again for datatables
                $compile(table)(scope);
                scope.$apply();
            }


        }
    }
}])
.directive('genomesTable', ['$compile', function($compile) {
    return {
        link: function(scope, element, attr) {

            scope.tableOptions = {columns: [
                                      { title: 'Name', data: function(d) {
                                        var path = "genome({ws: '"+d[7]+"', name: '"+d[1]+"', tab: 'functional'})";
                                        return '<a ui-sref="'+path+'" >'+d[1]+'</a>';
                                       }},
                                   ]}

            element.loading('', true);
            var p1 = kb.ws.list_objects({workspaces: ['coremodels'], type: 'KBaseGenomes.Genome' });
            //var p2 = kb.ws.list_objects({workspaces: ['coremodels'], type: 'KBaseGenomes.ContigSet' });

            $.when(p1).done(function(d) {
                //var data = d1.concat(d2);
                element.rmLoading();

                scope.tableOptions.data = d;

                var t = $('<table class="table table-hover">');
                $(element).append(t);
                var table = t.dataTable(scope.tableOptions);
                $compile(table)(scope);
            })
        }
    }
}])

.directive('contig', ['stateParams', function($stateParams) {
    return {
        link: function(scope, ele, attr) {
            ele.loading()
            //var ref = $stateParams.ws+'/'+$stateParams.name
            var ref = "chenrydemo/kb|g.422"

            var p = kb.ws.get_objects([{ref: ref}])
            $.when(p).done(function(d) {
                ele.rmLoading();

                var data = d[0].data;

                var chart_data = process(data);
                draw(chart_data)
            })

            function process(data) {
                var numbers = []

                var features = data.features

                var max_e = 0;
                for (var i in features) {
                    var f = features[i];

                    var l = f.location;

                    var start = l[0][1], end, direction;
                    if (l[0][2] === '-') {
                        direction = 'left';
                        end = l[0][1];
                        start = end - l[0][3]
                    } else {
                        direction = 'right';
                        start = l[0][1];
                        end = start + l[0][3]
                    }

                    numbers.push({s: start, e: end, direction: direction})

                    if (end > max_e) max_e = end;
                }
                return {numbers: numbers, max: max_e};
            }

            function randomData() {
                var count = 100;
                var max_length = 10;

                var numbers = [];
                for (var i=0; i<count; i++) {
                    var num = Math.floor((Math.random()*(max_end-max_length))+1);
                    var num2 = Math.floor((Math.random()*max_length)+1);
                    numbers.push( [num,num+num2] );
                }

                return numbers;
            }

            function draw(data) {
                padding_bottom = 50;

                var max_end = data.max,
                    numbers = data.numbers;

                var h = 10; /* height of boxes */
                $(ele).append('<div id="cdd-chart">');

                //Create the Scale we will use for the Axis
                var x = d3.scale.linear()
                                .domain([0, max_end])
                                .range([20, width-20]);

                //Create the Axis
                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom")


                var zoom = d3.behavior.zoom()
                    .x(x)
                    .scaleExtent([1, 700])
                    .on("zoom", zoomed_poly);

                var svg = d3.select("#cdd-chart").append("svg")
                                                 .attr("width", width)
                                                 .attr("height", height)
                                                 .attr("transform", "translate(" + 0 + "," + 0 + ")")
                                                 .call(zoom);

                svg.append("rect")
                    .attr("class", "overlay")
                    .attr("width", width)
                    .attr("height", height);

                // Create an SVG group Element for the Axis elements and call the xAxis function
                var xAxisGroup = svg.append("g")
                                .attr("class", "x axis")
                                .attr("transform", "translate(0," + (height - padding_bottom) + ")")
                                    .call(xAxis);

                function zoomed() {
                    svg.select(".x.axis").call(xAxis);
                    // svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                    svg.selectAll('.cdd-box').attr("x", function(d) {
                        var start = d3.select(this).data()[0].start
                        var end = d3.select(this).data()[0].end
                        return x(start);
                    })
                    .attr('width', function(){
                        var start = d3.select(this).data()[0].start
                        var end = d3.select(this).data()[0].end
                        return ( x(end)-x(start) );
                    });
                }

                function zoomed_poly() {
                    svg.select(".x.axis").call(xAxis);
                    svg.selectAll('.cdd-box')
                       .attr("points", function(d) {
                            var start = d3.select(this).data()[0].start;
                            var end = d3.select(this).data()[0].end;
                            var h = d3.select(this).data()[0].height;

                            d = d3.select(this).data()[0].direction;
                            if (d === 'left') {
                                return polyLeft(start, end, h);
                            } else {
                                return polyRight(start, end, h);
                            }
                    })
                }

                var ystart = 20

                // create row heights
                var row_count = 25;
                var row_h = {}
                for (var i=1; i <= row_count; i++) {
                    row_h[i] = height - padding_bottom - ystart-(2*(i-1)*h)
                }

                var rows = {};
                for (var i=1; i <= row_count; i++) {
                    rows[i] = [];
                }

                for (var i in numbers) {
                    var start = numbers[i].s;
                    var end = numbers[i].e;
                    var direction = numbers[i].direction;

                    // go through existing rows to see if there is a good row
                    var found_row = 0 // starting with non existant key
                    for (var key in rows) {
                        var row = rows[key]

                        var good_row = true;
                        for (var j in row) {
                            var s = row[j][0]
                            var e = row[j][1]

                            // if outside existing box, continue
                            if (start > e || end < s) {
                                continue
                            } else {
                                good_row = false
                                break;
                            }
                        }

                        if (!good_row) {
                            continue
                        } else {
                            found_row = key
                            row.push([start, end])
                            break
                        }
                    }

                    if (found_row) {
                        if (direction === 'left') {
                            drawArrowLeft(start, end, row_h[found_row])
                        } else {
                            drawArrowRight(start, end, row_h[found_row])
                        }
                    } else {
                        console.error('did not find a place for ', start, end)
                    }
                }

                function drawBox(start, end, height) {
                    var rect = svg.append('rect')
                                  .data([{start: start, end: end}])
                                  .attr('class', 'cdd-box')
                                  .attr('x', x(0))
                                  .attr('y', 0)
                                  .attr('width', x(0)-x(0))
                                  .attr('height', h)
                                  .transition()
                                      .duration(1000)
                                      .ease("elastic")
                                      .attr('x', x(start))
                                       .attr('y', height)
                                      .attr('width', x(end)-x(start))
                                      .each("end", events)

                    var content = '<b>start:</b> '+start+'<br>'+
                                  '<b>end:</b> '+end+'<br>'+
                                  '<b>length:</b> '+(end-start);


                    //$(rect.node()).popover({html: true, content: content, animation: false,
                    //                        container: 'body', trigger: 'hover'});

                }

                function drawArrowRight(start, end, h) {
                    var poly = svg.append('polygon')
                                  .data([{start: start, end: end, height: h, direction: 'right'}])
                                  .attr('class', 'cdd-box')
                                      .attr('points', polyRight(start, end, h) )
                    events(poly);
                }

                function drawArrowLeft(start, end, h) {
                    var poly = svg.append('polygon')
                                  .data([{start: start, end: end, height: h, direction: 'left'}])
                                  .attr('class', 'cdd-box')
                                      .attr('points', polyLeft(start, end, h) )
                    events(poly);
                }

                function cornerRight(s, e) {
                    if ( (e-s) > 10 ) {
                        return e - 5
                    } else {
                        return s + ( 2*(e-s)/3 )
                    }
                }

                function cornerLeft(s, e) {
                    if ( (e-s) > 10 ) {
                        return s + 5
                    } else {
                        return  s + ( (e-s)/3 )
                    }
                }

                function polyRight(start, end, h) {
                    return x(start)+','+h+' '+
                           cornerRight(x(start), x(end))+','+h+' '+
                           x(end) +','+(h+5)+' '+
                           cornerRight(x(start), x(end))+','+(h+10)+' '+
                           x(start)+','+(h+10);
                }

                function polyLeft(start, end, h) {
                    return cornerLeft(x(start), x(end))+','+h+' '+
                            x(end) +','+h+' '+
                            x(end) +','+(h+10)+' '+
                           cornerLeft(x(start), x(end))+','+(h+10)+' '+
                           x(start)+','+(h+5);
                }


                function events(poly) {
                    poly.on('mouseover', function(d){
                        var rect = d3.select(this);
                        var start = rect.data()[0].start
                        var end = rect.data()[0].end
                        var s = x(start);
                        var e = x(end);

                        rect//.transition()
                            //.duration(200)
                            .style("fill", 'steelblue');

                        svg.append('line')
                            .attr('class', 'grid-line')
                            .attr('x1', s)
                            .attr('y1', 0)
                            .attr('x2', s)
                            .attr('y2', height)
                            .attr('stroke-dasharray', "5,5" )

                        svg.append('line')
                            .attr('class', 'grid-line')
                            .attr('x1', e)
                            .attr('y1', 0)
                            .attr('x2', e)
                            .attr('y2', height)
                            .attr('stroke-dasharray', "5,5" )

                        svg.append('text')
                            .attr('class', 'grid-label')
                           .text(start)
                            .attr('x', function() {
                                return s - this.getComputedTextLength() - 2;
                            })
                            .attr('y', height -10)

                        svg.append('text')
                            .attr('class', 'grid-label')
                           .text(end)
                            .attr('x', e+2)
                            .attr('y', height - 10)

                    }).on('mouseout', function(d){
                        d3.selectAll('.cdd-box')
                                //.transition()
                                //.duration(200)
                                .style('fill', 'lightsteelblue')
                        d3.selectAll('.grid-line').remove()
                        d3.selectAll('.grid-label').remove()
                    })
                    /*
                    svg.on('mousemove', function () {
                       coordinates = d3.mouse(this);
                        var x = coordinates[0];
                        var y = coordinates[1];
                    });*/
                }


            }

        }
    };
}])

.directive('heatmap',
    ['ModelViewer', '$q', '$http',
    function(MV, $q, $http) {
    return {
        link: function(scope, elem, attr) {
            var msConfig = new ModelSeedVizConfig();

            //var width = 1000,
            //    height = 1000;

            // resize svg
            var d = document,
                e = d.documentElement,
                g = d.getElementsByTagName('body')[0],
                width = window.innerWidth || e.clientWidth || g.clientWidth,
                height = window.innerHeight|| e.clientHeight|| g.clientHeight;

            var heatData, // avoid refresh
                svg;

            scope.models = MV.models;

            function update() {
                scope.loading = true;
                MV.updateData().then(function(d) {
                    var models = d.FBAModel,
                        all_fbas = d.FBA;

                    heatData = parseData(models, all_fbas);
                    draw(heatData, true);
                })
            }

            // update and draw
            update();

            scope.$on('Compare.event.absFlux', function(event, absFlux) {
                draw(heatData, absFlux);
            })

            scope.$on('MV.event.change', function() {
                update()
            })


            function draw(data, absFlux) {
                elem.html('');
                elem.append('<div id="canvas">');
                heatmap_d3(data.x, data.y, data.data, absFlux);
                scope.loading = false;


                // ability to zoom
                d3.select("#canvas")
                  .call(d3.behavior.zoom().scaleExtent([-1, 8]).on("zoom", zoom))

                function zoom() {
                    svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                }
            }



            function parseData(models, fbas) {
                // create heatmap data
                var rxn_names = [],
                    model_names = [],
                    data = [];

                // first, get union of reactions
                for (var i=0; i < models.length; i++) {
                    var model = models[i];
                    model_names.push(model.name);

                    var rxns = model.modelreactions;
                    for (var j=0; j < rxns.length; j++) {
                        var rxn_name = rxns[j].reaction_ref.split('/')[5];
                        if (rxn_names.indexOf(rxn_name) === -1) rxn_names.push(rxn_name);
                    }
                }

                var rows = [];

                // for each model, get data for box, left to right
                for (var i=0; i < models.length; i++) {
                    var rxns = models[i].modelreactions;

                    // see if there is an fba result
                    // if so, get create rxn hash
                    var hasFBA = false,
                        fbaRXNs = {};
                    if (fbas && fbas[i]) {

                        hasFBA = true;
                        var fbaRxns = fbas[i].FBAReactionVariables;

                        for (var j=0; j<fbaRxns.length; j++) {
                            var rxnId = fbaRxns[j].modelreaction_ref.split('/')[5].split('_')[0];
                            fbaRXNs[rxnId] = fbaRxns[j];
                        }
                    }

                    var row = [];
                    // for each rxn in union of rxns, try to find rxn for that model
                    for (var j=0; j < rxn_names.length; j++) {
                        var rxn_name = rxn_names[j];

                        var found = false;
                        var flux;
                        for (var k=0; k<rxns.length; k++) {
                            if (rxns[k].reaction_ref.split('/')[5] === rxn_name) {
                                found = true;
                                if (hasFBA && fbaRXNs[rxn_name])
                                    flux = fbaRXNs[rxn_name].value;
                                break;
                            }
                        }

                        row.push({present: (found ? 1 : 0), flux: flux});
                    }

                    rows.push(row);
                }

                return {x: rxn_names, y: model_names, data: rows};
            }


            // basic, zoomable svg map
            function heatmap_d3(xData, yData, rows, absFlux) {
                elem.append('<div id="canvas">');
                svg = d3.select("#canvas").append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .append("g")

                var w = 7, h = 7, font_size = '8px', start_y = 100;

                // to precompute starting postion of heatmap
                var y_widths = [];
                for (var i=0; i < yData.length; i++) {
                    //var label = svg.append("text").attr("y", start_y+i*h+h)
                    //            .text(yData[i]).attr("font-size", font_size);

                    //y_widths.push(label.node().getBBox().width);
                    y_widths.push(yData[i].length * 4)

                }
                $(elem).find('text').remove(); // fixme

                var start_x = Math.max.apply(Math, y_widths) + 5;

                // for each row, plot each column entity
                for (var i=0; i < yData.length; i++) {

                    var y_label = svg.append("text")
                                     .attr("y", start_y+i*h+h-0.5)
                                     .text(yData[i])
                                     .attr("font-size", font_size)
                                     .attr('text-anchor', 'end')
                                     .on("mouseover", function(){d3.select(this).attr("fill", "black");})
                                     .on("mouseout", function(){d3.select(this).attr("fill", "#333");});

                    var bb = y_label.node().getBoundingClientRect();
                    y_label.attr('transform', 'translate('+String(start_x-4)+',0)');

                    for (var j=0; j < xData.length; j++) {
                        if (i === 0) {
                            var pos = start_x+j*w+w;

                            var x_label = svg.append("text")
                                             .attr("x", pos)
                                             .attr("y", start_y-3)
                                             .text(xData[j])
                                             .attr("font-size", font_size)
                                             .attr("transform", 'rotate(-45,'+pos+','+start_y+')')
                                             .on("mouseover", function(){
                                                 d3.select(this).attr("fill", "black");
                                                 d3.select(this).attr("font-weight", "700");})
                                             .on("mouseout", function(){
                                                 d3.select(this).attr("fill", "#333");
                                                 d3.select(this).attr("font-weight", "none");});
                        }

                        var prop = rows[i][j];
                        var rect = svg.append("rect")
                                      .attr("x", start_x+j*w)
                                      .attr("y", start_y+i*h)
                                      .attr("width", w)
                                      .attr("height", h)
                                      .attr("stroke", msConfig.stroke)
                                      .attr('stroke-width', '.5px')
                                      .attr('data-row-num', i)
                                      .attr('class', 'model-rxn');

                        if (prop.present && prop.flux) {
                            var color = msConfig.getColor(prop.flux, absFlux);
                            rect.attr('fill', color);
                        } else {
                            rect.attr("fill", (prop.present === 1 ? msConfig.geneColor : 'white') );
                        }

                        // tool tips
                        var title = xData[j];
                        var content = '<b>Flux:</b> '+prop.flux+'<br>'+
                                      '<b>Org:</b> '+yData[i]+'<br>';
                        $(rect.node()).popover({html: true, content: content,
                                                animation: false, title: title,
                                                container: 'body', trigger: 'hover'});

                        // highlight object in selected data
                        $(rect.node()).hover(function() {
                            var i = $(this).attr('data-row-num')
                            $('#selected-models ul li:eq('+i+')').find('a.fba')
                            .addClass('selected-data-highlight')
                        },
                        function() {
                            var i = $(this).attr('data-row-num')
                            $('#selected-models ul li:eq('+i+')').find('a.fba')
                                .removeClass('selected-data-highlight');
                        })

                        function updateWindow(){
                            width = window.innerWidth || d.clientWidth || g.clientWidth;
                            height = window.innerHeight|| d.clientHeight|| g.clientHeight;
                            svg.attr('width', width).attr('height', height);
                        }
                        window.onresize = updateWindow;
                    }
                }
            }

        }
    }
}])

.directive('legend', function() {
    return {
        link: function(scope, elem, attr) {
            var config = new ModelSeedVizConfig();

            angular.element(elem).append('<div id="legend">');

            var w = 10,
                h = 10;

            var yOffset = 30,
                xOffset = 10;

            var boxPad = 3;

            var svg = d3.select("#legend")
                .append('svg')
                .attr('width', 340)
                .attr('height', 40);

            // add genes present legend
            var g = svg.append('g');
            g.append('rect')
               .attr('width', w)
               .attr('height', h)
               .attr('x', 10)
               .attr('y', yOffset)
               .attr('fill', config.geneColor)
               .attr('stroke', config.stroke)

            g.append('text')
               .attr('x', xOffset+w+5)
               .attr('y', yOffset+h)
               .text('Gene Present')
               .attr('font-size', '10px')


            // legend gradients
            var negGradient = svg.append("svg:defs")
              .append("svg:linearGradient")
                .attr("id", "negGradient")
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "100%")
                .attr("y2", "0%")
                .attr("spreadMethod", "pad");
            negGradient.append("svg:stop")
                .attr("offset", "0%")
                .attr("stop-color", config.getNegMaxHex())
                .attr("stop-opacity", 1);
            negGradient.append("svg:stop")
                .attr("offset", "100%")
                .attr("stop-color", config.getNegMinHex())
                .attr("stop-opacity", 1);

            var posGradient = svg.append("svg:defs")
              .append("svg:linearGradient")
                .attr("id", "posGradient")
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "100%")
                .attr("y2", "0%")
                .attr("spreadMethod", "pad");
            posGradient.append("svg:stop")
                .attr("offset", "0%")
                .attr("stop-color", config.getPosMinHex())
                .attr("stop-opacity", 1);
            posGradient.append("svg:stop")
                .attr("offset", "100%")
                .attr("stop-color", config.getPosMaxHex())
                .attr("stop-opacity", 1);

            var absGradient = svg.append("svg:defs")
              .append("svg:linearGradient")
                .attr("id", "absGradient")
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "100%")
                .attr("y2", "0%")
                .attr("spreadMethod", "pad");
            absGradient.append("svg:stop")
                .attr("offset", "0%")
                .attr("stop-color", config.getNegMinHex())
                .attr("stop-opacity", 1);
            absGradient.append("svg:stop")
                .attr("offset", "100%")
                .attr("stop-color", config.getNegMaxHex())
                .attr("stop-opacity", 1);

            function fluxLegend() {
                // Negative flux
                var g = svg.append('g').attr('id', 'legend-neg-flux'),
                    start = 125,
                    w = 50;

                g.append('rect')
                   .attr('width', w)
                   .attr('height', h)
                   .attr('x', start)
                   .attr('y', yOffset)
                   //.attr('stroke', config.stroke)
                   .style("fill", "url(#negGradient)");

                g.append('text')
                   .attr('x', start-17)
                   .attr('y', yOffset+h)
                   .text( -config.getMaxAbsFlux() )
                   .attr('font-size', '10px');

                g.append('text')
                   .attr('x', start+w+boxPad)
                   .attr('y', yOffset+h)
                   .text(0)
                   .attr('font-size', '10px');

                g.append('text')
                   .attr('x', start)
                   .attr('y', yOffset -3)
                   .text('Neg Flux')
                   .attr('font-size', '10px');

                // Positive flux
                var g = svg.append('g').attr('id', 'legend-pos-flux'),
                    start = 187,
                    w = 50;

                g.append('rect')
                   .attr('width', w)
                   .attr('height', h)
                   .attr('x', start)
                   .attr('y', yOffset)
                   //.attr('stroke', config.stroke)
                   .style("fill", "url(#posGradient)");

                g.append('text')
                   .attr('x', start+w+boxPad)
                   .attr('y', yOffset+h)
                   .text(config.getMaxAbsFlux())
                   .attr('font-size', '10px');

                g.append('text')
                   .attr('x', start)
                   .attr('y', yOffset -3)
                   .text('Pos Flux')
                   .attr('font-size', '10px');
            }

            function absFluxLegend() {
                // Negative flux
                var g = svg.append('g').attr('id', 'legend-abs-flux'),
                    start = 125,
                    w = 50;

                g.append('rect')
                   .attr('width', w)
                   .attr('height', h)
                   .attr('x', start)
                   .attr('y', yOffset)
                   //.attr('stroke', config.stroke)
                   .style("fill", "url(#absGradient)");

                g.append('text')
                   .attr('x', start-10)
                   .attr('y', yOffset+h)
                   .text( 0 )
                   .attr('font-size', '10px');

                g.append('text')
                   .attr('x', start+w+boxPad)
                   .attr('y', yOffset+h)
                   .text(config.getMaxAbsFlux())
                   .attr('font-size', '10px');

                g.append('text')
                   .attr('x', start)
                   .attr('y', yOffset -3)
                   .text('|flux|')
                   .attr('font-size', '10px');
            }
            absFluxLegend();

            scope.$on('Compare.event.absFlux', function(event, absFlux) {
                if (absFlux) {
                    svg.selectAll("g#legend-neg-flux").remove();
                    svg.selectAll("g#legend-pos-flux").remove();
                    absFluxLegend();
                } else {
                    svg.selectAll("g#legend-abs-flux").remove();
                    fluxLegend()
                }
            })
        }
    }
})



.directive('absLegend', function() {
    return {
        link: function(scope, elem, attr) {
            var config = new ModelSeedVizConfig();

            angular.element(elem).append('<div id="legend">');

            var w = 10,
                h = 10;

            var yOffset = 43,
                xOffset = 10;

            var boxPad = 3;

            var svg = d3.select("#legend")
                .append('svg')
                .attr('width', 400)
                .attr('height', 66);

            // add genes present legend
            var g = svg.append('g');
            g.append('rect')
               .attr('width', w)
               .attr('height', h)
               .attr('x', 10)
               .attr('y', yOffset)
               .attr('fill', config.geneColor)
               .attr('stroke', config.stroke)

            g.append('text')
               .attr('x', xOffset+w+5)
               .attr('y', yOffset+h)
               .text('Gene Present')
               .attr('font-size', '10px')


            // add flux gradients
            var posGradient = svg.append("svg:defs")
              .append("svg:linearGradient")
                .attr("id", "posGradient")
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "100%")
                .attr("y2", "0%")
                .attr("spreadMethod", "pad");
            posGradient.append("svg:stop")
                .attr("offset", "0%")
                .attr("stop-color", config.getNegMinHex())
                .attr("stop-opacity", 1);
            posGradient.append("svg:stop")
                .attr("offset", "100%")
                .attr("stop-color", config.getNegMaxHex())
                .attr("stop-opacity", 1);

            // Negative flux
            var g = svg.append('g'),
                start = 125,
                w = 50;

            g.append('rect')
               .attr('width', w)
               .attr('height', h)
               .attr('x', start)
               .attr('y', yOffset)
               //.attr('stroke', config.stroke)
               .style("fill", "url(#posGradient)");

            g.append('text')
               .attr('x', start-10)
               .attr('y', yOffset+h)
               .text( 0 )
               .attr('font-size', '10px');

            g.append('text')
               .attr('x', start+w+boxPad)
               .attr('y', yOffset+h)
               .text( config.getMaxAbsFlux())
               .attr('font-size', '10px');

            g.append('text')
               .attr('x', start)
               .attr('y', yOffset -3)
               .text('Abs(Flux)')
               .attr('font-size', '10px');

        }
    }
})

.directive('ngHover', function() {
    return {
        scope: true,
        link: function(scope, element, attr) {
            scope.show = function() {
                this.hoverOn = true;
            };

            scope.hide = function() {
                this.hoverOn = false;
            };

        }
    }
})

.directive('sidebarCollapse', function() {
    return {
        link: function(scope, element, attr) {
            var original_w = 220;
            var new_w = 56;

            var collapsed = false;

            element.click(function() {
                if ( !collapsed ){
                    element.find('.fa-caret-left').fadeOut(function() {
                        $(this).remove();
                    });
                    var caret = $('<span class="fa fa-caret-right">').hide().fadeIn();
                    element.append(' ', caret);

                    // animation for
                    $('.sidebar-nav, .sidebar').hide('slide', {
                            direction: 'left'
                        }, 350, function() {
                            $('.sidebar').show();
                            $('.sidebar').css('width', new_w)
                        });

                    // animation for margin of page view
                    $('#page-wrapper').animate({
                            marginLeft: new_w,
                        }, 400, function() {
                            $('.sidebar-nav-small').fadeIn('fast');
                            collapsed = true
                        });

                } else {
                    element.find('.fa-caret-right').fadeOut(function() {
                        $(this).remove();
                    });
                    var caret = $('<span class="fa fa-caret-left">').hide().fadeIn()
                    element.prepend(caret, ' ')

                    $('.sidebar-nav-small').fadeOut('fast');

                    $('#page-wrapper').animate({
                            marginLeft: original_w,
                        }, 300, function() {
                            $('.sidebar').css('width', original_w)
                            $('.sidebar-nav').fadeIn('fast')
                            collapsed = false
                        });
                }


            })

        }
    }
})

.directive('fbaDropdown', function() {
    return {
        controller: 'Compare',
        link: function(scope, element, attrs) {
            var ws = attrs.ws;
            var name = attrs.name;
        }
    }
})


.directive('proto', function() {
    return {
        link: function(scope, element, attr) {


            var config = new ModelSeedVizConfig();

            var rainbow = new Rainbow();

            var numberOfItems = 100;

            rainbow.setNumberRange(1, numberOfItems);
            rainbow.setSpectrum('lightred', 'darkred');

            var s = $('<div>');
            for (var i = 1; i <= numberOfItems; i++) {
                var hexColour = rainbow.colourAt(i);
                s.append( $('<div>#' + hexColour + '</div>').css('color', '#'+hexColour) );
            }

            $(element).append(s)
        }
    }
})


.directive('tooltip', function() {
    return {
        link: function(scope, element, attr) {

            element.tooltip({title: attr.tooltip,
                             placement: (attr.tooltipPlacementa ? attr.tooltipPlacementa : 'bottom'),
                             delay: { "show": 500}
                            })
            element.click(function() {
                element.tooltip('hide');
            })
        }
    }
})


.directive('ngTable', function() {
    return {
        restrict: 'EA',
        scope: {
            header: '=tableHeader',
            data: '=tableData',
            opts: '=tableOpts',
            loading: '=tableLoading',
            placeholder: '@tablePlaceholder',
        },
        templateUrl: 'app/views/general/table.html',
        link: function(scope, elem, attrs) {

        }
    }
 })
.directive('ngTableSolr', function() {
    return {
        restrict: 'EA',
        scope: {
            header: '=tableHeader',
            data: '=tableData',
            opts: '=tableOpts',
            loading: '=tableLoading',
            placeholder: '@tablePlaceholder',
        },
        templateUrl: 'app/views/general/solr-table.html',
        link: function(scope, elem, attrs) {

        }
    }
 })


 .directive('ngSolrTableEditor', function() {
     return {
         restrict: 'EA',
         scope: {
             header: '=tableHeader',
             data: '=tableData',
             opts: '=tableOpts',
             loading: '=tableLoading',
             placeholder: '@tablePlaceholder',
             addItems: '=tableAddItems',
             notFoundText: '@tableNotFoundText',             
         },
         templateUrl: 'app/views/general/solr-table-editor.html',
         link: function(scope, elem, attrs) {

             scope.checkedItems = [];

             scope.checkItem = function(item) {
                 item.checked = item.checked ? false : true;

                 if (item.checked)
                     scope.checkedItems.push(item)
                 else {
                     // remove from checked list
                     for (var i=0; i<scope.checkedItems.length; i++) {
                         if ( angular.equals(scope.checkedItems[i], item) )
                             scope.checkedItems.splice(i, 1)
                     }
                 }
             }

         }
     }
  })


.directive('ngTableEditor', function() {
    return {
        restrict: 'EA',
        scope: {
            header: '=tableHeader',
            data: '=tableData',
            opts: '=tableOpts',
            loading: '=tableLoading',
            placeholder: '@tablePlaceholder',
            addItems: '=tableAddItems',
        },
        templateUrl: 'app/views/general/table-editor.html',
        link: function(scope, elem, attrs) {

            scope.checkedItems = [];

            scope.checkItem = function(item) {
                item.checked = item.checked ? false : true;

                if (item.checked)
                    scope.checkedItems.push(item)
                else {
                    // remove from checked list
                    for (var i=0; i<scope.checkedItems.length; i++) {
                        if ( angular.equals(scope.checkedItems[i], item) )
                            scope.checkedItems.splice(i, 1)
                    }
                }
            }

        }
    }
 })


.directive('editable', ['$timeout', 'FBA',
    function($timeout, FBA) {
    return {
        restrict: 'EA',
        link: function(scope, elem, attrs) {

            $(elem).hover(function(){
                $(this).append(' <i class="fa fa-pencil-square-o pull-right"'+
                    ' style="position: absolute; bottom: 0; right: 0;"></i>')
            }, function() {
                $(this).find('i').remove();
            })

        }
    }
 }])

.directive('autoFocus', ['$timeout', function($timeout) {
    return {
        restrict: 'AC',
        link: function(scope, elem) {
            $timeout(function(){
                elem[0].focus();
            }, 0);
        }
    }
}])

.directive('sortable', function() {
    return {
        restrict: 'EA',
        link: function(scope, elem, attrs) {

            // see table styling in core.css for sorting carets
            scope.sortBy = function($event, name) {
                var desc = scope.opts.sort ? !scope.opts.sort.desc : false;
                scope.opts.sort = {field: name, desc: desc};

                angular.element(elem).find('th').removeClass('sorting-asc')
                angular.element(elem).find('th').removeClass('sorting-desc')

                if (desc) {
                    angular.element($event.target).removeClass('sorting-asc')
                    angular.element($event.target).addClass('sorting-desc')
                } else {
                    angular.element($event.target).removeClass('sorting-desc')
                    angular.element($event.target).addClass('sorting-asc')
                }
            }
        }
    }
 })


.directive('pagination', function() {
    return {
        restrict: 'EA',
        scope: true,
        link: function(scope, elem, attrs) {

            scope.next = function() {
                scope.opts.offset += scope.opts.limit;
            }

            scope.prev = function() {
                scope.opts.offset -= scope.opts.limit;
            }
        }
    }
})
