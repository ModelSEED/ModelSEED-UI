
function complete_cached() {
    $.get('./node/output.json', function(d) {
        elem.rmLoading()
        elem.append('<div>'+d.x.length+' x '+d.y.length+' = '+(d.x.length*d.y.length)+' boxes</div>' )
        elem.append('<br>')
        elem.append('<div id="test"><canvas id="heatmap"></canvas></div>');
        super_map(d.x, d.y, d.data);
    })
}

// canvas map, for use with viz service
function super_map(y_data, x_data, rows) {
    elem.append('<div id="map" class="map" style="height: 400px; width: 100%;"></div>')

    var offset_x = 100,
        offset_y = 100;

    var w = 10,
        h = 10;

    var width = 1500,
        height = 500;

    var canvas = d3.select("#heatmap")
        .attr("width", width)
        .attr("height", height)
        .call( d3.behavior.zoom().scaleExtent([1, 8]).on("zoom", zoom) )
      .node().getContext("2d");

    draw();

    function zoom() {
        canvas.save();
        canvas.clearRect(0, 0, width, height);
        canvas.translate(d3.event.translate[0], d3.event.translate[1]);
        canvas.scale(d3.event.scale, d3.event.scale);
        draw();
        canvas.restore();
    }


    function layer() {
        var rects = []

        for (var i=0; i < rows.length; i++) {
            var row = rows[i];

            // for each rxn in union of rxns, try to find rxn for that model
            for (var j=0; j < row.length; j++) {
                var val = row[j];

                canvas.beginPath();
                canvas.rect(offset_x+(j*w), offset_y+(i*h), w, h);

                canvas.fillStyle = (val === 1 ? vizConfig.geneColor : 'white');
                canvas.fill();
                canvas.lineWidth = 0.1;
                canvas.strokeStyle = msConfig.stroke;
                canvas.stroke();
            }
        }
    }

    function draw() {
        /*
        for (var i=0; i < x_data.length; i++) {
            canvas.textAlign = 'right';
            canvas.fillText(x_data[i], offset_x-4, offset_y+(i*h)+h);
        }


        for (var i=0; i < y_data.length; i++) {
             canvas.save();
             var cx = offset_x+(i*w);
             var cy = offset_y;
             canvas.textAlign = 'center';
             canvas.translate(cx, cy);
             canvas.rotate( -(Math.PI / 4));
             canvas.translate(-cx, -cy);
             canvas.fillText(y_data[i], offset_x+(i*w)+30, offset_y+2);
             canvas.restore();
        }*/

        layer();

    }
            }