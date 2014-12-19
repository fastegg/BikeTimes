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

var opts = {
	client_id: 3860,
	scope: undefined,
};

var stravaSessions = [];

function newStravaSession(id)
{
	var newSession = {};

	newSession.id = id;

	stravaSessions[id] = newSession;

	return newSession;
}

function getStravaSession(id)
{
	var rtn = stravaSessions[id];

	if(rtn === undefined && id > 0)
		rtn = newStravaSession();

	return rtn;
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

	req.strava = getStravaSession(req.session.id);

	req.strava.authLink = module.exports.getAuthLink(req.url);

	if(req.session && req.session.stravaToken && !req.strava.athlete)
	{
		strava.athlete.get({'access_token':req.session.stravaToken},function(err,payload) {
        	if(!err)
        	{
        		req.strava.athlete = payload;
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
				req.session.stravaToken = payload.access_token;

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
	if(req.session.stravaToken) //1
	{
        strava.athlete.listActivities({'access_token':req.session.stravaToken},function(err,payload) {
        	if(!err)
        	{
        		req.strava.activities = payload;
        		res.send(stencil.fillStencilWithReq('stravaActivities', req));
        	}
        	else
        	{
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
				req.strava.streams = payload;
			}
			else
			{
				console.log(err);
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