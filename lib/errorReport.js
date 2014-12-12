module.exports = function(err, req, res, next)
{
	console.log('Error!');
	console.log(err.stack);
}