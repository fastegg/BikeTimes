var xml2js = require('xml2js');
var pages = require('./cachePages.js');
var racePace = require('./racePace.js');
var stencil = require('./lib/stencil.js');
var sessionData = require('./lib/sessionData.js');

module.exports = {};
module.exports.use = useGPX;
module.exports.view = viewGPX;
module.exports.post = postGPX;
module.exports.get = getGPX;
module.exports.getJS = getGPXJS;

//module.exports.useSession = useSessionGPX;

function getGPXJS(req, res)
{
	var sessionData = req.sessionData;

	if(sessionData.racePace !== undefined)
	{
		var viewGPXJS = pages.getPage('custom/viewGPX.js');

		viewGPXJS = viewGPXJS.replace('//GPXDATAREPLACE//','gpxData = ' + JSON.stringify(sessionData.racePace) + ';');

		res.send(viewGPXJS);
	}
}

function postGPX(req, res)
{
	var sessionData = req.sessionData;

	if(sessionData !== undefined && sessionData.racePace !== undefined)
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
	if(req.sessionData.racePace !== undefined)
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

/*
function useSessionGPX(req, res, next)
{
	var curSession = sessions[req.session.id];

	if(curSession === undefined)
	{
		curSession = {};
		curSession.id = ++iMaxID;
		curSession.GPX = undefined;

		sessions[curSession.id] = curSession;

		req.session.id = curSession.id;
	}

	req.gpxSession = curSession;

	next();
}
*/

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
				var sessionData = req.sessionData;
  				GPXObj = r;

				if(GPXObj === undefined)
		        {
		        	//Return an error!
		        	sessionData.GPX = undefined;
		        }
		        else
		        {
		        	var uploads = req.session.uploads || 0;
		        	//curSession.uploads = ++uploads;
		        	sessionData.GPX = {};
		        	sessionData.GPX = GPXObj;

		        	sessionData.racePace = racePace.setFromGPX(GPXObj);
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
	var sessionData = req.sessionData;
	
	if(sessionData !== undefined && sessionData.GPX !== undefined)
	{
		res.send(stencil.fillStencilWithReq('viewGPX', req));
	}
	else
	{
		res.redirect('/');
	}
}