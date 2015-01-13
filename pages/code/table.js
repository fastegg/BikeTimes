var highLights = {};

function unhighlightRow(tableName)
{
	var index = highLights[tableName];

	console.log('Unhighlight!', index);

	if(index !== undefined && index > -1)
	{
		console.log('Remove class index ' + index);
		var table = $('#' + tableName);

		if(table)
		{
			console.log('Remove Class... Table');
			var row = table[0].rows[index];

			if(row)
			{
				console.log('RemoveClass!');
				highLights[tableName] = index;
				$(row).removeClass('active');

				var toHide = $(row).find('.hideWhenUnactive');

				console.log('Hide:', toHide);

				$(toHide).addClass('hidden');

				for(var elem in toHide)
				{
					
				}
			}
		}
	}

	highLights[tableName] = -1;
}

function highlightRow(tableName, index)
{
	unhighlightRow(tableName);

	var table = $('#' + tableName);

	if(table)
	{
		var row = table[0].rows[index];

		if(row)
		{
			highLights[tableName] = index;
			$(row).addClass('active');

			highLights[tableName] = index;

			var toHide = $(row).find('.hideWhenUnactive');

			console.log('Unhide:', toHide);

			$(toHide).removeClass('hidden');

			for(var elem in toHide)
			{
				
			}
		}
	}
}