(function( $, undefined ) {

$.KBWidget({
    name: "kbaseETCDiagram",
    version: "1.0.0",
    options: {
    },

    init: function(options) {
        this._super(options);
        var self = this;

        var config = new ModelSeedVizConfig();

        var ele = this.$elem,
            ws = options.ws,
            name = options.name;

        // canvas
        var height = 800,
            width = 900;

        // boxes
        var w = 100,
            h = 30;

        var start_x = 25,
            start_y = 75;

        var headerFontSize = '11px',
            fontSize = '10px';

        ele.append('<div id="canvas">');
        var svg = d3.select("#canvas").append("svg")
                    .attr("width", width)
                    .attr("height", height)

        var kbapi = new KBModeling().kbapi;
        //var p = kbapi('ws', 'get_objects', [{workspace: 'nconrad:core', name: 'ETC_data'},
        //                                   {workspace: ws, name: name }
        //                                  ]);


        var p1 = $.getJSON('../data/app/etc.json');
        var p2 = kbapi('ws', 'get_objects', [{workspace: ws, name: name }
                                          ]);
        $.when(p1, p2).done(function(d1, d2) {
            ele.rmLoading();

            var etc = d1[0],
                model = d2[0].data;

            draw(etc, model);
        })

        function draw(etc, model) {
            //.append("g")
                //.call(d3.behavior.zoom().scaleExtent([1, 8]).on("zoom", zoom))
            //.append("g");

            var model_rxns = rxnDict(model),
                rows = etc.pathways;

            // first get unique substrates (by name), and filter out electron electron_acceptors
            var electron_acceptors = [];
            var unique_columns = [];
            for (var j=0; j<rows.length; j++) {
                if (rows[j].type == "electron_acceptor") {
                    electron_acceptors.push(rows[j]);
                    continue;
                }

                var name = rows[j].name

                //var g = svg.append('g');
                if (name.indexOf('/') === -1) {
                  svg.append("text")
                     .attr("y", start_y - h/3)
                     .attr("x", start_x + w*j)
                     .text(name)
                     .attr('font-size', headerFontSize)
                } else {
                  svg.append("text")
                     .attr("y", start_y - h/1.2)
                     .attr("x", start_x + w*j)
                     .text(name.split('/')[0]+' & ')
                     .attr('font-size', headerFontSize);
                  svg.append("text")
                     .attr("y", start_y - h/3)
                     .attr("x", start_x + w*j)
                     .text(name.split('/')[1])
                     .attr('font-size', headerFontSize);
                }

                // FIXME: rename steps -> entities on backend
                var col_entities = rows[j].steps;
                var unique_entities = {};
                for (var i in col_entities) {
                    var entity = col_entities[i];

                    if (entity.substrates.name in unique_entities )
                        unique_entities[entity.substrates.name].push(entity);
                    else
                        unique_entities[entity.substrates.name] = [entity]
                }
                unique_columns.push(unique_entities)
            }


            // next, plot first x columns
            for (var i=0; i < unique_columns.length; i++) {
                var entities = unique_columns[i];

                var z = 0;
                for (var name in entities) {
                    var info = entities[name];

                    var foundRXNs = {};
                    for (var j=0; j<info.length; j++) {
                        var obj = info[j]

                        for (var k=0; k<obj.reactions.length; k++) {
                            var rxn_id = obj.reactions[k];

                            if (rxn_id in model_rxns)
                                foundRXNs[rxn_id] = model_rxns[rxn_id];
                        }
                    }

                    var x = start_x + w*i;
                    var y = start_y + h*z;
                    var color = (Object.keys(foundRXNs).length > 0 ? config.geneColor : 'white')

                    drawBox(name, x, y, color, info, foundRXNs);
                    z++;
                }
            }


            // plot electron acceptors
            svg.append("text")
                 .attr("y", start_y - h/3)
                 .attr("x", start_x + w*(3))
                 .text('Electron Acceptors')
                 .attr('font-size', headerFontSize);

            for (var i in electron_acceptors) {
                var steps = electron_acceptors[i].steps;

                var foundRXNs = {};  //may need to know which rxn was found
                for (var j in steps) {
                    var entity = steps[j];

                    for (var k in entity.reactions) {
                        var rxn_id = entity.reactions[k];

                        if (rxn_id in model_rxns)
                            foundRXNs[rxn_id] = model_rxns[rxn_id];
                    }
                }

                var x = start_x + w*(3),
                    y = start_y + h*i;
                var color = (Object.keys(foundRXNs).length > 0 ? config.geneColor : 'white')

                drawEA(electron_acceptors[i], x, y, color, foundRXNs);
            }
        } // end draw



        function drawBox(name, x, y, color, info, foundRXNs) {
            var g = svg.append('g');
            var rect = g.append('rect')
                        .attr('class', 'rxn')
                        .data( [{ x: x, y: y }])
                        .attr('x', x)
                        .attr('y', y)
                        .attr('width', w)
                        .attr('height', h)
                        .style('stroke', '#666')
                        .style('fill', (color ? color : 'white') );


            g.append("text")
             .attr("x", x+ 4)
             .attr("y", y + h/2)
             .text(name)
             .attr("font-size", fontSize);

             var content = $('<div>');
             for (var i=0; i<info.length; i++) {
                var reactions = info[i].reactions;
                var substrates = info[i].substrates;

                var products = info[i].products;

                var rxn = reactions[0];
                content.append('('+i+') '+(rxn in foundRXNs ? '<b style="color:'+config.geneColor+';">'
                                            +rxn+'</b>' : rxn)+' - '+
                                          substrates.name+ ' - '+
                                          products.name+'<br>')
             }


            $(g.node()).popover({content: content,
                                 trigger: 'hover',
                                 html: true,
                                 placement: 'bottom',
                                 container: 'body'});
        }


        function drawEA(entity, x, y, color, foundRXNs) {
            var g = svg.append('g');
            var rect = g.append('rect')
                        .attr('class', 'rxn')
                        .data( [{ x: x, y: y }])
                        .attr('x', x)
                        .attr('y', y)
                        .attr('width', w)
                        .attr('height', h)
                        .style('stroke', '#666')
                        .style('fill', (color ? color : 'white') );


            g.append("text")
             .attr("x", x+ 4)
             .attr("y", y + h/2)
             .text(entity.name)
             .attr("font-size", fontSize);

             var content = $('<div>');
             for (var i=0; i<entity.steps.length; i++) {
                var reactions = entity.steps[i].reactions,
                    substrates = entity.steps[i].substrates,
                    products = entity.steps[i].products;

                var rxn = reactions[0];
                content.append('('+i+') '+(rxn in foundRXNs ? '<b style="color:'+config.geneColor+';">'
                                            +rxn+'</b>' : rxn)+' - '+
                                          substrates.name+ ' - '+
                                          products.name+'<br>')
             }



            $(g.node()).popover({content: content,
                                 title: entity.name,
                                 //title: '<b>'+rxns.join(', ')+'</b>',
                                 trigger: 'hover',
                                 html: true,
                                 placement: 'bottom',
                                 container: 'body'});
        }


        function rxnDict(model) {
            var rxns = {};
            for (var i in model.modelreactions) {
                rxns[model.modelreactions[i].reaction_ref.split('/')[5]] = model.modelreactions[i];
            }

            return rxns;
        }


        return this;
    }  //end init


})
}( jQuery ) );
