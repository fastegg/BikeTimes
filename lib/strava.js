/*
https://www.strava.com/oauth/authorize?
client_id=9
&response_type=code
&redirect_uri=http://testapp.com/token_exchange
&scope=view_private
&state=mystate
&approval_prompt=force
*/

var url = require('url');
var strava = require('strava-v3');
var stencil = require('./stencil.js');
var errors = require('./errorReport.js');

var opts = {
	client_id: 3860,
	scope: undefined,
};

var stravaSessions = [];

function newStravaSession(req, res)
{
	var newSession = {};

	if(req.sessionData)
		req.sessionData.strava = {};
}

function getStravaSession(req, res)
{
	if(!req.sessionData)
	{
		errors.logError('Using strava.js without valid session data.', req, res, 'Unable to set Strava data.');
		return null;
	}

	if(!req.sessionData.strava)
		newStravaSession(req, res);

	return req.sessionData.strava;
}

function stravaEx()
{
		
}

stravaEx.prototype.config = function(config)
{
	for(var opt in opts)
	{
		if(config[opt] !== undefined)
			opts[opt] = config[opt];
	}
}

stravaEx.prototype.use = function(req, res, next)
{
	if(!req.session)
		next();

	var stravaSession = getStravaSession(req, res);

	stravaSession.authLink = module.exports.getAuthLink(req.url);

	if(stravaSession.stravaToken && !stravaSession.athlete)
	{
		strava.athlete.get({'access_token':req.session.stravaToken},function(err,payload) {
        	if(!err)
        	{
        		stravaSession.athlete = payload;
        		next();
        	}
        	else
        	{
        		next();
        	}
		});
	}
	else
	{
		next();
	}
}

stravaEx.prototype.authGet = function (req, res)
{
	var urlParsed = url.parse(req.url, true);

	if(urlParsed.query && urlParsed.query.code)
	{
		strava.oauth.getToken(urlParsed.query.code, function(err,payload) {
			if(!err)
			{
				var stravaSession = getStravaSession(req, res);

				stravaSession.stravaToken = payload.access_token;
				stravaSession.athlete = payload.athlete;
				res.redirect('/strava');
			}
			else
			{
				res.redirect('/');
			}
        });
	}
	else
	{
		res.redirect('/');
	}
}

stravaEx.prototype.getLists = function (req, res)
{
	var stravaSession = getStravaSession(req, res);

	if(stravaSession.stravaToken)
	{
        strava.athlete.listActivities({'access_token':req.session.stravaToken},function(err,payload) {
        	if(!err)
        	{
        		stravaSession.activities = payload;
        		//stravaSession.lastRequest = Date(); //TODO: Make sure we don't request this over and over if we don't have to
        		res.send(stencil.fillStencilWithReq('stravaActivities', req));
        	}
        	else
        	{
        		errors.logError('Failed to load Activities: ' + err, req, res, 'Unable to load activities');
        		req.session = null //clear the session, to clear the last strava token
        		res.redirect('/');
        	}
        });
	}
	else
	{
		//Clear the session, invalid strava code
		req.session = null;
		res.redirect('/');
	}
}

stravaEx.prototype.loadStream = function(req, res)
{
	var urlParsed = url.parse(req.url, true);

	if(urlParsed && urlParsed.query && urlParsed.query.id);
	{
		strava.streams.activity({id: urlParsed.query.id, types: 'latlang,time'}, function(err, payload) {
			if(!err)
			{
				var stravaSession = getStravaSession(req, res);

				stravaSession.streams = payload;
			}
			else
			{
				errors.logError('Failed to load Activity: ' + err, req, res, 'Unable to load activity');
				req.session = null;
				res.redirect('/');
			}
		});
	}
}

stravaEx.prototype.getAuthLink = function(state)
{
	var authLink = strava.oauth.getRequestAccessURL({scope: opts.scope, redirect_uri: (process.env.strava_redirect_uri || "127.0.0.1/token_exchange")});

	return authLink;
}

module.exports = new stravaEx();