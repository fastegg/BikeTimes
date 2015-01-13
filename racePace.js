var deepcopy = require('./lib/deepcopy.js');
var gpx2segs = require('./lib/gpx2segs.js')

module.exports = {};

module.exports.calcRacePace = calcRacePace;
module.exports.setFromGPX = setFromGPX;
module.exports.setFromStrava = setFromStrava;

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
	var o1 = toRadians(v1[0])
	var o2 = toRadians(v2[0]);
	var ao = toRadians(v2[0]-v1[0]);
	var ah = toRadians(v2[1]-v1[1]);

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

function lerp(a, b, p) {
	return a + p * (b - a);
}

/////////////////////////////////////////////
//
// Main exported function
//
/////////////////////////////////////////////

function removeStops(activity, removeLocations)
{
	var streams = activity.streams;
	var i;
	var fTimeRemoved = 0;
	var bCurrentlyStopped = false;
	var fTimeRemoving = 0;
	var fDistRemoving = 0;
	var fDistRemoved = 0;

	for(i=0;i<activity.streams.distance.data.length;i++)
	{
		if(i===0)
		{
			continue;
		}

		if(fTimeRemoved > 0)
		{
			activity.streams.time.data[i] -= fTimeRemoved;
		}

		if(fDistRemoved > 0)
		{
			activity.streams.distance.data[i] -= fDistRemoved;
		}

		var fDist = activity.streams.distance.data[i] - activity.streams.distance.data[i-1];
		var fTimeBetween = activity.streams.time.data[i] - activity.streams.time.data[i-1]
		var fKPH = activity.streams.velocity.data[i];

		if(fKPH < 3	|| (bCurrentlyStopped === true && fKPH < 5))
		{
			if(bCurrentlyStopped === false)
			{
				bCurrentlyStopped = true;
				removeLocations.push({loc: i, timeRemoved: 0, distance: activity.streams.distance.data[i]});
			}

			fTimeRemoving += fTimeBetween;
			fDistRemoving += fDist;
		}
		else
		{
			if(bCurrentlyStopped)
			{
				var removeID = removeLocations.length-1;
				var iRemoveSpots = i - removeLocations[removeID].loc;

				for(var seg in activity.streams)
				{
					activity.streams[seg].data.splice(removeLocations[removeID].loc, iRemoveSpots);
				}

				i = i - iRemoveSpots;
				bCurrentlyStopped = false;

				removeLocations[removeID].timeRemoved = fTimeRemoving;

				activity.streams.time.data[i] -= fTimeRemoving;
				activity.streams.distance.data[i] -= fDistRemoving;

				fTimeRemoved += fTimeRemoving;
				fTimeRemoving = 0;
				fDistRemoved += fDistRemoving;
				fDistRemoving = 0;
			}
		}
	}
}

function smoothenStops(activity, removeLocations)
{
	var i;
	var newLastPoint = undefined;

	for(i=removeLocations.length-1;i>=0;i--)
	{
		console.log('Remove loc: ' + i);
		var pos = removeLocations[i].loc;

		var start = pos;
		var end = pos;

		var fTimeRemoved = 0;

		while(start > 0)
		{
			//Remove first
			start--;

			//Check to see if the start is more than 15 seconds from pos
			if(activity.streams.time.data[pos] - activity.streams.time.data[start] > 15)
			{
				break;
			}

			//Check to see if the kph has dropped
			if(start < pos - 1 && activity.streams.velocity.data[start] < activity.streams.velocity.data[start+1])
			{
				start++;
				break;
			}

			//Check to see if the kph is within 10% of the last kph
			if(start < pos - 1 && activity.streams.velocity.data[start] / activity.streams.velocity.data[start+1] < 1.10)
			{
				break;
			}
		}

		while (end < activity.streams.velocity.data.length)
		{
			end++;

			//Check to see if the end is more than 15 seconds from pos
			if(activity.streams.time.data[end] - activity.streams.time.data[pos] > 15)
			{
				break;
			}

			//Check to see if the kph has dropped
			if(end > pos && activity.streams.velocity.data[end] < activity.streams.velocity.data[end-1])
			{
				end--;
				break;
			}

			//Check to see if the kph is within 10% of the last kph
			if(end > pos + 1 && activity.streams.velocity.data[end] / activity.streams.velocity.data[end-1] < 1.10)
			{
				break;
			}
		}

		console.log('Check...');

		var fTotalDist = activity.streams.distance.data[end] - activity.streams.distance.data[start];
		var fAvgKPH = (activity.streams.velocity.data[start] + activity.streams.velocity.data[end]) / 2;
		var fTimeToTravel = (fTotalDist/fAvgKPH) * 3600 //Time in seconds 
		var nextpt = start+1;

		var fTimeStart = activity.streams.time.data[start];
		var fTimeEnd = activity.streams.time.data[end];
		var fTimeSpot = activity.streams.time.data[nextpt] - fTimeStart;

		var fLeftOverDist = fTotalDist;
		var fDistLost = fTotalDist;

		removeLocations[i].timeRemoved += activity.streams.time.data[end] - activity.streams.time.data[start] - fTimeToTravel;

		while(fTimeSpot < fTimeToTravel && nextpt < end)
		{
			var pct = fTimeSpot / fTimeToTravel;
			var fKPH = lerp(activity.streams.velocity.data[start], activity.streams.velocity.data[end], pct);
			var fTimeDifference = (fTimeSpot + fTimeStart) - activity.streams.time.data[nextpt-1];
			var fDistToTravel = (fKPH / 3600) * fTimeDifference;

			activity.streams.distance.data[nextpt] = activity.streams.distance.data[nextpt-1] + fDistToTravel;
			activity.streams.velocity.data[nextpt] = fKPH;

			fLeftOverDist -= fDistToTravel;
			fDistLost -= fDistToTravel;
			
			nextpt++;
			fTimeSpot = activity.streams.time.data[nextpt] - fTimeStart;
		}

		console.log('Check...');

		var fLeftOverTime = fTimeToTravel - (fTimeSpot - (activity.streams.time.data[nextpt] - activity.streams.time.data[nextpt-1]));
		var fLeftOverDist = (activity.streams.velocity.data[end] / 3600 * fLeftOverTime);
		var fLeftOverKPH = KPH(fLeftOverDist, fLeftOverTime);
		fDistLost -= fLeftOverDist;

		if(nextpt < end)
		{
			var ptsRemoved = end-nextpt + 1;

			fTimeRemoved = activity.streams.time.data[end + 1] - activity.streams.time.data[nextpt];

			console.log('Removing ' + fTimeRemoved + ' secs at ' + nextpt);

			for(var seg in activity.streams)
			{
				activity.streams[seg].data.splice(nextpt,ptsRemoved);
			}
		}
		else
		{
			console.log('Not removing spots: ' + nextpt + ' - ' + end);
		}

		if(fLeftOverDist > 0 || fLeftOverTime > 0 || fTimeRemoved > 0)
		{
			var iDist = nextpt;

			if(fTimeRemoved > 0)
			{	
				for(iDist=nextpt;iDist<activity.streams.distance.data.length;iDist++)
				{
					var fTimeBetween = activity.streams.time.data[iDist] - activity.streams.time.data[iDist-1];

					activity.streams.time.data[iDist] -= fTimeRemoved;
					activity.streams.distance.data[iDist] -= fDistLost;

					var fTimeBetween = activity.streams.time.data[iDist] - activity.streams.time.data[iDist-1];
					var pct = fLeftOverTime / fTimeBetween;
					var fTargetKPH = (fLeftOverKPH * pct + activity.streams.velocity.data[iDist] * (1-pct));
					var fOldDist = activity.streams.distance.data[iDist] - activity.streams.distance.data[iDist-1];
					var fNewDist = (fTargetKPH / 3600) * fTimeBetween;
					
					activity.streams.distance.data[iDist] = activity.streams.distance.data[iDist-1] + fNewDist;

					fLeftOverDist = fOldDist - fNewDist;
					fLeftOverKPH = KPH(fLeftOverDist, fLeftOverTime);

					activity.streams.velocity.data[iDist] = KPH(activity.streams.distance.data[iDist] - activity.streams.distance.data[iDist-1], fTimeBetween);
				}

				console.log('Check...');

				if(fLeftOverDist)
				{
					if(newLastPoint === undefined)
					{
						newLastPoint = {
							time: 0,
							distance: 0,
							velocity: 0
						}
					}

					newLastPoint.time += fLeftOverTime;
					newLastPoint.distance += fLeftOverDist;

					if(newLastPoint.time > 5)
					{
						var newDist = newLastPoint.distance * (5/newLastPoint.time);
						var newVelocity = KPH(newDist, 5);

						for(seg in activity.streams)
						{
							if(seg === 'time')
							{
								activity.streams.time.data.push(activity.streams.time.data[activity.streams.time.data.length-1] + 5);
							}
							else if(seg === 'distance')
							{
								activity.streams.distance.data.push(activity.streams.distance.data[activity.streams.distance.data.length-1] + newDist);
							}
							else if(seg === 'velocity')
							{
								activity.streams.velocity.data.push(newVelocity);
							}
							else
							{
								activity.streams[seg].data.push(0);
							}
						}

						newLastPoint.time -= 5;
						newLastPoint.distance -= newDist;

						console.log('Setting new last point...', newLastPoint);
					}

					newLastPoint.velocity = KPH(newLastPoint.distance, newLastPoint.time);
				}
			}
		}
	}

	if(newLastPoint !== undefined && newLastPoint.time != 0)
	{
		activity.streams.velocity.data.push(newLastPoint.velocity);
		activity.streams.time.data.push(newLastPoint.time + activity.streams.time.data[activity.streams.time.data.length-1]);
		activity.streams.distance.data.push(newLastPoint.distance + activity.streams.distance.data[activity.streams.distance.data.length-1]);
	}

	console.log('Done!');
}

/*
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
*/

function calcRacePace(orig)
{
	var i;

	if(!orig.streams.distance && orig.streams.latlon)
	{
		orig.streams.distance = {
			type: 'distance',
			data: [],
			original_size: orig.streams.latlon.original_size,
			resolution: orig.streams.latlon.resolution
		};

		for(i=0;i<orig.streams.latlon.length;i++)
		{
			if(i===0)
			{
				orig.streams.distance.data.push(0);
			}
			else
			{
				orig.streams.distance.data.push(GPXDistToKM(orig.streams.latlng.data[i-1], orig.streams.latlon.data[i]));
			}
		}
	}

	var rtn = deepcopy(orig);
	var removeLocations = [];

	console.log('Remove stops');

	removeStops(rtn, removeLocations);

	rtn.moving_time = rtn.streams.time.data[rtn.streams.time.data.length-1];

	console.log('Smoothen stops');

	smoothenStops(rtn, removeLocations);
	//Set GPX data only when requested
	rtn.removed = removeLocations;
	rtn.timegained = 0;

	console.log('Calculating time gained');

	for(i=0;i<removeLocations.length;i++)
	{
		rtn.timegained += removeLocations[i].timeRemoved;
	}

	rtn.racepace_time = rtn.streams.time.data[rtn.streams.time.data.length-1];

	return rtn;
}

function setFromGPX(gpx)
{
	var rtn = {};

	rtn.orig = gpx2segs.convert(gpx);
	rtn.racePace = calcRacePace(rtn.orig);

	var lastDist = 0;

	for(var i=0;i<rtn.racePace.streams.distance.data.length;i++)
	{
		if(lastDist > rtn.racePace.streams.distance.data[i])
		{
			console.log("Problem found: " + i);
		}

		lastDist = rtn.racePace.streams.distance.data[i];
	}

	return rtn;
}

function setFromStrava(strava)
{
	var rtn = {};

	//Strava streams don't have velocity (only velocity_smooth), calculate it
	strava.streams.velocity = {
		data: []
	};

	strava.streams.velocity.data.push(0);
	strava.streams.distance.data[0] = strava.streams.distance.data[0]/1000 //Convert meters to km

	for(var i=1;i<strava.streams.distance.data.length;i++)
	{
		strava.streams.distance.data[i] = strava.streams.distance.data[i]/1000 //Convert meters to km

		var fTimeBetween = strava.streams.time.data[i] - strava.streams.time.data[i-1];
		var fDistBetween = strava.streams.distance.data[i] - strava.streams.distance.data[i-1];

		strava.streams.velocity.data.push(KPH(fDistBetween, fTimeBetween));
	}

	rtn.orig = strava;
	rtn.racePace = calcRacePace(rtn.orig);

	return rtn;
}