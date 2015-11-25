
angular.module('core-directives', []);
angular.module('core-directives')

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


.directive('compareRegions', ['$compile', 'config', 'WS', '$http',
function($compile, config, WS, $http) {
    return {
        restrict: 'EA',
        link: function($s, ele, attrs) {

            //ele.loading()
            //var ref = $stateParams.ws+'/'+$stateParams.name
            var ref = "chenrydemo/kb|g.422"

            var width = 700,
                height = 200;

            var pad = 300;

            $http.rpc('ms', 'compare_regions',
                {similarities: [ {hit_id: 'fig|380749.5.peg.487'}] } )
                .then(function(res) {
                    var features = res.regions[0].features;


                    var ranges = [],
                        values = [];

                    for (var i = 0; i<features.length; i++) {
                        var feature = features[i],
                            s = parseInt(feature.begin),
                            e = parseInt(feature.end),
                            range = {s: s, e: e };

                        ranges.push( range );
                        values.push(s, e);
                    }

                    var data = {numbers: ranges,
                                min: Math.min.apply(Math, values) - 100,
                                max: Math.max.apply(Math, values) + 100}

                    draw(data);
                    console.log('data', data)
                })


            function draw(data) {
                padding_bottom = 50;

                var max_end = data.max,
                    min_start = data.min,
                    numbers = data.numbers;

                var h = 10; /* height of boxes */
                $(ele).append('<div id="cdd-chart">');

                //Create the Scale we will use for the Axis
                var x = d3.scale.linear()
                                .domain([min_start, max_end])
                                .range([20, width-20]);

                //Create the Axis
                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom")


                var zoom = d3.behavior.zoom()
                    .x(x)
                    .scaleExtent([0, 1000])
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
    }
}])

.directive('pathway', ['$compile', 'config', 'WS', '$q',
function($compile, config, WS, $q) {
    return {
        restrict: 'EA',
        scope: {
            name: '=pathway',
            models: '=models',
            fbas: '=fbas',
        },
        template: '<md-progress-circular ng-if="loading" md-mode="indeterminate"></md-progress-circular>'+
                  '<div class="pathway-container">'+
                        '<img src="data:image/png;base64,{{encodedImage}}">'+
                        '<div id="pathway-{{name}}" class="pathway"></div>'+
                  '</div>',
        link: function($s, elem, attrs) {

            // for template caching
            $s.$watch('models', function (val)  {
                if (!val) return;
                loadData();
            })

            // for template caching
            $s.$watch('fbas', function (val)  {
                if (!val) return;
                loadData();
            })

            // get image and map data
            function loadData(){
                $s.loading = true;
                var imgPath = config.paths.maps.replace('maps', 'kegg')+$s.name+'.png',
                    mapPath = config.paths.maps+$s.name,
                    p1 = WS.get(imgPath),
                    p2 = WS.get(mapPath);

                $q.all([p1, p2])
                  .then(function(args) {
                      $s.loading = false;
                      $s.encodedImage = args[0].data;
                      $s.mapData = args[1].data;

                      var params = {elem: 'pathway-'+$s.name,
                                    usingImage: true,
                                    mapName: $s.name,
                                    mapData: $s.mapData,
                                    models: $s.models,
                                    fbas: $s.fbas,
                                    absFlux: true}

                      //console.log('pathway params', params)
                      var pathway = new ModelSeedPathway(params);
                   })
           }
        }
    }
}])


.directive('highlight', ['$compile', function($compile) {
    return {
        restrict: 'EA',
        scope: {
            text: '@highlight',
            term: '=highlightTerm',
            linkableEq: '@linkableEq',
        },
        link: function(scope, elem, attrs) {
            //var newText = scope.text.replace(scope.term, '<b class="text-highlight">'+scope.term+'</b>')

            var newText = '';

            if ('linkableEq' in attrs) {
                var leftNames = scope.text.split('<=>')[0].replace(/\[\w\]/g, '').replace(/\(\d+\)/g, '')
                                        .split(' + ')
                var rightNames = scope.text.split('<=>')[1].replace(/\[\w\]/g, '').replace(/\(\d+\)/g, '')
                                        .split(' + ')
                for (var i=0; i<leftNames.length; i++) leftNames[i] = leftNames[i].trim();
                for (var i=0; i<rightNames.length; i++) rightNames[i] = rightNames[i].trim();

                var sides = scope.text.split('<=>'),
                    left = sides[0].split(' + '),
                    right = sides[1].split(' + ')

                var search = /(cpd\d*)/g;
                var sideIDs = scope.linkableEq.split('<=>'),
                    leftIDs = sideIDs[0].match(search),
                    rightIDs = sideIDs[1].match(search);

                //console.log('names', leftNames, rightNames)
                //console.log('ids', leftIDs, rightIDs)

                for (var i=0; i<left.length; i++) {
                    var link = $compile( '<div><a ui-sref="app.biochemViewer({cpd:\''+leftIDs[i]+'\'})">'+leftNames[i]+'</a></div>' )(scope)
                    left[i] = left[i].replace(leftNames[i], link.html() )
                }

                for (var i=0; i<right.length; i++) {
                    var link = $compile( '<div><a ui-sref="app.biochemViewer({cpd:\''+rightIDs[i]+'\'})">'+rightNames[i]+'</a></div>' )(scope)
                    right[i] = right[i].replace(rightNames[i], link.html() )
                }

                newText = left.join(' + ') + '<=>' + right.join(' + ')
            }

            angular.element(elem).html(newText);
        }
    }
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
        restrict: 'EA',
        scope: {
            heatmap: '=heatmap',
        },
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

            var w = 10, h = 10, font_size = '7px';
            var start_x; // needs to be computed for starting position of heatmap

            var heatData, // avoid refresh
                svg;

            scope.$watch('heatmap', function (val)  {
                if (!val) return;
                console.log('drawing!')
                draw(val, 1);
            })

            scope.$on('Compare.event.absFlux', function(e, absFlux) {
                draw(scope.heatmap, absFlux);
            })


            function draw(data, absFlux) {
                elem.html('');
                elem.append('<div id="canvas">');
                heatmap_d3(data.x, data.y, data.data, absFlux);

                // ability to zoom
                d3.select("#canvas")
                  .call(d3.behavior.zoom().scaleExtent([-1, 8]).on("zoom", zoom))

                function zoom() {
                    svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                }
            }

            // basic, zoomable svg map
            function heatmap_d3(xData, yData, rows, absFlux) {
                elem.append('<div id="canvas">');
                svg = d3.select("#canvas").append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .append("g")

                // to precompute starting postion of heatmap
                var y_widths = [];
                for (var i=0; i < yData.length; i++) {
                    //var label = svg.append("text").attr("y", start_y+i*h+h)
                    //            .text(yData[i]).attr("font-size", font_size);

                    //y_widths.push(label.node().getBBox().width);
                    y_widths.push(yData[i].length * 4)
                }
                $(elem).find('text').remove(); // fixme

                start_x = Math.max.apply(Math, y_widths) + 5;

                // draw in four sets
                drawGroup(xData, yData, rows, absFlux, 0, 500, 100)
                drawGroup(xData, yData, rows, absFlux, 500, 1000, 200)
                drawGroup(xData, yData, rows, absFlux, 1000, rows[0].length, 300)

                // resizing
                function updateWindow(){
                    width = window.innerWidth || d.clientWidth || g.clientWidth;
                    height = window.innerHeight|| d.clientHeight|| g.clientHeight;
                    svg.attr('width', width).attr('height', height);
                }
                window.onresize = updateWindow;
            }


            function drawGroup(xData, yData, rows, absFlux, start, end, startY) {
                var start_y = startY ? startY : 100;

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

                    var interation = 0;
                    for (var j=(start ? start : 0); j < (end ? end : xData.length); j++) {
                        if (i === 0) {
                            var pos = start_x+interation*w+w;

                            var x_label = svg.append("text")
                                             .attr("x", pos)
                                             .attr("y", start_y-5)
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
                                      .attr("x", start_x+interation*w)
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
                        var title = '<b>'+yData[i]+'</b><br>'+xData[j];
                        var content = '<b>Flux:</b> '+prop.flux+'<br>';


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

                        interation = interation + 1
                    } // end row loop
                }
            } // end drawGroup

        }  // end link
    }
}])

.directive('legend', function() {
    return {
        scope: {
            min: '=min',
            max: '=max'
        },
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
                   .text( -scope.min )
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
                   .text(scope.max)
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
                   .text( scope.max )
                   .attr('font-size', '10px');

                g.append('text')
                   .attr('x', start)
                   .attr('y', yOffset -3)
                   .text('|flux|')
                   .attr('font-size', '10px');
            }
            absFluxLegend();

            scope.$watch('max', function() {
                absFluxLegend();
            })

            // switch between absolute and actual legend
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


.directive('fbaDropdown', function() {
    return {
        controller: 'Compare',
        link: function(scope, element, attrs) {
            var ws = attrs.ws;
            var name = attrs.name;
        }
    }
})


/*
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
})*/


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


.directive('ngTable', ['$sce', '$compile', function($sce, $compile) {
    return {
        restrict: 'EA',
        scope: {
            header: '=tableHeader',
            data: '=tableData',
            opts: '=tableOpts',
            enablePaginatino: '@tablePagination',
            loading: '=tableLoading',
            rowClick: '=tableRowClick',
            placeholder: '@tablePlaceholder',
        },
        templateUrl: 'app/views/general/table.html',
        link: function(scope, elem, attrs) {

            scope.enablePagination =
                scope.enablePagination ? enablePagination : true;
        }
    }
}])

.directive('ngTableTwo', ['$sce', '$compile', function($sce, $compile) {
    return {
        restrict: 'EA',
        scope: {
            header: '=tableHeader',
            data: '=tableData',
            opts: '=tableOpts',
            loading: '=tableLoading',
            rowClick: '=tableRowClick',
            hoverClass: '@tableRowHoverClass',
            placeholder: '@tablePlaceholder',
            resultText: '@tableResultText',
        },
        templateUrl: 'app/views/general/table2.html',
        link: function(scope, elem, attrs) {
            var ele = angular.element(elem);

            scope.noPagination = ('disablePagination' in attrs) ? true: false;


        }
    }
}])

.directive('dynamic', ['$compile', function ($compile) {
    return {
        restrict: 'A',
        replace: true,
        link: function (scope, ele, attrs) {
            scope.$watch(attrs.dynamic, function(html) {
                ele.html(html);
                $compile(ele.contents())(scope);
            });
        }
    };
}])

.directive('ngTableSolr', function() {
    return {
        restrict: 'EA',
        scope: {
            header: '=tableHeader',
            data: '=tableData',
            opts: '=tableOpts',
            rowClick: '=tableRowClick',
            loading: '=tableLoading',
            placeholder: '@tablePlaceholder',
            stylingOpts: '=opts',
        },
        templateUrl: 'app/views/general/solr-table.html',
        link: function(scope, elem, attrs) {
            //console.log('scope', scope.stylingOpts)
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

.directive('ngTableSelector', function() {
    return {
        restrict: 'EA',
        scope: {
            header: '=tableHeader',
            data: '=tableData',
            opts: '=tableOpts',
            loading: '=tableLoading',
            placeholder: '@tablePlaceholder',
            addItems: '=tableAddItems',
            onSubmit: '=onSubmit',
            submitBtnTemplate: '@submitBtnTemplate',
            submitBtnType: '@submitBtnType',
            submitBtnClass: '@submitBtnClass',
            submitProgressText: '@submitProgressText',
            onDefault: '=onDefault',
            defaultBtnTemplate: '@defaultBtnTemplate',
            defaultBtnType: '@defaultBtnType',
            defaultBtnClass: '@defaultBtnClass',
            defaultProgressText: '@defaultProgressText',
        },
        templateUrl: 'app/views/general/table-selector.html',
        link: function(scope, elem, attrs) {

            scope.defaultBtn = scope.defaultBtn === 'true' ? true : false;
            scope.defaultBtnTemplate =  scope.defaultBtnTemplate ? scope.defaultBtnTemplate : 'Add';

            scope.noPagination = ('disablePagination' in attrs) ? true: false;

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

            scope.submitInProgress = false;
            scope.submit = function(items) {
                scope.submitInProgress = true;
                scope.onSubmit(items, function() {
                    scope.submitInProgress = false;

                    for (var i=0; i<items.length; i++) {
                        items[i].checked = false;

                        // if delete btn, remove from model
                        if (scope.submitBtnType === 'remove') {
                            var j = scope.data.length;
                            while (j--) {
                                if (angular.equals(scope.data[j], items[i])) {
                                    console.log('removing', j)
                                    scope.data.splice(j, 1)
                                }
                            }
                        }
                    }
                    scope.checkedItems = [];

                })
            }

            scope.defaultBtn = function(items) {
                scope.onDefault();
            }


        }
    }
 })

// curenlty used for media editor
 .directive('ngTableEditor', ['$filter', 'Dialogs', function($filter, Dialogs) {
       return {
           restrict: 'EA',
           scope: {
               header: '=tableHeader',
               data: '=tableData',
               opts: '=tableOpts',
               loading: '=tableLoading',
               placeholder: '@tablePlaceholder',
               addItems: '=tableAddItems',
               resultText: '@tableResultText',
               onSave: '=onSave',
               onSaveAs: '=onSaveAs',
               saveInProgressText: '@saveInProgressText',
               deleteBtnTemplate: '@deleteBtnTemplate',
               addBtnTemplate: '@addBtnTemplate',
               deleteInProgressText: '@deleteInProgressText',
               onCancel: '&onCancel',
               onAdd: '=onAdd'
           },
           templateUrl: 'app/views/general/table-editor.html',
           link: function(scope, elem, attrs) {
                scope.noPagination = ('disablePagination' in attrs) ? true: false;

                // table editor expects a copied object as of now
                // since there is no notion of filtering/sorting for the editor
                //scope.data = angular.copy(scope.data)

                // list of things to be deleted or edited.
                scope.checkedItems = [];
                scope.checkedIndexes = [];
                scope.checkItem = function($index, item) {
                    item.checked = item.checked ? false : true;

                    if (item.checked)
                        scope.checkedItems.push({index: $index, item: item})
                    else {
                        // remove from checked list
                        var i = scope.checkedItems.length;
                        while (i--) {
                            if ( angular.equals(scope.checkedItems[i].item, item) )
                                scope.checkedItems.splice(i, 1)
                        }
                    }
                }

                // command operations performed; can be undone via undo
                scope.operations = [];


                scope.deleteInProgressText = scope.deleteInProgressText || 'Deleting...'
                scope.deleteInProgress = false;
                scope.delete = function() {
                    scope.deleteInProgress = true;

                    // sort to delete largest index first, avoiding index issues
                    scope.checkedItems.sort(function(a,b) {
                        if (a.index < b.index) return -1;
                        if (a.index > b.index) return 1;
                        return 0;
                    });

                    // delete items
                    var i = scope.checkedItems.length;
                    while (i--) {
                        var index = scope.checkedItems[i].index;
                        scope.data.splice(index, 1);
                    }

                    // uncheck items
                    for (var i=0; i<scope.checkedItems.length; i++) {
                            scope.checkedItems[i].item.checked = false;
                    }

                    scope.operations.push({op: 'delete', items: scope.checkedItems});

                    // clear checked items
                    scope.checkedItems = [];

                    scope.deleteInProgress = false;
                }

                scope.add = function($event) {
                    scope.onAdd($event);
                }

                scope.edit = function(rowIndex, $index, cell) {
                    scope.editing = {row: rowIndex, col: $index};
                }

                scope.saveCell = function(rowIndex, colIndex, row, key) {
                    scope.operations.push({op: 'edit',
                                           old: row[key],
                                           new: scope.edit.cell,
                                           row: row,
                                           col: key,
                                           item: {rowIndex: rowIndex,
                                                  colIndex: colIndex}
                                         });
                    row[key] = scope.edit.cell;
                    scope.editing = null;
                }

                scope.undo = function() {
                    var op = scope.operations.pop();

                    if (op.op === 'delete') {
                        for (var i=0; i<op.items.length; i++) {
                            scope.data.splice(op.items[i].index, 0, op.items[i].item);
                        }
                    } else if (op.op === 'add') {
                        var i = op.items.length;
                        while (i--) {
                            scope.data.splice(op.items[i].index, 1);
                        }
                    } else if (op.op === 'edit') {
                        scope.data[op.item.rowIndex][op.col] = op.old;
                    }
                }

                scope.saveInProgressText = scope.saveInProgressText || 'Saving...'
                scope.saveInProgress = false;
                scope.save = function($ev) {
                    scope.saveInProgress = true;

                    scope.onSave(scope.data)
                         .then(function(res) {
                             scope.saveInProgres = false;
                             scope.onCancel();
                         })
                }

                scope.saveAs = function($ev) {
                    scope.saveAsInProgress = true;

                    // show save as dialog, with save/cancel callbacks
                    Dialogs.saveAs($ev,
                        function(newName){
                            scope.onSaveAs(scope.data, newName)
                                 .then(function() {
                                     scope.saveAsInProgres = false;
                                     scope.onCancel();
                                 });
                        },
                        function() {

                        });
                }

                scope.cancel = function($event) {
                    $event.preventDefault();
                    scope.onCancel();
                }

                // listen for operations, add to operation stack
                scope.$on('Events.commandOperation', function(e, operation) {
                    scope.operations.push({op: operation.op, items: operation.items})
                })

            }
       }
}])



 // curenlty used for model editor
.directive('ngTableEditor2', ['$filter', 'Dialogs', function($filter, Dialogs) {
    return {
        restrict: 'EA',
        scope: {
            header: '=tableHeader',
            data: '=tableData',
            opts: '=tableOpts',
            loading: '=tableLoading',
            placeholder: '@tablePlaceholder',
            addItems: '=tableAddItems',
            resultText: '@tableResultText',
            onSave: '=onSave',
            onSaveAs: '=onSaveAs',
            saveInProgressText: '@saveInProgressText',
            deleteBtnTemplate: '@deleteBtnTemplate',
            addBtnTemplate: '@addBtnTemplate',
            deleteInProgressText: '@deleteInProgressText',
            onCancel: '&onCancel',
            onAdd: '=onAdd'
        },
        templateUrl: 'app/views/general/table-editor2.html',
        link: function(scope, elem, attrs) {
            scope.noPagination = ('disablePagination' in attrs) ? true: false;

            // table editor expects a copied object as of now
            // since there is no notion of filtering/sorting for the editor
            //scope.data = angular.copy(scope.data)
            //
            scope.$watch('data', function(newvalue){
                console.log(' the data changed!!!', newvalue)
            })

            // list of things to be deleted or edited.
            scope.checkedItems = [];
            scope.checkedIndexes = [];
            scope.checkItem = function($index, item) {
                item.checked = item.checked ? false : true;

                if (item.checked)
                    scope.checkedItems.push({index: $index, item: item})
                else {
                    // remove from checked list
                    var i = scope.checkedItems.length;
                    while (i--) {
                        if ( angular.equals(scope.checkedItems[i].item, item) )
                            scope.checkedItems.splice(i, 1)
                    }
                }
            }

            // command operations performed; can be undone via undo
            scope.operations = [];


            scope.deleteInProgressText = scope.deleteInProgressText || 'Deleting...'
            scope.deleteInProgress = false;
            scope.delete = function() {
                scope.deleteInProgress = true;

                // sort to delete largest index first, avoiding index issues
                scope.checkedItems.sort(function(a,b) {
                    if (a.index < b.index) return -1;
                        if (a.index > b.index) return 1;
                            return 0;
                });
                console.log('deleting checked items', scope.checkedItems)

                // delete items
                var i = scope.checkedItems.length;
                while (i--) {
                    for (var j=0; j<scope.data.length; j++) {

                        if ( angular.equals(scope.data[j], scope.checkedItems[i].item) ) {
                            scope.data.splice(j, 1);
                            break;
                        }
                    }
                }

                // uncheck items
                for (var i=0; i<scope.checkedItems.length; i++) {
                    scope.checkedItems[i].item.checked = false;
                }

                scope.operations.push({op: 'delete', items: scope.checkedItems});

                // clear checked items
                scope.checkedItems = [];

                scope.deleteInProgress = false;
            }

            scope.add = function($event) {
                scope.onAdd($event);
            }

            scope.edit = function(rowIndex, $index, cell) {
                scope.editing = {row: rowIndex, col: $index};
            }

            scope.saveCell = function(rowIndex, colIndex, row, key) {
                scope.operations.push({op: 'edit',
                                     old: row[key],
                                     new: scope.edit.cell,
                                     row: row,
                                     col: key,
                                     item: {rowIndex: rowIndex,
                                            colIndex: colIndex}
                                   });
                row[key] = scope.edit.cell;
                scope.editing = null;
            }

              scope.undo = function() {
                  var op = scope.operations.pop();

                  if (op.op === 'delete') {
                      for (var i=0; i<op.items.length; i++) {
                          scope.data.splice(op.items[i].index, 0, op.items[i].item);
                      }
                  } else if (op.op === 'add') {
                      var i = op.items.length;
                      while (i--) {
                          scope.data.splice(op.items[i].index, 1);
                      }
                  } else if (op.op === 'edit') {
                      scope.data[op.item.rowIndex][op.col] = op.old;
                  }
              }

              scope.saveInProgressText = scope.saveInProgressText || 'Saving...'
              scope.saveInProgress = false;
              scope.save = function($ev) {
                  scope.saveInProgress = true;

                  scope.onSave(scope.data)
                       .then(function(res) {
                           scope.saveInProgres = false;
                           scope.onCancel();
                       })
              }

              scope.saveAs = function($ev) {
                  scope.saveAsInProgress = true;

                  // show save as dialog, with save/cancel callbacks
                  Dialogs.saveAs($ev,
                      function(newName){
                          scope.onSaveAs(scope.data, newName)
                               .then(function() {
                                   scope.saveAsInProgres = false;
                                   scope.onCancel();
                               });
                      },
                      function() {

                      });
              }

              scope.cancel = function($event) {
                  $event.preventDefault();
                  scope.onCancel();
              }

              // listen for operations, add to operation stack
              scope.$on('Events.commandOperation', function(e, operation) {
                  console.log('adding things', operation)
                  scope.operations.push({op: operation.op, items: operation.items})
              })

          }
     }
}])



.directive('editable', ['$timeout', 'FBA',
    function($timeout, FBA) {
    return {
        restrict: 'EA',
        scope: {
            editable: '=editable'
        },
        link: function(scope, elem, attrs) {


            if (scope.editable == true) {
                $(elem).hover(function(){
                    $(this).append(' <i class="fa fa-pencil-square-o pull-right"'+
                        ' style="position: absolute; bottom: 0; right: 0;"></i>')
                }, function() {
                    $(this).find('i').remove();
                })
            }

        }
    }
 }])

.directive('sortable', function() {
    return {
        restrict: 'EA',
        link: function(scope, elem, attrs) {

            if (scope.opts.sort && ('desc' in scope.opts.sort) )
            scope.opts.sort.desc = scope.opts.sort.desc ? true : false;


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

 .directive('sortableTest', function() {
     return {
         restrict: 'EA',
         link: function(scope, elem, attrs) {

             if (scope.opts.sort && ('desc' in scope.opts.sort) )
             scope.opts.sort.desc = scope.opts.sort.desc ? true : false;


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

 .directive('autoFocus', ['$timeout', function($timeout) {
     return {
         restrict: 'AC',
         link: function(scope, elem, attrs) {
             $timeout(function(){
                 elem[0].focus();
                 if (attrs.autoFocus == 'selectall') $(elem).select();
             }, 0);
         }
     }
 }])

 .directive('search', function() {
     return {
         restrict: 'EA',
         scope: {
             query: '=search',
             opts: '=searchOpts',
             searchPlaceholder: '@searchPlaceholder'
         },
         template: '<md-icon class="material-icons">search</md-icon>'+
                   '<input ng-model="query" ng-model-options="{debounce: {default: 100, blur: 0}}" type="text" placeholder="{{searchPlaceholder}}" class="query-input" ng-change="queryChange()">',
         link: function(scope, elem, attrs) {
             var lastQuery;

             scope.queryChange = function() {
                 if (lastQuery != scope.query) scope.opts.offset = 0;
             }
         }
     }
 })


.directive('pagination', function() {
    return {
        restrict: 'EA',
        scope: {
            offset: '=paginationOffset',
            limit: '=paginationLimit',
            total: '=paginationTotal'
        },
        template: '<span hide-sm ng-if="total">{{offset+1}}-{{total < offset+limit ? total : offset+limit}} of {{total | number}} results</span>'+
                    '<div ng-disabled="offset == 0" class="btn btn-default btn-sm" ng-click="prev()">'+
                        '<i class="fa fa-chevron-left"></i> prev'+
                    '</div>'+
                    '<div ng-disabled="total <= offset + limit" class="btn btn-default btn-sm" ng-click="next()">next '+
                        '<i class="fa fa-chevron-right"></i>'+
                    '</div>',
        link: function(scope, elem, attrs) {
            scope.next = function() {
                scope.offset += scope.limit;
            }

            scope.prev = function() {
                scope.offset -= scope.limit;
            }
        }
    }
})


.directive('popover', function() {
    return {
        restrict: 'EA',
        scope: {

        },
        link: function(scope, elem, attrs) {

            angular.element(elem)
                    .popover({content: attrs.popover, trigger: 'hover', placement: 'bottom',
                              container: 'body'})

            angular.element(elem).on('mouseover', function() {
                $(this).css('font-weight', 800)
            })

            angular.element(elem).on('mouseout', function() {
                $(this).css('font-weight', 500)
            })

        }
    }
})
