var deepcopy = require('./deepcopy.js');
var gpxUtil = require('./gpxUtil.js');

module.exports = {};

module.exports.convert = gpx2segs;
module.exports.revert = segs2gpx;

function gpx2segs(gpx)
{
	var rtn = {};
	var trk = gpx.gpx.trk;
	var lastpt;
	var totalDist = 0;
	var totalTime = 0;

	rtn.streams = {};

	rtn.streams.distance = {data: []};
	rtn.streams.latlng = {data: []};
	rtn.streams.time = {data: []};
	rtn.streams.altitude = {data: []};
	rtn.streams.velocity = {data: []};

	rtn.start_date_local = trk[0].trkseg[0].trkpt[0].time[0];
	rtn.start_latlng = [trk[0].trkseg[0].trkpt[0].$.lat, trk[0].trkseg[0].trkpt[0].$.lon];
	rtn.total_elevation_gain = 0;

	for(var i=0;i<trk.length;i++)
	{
		for(var n=0;n<trk[i].trkseg.length;n++)
		{
			for(var j=0;j<trk[i].trkseg[n].trkpt.length;j++)
			{
				var pt = trk[i].trkseg[n].trkpt[j];

				rtn.streams.latlng.data.push([pt.$.lat, pt.$.lon]);

				if(lastpt)
				{
					var fDist = gpxUtil.GPXDistToKM(pt, lastpt);
					totalDist += fDist;
					rtn.streams.distance.data.push(totalDist);

					var fTime =  (gpxUtil.GPXTimeToDate(pt.time[0]).getTime() - gpxUtil.GPXTimeToDate(lastpt.time[0]).getTime()) / 1000; //Milliseconds to seconds
					totalTime += fTime;
					rtn.streams.time.data.push(totalTime);

					rtn.streams.velocity.data.push(gpxUtil.KPH(fDist, fTime));
				}
				else
				{
					rtn.streams.distance.data.push(0);
					rtn.streams.time.data.push(0);
					rtn.streams.velocity.data.push(0);
				}

				if(pt.ele[0])
				{
					var ele = parseInt(pt.ele[0]);
					rtn.streams.altitude.data.push(ele);
					if(lastpt && ele > parseInt(lastpt.ele[0]))
						rtn.total_elevation_gain += ele - parseInt(lastpt.ele[0]);
				}

				lastpt = pt;
			}
		}
	}

	rtn.average_speed = totalDist / totalTime * 1000; //Meters per second
	rtn.elapsed_time = rtn.streams.time.data[rtn.streams.time.data.length-1];
	rtn.distance = rtn.streams.distance.data[rtn.streams.distance.data.length-1] * 1000; //In meters
	
	return rtn;
}

function segs2gpx(segs, gpxCopy)
{
	var rtn = gpxCopy ? deepcopy(gpxCopy) : {};
	var startTime = segs.start_date_local ? segs.start_date_local : segs.start_date;

	rtn.trk = [];
	rtn.trk[0] = {trkseg: []};
	rtn.trk[0].trkseg[0] = {trkpt: []};

	return rtn;
}