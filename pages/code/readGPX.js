var map;

function readGPXFile(evt)
{
	var dataArray = [];
	var files = evt.target.files;

	if(files.length > 1)
	{
		return;
	}

	var reader = new FileReader();

	reader.onload = function(e)
	{
		if(e)
		{
			//var results = $.xml2json(e.target.result);
			document.getElementById("gpxInput").submit();
		}
		else
		{
			//Display Error!
			console.log('Trouble reading file!');
		}
	}

	reader.readAsText(files[0]);
}