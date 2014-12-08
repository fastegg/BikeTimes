var deepcopy = require('./lib/deepcopy.js');

module.exports = {};

module.exports.calcRacePace = calcRacePace;

/////////////////////////////////////////////
//
// Helper Functions
//
/////////////////////////////////////////////

//Assumed GPX time format: YYYY-MM-DDTHH:MM:SS.MILSZ
function GPXTimeToDate(timeStamp)
{
	var sDate = new Date(timeStamp);
	return sDate;
}

function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

function DateToGPXTime(sDate)
{
	return sDate.getUTCFullYear() + "-" + (pad(sDate.getUTCMonth() + 1,2)) + "-" + pad(sDate.getUTCDate(),2) + "T" + pad(sDate.getUTCHours(),2) + ":" + pad(sDate.getUTCMinutes(),2) + ":" + pad(sDate.getUTCSeconds(),2) + "." + pad(sDate.getUTCMilliseconds(),3) + "Z";
}

function toRadians(deg)
{
	return deg * (Math.PI / 180);
}

function GPXDistToKM(v1, v2)
{
	var R = 6371; // km
	var o1 = toRadians(v1.$.lat)
	var o2 = toRadians(v2.$.lat);
	var ao = toRadians(v2.$.lat-v1.$.lat);
	var ah = toRadians(v2.$.lon-v1.$.lon);

	var a = Math.sin(ao/2) * Math.sin(ao/2) +
	        Math.cos(o1) * Math.cos(o2) *
	        Math.sin(ah/2) * Math.sin(ah/2);

	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

	return d = R * c;
}

//Returns the Kilometers per hour.
function KPH(km, seconds)
{
	var d = 3600 / seconds;

	return km*d;
}

function gpx_calcElapsedTime(trk)
{
	var trks;
	var trksegs;
	var trkpts;

	trks = trk.length-1;
	trksegs = trk[trks].trkseg.length-1;
	trkpts = trk[trks].trkseg[trksegs].trkpt.length-1;

	return GPXTimeToDate(trk[trks].trkseg[trksegs].trkpt[trkpts].time[0]).getTime() - GPXTimeToDate(trk[0].trkseg[0].trkpt[0].time[0]).getTime();
}

function lerp(a, b, p) {
	return a + p * (b - a);
}

/////////////////////////////////////////////
//
// Main exported function
//
/////////////////////////////////////////////

function removeStops(origpts, removeLocations)
{
	var newpts = [];
	var i;
	var fTimeRemoved = 0;
	var bCurrentlyStopped = false;
	var fRPDist = 0;

	for(i=0;i<origpts.length;i++)
	{
		var lastpt;
		var curpt;
		var newpt;

		if(i===0)
		{
			curpt = origpts[i];

			curpt.dist = 0;
			curpt.kph = 0;

			newpt = deepcopy(curpt);

			newpts.push(newpt);
			
			continue;
		}
		else
		{
			curpt = origpts[i];
			lastpt = origpts[i-1];
		}

		newpt = deepcopy(curpt);

		if(fTimeRemoved > 0)
		{
			var prevTime = GPXTimeToDate(newpt.time[0]);
			newpt.time[0] = DateToGPXTime(new Date(GPXTimeToDate(newpt.time[0]).getTime() - fTimeRemoved));
		}

		var fDist = GPXDistToKM(curpt, lastpt);
		var fTimeBetween = (new Date(GPXTimeToDate(curpt.time[0]))).getTime() - (new Date(GPXTimeToDate(lastpt.time[0]))).getTime();
		var fKPH = KPH(fDist, fTimeBetween / 1000);

		//Save these to the orig data
		curpt.dist = lastpt.dist + fDist;
		curpt.kph = fKPH;

		if(fKPH < 3	|| bCurrentlyStopped === true && fKPH < 5)
		{
			if(bCurrentlyStopped === false)
			{
				bCurrentlyStopped = true;
				removeLocations.push(newpts.length);
			}

			fTimeRemoved += fTimeBetween;
		}
		else
		{
			if(bCurrentlyStopped === true)
				bCurrentlyStopped = false;
			
			fRPDist += fDist;
			newpt.dist = fRPDist;
			newpt.kph = fKPH;

			newpts.push(newpt);
		}
	}

	return newpts;
}

function smoothenStops(trkpts, removeLocations)
{
	var i;

	var newLastPoint;

	for(i=removeLocations.length-1;i>=0;i--)
	{
		var pos = removeLocations[i];

		var start = pos;
		var end = pos;

		var fTimeRemoved = 0;

		while(start > 0)
		{
				//Remove first
				start--;
				
				//Check to see if the start is more than 15 seconds from pos
				if(GPXTimeToDate(trkpts[pos].time[0]).getTime() - GPXTimeToDate(trkpts[start].time[0]).getTime() > 15000)
				{
					break;
				}

				//Check to see if the kph has dropped
				if(trkpts[start].kph < trkpts[start+1].kph)
				{
					start++;
					break;
				}

				//Check to see if the kph is within 10% of the last kph
				if(trkpts[start].kph / trkpts[start+1].kph < 1.10)
				{
					break;
				}
		}

		while(end < trkpts.length-1)
		{
			//Remove first, to make sure we don't just check n
			end++;

			//Check to see if the start is more than 15 seconds from n
			if(GPXTimeToDate(trkpts[end].time[0]).getTime() - GPXTimeToDate(trkpts[pos].time[0]).getTime() > 15000)
			{
				break;
			}

			//Check to see if the kph has dropped
			if(trkpts[end].kph < trkpts[end-1].kph)
			{
				end--;
				break;
			}

			//Check to see if the kph is within 10% of the last kph
			if( trkpts[end].kph / trkpts[end-1].kph < 1.10)
			{
				break;
			}
		}

		var fTotalDist = trkpts[end].dist - trkpts[start].dist;
		var fAvgKPH = (trkpts[start].kph + trkpts[end].kph) / 2;
		var fTimeToTravel = (fTotalDist/fAvgKPH) * 3600 * 1000 //Time in milliseconds 
		var nextpt = start+1;

		var fTimeStart = GPXTimeToDate(trkpts[start].time[0]).getTime();
		var fTimeEnd = GPXTimeToDate(trkpts[end].time[0]).getTime();
		var fTimeLost = 0;
		var fTimeSpot = GPXTimeToDate(trkpts[nextpt].time[0]).getTime() - fTimeStart;

		var fLeftOverDist = fTotalDist;
		var fDistLost = fTotalDist;

		while(fTimeSpot < fTimeToTravel)
		{
			var pct = fTimeSpot / fTimeToTravel;
			var fKPH = lerp(trkpts[start].kph, trkpts[end].kph, pct);
			//fKPH = (fKPH + trkpts[nextpt-1].kph) / 2;
			var fTimeDifference = (fTimeSpot + fTimeStart) - GPXTimeToDate(trkpts[nextpt-1].time[0]).getTime();
			var fDistToTravel = (fKPH / 3600000) * fTimeDifference;

			trkpts[nextpt].dist = trkpts[nextpt-1].dist + fDistToTravel;
			trkpts[nextpt].kph = fKPH;

			fLeftOverDist -= fDistToTravel;
			fDistLost -= fDistToTravel;
			
			nextpt++;
			fTimeSpot = GPXTimeToDate(trkpts[nextpt].time[0]).getTime() - fTimeStart;
		}

		var fLeftOverTime = fTimeToTravel - (fTimeSpot - (GPXTimeToDate(trkpts[nextpt].time[0]).getTime() - GPXTimeToDate(trkpts[nextpt-1].time[0]).getTime()));
		var fLeftOverDist = (trkpts[end].kph / 3600000 * fLeftOverTime);
		var fLeftOverKPH = KPH(fLeftOverDist, fLeftOverTime / 1000);
		fDistLost -= fLeftOverDist;

		if(nextpt <= end)
		{
			var ptsRemoved = end-nextpt+1;

			console.log('pts Removed: ' + ptsRemoved);

			fTimeRemoved = GPXTimeToDate(trkpts[end+1].time[0]).getTime() - GPXTimeToDate(trkpts[nextpt].time[0]).getTime();
			//Remove the points on the end
			trkpts.splice(nextpt,ptsRemoved);

			//trkpts[nextpt].dist = trkpts[nextpt-1].dist + fLeftOverDist;
		}

		if(fLeftOverDist > 0 || fLeftOverTime > 0)
		{
			var iDist = nextpt;

			if(fTimeRemoved > 0)
			{
				for(iDist=nextpt;iDist<trkpts.length;iDist++)
				{
					console.log('Checking: ' + iDist);

					trkpts[iDist].time[0] = DateToGPXTime(new Date(GPXTimeToDate(trkpts[iDist].time[0]).getTime() - fTimeRemoved));
					trkpts[iDist].dist -= fDistLost;

					var fTimeBetween = GPXTimeToDate(trkpts[iDist].time[0]).getTime() - GPXTimeToDate(trkpts[iDist-1].time[0]).getTime();
					var pct = fLeftOverTime / fTimeBetween;
					var fTargetKPH = (fLeftOverKPH * pct + trkpts[iDist].kph * (1-pct));
					var fOldDist = trkpts[iDist].dist - trkpts[iDist-1].dist;
					//var fNewDist = fOldDist * (1-pct);
					var fNewDist = (fTargetKPH / 3600000) * fTimeBetween;
					
					console.log('Left Over KPH: ' + fLeftOverKPH);
					console.log('Last KPH: ' + trkpts[iDist].kph);

					trkpts[iDist].dist = trkpts[iDist-1].dist + fNewDist;

					fLeftOverDist = fOldDist - fNewDist;
					fLeftOverKPH = KPH(fLeftOverDist, fLeftOverTime / 1000);

					trkpts[iDist].kph = KPH(trkpts[iDist].dist - trkpts[iDist-1].dist, fTimeBetween / 1000);
					//trkpts[iDist].kph = fTargetKPH;

					console.log('Time Between: ' + fTimeBetween);

					console.log('Target KPH: ' + fTargetKPH);
					console.log('Actual KPH: ' + trkpts[iDist].kph);

					console.log('Left Over Dist: ' + fLeftOverDist);
				}

				if(fLeftOverDist)
				{
						if(newLastPoint === undefined)
							newLastPoint = deepcopy(trkpts[iDist-1]);
						
						newLastPoint.time[0] = DateToGPXTime(new Date(GPXTimeToDate(newLastPoint.time[0]).getTime() + fLeftOverTime));
						newLastPoint.dist += fLeftOverDist;
				}
			}
		}
	}

	if(newLastPoint !== undefined)
		trkpts.push(newLastPoint);
}

function perserveGPXData(oldtrk, newtrk)
{
	var iOld, iNew;
	var fDist = 0;

	iOld = 0;

	for(iNew = 0; iNew < newtrk.length; iNew++)
	{
		while(iOld < oldtrk.length-2 && oldtrk[iOld+1].dist < newtrk[iNew].dist)
		{
			iOld++;
		}

		if(oldtrk[iOld].dist === newtrk[iNew].dist)
			continue;

		var pct = (newtrk[iNew].dist - oldtrk[iOld].dist) / (oldtrk[iOld+1].dist / oldtrk[iOld].dist);

		newtrk[iNew].$.lon = lerp(oldtrk[iOld].$.lon, oldtrk[iOld+1].$.lon, pct);
		newtrk[iNew].$.lat = lerp(oldtrk[iOld].$.lat, oldtrk[iOld+1].$.lat, pct);
	}
}

function calcRacePace(gpxStruct)
{
	var i = 0;

	if(gpxStruct === undefined || gpxStruct.orig === undefined)
	{
		return;
	}

	gpxStruct.racePace = {};
	gpxStruct.details = {};

	gpxStruct.details.elapsedTime = gpx_calcElapsedTime(gpxStruct.orig.gpx.trk);

	gpxStruct.details.startTime = gpxStruct.orig.gpx.trk[0].trkseg[0].trkpt[0].time[0];
	
	gpxStruct.details.movingTime = 0; //Calculated during first main loop
	gpxStruct.details.racePaceTime = 0; //Calculated uring second main loop

	gpxStruct.details.removeLocations = [];

	gpxStruct.racePace = {};
	gpxStruct.racePace.gpx = {};
	
	for(i=0;i<gpxStruct.orig.gpx.trk.length;i++)
	{
		var trk = gpxStruct.orig.gpx.trk[i];
		var n;
		var fTimeRemoved = 0;
		var fRPDist = 0;
		var removeLocations = [];

		var newtrk = [];
		var newpts = [];
		var newseg = [];

		//Main loop removing stops
		for(n=0;n<trk.trkseg.length;n++)
		{
			var newRemoveLocations = [];
			var trkseg = trk.trkseg[n];
			var j;
			var bCurrentlyStopped = false;

			console.log('Remove Stops!');
			var newpts = removeStops(trk.trkseg[n].trkpt, newRemoveLocations);

			newseg.push({trkpt: newpts});
			removeLocations.push(newRemoveLocations);
		}

		console.log('Cleanup...');

		newtrk.push({trkseg: newseg});

		gpxStruct.racePace.gpx.trk = newtrk;

		console.log('Calc moving time');
		//Calculate moving time
		gpxStruct.details.movingTime = gpx_calcElapsedTime(gpxStruct.racePace.gpx.trk);

		for(n=0;n<trk.trkseg.length;n++)
		{
			console.log('Smoothen stops...');
			smoothenStops(newtrk[i].trkseg[n].trkpt, removeLocations[n]);	

			console.log('Preserver GPX data...');
			perserveGPXData(trk.trkseg[n].trkpt, newtrk[i].trkseg[n].trkpt);
		}

		//Calculate race pace time
		console.log('Calc race pace...');
		gpxStruct.details.racePaceTime = gpx_calcElapsedTime(gpxStruct.racePace.gpx.trk);
	}
}