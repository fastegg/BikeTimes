
//Distance functions, assuming vec are GPS locations
// Vec2 
// {
//		var lat;
//		var lon;	
// }
function vec2DistSquared(v1, v2)
{
	var xd = v2.lat-v1.lat;
	var yd = v2.lon-v1.lon;

	return (xd*xd + yd*yd);
}

function vec2Dist(v1, v2)
{
	Math.sqrt(vec2DistSquared);
}

function toRadians(deg)
{
	return deg * (Math.PI / 180);
}

function GPXDistToKM(v1, v2)
{
	var R = 6371; // km
	var o1 = toRadians(v1.lat)
	var o2 = toRadians(v2.lat);
	var ao = toRadians(v2.lat-v1.lat);
	var ah = toRadians(v2.lon-v1.lon);

	var a = Math.sin(ao/2) * Math.sin(ao/2) +
	        Math.cos(o1) * Math.cos(o2) *
	        Math.sin(ah/2) * Math.sin(ah/2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

	return d = R * c;
}

function KPH(km, seconds)
{
	var d = 3600 / seconds;

	return km*d;
}


function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

//Assumed GPX time format: YYYY-MM-DDTHH:MM:SS.MILSZ
function GPXTimeToDate(timeStamp)
{
	var sDate = new Date(timeStamp);

	return sDate;
}

function DateToGPXTime(sDate)
{
	return sDate.getUTCFullYear() + "-" + (pad(sDate.getUTCMonth() + 1,2)) + "-" + pad(sDate.getUTCDate(),2) + "T" + pad(sDate.getUTCHours(),2) + ":" + pad(sDate.getUTCMinutes(),2) + ":" + pad(sDate.getUTCSeconds(),2) + "." + pad(sDate.getUTCMilliseconds(),3) + "Z";
}

function fillKPHForData(gpsList, index, dataOut)
{
	for(i=1;i<gpsList.length;i++)
	{
		var curLoc = gpsList[i];
		var prevLoc = gpsList[i-1];

		var fDist = GPXDistToKM(curLoc,prevLoc);

		if(dataOut[i] === undefined)
			dataOut[i] = [i];

		dataOut[i][index] = KPH(fDist,5);
	}

	for(;i<dataOut.length;i++)
	{
		dataOut[i][index] = undefined;
	}
}

function lerp(a,b,f)
{
	return a + f * (b - a);
}

/*
function rp_moveLoc(gpsList,iLoc,fSeconds);
{

}
*/

function rp_calc(gpsList)
{
	var fTimeRemoved = 0;
	var fTimeRemoving = 0;
	var fLeftOverTime = 0;
	var i;
	var iRemoveStart = 0;
	var output = "<table><tr><th>Index</th><th>Time</th><th>Distance</th><th>KPH</th><th>New Time</th></tr>";
	var fDistAdd = 0;

	for(i=1;i<gpsList.length;i++)
	{
		var curLoc = gpsList[i];
		var prevLoc = gpsList[i-1];
		var nextLoc = gpsList[i+1];
		
		var fDist = GPXDistToKM(curLoc,prevLoc);

		var prevTime = 0;
		
		output += "<tr><td>" + i + "</td><td>" + curLoc.time + "</td><td>" + fDist + "</td><td>" + KPH(fDist,5) + "</td>";

		if(fTimeRemoved > 0)
		{
			prevTime = GPXTimeToDate(curLoc.time);
			curLoc.time = DateToGPXTime(new Date(GPXTimeToDate(curLoc.time).getTime() - fTimeRemoved));
		}

		if(fLeftOverTime > 0 && nextLoc != undefined)
		{
			curLoc.lat = lerp(curLoc.lat,nextLoc.lat,fLeftOverTime/5);
			curLoc.lon = lerp(curLoc.lon,nextLoc.lon,fLeftOverTime/5);
			curLoc.ele = lerp(curLoc.ele,nextLoc.ele,fLeftOverTime/5);
		}
		
		if(KPH(fDist,5) < 3)
		{
			var fLastTime = fTimeRemoving;

			fTimeRemoving += GPXTimeToDate(curLoc.time).getTime() - GPXTimeToDate(prevLoc.time).getTime();

			if(iRemoveStart === 0)
				iRemoveStart = i;

			output += "<td>REMOVED!</td></tr>"
		}
		else
		{
			if(iRemoveStart > 0)
			{
				curLoc.time = DateToGPXTime(new Date(GPXTimeToDate(curLoc.time).getTime() - fTimeRemoving));
				gpsList.splice(iRemoveStart,i-iRemoveStart);
				i-=i-iRemoveStart;
				iRemoveStart = 0;
				fTimeRemoved += fTimeRemoving;

				output += "<td>Removing: " + fTimeRemoving + " seconds - " + curLoc.time + "</td></tr>"

				fTimeRemoving = 0;

				var iScaleStart = i;
				var iScaleEnd = i + 1;
				var fLastKPH = 0;
				var scalePrevLoc;
				var scaleCurLoc;
				var curKPH;
				var dist;
				var distCovered = 0;
				var startKPH;

				while(iScaleStart > 1 && iScaleStart > i - 2)
				{
					scalePrevLoc = gpsList[iScaleStart-1];
					scaleCurLoc = gpsList[iScaleStart];
					dist = GPXDistToKM(scaleCurLoc,scalePrevLoc);
					curKPH = KPH(dist,5);

					if(curKPH < fLastKPH + 2.0)
						break;

					distCovered += dist;
					iScaleStart--;
				}

				startKPH = curKPH;
				fLastKPH = 100000.0;

				while (iScaleEnd < gpsList.length && iScaleEnd < i + 2)
				{
					scalePrevLoc = gpsList[iScaleEnd-1];
					scaleCurLoc = gpsList[iScaleEnd];
					dist = GPXDistToKM(scaleCurLoc,scalePrevLoc);
					curKPH = KPH(dist,5);
					if(curKPH > fLastKPH - 2.0)
						break;

					distCovered += dist;
					iScaleEnd++;
				}

				console.log("Scale start and end: " + iScaleStart + " : " + iScaleEnd + "(" + curKPH + ":" + startKPH +")");

				var avgKPH = (curKPH + startKPH) / 2;
				var seconds = distCovered / avgKPH * 3600;
				var intervals = seconds / 5;

				console.log("Distance covered: " + distCovered);
				console.log("Intervals: " + intervals);
				console.log("KPH:" + avgKPH);
				console.log("Seconds: " + seconds);

				for(var interval = 0; interval < intervals; interval++)
				{
					var intervalKPH = lerp(startKPH,curKPH,interval/intervals);
					var intervalDist = intervalKPH / 3600 * 5;
					var iJumps = 0;

					scaleCurLoc = gpsList[iScaleStart + interval];
					var scaleNextLoc = gpsList[iScaleStart + interval + 1];

					dist = GPXDistToKM(scaleCurLoc,scaleNextLoc);

					while(intervalDist > dist)
					{
						intervalDist -= dist;
						iJumps++;

						scaleCurLoc = gpsList[iScaleStart + interval + iJumps];
						scaleNextLoc = gpsList[iScaleStart + interval + 1 + iJumps];

						dist = GPXDistToKM(scaleCurLoc,scaleNextLoc);
					}

					var fDistPercentage = intervalDist / dist;

					//Just in case it changed during the while statement above
					scaleNextLoc.lat = lerp(scaleCurLoc.lat,scaleNextLoc.lat,fDistPercentage);
					scaleNextLoc.lon = lerp(scaleCurLoc.lon,scaleNextLoc.lon,fDistPercentage);
					scaleNextLoc.ele = lerp(scaleCurLoc.ele,scaleNextLoc.ele,fDistPercentage);

					if(iJumps)
					{
						gpsList.splice(iScaleStart+interval+1,iJumps);
						fTimeRemoved += 5000 * iJumps;
					}
				}

				fLeftOverTime += seconds - Math.floor(intervals) * 5;

				if(fLeftOverTime > 5)
				{
					fLeftOverTime -= 5.0;
					fTimeRemoved += 5000;
					gpsList.splice(i,1);
					i--;
				}

				console.log("Left Over Time: " + fLeftOverTime);

			}
			else
			{
				output += "<td>" + curLoc.time + "</td></tr>"	
			}

			
		}
	}

	output += "</table>";

	return output;
}