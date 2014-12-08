var gpxData = {};

//GPXDATAREPLACE//

function mapPanToBounds(map, GPXbounds)
{
	var minBounds = new google.maps.LatLng(GPXbounds.minlat,GPXbounds.minlon);
	var maxBounds = new google.maps.LatLng(GPXbounds.maxlat,GPXbounds.maxlon);
	var g_bounds = new google.maps.LatLngBounds();

	g_bounds.extend(minBounds);
	g_bounds.extend(maxBounds);

	map.fitBounds(g_bounds);

	map.panToBounds(g_bounds);
}

function mapPoints(map, trk)
{
	var i,n;
	var cords = [];

	for(i=0;i<trk.trkseg.length;i++)
	{
		for(n=0;n<trk.trkseg[i].trkpt.length;n++)
		{
			var point = trk.trkseg[i].trkpt[n];

			cords.push(new google.maps.LatLng(point.$.lat, point.$.lon));
		}
	}

	var flightPath = new google.maps.Polyline({
        path: cords,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 4
    });

    flightPath.setMap(map);
}

function initMap() {
	var mapCanvas = document.getElementById('map_canvas');
	var mapOptions = {
    	center: new google.maps.LatLng(0, 0),
    	zoom: 1,
    	mapTypeId: google.maps.MapTypeId.ROADMAP,
    	disableDefaultUI: true
    }
	map = new google.maps.Map(mapCanvas, mapOptions);

	mapPoints(map,gpxData.orig.gpx.trk[0]);
	mapPanToBounds(map, gpxData.orig.gpx.metadata[0].bounds[0].$);

	initGraph();
}

function lerp(a, b, p) {
	return a + p * (b - a);
}

function graphOrigPoints(chart_ele, options_ele, chart_spd, options_spd, trk, trk_rp)
{
	var data_ele = new google.visualization.DataTable();
	var data_spd = new google.visualization.DataTable();

	data_ele.addColumn('number');
    data_ele.addColumn('number');

    data_spd.addColumn('number');
    data_spd.addColumn('number');
    data_spd.addColumn('number');

    var i = 0;
    var n = 0;
    var j = 0;
    var m = 0;

    
	
    /* FOR TESTING PURPOSE ONLY!!!

    for(i=0;i<trk_rp.trkseg.length;i++)
    {
    	for(n=0;n<trk_rp.trkseg[i].trkpt.length;n++)
    	{
    		trk_rp.trkseg[i].trkpt[n].dist += 10;
    	}
    }

    i=0;
    n=0;
	
	
    //FINISH TEST!!!
	*/

	console.log('Length of trk: ' + trk.trkseg.length);
	console.log('Length of trkRP: ' + trk_rp.trkseg.length);
	while((i < trk.trkseg.length && n < trk.trkseg[i].trkpt.length) || (j < trk_rp.trkseg.length && m < trk_rp.trkseg[j].trkpt.length))
	{
		var dist;
		var kph = undefined;
		var kph_rp = undefined;

		if(i < trk.trkseg.length && (j >= trk_rp.trkseg.length || trk.trkseg[i].trkpt[n].dist < trk_rp.trkseg[j].trkpt[m].dist))
		{
			if(j < trk_rp.trkseg.length && m-1 > 0)
			{
				var percentage = (trk.trkseg[i].trkpt[n].dist - trk_rp.trkseg[j].trkpt[m-1].dist) / (trk_rp.trkseg[j].trkpt[m].dist - trk_rp.trkseg[j].trkpt[m-1].dist);
				kph_rp = lerp(trk_rp.trkseg[j].trkpt[m-1].kph, trk_rp.trkseg[j].trkpt[m].kph, percentage)
			}
			dist = trk.trkseg[i].trkpt[n].dist;
			kph = trk.trkseg[i].trkpt[n].kph;
			n++;
		}
		else if(j < trk_rp.trkseg.length && (i >= trk.trkseg.length || trk.trkseg[i].trkpt[n].dist > trk_rp.trkseg[j].trkpt[m].dist))
		{
			if(i < trk.trkseg.length && n-1 > 0)
			{
				var percentage = (trk_rp.trkseg[j].trkpt[m].dist - trk.trkseg[i].trkpt[n-1].dist) / (trk.trkseg[i].trkpt[n].dist - trk.trkseg[i].trkpt[n-1].dist);
				kph = lerp(trk.trkseg[i].trkpt[n-1].kph, trk.trkseg[i].trkpt[n].kph, percentage)
			}
			dist = trk_rp.trkseg[j].trkpt[m].dist;
			kph_rp = trk_rp.trkseg[j].trkpt[m].kph;
			m++
		}
		else
		{
			dist = trk.trkseg[i].trkpt[n].dist;
			kph = trk.trkseg[i].trkpt[n].kph
			kph_rp = trk_rp.trkseg[j].trkpt[m].kph;

			n++;
			m++;
		}

		if(kph < 0 || kph_rp < 0)
		{
			console.log('KPH Below 0!');
			console.log('KPH: ' + kph + " KPHRP: " + kph_rp);
			console.log('M:' + m + ' N:' + n);
			console.log('I:' + i + 'J:' + j);
		}
		else
		{
			data_spd.addRow([dist, kph, kph_rp]);	
		}
		

		if(i < trk.trkseg.length && n >= trk.trkseg[i].trkpt.length)
    	{
    		i++;
    		n=0;
    	}

    	if(j < trk_rp.trkseg.length && m >= trk_rp.trkseg[j].trkpt.length)
    	{
    		j++;
    		m=0
    	}
	}

	//Map evevation basied on old information
    for(i=0;i<trk.trkseg.length;i++)
    {
    	for(n=0;n<trk.trkseg[i].trkpt.length;n++)
    	{
    		var ele = parseFloat(trk.trkseg[i].trkpt[n].ele[0]);

    		//Assume 0 means something went wrong. Use last elevation
    		if(ele === 0.0)
    		{
    			var eleN = n-1;
    			while(eleN > 0)
    			{
    				ele = parseFloat(trk.trkseg[i].trkpt[eleN].ele[0]);

    				if(ele !== 0.0)
    					break;

    				eleN -= 1;
    			}

    			//If last elevation can't be found, use next elevation
    			if(ele === 0.0)
    			{
    				while (eleN < 0)
    				{
    					ele = parseFloat(trk.trkseg[i].trkpt[eleN].ele[0]);

    					if(ele !== 0.0)
    						break;

    					eleN += 1;
    				}
    			}
    		}

    		data_ele.addRow([trk.trkseg[i].trkpt[n].dist, ele]);
    	}
    }

	chart_ele.draw(data_ele, options_ele);
	chart_spd.draw(data_spd, options_spd);
}

function initGraph() {
	var chart_ele = new google.visualization.LineChart(document.getElementById('graph-canvas-ele'));
	var chart_spd = new google.visualization.LineChart(document.getElementById('graph-canvas-spd'));

	var options_ele = {};
	var options_spd = {};

	graphOrigPoints(chart_ele, options_ele, chart_spd, options_spd, gpxData.orig.gpx.trk[0], gpxData.racePace.gpx.trk[0]);
}

google.maps.event.addDomListener(window, 'load', initMap);

google.load("visualization", "1", {packages:["corechart"]});
google.setOnLoadCallback(initGraph);