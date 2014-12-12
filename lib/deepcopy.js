module.exports = deepcopy;

function deepcopy(obj)
{
	if(typeof(obj) == 'object')
	{
		var rtn = {};

		for(var member in obj)
		{
			var objtype = typeof(obj[member]);

			if(objtype === 'object')
			{
				if(Array.isArray(obj[member]))
				{
					var i;

					rtn[member] = [];

					for(i=0;i<obj[member].length;i++)
					{
						rtn[member][i] = deepcopy(obj[member][i]);
					}
				}
				else
				{
					rtn[member] = deepcopy(obj[member]);
				}
			}
			else
			{
				rtn[member] = obj[member];
			}
		}

		return rtn;	
	}
	else
	{
		return obj;
	}
}