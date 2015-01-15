var gpxData = {};

var map;
var stopMarkers = [];
var bShowingMarkers = false;

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

function createStopMarkers(data){
	for(i=0;i<data.length;i++)
	{
		var marker = new google.maps.Marker({
	      position: new google.maps.LatLng(data[i].lat, data[i].lon),
	      map: null,
	      //icon: startImage,
	      title:i+""
		});

		stopMarkers.push(marker);
	}
}

function toggleStops(){
	var i;

	for(i=0;i<stopMarkers.length;i++)
	{
		if(bShowingMarkers)
			stopMarkers[i].setMap(null);
		else
			stopMarkers[i].setMap(map);
	}

	bShowingMarkers = !bShowingMarkers;
}

var startImage = {
	url: 'img/mapicons/marker-icon-green.png',
	// This marker is 20 pixels wide by 32 pixels tall.
	size: new google.maps.Size(32, 32),
	// The origin for this image is 0,0.
	origin: new google.maps.Point(0,0),
	// The anchor for this image is the base of the flagpole at 0,32.
	anchor: new google.maps.Point(0, 16)
};

var endImage = {
	url: 'img/mapicons/marker-icon-red.png',
	// This marker is 20 pixels wide by 32 pixels tall.
	size: new google.maps.Size(32, 32),
	// The origin for this image is 0,0.
	origin: new google.maps.Point(0,0),
	// The anchor for this image is the base of the flagpole at 0,32.
	anchor: new google.maps.Point(0, 16)
};

var stopImage = {
	url: 'img/mapicons/marker-icon-orange.png',
	// This marker is 20 pixels wide by 32 pixels tall.
	size: new google.maps.Size(32, 32),
	// The origin for this image is 0,0.
	origin: new google.maps.Point(0,0),
	// The anchor for this image is the base of the flagpole at 0,32.
	anchor: new google.maps.Point(0, 16)
};

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

    //Set start and stop markers
    var startMarker = new google.maps.Marker({
      position: new google.maps.LatLng(data[0][0], data[0][1]),
      map: map,
      //icon: startImage,
      title:"Start"
	});

	var endMarker = new google.maps.Marker({
      position: new google.maps.LatLng(data[data.length-1][0], data[data.length-1][1]),
      map: map,
      //icon: endImage,
      title:"Finish"
	});
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
	createStopMarkers(gpxData.racePace.removed);
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