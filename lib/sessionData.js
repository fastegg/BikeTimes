var errorReport = require('./errorReport.js');
var idCount = 0;

module.exports = sessionData;

var sessions = {};

function sessionData(config)
{
	if(config)
	{
		if(!config.maxage) config.maxage = 3600000; //1 hour
	}
	
	return function(req, res, next)
	{
		if(!req.session)
		{
			errorReport.logError('Using sessionData without a proper cookie-session! This will go poorly', req, res);
			return;
		}

		if(!req.session.id)
			req.session.id = idCount++;

		console.log('Session request for id:', req.session.id);

		var sessionData = sessions[req.session.id];

		if(!sessionData)
		{
			sessionData = {};
			sessions[req.session.id] = sessionData;
			sessionData.id = req.session.id;
		}

		if(sessionData.timeoutObj)
			clearTimeout(sessionData.timeoutObj);

		sessionData.timeoutObj = setTimeout(sessionExpire, config.maxage, req.session.id);
		req.sessionData = sessionData;

		next();
	}
}

function sessionExpire(id)
{	
	if(sessions[id])
		sessions[id] = undefined;
}