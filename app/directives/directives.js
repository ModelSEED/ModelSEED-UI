
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

/*
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
}])*/



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

.directive('ngTableSubsystem',
            ['$sce', '$compile', 'Dialogs', 'WS', function($sce, $compile, Dialogs, WS) {
    return {
        restrict: 'EA',
        scope: {
            header: '=tableHeader',
            data: '=tableData',
            subsysName: '=tableSubsysName',
            subsysPath: '=tableSubsysPath',
            dataClone: '=tableDataClone',
            opts: '=tableOpts',
            famtrees: '=tableFamtrees',
            loading: '=tableLoading',
            cellClick: '=tableCellClick',
            hoverClass: '@tableRowHoverClass',
            placeholder: '@tablePlaceholder',
            resultText: '@tableResultText',
            onSave: '=onSave',
            onSaveAs: '=onSaveAs',
            saveInProgressText: '@saveInProgressText',
            onCancel: '&onCancel'
        },
        templateUrl: 'app/components/subsystems/table-subsys.html',
        link: function(scope, elem, attrs) {
            var ele = angular.element(elem);
            scope.htmlPath = 'app/components/subsystems/';

            scope.noPagination = ('disablePagination' in attrs) ? true: false;

            // model: cell selection data
            scope.selectedCell = '';
            scope.dataModified = false;
            scope.dataSaved = true;
            scope.treeData = null;
            scope.selected = {};

            scope.showGene = function(ev, item) {
                Dialogs.showGene(ev, path(item.name))
            }

            scope.cellDblClick = function(ev, row_col, usr) {
                scope.selectedCell = row_col;
                var can_id = 'can_' + row_col;
                var cell_info = getRowColIds(can_id);
                var gene_group_name = cell_info['gene_group'],
                    row_id = cell_info['row_id'],
                    col_id = cell_info['col_id'];
                scope.sel_cand = document.getElementById(can_id);

                Dialogs.showGene(ev, scope.dataClone[row_id+1][col_id]["candidates"][scope.sel_cand.selectedIndex],
                function(gene) {
                    console.log('modified gene object: ', JSON.stringify(gene));
                    scope.dataClone[row_id+1][col_id]["candidates"][scope.sel_cand.selectedIndex] = gene;
                    scope.dataModified = true;
                    scope.dataSaved = false;
                });

                ev.stopPropagation();
                ev.preventDefault();
            }

            scope.familyTreeSelected = function(ev, treeName, func_name, col_id, usr) {
                loadPhyloXML(ev, treeName, func_name, col_id, updateAnnotationInTree);
                ev.stopPropagation();
                ev.preventDefault();
            }

            function loadPhyloXML(ev, treeName, func_name, col_id, cb) {
                // loading the family tree data (in extendable phyloxml format)
                // assuming that the family tree(s) are saved in the subfolder of
                // phyloxml_wsPath+'/phyloxmls'+$s.subsysName/
                scope.loadingFamTree = true;
                var phyloxmlDoc = null;
                var phyloxml_wsPath = scope.subsysPath + '/phyloxmls/';
                phyloxml_wsPath = phyloxml_wsPath + scope.subsysName + '/' + treeName + '.xml';
                WS.get(phyloxml_wsPath)
                .then(function(res) {
                    var xml_str = res.data,
                        xmlMeta_str = res.meta;

                    // DOMParser parses an xml string into a DOM tree and return a XMLDocument in memory
                    // XMLSerializer will do the reverse of DOMParser
                    // var oSerializer = new XMLSerializer();
                    // var sXML = oSerializer.serializeToString(xmldoc);
                    var p = new DOMParser();
                    phyloxmlDoc = p.parseFromString(xml_str, 'application/xml');
                    console.log(phyloxmlDoc.documentElement.nodeName == "parsererror" ? "error while parsing"
                                : phyloxmlDoc.documentElement.nodeName);
                    scope.xmlMeta = p.parseFromString(xmlMeta_str, 'text/xml');
                    scope.treeData = phyloxmlDoc;
                    var xmldoc = cb(func_name, col_id);
                    Dialogs.showFuncFamTree(ev, func_name, xmldoc, function(tree_msg) {
                        // alert(func_name + ' calling back from tree display--' + tree_msg);
                    });
                    scope.loadingFamTree = false;
                })
                .catch(function(error) {
                    console.log('Caught an error: "' + error.error.message);
                    scope.treeData = null;
                    scope.loadingFamTree = false;
                });
            }

            // Modify the XML data structure according to the annotations in column (col_id)
            function updateAnnotationInTree(func, col_id) {
                var xmldoc = scope.treeData.cloneNode(true);
                var can_arr = [], cur_arr = [], pre_arr = [];
                var dKeys = Object.keys(scope.dataClone);
                for (var r=1; r<dKeys.length-1; r++) { // r=1 skip header
                    var row_col = 'row' + r.toString() + '_col' + col_id.toString();
                    var can_id = 'can_' + row_col, cur_id = 'cur_' + row_col, pre_id = 'pre_' + row_col;
                    if (document.getElementById(can_id) !== null)
                        can_arr = document.getElementById(can_id).options;
                    if (document.getElementById(cur_id) !== null)
                        cur_arr = document.getElementById(cur_id).options;
                    if (document.getElementById(pre_id) !== null)
                        pre_arr = document.getElementById(pre_id).options;

                    if (can_arr != [])
                        xmldoc = mapAnnotations(xmldoc, 'name', can_arr, cur_arr, pre_arr);
                }
                // After all annotations have been updated with new xml nodes added, append the last:
                var root_node = xmldoc.getElementsByTagName('phyloxml')[0];
                var lbls = xmldoc.createElement('labels', root_node.namespaceURI);
                var lbl1 = xmldoc.createElement('label', root_node.namespaceURI);
                var nm1 = xmldoc.createElement('name', root_node.namespaceURI);
                var txt1 = xmldoc.createTextNode('Score');
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
                dt2.setAttribute('tag', 'property');
                dt2.setAttribute('ref', 'resistance');
                lbl2.appendChild(dt2);
                lbl2.setAttribute('type', 'color');

                lbls.appendChild(lbl2);
                root_node.appendChild(lbls);

                // console.log(xmldoc.firstChild.innerHTML);
                return xmldoc;
            }

            // run through the annotation arrays to find gene_name matches
            // looping through these three arrays--if gene is in cur_arr, then green color
            // will be assigned to that the 'clade' node; if gene is in pre_arr, then blue
            // color will be assigned to that the 'clade' node; if gene is not in either
            // cur_arr or pre_arr, red color will be assigned to that the 'clade' node;
            // otherwise, black color will be assigned to that the 'clade' node.
            function mapAnnotations(xmldoc, tagName, can_arr, cur_arr, pre_arr) {
                // get the `phylogeny` node as the root
                var tree = xmldoc.firstChild.childNodes[1];
                var namespc = tree.namespaceURI;
                if (tree.childElementCount > 0) {
                    var nodes = tree.getElementsByTagName(tagName);
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
                    for (var i=0; i<nodes.length; i++) {
                        if (nodes[i].childNodes.length > 0) {
                            var gene_name = nodes[i].innerHTML;
                            var parnt = nodes[i].parentNode;
                            var colr = '', score = '';''
                            for (var j=0; j<can_genes.length; j++) {
                                var can_gene = can_genes[j];
                                if (gene_name.indexOf(can_gene) >= 0) {// found gene in annotation
                                    colr = 'red'; // default color, not in curation or prediction
                                    if (cur_genes.includes(can_gene)) colr = 'green';
                                    else if (pre_genes.includes(can_gene)) colr = 'blue';
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
                                parnt.appendChild(ele1);
                                parnt.appendChild(ele2);
                            }
                        }
                    }
                }
                return xmldoc;
            }

            // context menu open
            scope.openMenu = function(e, i, h) {
                scope.selectColumn(e, i, h);
            }

            // context menu close
            scope.closeMenu = function(e, i) {
                scope.selected = undefined;
            }

            scope.selectColumn = function(e, i, h) {
                scope.selected = {func_name: h.key, col_id: h.column_id};
                e.stopPropagation();
                e.preventDefault();
            }

            scope.addSelected = function(ev, cand, dest, usr) {
                // add selected items in candidates to the destination DOM object dest if the item--
                // 1) is not in the dest AND 2) is not in the third select (dropdown box)
                var cell_info = getRowColIds(cand);
                var row_id = cell_info['row_id'],
                    col_id = cell_info['col_id'],
                    cur_id = 'cur_row'+row_id.toString()+'_col'+col_id.toString(),
                    pre_id = 'pre_row'+row_id.toString()+'_col'+col_id.toString(),
                    third_id = '';

                if (cur_id == dest) third_id = pre_id;
                else third_id = cur_id;

                var sel_cand = document.getElementById(cand),
                    sel_dest = document.getElementById(dest),
                    sel_3rd = document.getElementById(third_id);

                for (var i = 0; i < sel_cand.options.length; i++) {
                    if (sel_cand.options[i].selected) {
                        var sel_val = sel_cand.options[i].value,
                            sel_text = sel_cand.options[i].text;
                        var in_dest = false, in_3rd = false;
                        for (var j1 = 0; j1 < sel_dest.length; j1++) {
                            if (sel_dest.options[j1].text == sel_text) {
                                in_dest = true;
                                break;
                            }
                        }
                        for (var j2 = 0; j2 < sel_3rd.length; j2++) {
                            if (sel_3rd.options[j2].text == sel_text) {
                                in_3rd = true;
                                break;
                            }
                        }
                        if (!in_dest && !in_3rd) {
                            // create a new option element
                            var opt = document.createElement('option');
                            // create text node to add to option element (opt)
                            opt.appendChild( document.createTextNode(sel_text) );
                            // set value property of opt
                            opt.value = sel_val;
                            // add opt to end of select box (sel)
                            sel_dest.appendChild(opt);
                        }
                    }
                }
                updateCloneData(dest);
                sortOptions(sel_dest);
                updateOptionColor(cand);
            }

            scope.removeSelected = function(ev, src, cand, usr) {
                var sel_src = document.getElementById(src);

                // 1) Remember selected items.
                var is_selected = [];
                for (var i = 0; i < sel_src.options.length; ++i) {
                    is_selected[i] = sel_src.options[i].selected;
                }

                // 2) Remove selected items.
                var len = sel_src.options.length;
                while (len--) {
                    if (is_selected[len]) {
                        sel_src.removeChild(sel_src.options[len]);
                    }
                }
                updateCloneData(src);
                sortOptions(sel_src);
                updateOptionColor(cand);
            }

            scope.saveInProgressText = scope.saveInProgressText || 'Saving...'
            scope.saveInProgress = false;
            scope.save = function($ev) {
                scope.saveInProgress = true;

                scope.onSave(Object.values(scope.dataClone))
                .then(function(res) {
                    scope.saveInProgress = false;
                    scope.dataSaved = true;
                })
            }

            scope.saveAs = function($ev) {
                scope.saveAsInProgress = true;

                // show save as dialog, with save/cancel callbacks
                Dialogs.saveAs($ev,
                    function(newName){
                        scope.onSaveAs(Object.values(scope.dataClone), newName)
                        .then(function() {
                            scope.saveAsInProgres = false;
                            scope.dataSaved = true;
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

            function updateCloneData(sel_id) {
                /*
                 Save the data in dropdown list with id of sel_id into the corresponding
                 json document sections of the dataClone.
                 */
                var cell_info = getRowColIds(sel_id);
                var gene_group_name = cell_info['gene_group'],
                    row_id = cell_info['row_id'],
                    col_id = cell_info['col_id'];

                var sel_opts = document.getElementById(sel_id).options;
                var sel_data = []; //arrays of objects
                for (var i=0; i<sel_opts.length; i++) {
                    var sel = {};
                    sel[sel_opts[i].text] = {"score": sel_opts[i].value};
                    sel_data.push(sel);
                }
                scope.dataClone[row_id+1][col_id][gene_group_name] = sel_data;
            }

            function getRowColIds(sel_id) {
                /*
                sel_id: in the form of, e.g., 'cur_row12_col3'
                return: {'name': 'cur', 'row_id': 12, 'col_id': 3}
                */
                // parts = ['curation', 'row12', 'col3']
                var parts = sel_id.split('_');
                var gene_grp = '';
                switch(parts[0]) {
                    case "cur":
                        gene_grp = 'curation';
                        break;
                    case "pre":
                        gene_grp = 'prediction';
                        break;
                    case "cand":
                        gene_grp = 'candidates';
                        break;
                    default:
                        // do nothing
                        break;
                }
                return {"gene_group": gene_grp,
                        "row_id": Number(parts[1].substring(3,)),
                        "col_id": Number(parts[2].substring(3,))};
            }

            function sortOptions(sel) {
                // Sort (ascending) the select options by their text values.
                var options = sel.options;
                var optionsArray = [], optionVals = [], optionTexts = [], optionsArray1 = [];
                for (var i = 0; i < options.length; i++) {
                    optionsArray.push(options[i]);
                    optionVals.push(options[i].value);
                    optionTexts.push(options[i].text);
                }
                optionTexts = optionTexts.sort();
                for (var j = 0; j < optionTexts.length; j++) {
                    for (var k = 0; k < optionsArray.length; k++) {
                        if (optionTexts[j] == optionsArray[k].text) {
                            optionsArray1[j] = optionsArray[k];
                            break;
                        }
                    }
                }
                for (var l = 0; l <= options.length; l++) {
                    options[l] = optionsArray1[l];
                }
                sel.options = options;
            }

            function updateOptionColor(cand_id) {
                // update the option items' color according to their match with items in
                // either the curation or the prediction lists: the item will be colored red when
                // it is absent in BOTH the curation list AND the prediction list
                var cell_info = getRowColIds(cand_id);
                var row_id = cell_info['row_id'],
                    col_id = cell_info['col_id'],
                    cur_id = 'cur_row'+row_id.toString()+'_col'+col_id.toString(),
                    pre_id = 'pre_row'+row_id.toString()+'_col'+col_id.toString();

                var  cur_opts= document.getElementById(cur_id).options,
                     cand_opts = document.getElementById(cand_id).options,
                     pre_opts = document.getElementById(pre_id).options;

                if (cand_opts.length == 0) return;

                var cur_optTexts = [], cand_optTexts = [], pre_optTexts = [];

                for (var k = 0; k < cand_opts.length; k++) cand_optTexts.push(cand_opts[k].text);

                if (cur_opts == 0 && pre_opts == 0) {
                    for (var k1 = 0; k1<cand_opts.length; k1++) {
                        cand_opts[k1].setAttribute("style", "color: red;");
                        cand_opts[k1].selected = false;
                    }
                }
                else {
                    if(cur_opts.length > 0) {
                        for (var j1 = 0; j1 < cur_opts.length; j1++) {
                            cur_optTexts.push(cur_opts[j1].text);
                        }
                    }
                    if(pre_opts.length > 0) {
                        for (var j2 = 0; j2 < pre_opts.length; j2++) {
                            pre_optTexts.push(pre_opts[j2].text);
                        }
                    }
                    for (var i = 0; i < cand_optTexts.length; i++) {
                        if (!cur_optTexts.includes(cand_optTexts[i]) && !pre_optTexts.includes(cand_optTexts[i])) {
                            cand_opts[i].setAttribute("style", "color: red;");
                        }
                        else {
                            cand_opts[i].setAttribute("style", "color: black;");
                        }
                        cand_opts[i].selected = false;
                    }
                }
            }
        }
    }
}])

.directive('dtable', ['$sce', '$compile', function($sce, $compile) {
    return {
        restrict: 'EA',
        scope: {
            header: '=header',
            data: '=rows',
            opts: '=opts',
            loading: '=loading',
            rowClick: '=rowClick',
            hoverClass: '@rowHoverClass',
            placeholder: '@placeholder',
            resultText: '@resultText',
            stylingOpts: '=stylingOpts',
        },
        templateUrl: 'app/views/general/dtable.html',
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

.directive('ngTableSolr', ['Dialogs', '$mdDialog',
function(Dialogs, $dialog) {
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
            enableDownload: '=',
            enableColumnSearch: '=enableColumnSearch',
            advanceSearch: '=advanceSearch'
        },
        templateUrl: 'app/views/general/solr-table.html',
        link: function(scope, elem, attrs) {
            var searchAll = 'Click to search all fields';
            var searchCol = 'Click to search in columns'; 
            var searchFields = scope.opts.searchFields;

            scope.advancedOptsEnabled = scope.enableColumnSearch;
            if (scope.advancedOptsEnabled) {
                scope.advanceSearch = searchAll;
            } else {
                scope.advanceSearch = searchCol;
            }

            scope.download = function($ev) {
                scope.enableDownload($ev, scope.opts);
            }

            scope.toggleAdvancedOptions = function($ev) {
                scope.advancedOptsEnabled = !scope.advancedOptsEnabled

                // remove search terms when column search disabled,
                // and remove general query when enabled
                if (scope.advancedOptsEnabled == false) {
                    delete scope.opts.queryColumn;
                    scope.advanceSearch = searchCol;
                } else {
                    scope.opts.query = '';
                    searchFields[3] = 'synonyms';
                    searchFields[4] = 'aliases';
                    scope.opts.searchFields = searchFields;
                    scope.advanceSearch = searchAll;
                }
            }

            scope.alert = function(arg) {
                alert(arg);
            }

            /* user leaves a comment on a row*/
            scope.rxnComments = ['incorrect abbreviation', 'incorrect stoichiometry', 'incorrect balance', 'incorrect EC', 'incorrect database mapping'];
            scope.cpdComments = ['incorrect abbreviation', 'incorrect synonym', 'incorrect formula', 'incorrect charge', 'incorrect structure', 'incorrect database mapping'];
            scope.leaveComment = function(ev, rowId, comment_tab, usr) {
                if(comment_tab == 'rxn'){
                    comment_items = scope.rxnComments;
                }
                else if(comment_tab == 'cpd'){
                    comment_items = scope.cpdComments;
                }
                // console.log('comment items passed: ', comment_items);

                Dialogs.leaveComment(ev, rowId, comment_items, usr,
                function(comments) {
                    console.log('getting a comment: ', comments);
                });
            }

            /* table row click (not used as of now)*/
            scope.rowClick = function(ev) {
                Dialogs.rowClicked(ev,
                function(rowId) {
                    console.log('row clicked on: ', rowId);
                });
            }
        }
    }
 }])


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
            if (attrs.sortable == 'false') return;

            if (scope.opts.sort && 'desc' in scope.opts.sort)
                scope.opts.sort.desc = scope.opts.sort.desc ? true : false;

            var desc = scope.opts && scope.opts.sort ? !scope.opts.sort.desc : false;
            var field = scope.opts.sort ? scope.opts.sort.field : null

            var colId = attrs.colId;

            if (desc && colId == field) {
                angular.element(elem).removeClass('sorting-asc')
                angular.element(elem).addClass('sorting-desc')
            } else if (!desc && colId == field) {
                angular.element(elem).removeClass('sorting-desc')
                angular.element(elem).addClass('sorting-asc')
            }

            // see table styling in core.css for sorting carets
            scope.sortBy = function($event, name) {
                // if sort order is not set, assume ascending order
                // otherwise, negate
                var desc = scope.opts.sort ? !scope.opts.sort.desc : false;
                scope.opts.sort = {field: name, desc: desc};

                var tr = angular.element(elem).parent();
                tr.find('th').removeClass('sorting-asc')
                tr.find('th').removeClass('sorting-desc')

                if (!desc) {
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
             searchPlaceholder: '@searchPlaceholder',
             disableSearch: '='
         },
         template: '<md-icon class="material-icons">search</md-icon>'+
                   '<input ng-model="query" ng-disabled="disableSearch" ng-model-options="{debounce: {default: 100, blur: 0}}" '+
                   'type="text" placeholder="{{searchPlaceholder}}" class="query-input" ng-change="queryChange()" input-clear>',
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

.directive('bindHtmlCompile', ['$compile', function ($compile) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                scope.$watch(function () {
                    return scope.$eval(attrs.bindHtmlCompile);
                }, function (value) {
                    // In case value is a TrustedValueHolderType, sometimes it
                    // needs to be explicitly called into a string in order to
                    // get the HTML string.
                    element.html(value && value.toString());
                    // If scope is provided use it, otherwise use parent scope
                    var compileScope = scope;
                    if (attrs.bindHtmlScope) {
                        compileScope = scope.$eval(attrs.bindHtmlScope);
                    }
                    $compile(element.contents())(compileScope);
                });
            }
        };
    }])


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

.directive('inputClear', function() {
    return {
        restrict: 'A',
        compile: function (element, attrs) {
            var action = attrs.ngModel + " = ''";
            element.after(
                '<md-button aria-label="clear search" class="animate-show md-icon-button md-accent hover"' +
                'ng-show="' + attrs.ngModel + '" ng-click="' + action + '"' +
                'style="position: absolute; bottom: 0px; right: -6px; margin: 18px 0px; color: #777; height: 10px;" >' +
                '<i class="fa fa-remove"></i>' +
                '</md-button>');
        }
    };
})

.directive('stoichiometryToEq', ['$compile', function($compile) {
    return {
        restrict: 'A',
        scope: {
             stoichiometryToEq: '@',
             direction: '@'
        },
        link: function(scope, elem, attrs) {
            var stoichString = scope.stoichiometryToEq;
            if (!stoichString) return;

            var parts = stoichString.split(';');
            var dir = scope.direction;

            if (dir === '=')
                var dirClass = 'fa-arrows-h';
            else if (dir === '>')
                var dirClass = 'fa-long-arrow-right';
            else if (dir === '<')
                var dirClass = 'fa-long-arrow-left';

            var transporter

            // create html for left and right hand sides of equation
            var lhs = [], rhs = [];
            for (var i=0; i<parts.length; i++) {
                var attrs = parts[i].split(':');

                var weight = attrs[0],
                    id = attrs[1],
                    compart = attrs[2],
                    compartNum = attrs[3];
                    name = attrs[4] ? attrs[4].replace(/^"(.*)"$/, '$1')
                                   .replace(/(?!\d\-|\d\,|^\d|\d\')(\d+)/g, '<sub>$1</sub>') : 'N/A';

                if (weight < 0)
                    lhs.push((weight === "-1" ? '' : -1*weight) +
                             ' <a ui-sref="app.cpd({id: \''+id+'\'})"><i>'+name+'</i></a>' +
                             (compartNum === "0" ? '' : ' ['+compart+']'));
                if (weight > 0)
                    rhs.push((weight === "1" ? '' : weight) +
                             ' <a ui-sref="app.cpd({id: \''+id+'\'})"><i>'+name+'</i></a>' +
                             (compartNum === "0" ? '' : ' ['+compart+']'));
            }

            var eq = lhs.join(' + ') +
                    ' <i class="eq-direction fa ' + dirClass + '"></i> ' +
                     rhs.join(' + ');

            elem.html(eq);
            $compile(elem.contents())(scope);
        }
    }
}])

.directive('stoichiometryToImgs', ['$compile', 'Biochem', function($compile, Biochem) {
    return {
        restrict: 'A',
        scope: {
             stoichiometryToImgs: '@',
             direction: '@'
        },
        link: function(scope, elem, attrs) {
            var stoichString = scope.stoichiometryToImgs;
            if (!stoichString) return;

            var parts = stoichString.split(';');
            var dir = scope.direction;

            if (dir === '=')
                var dirClass = 'fa-arrows-h';
            else if (dir === '>')
                var dirClass = 'fa-long-arrow-right';
            else if (dir === '<')
                var dirClass = 'fa-long-arrow-left';

            var transporter

            // create html for left and right hand sides of equation
            var lhs = [], rhs = [];
            for (var i=0; i<parts.length; i++) {
                var attrs = parts[i].split(':');

                var weight = attrs[0],
                    id = attrs[1],
                    compart = attrs[2],
                    compartNum = attrs[3];
                    name = attrs[4] ? attrs[4].replace(/^"(.*)"$/, '$1')
                                   .replace(/(?!\d\-|\d\,|^\d|\d\')(\d+)/g, '<sub>$1</sub>') : 'N/A';

                var fig = function(stoich, compart){
                    return '<figure><img src='+Biochem.getImagePath(id)+' height=100px>' +
                           '<figcaption>'+stoich+' <a ui-sref="app.cpd({id: \''
                           +id+'\'})"><i>'+name+'</i></a>' + compart +
                           '</figcaption></figure>';
                }

                if (weight < 0)
                    lhs.push(fig(weight === "-1" ? '' : -1*weight,
                                compartNum === "0" ? '' : ' ['+compart+']'));
                if (weight > 0)
                    rhs.push(fig(weight === "1" ? '' : weight,
                                compartNum === "0" ? '' : ' ['+compart+']'));
            }

            var eq = '<div class="reactant">'+ lhs.join(' + ') +
                    ' <i class="eq-direction fa ' + dirClass + '"></i> ' +
                     rhs.join(' + ') + '</div>';

            elem.html(eq);
            $compile(elem.contents())(scope);
        }
    }
}])

.directive('prettyFormula', ['$compile', function($compile) {
    return {
        restrict: 'A',
        scope: {
             formula: '@prettyFormula'
        },
        link: function(scope, elem, attrs) {
            var formula = scope.formula;
            if (!formula) return;

            var formula = formula.replace(/(\d+)/g, '<sub>$1</sub>');
            elem.html(formula);
            $compile(elem.contents())(scope);
        }
    }
}])


// added for searching biochemistry data in solr
.directive('biochemSearchResults', function () {
    return {
      scope: {
        solrUrl: '=',
        collection: '=',
        displayField: '=',
        search_query: '&',
        results: '&'
      },
      restrict: 'E',
      controller: function($scope, $http) {
        console.log('Searching for ' + $scope.query + ' at ' + $scope.solrUrl + ' in ' + $scope.collection);
        $scope.$watch('query', function() {
          $http(
            {method: 'JSONP',
             url: $scope.solrUrl + $scope.collection + '/select',
             params:{'json.wrf': 'JSON_CALLBACK',
                    'q': $scope.search_query,
                    'fl': $scope.displayField}
            })
            .success(function(data) {
              var docs = data.response.docs;
              console.log('search success!');
              $scope.results.docs = docs;

            }).error(function() {
              console.log('Search failed!');
            });
        });
      },
      template: '<input ng-model="search_query" name="Search Query"></input>' +
                '<input ng-model="collection" name="Search Collection"></input>' +
                '<h2>Biochemistry Search Results for </h2>' +
                '<span ng-repeat="doc in results.docs">' +
                '  <p>{{doc}}</p>'  +
                '</span>'
    };
  });

  /* supposed to be used as follows:
<biochem-search-results
    solr-url="'http://0.0.0.0:8983/solr/'"
    collection="'compounds'"
    search_query="''"
    display-field="'aliases'">
</biochem-search-results>
  */

// End 'added for searching biochemistry data in solr'