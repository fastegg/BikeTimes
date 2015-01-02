module.exports = {};

module.exports.GPXTimeToDate = function GPXTimeToDate(timeStamp)
{
	var sDate = new Date(timeStamp);
	return sDate;
}

function toRadians(deg)
{
	return deg * (Math.PI / 180);
}

module.exports.GPXDistToKM = function GPXDistToKM(v1, v2)
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

module.exports.KPH = function KPH(km, seconds)
{
	var d = 3600 / seconds;

	return km*d;
}