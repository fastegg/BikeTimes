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

var posImage = {
	url: 'img/mapicons/marker-icon-blue.png',
	// This marker is 20 pixels wide by 32 pixels tall.
	size: new google.maps.Size(32, 32),
	// The origin for this image is 0,0.
	origin: new google.maps.Point(0,0),
	// The anchor for this image is the base of the flagpole at 0,32.
	anchor: new google.maps.Point(0, 16)
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

var posMarker;

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

	posMarker = new google.maps.Marker({
      position: null,
      map: null,
      //icon: posImage,
      title:i+""
	});
}

function lerp(a, b, p) {
	return a + p * (b - a);
}

var data_ele;
var data_spd;

function graphOrigPoints(chart_ele, options_ele, chart_spd, options_spd, orig, racepace, conversionspd, conversionele)
{
	data_ele = new google.visualization.DataTable();
	data_spd = new google.visualization.DataTable();

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

    	if(conversionspd && conversionspd != 1.0)
    	{
    		dist *= conversionspd;
    		kph *= conversionspd;
    		kph_rp *= conversionspd;
    	}

    	data_spd.addRow([dist, kph, kph_rp]);
    }

	//Map evevation basied on old information
	if(racepace.streams.altitude)
	{
		for(i=0;i<racepace.streams.altitude.data.length;i++)
		{
			var ele = parseFloat(racepace.streams.altitude.data[i]);

			//Assume 0 means something went wrong. Use last elevation
			if(ele === 0.0)
			{
				var n = i;

				while(n > 0)
				{
					ele = parseFloat(racepace.streams.altitude.data[n]);

					if(ele !== 0.0)
						break;

					n--;
				}

				if(ele === 0.0)
				{
					n = i;

					while(n < racepace.streams.altitude.data.length - 1)
					{
						ele = parseFloat(racepace.streams.altitude.data[n])

						if(ele !== 0.0)
							break;

						n++;
					}
				}
			}

			if(conversionele && conversionele != 1.0)
	    	{
	    		ele *= conversionele;
	    	}

			data_ele.addRow([racepace.streams.distance.data[i] * conversionspd, ele]);
		}
	}

	chart_ele.draw(data_ele, options_ele);
	chart_spd.draw(data_spd, options_spd);
}

var chart_ele;
var chart_spd;

var distObj;
var eleObj;
var gradeObj;
var timeObj;
var spdObj;

function round(number, decPlaces)
{
	var decMulti = Math.pow(10,decPlaces);

	return Math.round(number * decMulti) / decMulti;
}

function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

function displayTime(time, displayHours, displayMins, padSeconds)
{
	var newDate = new Date(time * 1000);
	var rtn = '';

	if(displayHours || newDate.getUTCHours())
	{
		rtn += pad(newDate.getUTCHours(),2) + ':';
		displayMins = true;
	}

	if(displayMins || newDate.getUTCMinutes())
	{
		rtn += pad(newDate.getUTCMinutes(),2) + ':';
		padSeconds = true;
	}

	if(padSeconds)
		rtn += pad(newDate.getUTCSeconds(), 2);
	else
		rtn += newDate.getUTCSeconds();

	return rtn;
}

function set_targets(dist, ele, grade, time, speed, pos)
{
	if(units === 1)
	{
		distObj.html(round(dist,2) + ' mi');
		eleObj.html(round(ele,2) + ' ft');
	}
	else
	{
		distObj.html(round(dist,2) + ' km');
		eleObj.html(round(ele,2) + ' m');
		
	}
	gradeObj.html(round(grade*100,1) + '%');
	timeObj.html(displayTime(time,true));
	spdObj.html(round(speed,2));

	posMarker.setPosition(new google.maps.LatLng(pos.lat, pos.lng));
}

function dataTable_getRowForDist(table, column, dist)
{
	var i = 0;

	while(dist > table.getValue(i,column))
	{
		i++;
	}

	return i;
}

function chart_hovor_ele(data)
{
	var dist = gpxData.racePace.streams.distance.data[data.row];
	var ele = gpxData.racePace.streams.altitude.data[data.row];

	var grade = data.row > 2 ? ((gpxData.racePace.streams.altitude.data[data.row] - gpxData.racePace.streams.altitude.data[data.row-1]) / 1000) / (gpxData.racePace.streams.distance.data[data.row] - gpxData.racePace.streams.distance.data[data.row-1]) : 0;
	var time = gpxData.racePace.streams.time.data[data.row];
	var speed = gpxData.racePace.streams.velocity.data[data.row];

	chart_spd.setSelection([{row: dataTable_getRowForDist(data_spd, 0, dist), column: 2}]);

	set_targets(dist, ele, grade, time, speed, {lat: gpxData.racePace.streams.latlng.data[data.row][0], lng: gpxData.racePace.streams.latlng.data[data.row][1]});
}

function chart_hovor_spd(data)
{
	if(data.column === 1)
	{
		data.column = 2
		chart_spd.setSelection({row: data.row, column: 2});
	}

	var dist = data_spd.getValue(data.row, 0);

	var eleRow = dataTable_getRowForDist(data_ele, 0, dist);
	
	var ele = gpxData.racePace.streams.altitude.data[eleRow];
	var grade = eleRow > 1 ? ((gpxData.racePace.streams.altitude.data[eleRow] - gpxData.racePace.streams.altitude.data[eleRow-1]) / 1000) / (gpxData.racePace.streams.distance.data[eleRow] - gpxData.racePace.streams.distance.data[eleRow-1]) : 0;
	var speed = data_spd.getValue(data.row, data.column);
	var time = gpxData.racePace.streams.time.data[eleRow];

	chart_ele.setSelection([{row: eleRow, column: 1}]);

	set_targets(dist, ele, grade, time, speed, {lat: gpxData.racePace.streams.latlng.data[eleRow][0], lng: gpxData.racePace.streams.latlng.data[eleRow][1]});
}

function chart_out()
{
	eleObj.html('---');
	distObj.html('---');
	gradeObj.html('---');
	timeObj.html('---');
	spdObj.html('---');

	posMarker.setMap(null);

	chart_ele.setSelection([]);
	chart_spd.setSelection([]);
}

function findChartMouseHAxis(event, cli)
{
	var rtn = {x: 0, y: 0};

	event = event || window.event; // IE-ism

    rtn.x = event.offsetX;
    rtn.y = event.offsetY;

    var box = cli.getChartAreaBoundingBox();

    if(rtn.x > box.left + box.width)
    	return null;
    if(rtn.x < box.left)
    	return null;
    if(rtn.y > box.top + box.height)
    	return null;
    if(rtn.y < box.top)
    	return null;

    rtn.x -= box.left;
    rtn.y -= box.top;

	return rtn;
}

function chart_enter(event, chart)
{
	posMarker.setMap(map);
}

function findXLocForRow(cli, dist)
{
	var box = cli.getChartAreaBoundingBox();
	var min, max, c, val, lastVal;

	//First, check if it's outside the box
	if(cli.getHAxisValue(0) >= dist)
		return box.left;
	else if(cli.getHAxisValue(box.width) <= dist)
		return box.width;

	val = -1;
	lastVal = -1;
	min = 0;
	max = box.width;
	c = 0;

	while(val !== dist)
	{
		c = min + ((max-min) / 2);
		val = cli.getHAxisValue(c);

		if(val === lastVal)
			return c;

		lastVal = val;
		
		if(val > dist)
			max = c;
		else if(val < dist)
			min = c;
		else
			return c;
	}
	
	return c;
}

function chart_move(event, chart)
{
	var cli = chart.getChartLayoutInterface();
	var mousePos = findChartMouseHAxis(event, cli);

	if(!mousePos)
		return;
	
	var dist = cli.getHAxisValue(mousePos.x);

	var eleRow = dataTable_getRowForDist(data_ele, 0, dist);
	var spdRow = dataTable_getRowForDist(data_spd, 0, dist);

	var ele = data_ele.getValue(eleRow,1);
	var grade = eleRow > 1 ? ((gpxData.racePace.streams.altitude.data[eleRow] - gpxData.racePace.streams.altitude.data[eleRow-1]) / 1000) / (gpxData.racePace.streams.distance.data[eleRow] - gpxData.racePace.streams.distance.data[eleRow-1]) : 0;
	var speed = data_spd.getValue(spdRow, 2);
	var time = gpxData.racePace.streams.time.data[eleRow];

	set_targets(dist, ele, grade, time, speed, {lat: gpxData.racePace.streams.latlng.data[eleRow][0], lng: gpxData.racePace.streams.latlng.data[eleRow][1]});

	//Set chart lines
	if(chart === chart_ele)
	{
		var pos = findXLocForRow(chart_spd.getChartLayoutInterface(), dist);
		$('#chart-line-spd').css({left: pos});

		$('#chart-line-ele').css({left: mousePos.x});
	}
	else
	{
		var pos = findXLocForRow(chart_ele.getChartLayoutInterface(), dist);
		$('#chart-line-ele').css({left: pos});

		$('#chart-line-spd').css({left: mousePos.x});
	}
	
}

function chart_leave(event, chart)
{
	eleObj.html('---');
	distObj.html('---');
	gradeObj.html('---');
	timeObj.html('---');
	spdObj.html('---');

	posMarker.setMap(null);

	//Set chart lines
	$('#chart-line-ele').css({left: 0});
	$('#chart-line-spd').css({left: 0});
}
var explorer = {
	maxZoomOut: 1,
	maxZoomIn: 0.01,
	actions: ['dragToZoom', 'rightClickToReset'],
	axis: 'horizontal'
}

var tooltip = {
	trigger: 'none'
}
var options_ele = {colors: ['#CCC'], focus: 'category', explorer: explorer, tooltip: tooltip, hAxis: {gridlines: {count: 4}, format: '#km'}, legend:{position: 'none'}, chartArea: {width: '100%'}, crosshair: {orientation: 'vertical'}};
var options_spd = {colors: ['#CCC', '#337ab7'], focus: 'category', explorer: explorer, tooltip: tooltip, hAxis: {gridlines: {count: 4}, format:'#km'}, legend: {position: 'none'}, chartArea: {width: '100%'}};


function initGraph() {
	chart_ele = new google.visualization.AreaChart(document.getElementById('graph-canvas-ele'));
	chart_spd = new google.visualization.LineChart(document.getElementById('graph-canvas-spd'));

	distObj = $('#ele-info-dist');
	timeObj = $('#ele-info-time');
	gradeObj = $('#ele-info-grade');
	eleObj = $('#ele-info-ele');
	spdObj = $('#spd-info-kph');

	graphOrigPoints(chart_ele, options_ele, chart_spd, options_spd, gpxData.orig, gpxData.racePace, 1.0, 1.0);
}

google.maps.event.addDomListener(window, 'load', initMap);

google.load("visualization", "1", {packages:["corechart"]});
google.setOnLoadCallback(initGraph);

var units = 0; //0 == KPH, 1 == MPH

function setKPH()
{
	if(units != 0)
		$("#unitsCSS").attr("href","style/kph.css");

	units = 0;

	graphOrigPoints(chart_ele, options_ele, chart_spd, options_spd, gpxData.orig, gpxData.racePace, 1.0, 1.0);
}

function setMPH()
{
	if(units != 1)
		$("#unitsCSS").attr("href","style/mph.css");

	units = 1;

	graphOrigPoints(chart_ele, options_ele, chart_spd, options_spd, gpxData.orig, gpxData.racePace, 0.621371, 3.28084);
}