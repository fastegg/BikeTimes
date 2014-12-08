function readGPXFile(var fileContents)
{
	var output = $.xml2json(fileContents);

	return output;
}