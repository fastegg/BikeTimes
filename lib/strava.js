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
var deepcopy = require('./deepcopy.js');
var racepace = require('../racePace.js');
var accounts = require('./accounts.js');

var opts = {
	client_id: 3860,
	scope: undefined,
};

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

function newStravaMessage(req, res, message)
{
	var stravaSession = getStravaSession(req, res);

	if(!stravaSession.messages)
	{
		stravaSession.messages = [];
	}

	stravaSession.messages.push(message);
}

function stravaEx()
{
		
}

stravaEx.prototype.isMasterAccount = function(req, res)
{
	var session = getStravaSession(req);

	if(session && session.stravaToken === "f95d1bef1025c12058d8e8ddc21d2c2022a23b87")
	{
		return true;
	}

	return false;
}

stravaEx.prototype.config = function(config)
{
	for(var opt in opts)
	{
		if(config[opt] !== undefined)
			opts[opt] = config[opt];
	}
}

stravaEx.prototype.showMessages = function(req, res, next)
{
	if(!req.session)
		next();

	var stravaSession = getStravaSession(req, res);

	if(stravaSession.messages)
	{
		if(!req.messages)
		{
			req.messages = [];
		}

		req.messages.push(stravaSession.messages);

		stravaSession.messages = undefined;
	}

	next();
}

stravaEx.prototype.use = function(req, res, next)
{
	if(!req.session)
		next();

	var stravaSession = getStravaSession(req, res);

	stravaSession.authLink = module.exports.getAuthLink(req.url);

	if(stravaSession.stravaToken && !stravaSession.athlete)
	{
		strava.athlete.get({'access_token':stravaSession.stravaToken},function(err,payload) {
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

				accounts.getOrCreateAccountFromStrava(payload.athlete, function(err, account)
					{
						if(!err)
						{
							stravaSession.account = account;
							res.redirect('/strava');
						}
						else
						{
							errors.logError(err, req, res, 'Unable to find or create account for athlete ' + payload.athlete.id);
							res.redirect('/');
						}
					});
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
	var urlParsed = url.parse(req.url, true);
	var pageNum = 1;

	if(urlParsed && urlParsed.query)
		pageNum = urlParsed.query.page || 1;

	if(stravaSession.stravaToken)
	{
        strava.athlete.listActivities({'access_token':stravaSession.stravaToken, page: pageNum, per_page: 20},function(err,payload) {
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
	var stravaSession = getStravaSession(req, res);

	if(urlParsed && urlParsed.query && urlParsed.query.id)
	{
		var i;
		var activity;

		if(stravaSession.activities)
		{
			for(i=0;i<stravaSession.activities.length;i++)
			{
				if(stravaSession.activities[i].id == urlParsed.query.id)
				{
					activity = stravaSession.activities[i];
					break;
				}
			}
		}

		if(activity)
		{
			strava.streams.activity({access_token: stravaSession.stravaToken, id: urlParsed.query.id, types: 'latlng,time,distance,altitude'}, function(err, payload) {
				if(!err)
				{
					var stravaSession = getStravaSession(req, res);
					var i;

					if(payload.message)
					{
						if(payload.message === 'Authorization Error')
						{
							newStravaMessage(req, res, 'You are unable to view this Activity');
							res.redirect('/');
							return;
						}
					}

					stravaSession.streamID = urlParsed.query.id;

					stravaSession.activity = deepcopy(activity);
					stravaSession.activity.streams = {};
					
					for(i=0;i<payload.length;i++)
					{
						stravaSession.activity.streams[payload[i].type] = payload[i];
					}

					req.sessionData.racePace = racepace.setFromStrava(stravaSession.activity);

					if(!stravaSession.account.entries[activity.id])
					{
						var newEntry = {
							activityid: stravaSession.activity.id,
							ownerid: stravaSession.athlete.id,
							racepace: req.sessionData.racePace.racePace.racepace_time
						}

						accounts.newEntry(newEntry);

						stravaSession.account.entries[activity.id] = newEntry;
					}

					if(stravaSession.activity.athlete.id === stravaSession.athlete.id)
					{
						stravaSession.activity.athlete = deepcopy(stravaSession.athlete);
						res.end(stencil.fillStencilWithReq('viewGPX', req));
					}
					else
					{
						strava.athlete.get({id: stravaSession.activity.athlete.id}, function(err, payload)
						{
							stravaSession.activity.athlete = deepcopy(payload);
							res.end(stencil.fillStencilWithReq('viewGPX', req));
						});
					}
				}
				else
				{
					errors.logError('Failed to load Activity: ' + err, req, res, 'Unable to load activity');
					req.session = null;
					res.redirect('/');
				}
			});
		}
		else
		{
			//No activity found, must be someone else's activity, try getting it anyways (public ones will show up)
			strava.activities.get({id: urlParsed.query.id}, function(err, payload) {
				if(!err)
				{
					if(payload.message)
					{
						if(payload.message === 'Authorization Error')
						{
							if(stravaSession.stravaToken)
								newStravaMessage(req, res, 'You are unable to view this Activity');
							else
								newStravaMessage(req, res, 'Please login with Strava to see this Activity');
						}

						res.redirect('/');
						return;
					}

					stravaSession.activity = deepcopy(payload);

					strava.streams.activity({id: urlParsed.query.id, types: 'latlng,time,distance,altitude'}, function(err, payload) {
						if(!err)
						{
							var stravaSession = getStravaSession(req, res);
							var i;

							if(payload.message)
							{
								if(payload.message === 'Authorization Error')
								{
									if(stravaSession.stravaToken)
										newStravaMessage(req, res, 'You are unable to view this Activity');
									else
										newStravaMessage(req, res, 'Please login with Strava to see this Activity');

									res.redirect('/');
									return;
								}
							}

							stravaSession.streamID = urlParsed.query.id;
							stravaSession.activity.streams = {};

							for(i=0;i<payload.length;i++)
							{
								stravaSession.activity.streams[payload[i].type] = payload[i];
							}

							req.sessionData.racePace = racepace.setFromStrava(stravaSession.activity);

							//Need to get athlete public information
							strava.athlete.get({access_token: stravaSession.stravaToken, id: stravaSession.activity.athlete.id}, function(err, payload) {
								if(!err)
								{
									stravaSession.activity.athlete.profile_medium = payload.profile_medium;
									stravaSession.activity.athlete.profile = payload.profile;

									res.end(stencil.fillStencilWithReq('viewGPX', req));	
								}
								else
								{
									errors.logError('Failed to load Activity: ' + err, req, res, 'Unable to load activity');
									req.session = null;
									res.redirect('/');
								}
								
							});
						}
						else
						{
							errors.logError('Failed to load Activity: ' + err, req, res, 'Unable to load activity');
							req.session = null;
							res.redirect('/');
						}
					});

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
}

stravaEx.prototype.getLogout = function(req, res)
{
	newStravaSession(req, res);
	newStravaMessage(req, res, 'Successfully Logged Out');
	res.redirect('/');
}

stravaEx.prototype.getAuthLink = function(state)
{
	var authLink = strava.oauth.getRequestAccessURL({scope: opts.scope, redirect_uri: (process.env.strava_redirect_uri || "127.0.0.1/token_exchange")});

	return authLink;
}

module.exports = new stravaEx();