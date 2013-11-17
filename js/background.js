
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

// If old database still exists, port old shortcuts over to new shortcut syntax
var OLD_STORAGE_KEY = 'autoTextExpanderShortcuts';
chrome.storage.sync.get(OLD_STORAGE_KEY, function(data)
{
	if (chrome.runtime.lastError) {	// Check for errors
		console.log(chrome.runtime.lastError);
	}
	else if (data && data[OLD_STORAGE_KEY])
	{
		// Loop through and them to object to store
		var newDataStore = {};
		var oldDataStore = data[OLD_STORAGE_KEY];
		for (var key in oldDataStore) {
			newDataStore[key] = oldDataStore[key];
		}

		// Delete old data, add new data
		chrome.storage.sync.remove(OLD_STORAGE_KEY, function() {
			if (chrome.runtime.lastError) {	// Check for errors
				console.log(chrome.runtime.lastError);
			} else {
				chrome.storage.sync.set(newDataStore, function() {
					if (chrome.runtime.lastError) {	// Check for errors
						console.log(chrome.runtime.lastError);
					}
					else	// Done with porting
					{
						// Send notification
						chrome.notifications.create("", {
							type: "basic"
							, iconUrl: "images/icon128.png"
							, title: "Database Update"
							, message: "Your shortcuts have been ported to a new storage system for better reliability and larger text capacity! Please check that your shortcuts and expansions are correct."
						}, function(id) {});

					}
				});
			}
		});
	}
	// Open up options page
	chrome.tabs.create({url: "options.html"});
});

