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

function mapPoints(map, data)
{
	var i,n;
	var cords = [];
	var bounds = new google.maps.LatLngBounds();

	for(i=0;i<data.length;i++)
	{
		var newPoint = new google.maps.LatLng(data[i][0], data[i][1]);
		
		cords.push(newPoint);
		bounds.extend(newPoint);
	}

	var flightPath = new google.maps.Polyline({
        path: cords,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 4
    });

    flightPath.setMap(map);

    map.fitBounds(bounds);
    map.panToBounds(bounds);
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

	mapPoints(map,gpxData.orig.streams.latlng.data);
}

function lerp(a, b, p) {
	return a + p * (b - a);
}

function graphOrigPoints(chart_ele, options_ele, chart_spd, options_spd, orig, racepace)
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

    var origLength = orig.streams.distance.data.length;
    var rpLength = racepace.streams.distance.data.length;

    while(i < origLength || n < rpLength)
    {
    	var dist;
    	var kph = undefined;
    	var kph_rp = undefined;

    	if(i < origLength && (n >= rpLength || orig.streams.distance.data[i] < racepace.streams.distance.data[n]))
    	{
    		if(n < rpLength)
    		{
    			var percentage = (orig.streams.distance.data[i] - racepace.streams.distance.data[n-1]) / (racepace.streams.distance.data[n] - racepace.streams.distance.data[n-1]);
	   			kph_rp = lerp(racepace.streams.velocity.data[n-1], racepace.streams.velocity.data[n], percentage);

	   			if(percentage < 0 || percentage > 1)
    				console.log("Out of range!!! i: " + i + 'n: ' + n);
    		}

    		dist = orig.streams.distance.data[i];
    		kph = orig.streams.velocity.data[i];
    		i++;
    	}
    	else if(n < rpLength && (i >= origLength || orig.streams.distance.data[i] > racepace.streams.distance.data[n]))
    	{
    		if(i < origLength)
    		{
    			var percentage = (racepace.streams.distance.data[n] - orig.streams.distance.data[i-1]) / (orig.streams.distance.data[i] - orig.streams.distance.data[i-1]);
    			kph = lerp(orig.streams.velocity.data[i-1], orig.streams.velocity.data[i], percentage);

    			if(percentage < 0 || percentage > 1)
    				console.log("Out of range!!! i: " + i + 'n: ' + n);
    		}

    		dist = racepace.streams.distance.data[n];
    		kph_rp = racepace.streams.velocity.data[n];
    		n++;
    	}
    	else
    	{
    		dist = orig.streams.distance.data[i];
    		kph = orig.streams.velocity.data[i];
    		kph_rp = racepace.streams.velocity.data[n];

    		i++;
    		n++;
    	}

    	data_spd.addRow([dist, kph, kph_rp]);
    }

/*
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
*/
	//Map evevation basied on old information
	if(orig.streams.altitude)
	{
		for(i=0;i<orig.streams.altitude.data.length;i++)
		{
			var ele = parseFloat(orig.streams.altitude.data[i]);

			//Assume 0 means something went wrong. Use last elevation
			if(ele === 0.0)
			{
				var n = i;

				while(n > 0)
				{
					ele = parseFloat(orig.streams.altitude.data[n]);

					if(ele !== 0.0)
						break;

					n--;
				}

				if(ele === 0.0)
				{
					n = i;

					while(n < orig.streams.altitude.data.length - 1)
					{
						ele = parseFloat(orig.streams.altitude.data[n])

						if(ele !== 0.0)
							break;

						n++;
					}
				}
			}

			data_ele.addRow([orig.streams.distance.data[i], ele]);
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

	graphOrigPoints(chart_ele, options_ele, chart_spd, options_spd, gpxData.orig, gpxData.racePace);
}

google.maps.event.addDomListener(window, 'load', initMap);

google.load("visualization", "1", {packages:["corechart"]});
google.setOnLoadCallback(initGraph);