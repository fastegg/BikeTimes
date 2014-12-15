var configOptions = {
	logErrors: true,
	logIssues: true,
	logWarnings: true,

	reThrowErrors: true
};

function errorReporter(config)
{
	
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

	return function(err, req, res, next)
	{
		this.logError(err.stack, req, res);

		if(configOptions.reThrowErrors)
			throw(err);
	}
}

errorReporter.prototype.logError = function(err, req, res)
{
	if(configOptions.logErrors)
	{
		console.log('Error!');
		console.log(err.stack);
	}
}

errorReporter.prototype.logWarning = function(warning, req, res)
{
	if(configOptions.logWarnings)
	{
		console.log('Warning!');
		console.log(warning, req !== undefined ? req.url : 'Unknown URL');
	}
}

errorReporter.prototype.logIssue = function(issue, req, res)
{
	if(configOptions.logIssues)
	{
		console.log('New issue submitted');
		console.log(issue);
	}
}

module.exports = new errorReporter();