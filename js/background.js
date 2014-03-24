// Manifest reference
var manifest = chrome.runtime.getManifest();

// Execute our content script into the given tab
var contentScripts = manifest.content_scripts[0].js;
function injectScript(tab)
{
	// Insanity check
	if (!tab || !tab.id) {
		console.log("Injecting into invalid tab:", tab);
		return;
	}

	// Loop through content scripts and execute in order
    for (var i = 0, l = contentScripts.length; i < l; ++i) {
        chrome.tabs.executeScript(tab.id, {
            file: contentScripts[i]
        });
    }
}

// Get paste contents from clipboard
function pasteFromClipboard()
{
	var pasteInto = $('<textarea/>')
		.attr('id', 'clipboard')
		.appendTo('body')
		.select();
	var result;
    if (document.execCommand('paste', true)) {
        result = $('#clipboard').val();
    }
	pasteInto.remove();
    return result;
}

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

		case "hidePageAction":
			chrome.pageAction.hide(sender.tab.id);
			break;

		case "getClipboardData":
			sendResponse({ paste:pasteFromClipboard() });
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

// On first install or upgrade, make sure to inject into all tabs
chrome.runtime.onInstalled.addListener(function(details)
{
	console.log("onInstalled: " + details.reason);

	// Action to take depending on reason
	var executeFunction;
	switch (details.reason)
	{
		case "install":
		case "update":
			executeFunction = injectScript;		// Inject content script
			break;
		default: break;
	}

	// Only act on if was fresh install or upgrade
	if (executeFunction)
	{
		// Execute on all open tabs
		chrome.tabs.query({}, function(tabs)
		{
			console.log("Executing on tabs: ", tabs);
			for (var i = 0, l = tabs.length; i < l; ++i) {
				executeFunction(tabs[i]);
			}
		});
	}

	// If upgrade and new version number, notify user with little notification
	if (details.reason == "update" && details.previousVersion != manifest.version)
	{
		chrome.notifications.create("", {
			type: "basic"
			, iconUrl: "images/icon128.png"
			, title: "AutoTextExpander Updated v" + manifest.version
			, message: "Hello hello! Please refresh your tabs to use the latest, and have a great day. :o)"
		}, function(id) {});
	}
});

