var configOptions = {
	logErrors: true,
	logIssues: true,
	logWarnings: true,

	reThrowErrors: true
};

var sessionErrors = {};

function errorReporter()
{
	
}

function addErrorDisplay(id, error)
{
	if(!sessionErrors[id])
	{
		sessionErrors[id] = {
			errors: []
		};
	}

	sessionErrors[id].errors.push(error);
}

errorReporter.prototype.addErrors = function(req, res, next)
{
	if(req.session && sessionErrors[req.session.id])
	{
		req.errors = sessionErrors[req.session.id].errors;
	}
	else
	{
		req.errors = [];
	}

	sessionErrors[req.session.id] = undefined;

	next();
}

errorReporter.prototype.setup = function(config)
{
	//Copy the config options
	for(var opt in configOptions)
	{
		if(config[opt] !== undefined)
		{
			configOptions[opt] = config[opt];
		}
	}

	return this.useError;
}

errorReporter.prototype.useError = function(err, req, res, next)
{
	module.exports.logError(err.stack, req, res);

	if(configOptions.reThrowErrors)
		throw(err);

	next();
}

errorReporter.prototype.showError = function(req, error)
{
	addErrorDisplay(req, error);
}

errorReporter.prototype.logError = function(err, req, res, displayError)
{
	if(configOptions.logErrors)
	{
		console.log('Error!');
		console.log(err.stack);
	}

	if(displayError)
		addErrorDisplay(req, displayError);
}

errorReporter.prototype.logWarning = function(warning, req, res, displayError)
{
	if(configOptions.logWarnings)
	{
		console.log('Warning!');
		console.log(warning, req !== undefined ? req.url : 'Unknown URL');
	}

	if(displayError)
		addErrorDisplay(req, displayError);
}

errorReporter.prototype.logIssue = function(issue, req, res, displayError)
{
	if(configOptions.logIssues)
	{
		console.log('New issue submitted');
		console.log(issue);
	}

	if(displayError)
		addErrorDisplay(req, displayError);
}

module.exports = new errorReporter();