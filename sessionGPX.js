var xml2js = require('xml2js');
var pages = require('./cachePages.js');
var racePace = require('./racePace.js');

module.exports = {};
module.exports.use = useGPX;
module.exports.view = viewGPX;
module.exports.post = postGPX;
module.exports.get = getGPX;
module.exports.getJS = getGPXJS;

module.exports.useSession = useSessionGPX;

function getGPXJS(req, res)
{
	var curSession = sessions[req.session.id];

	if(curSession.GPX !== undefined)
	{
		var viewGPXJS = pages.getPage('custom/viewGPX.js');

		viewGPXJS = viewGPXJS.replace('//GPXDATAREPLACE//','gpxData = ' + JSON.stringify(curSession.GPX) + ';');

		res.send(viewGPXJS);
	}
}

function postGPX(req, res)
{
	var curSession = sessions[req.session.id];

	console.log('Looking for session: ' + req.session.id);

	if(curSession !== undefined && curSession.GPX !== undefined)
	{
		res.redirect('/viewGPX');
	}
	else
	{
		res.redirect('/');
	}
}

function getGPX(req, res)
{
	if(req.session.GPX !== undefined)
	{
		res.redirect('/viewGPX');
	}
	else
	{
		res.redirect('/');
	}
}

var sessions = {};
var iMaxID = 0;

function useSessionGPX(req, res, next)
{
	var curSession;

	if(req.session.id)
	{
		curSession = sessions[req.session.id];
	}

	if(curSession === undefined)
	{
		curSession = {};
		curSession.id = ++iMaxID;
		curSession.GPX = undefined;

		sessions[curSession.id] = curSession;

		req.session.id = curSession.id;

		console.log('Creating new session: ' + curSession.id);
	}

	req.gpxSession = curSession;

	next();
}

function useGPX(req, res, next)
{
	if(!req.busboy)
		next();

	req.pipe(req.busboy);

	req.busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
		var fileContents = '';

		file.on('data', function(data) {
			fileContents += data.toString();
      	});

		file.on('end', function() {
			var parser = new xml2js.Parser();

			xml2js.parseString(fileContents, function (e, r) {
				var curSession = sessions[req.session.id];
  				GPXObj = r;

				if(GPXObj === undefined)
		        {
		        	//Return an error!
		        	curSession.GPX = undefined;
		        }
		        else
		        {
		        	var uploads = req.session.uploads || 0;
		        	curSession.uploads = ++uploads;
		        	curSession.GPX = {};
		        	curSession.GPX.orig = GPXObj;
		        	racePace.calcRacePace(curSession.GPX);
		        }
			});
			
			parser.on('end', function(result) {
				
			});

			parser.parseString(fileContents, function (err, result) {
					
				}
			);
		});
  	});

  	req.busboy.on('field', function (key, value, keyTruncated, valueTruncated) {

  	});

  	req.busboy.on('finish', function() {
  		next();
    });
}

function viewGPX(req, res)
{
	var curSession = sessions[req.session.id];
	
	if(curSession !== undefined && curSession.GPX !== undefined)
	{
		var jsonString = JSON.stringify(curSession.GPX);

		res.send(pages.getPage('viewGPX.html'));
	}
	else
	{
		res.redirect('/');
	}
}