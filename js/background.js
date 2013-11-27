
// Listen for whether or not to show the pageAction icon
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
{
	console.log(request);
	console.log(sender);

	switch (request.request)
	{
		case "showPageAction":
			chrome.pageAction.show(sender.tab.id);
			break;

		default:
			console.log("Unknown request received:", request);
			break;
	}
});

// If no shortcuts exist, show options page
chrome.storage.sync.get(null, function(data)
{
	if (chrome.runtime.lastError) {	// Check for errors
		console.log(chrome.runtime.lastError);
	}
	else if (!data || Object.keys(data).length == 0) {
		chrome.tabs.create({url: "options.html"});
	}
});

