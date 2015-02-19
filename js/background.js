// Constants
var MANIFEST = chrome.runtime.getManifest()     // Manifest reference
    , APP_ID_PRODUCTION = 'iibninhmiggehlcdolcilmhacighjamp'
    , DEBUG = (chrome.i18n.getMessage('@@extension_id') !== APP_ID_PRODUCTION)
;

// Execute our content script into the given tab
var contentScripts = MANIFEST.content_scripts[0].js;
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

// Opens or focuses on the options page if open
function openOrFocusOptionsPage()
{
    // Get the url for the extension options page
    var optionsUrl = chrome.extension.getURL('options.html'); 
    chrome.tabs.query({ 'url': optionsUrl }, function(tabs) 
    {
        if (tabs.length)    // If options tab is already open, focus on it
        {
            console.log("options page found:", tabs[0].id);
            chrome.tabs.update(tabs[0].id, {"selected": true});
        } 
        else {  // Open the options page otherwise
            chrome.tabs.create({url: optionsUrl});
        }
    });
}

// Listen for whether or not to show the pageAction icon
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
{
	console.log(request);
	console.log(sender);

	switch (request.request)
	{
		case "showPageAction":  // No longer needed
			chrome.pageAction.show(sender.tab.id);
			break;

		case "hidePageAction":  // No longer needed
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

	// If upgrade and new version number, process upgrade
	if (details.reason == "update" && details.previousVersion != MANIFEST.version) {
        processVersionUpgrade(details.previousVersion);
	}
});

// Show options page when browser action is clicked
//  Source: http://adamfeuer.com/notes/2013/01/26/chrome-extension-making-browser-action-icon-open-options-page/
chrome.browserAction.onClicked.addListener(function(tab) {
   openOrFocusOptionsPage();
});

// Function for anything extra that needs doing related to new version upgrade
function processVersionUpgrade(oldVersion)
{
    console.log('processVersionUpgrade:', oldVersion);

    switch (oldVersion)
    {
        case '1.1.6':
        case '1.1.5':
        case '1.1.4':
        case '1.1.3':
        case '1.1.2':
        case '1.1.1':
        case '1.1.0':
        case '1.0.9':
        case '1.0.8':
        case '1.0.6':
        case '1.0.5':
        case '1.0.3':
        case '1.0.0':
            upgradeShortcutsToV120();

        case '1.6.1':
        case '1.6.0':
        case '1.5.1':
        case '1.5.0':
        case '1.4.0':
        case '1.3.5':
        case '1.3.2':
        case '1.3.1':
        case '1.3.0':
        case '1.2.6':
        case '1.2.5':
        case '1.2.2':
        case '1.2.0':
            upgradeShortcutsToV170();

        case '1.7.0':
        default:
            upgradeShortcutsToLatest();
    }
}

// Migration of shortcuts to v1.2.0 format
function upgradeShortcutsToV120()
{
    console.log("upgradeShortcutsToV120");

    // If old database still exists, port old shortcuts over to new shortcut syntax
    var OLD_STORAGE_KEY = 'autoTextExpanderShortcuts';
    chrome.storage.sync.get(OLD_STORAGE_KEY, function(data)
    {
        if (chrome.runtime.lastError) {	// Check for errors
            console.log(chrome.runtime.lastError);
        }
        else if (data && data[OLD_STORAGE_KEY])
        {
            // Loop through and move them to object to store
            var newDataStore = {};
            var oldDataStore = data[OLD_STORAGE_KEY];
            $.each(oldDataStore, function(key, value) {
                newDataStore[key] = value;
            });

            // Delete old data, add new data
            chrome.storage.sync.remove(OLD_STORAGE_KEY, function() 
            {
                if (chrome.runtime.lastError) {	// Check for errors
                    console.log(chrome.runtime.lastError);
                } else {
                    chrome.storage.sync.set(newDataStore, function() 
                    {
                        if (chrome.runtime.lastError) {	// Check for errors
                            console.log(chrome.runtime.lastError);
                        }
                        else	// Done with porting
                        {
                            // Send notification
                            chrome.notifications.create("", {
                                type: "basic"
                                , iconUrl: "images/icon128.png"
                                , title: "Database Update v1.2.0"
                                , message: "Your shortcuts have been ported to a new storage system for better reliability and larger text capacity! Please check that your shortcuts and expansions are correct."
                            }, function(id) {});

                            // Open up options page
                            chrome.tabs.create({url: "options.html"});
                        }
                    });
                }
            });
        }
    });
}

// Migration of shortcuts to v1.7.0 format
function upgradeShortcutsToV170()
{
    console.log("upgradeShortcutsToV170");

    // Add shortcut prefix to shortcuts -- we assume that shortcuts are in 
    //  post-v1.2.0 format and they haven't been upgraded / prefixed yet
    var SHORTCUT_PREFIX = '@'
        , SHORTCUT_VERSION_KEY = 'v'
    ;
    chrome.storage.sync.get(null, function(data)
    {
        if (chrome.runtime.lastError) {	// Check for errors
            console.log(chrome.runtime.lastError);
        }
        else if (!$.isEmptyObject(data)) // Check that data is returned
        {
            // Loop through and apply prefix to all keys
            var newDataStore = {};
            $.each(data, function(key, value) {
                newDataStore[SHORTCUT_PREFIX + key] = value;
            });

            // Add metadata for shortcut version
            newDataStore[SHORTCUT_VERSION_KEY] = '1.7.0';

            // Delete old data, replace with new data
            chrome.storage.sync.clear(function() {
                if (chrome.runtime.lastError) {	// Check for errors
                    console.log(chrome.runtime.lastError);
                } else {
                    chrome.storage.sync.set(newDataStore, function() {
                        if (chrome.runtime.lastError) {	// Check for errors
                            console.log(chrome.runtime.lastError);
                        }
                        else	// Done with migration
                        {
                            // Send notification
                            chrome.notifications.create("", {
                                type: "basic"
                                , iconUrl: "images/icon128.png"
                                , title: "Database Update v1.7.0"
                                , message: "Your shortcuts have been migrated to a new storage format! Please check that your shortcuts and expansions are correct."
                            }, function(id) {});

                            // Open up options page
                            chrome.tabs.create({url: "options.html"});
                        }
                    });
                }
            });
        }
    });

}

// Updates the shortcut database with the latest version number
function upgradeShortcutsToLatest()
{
    chrome.storage.sync.get(null, function(data)
    {
        if (chrome.runtime.lastError) {	// Check for errors
            console.log(chrome.runtime.lastError);
        }
        else if (!$.isEmptyObject(data)) // Check that data is returned
        {
            // Update metadata for shortcut version to manifest version
            data[SHORTCUT_VERSION_KEY] = MANIFEST.version;

            // Delete old data, replace with new data
            chrome.storage.sync.clear(function() {
                if (chrome.runtime.lastError) {	// Check for errors
                    console.log(chrome.runtime.lastError);
                } else {
                    chrome.storage.sync.set(data, function() {
                        if (chrome.runtime.lastError) {	// Check for errors
                            console.log(chrome.runtime.lastError);
                        }
                        else	// Done with migration
                        {
                            // Fire off notification about upgrade
                            chrome.notifications.create("", {
                                type: "basic"
                                , iconUrl: "images/icon128.png"
                                , title: "AutoTextExpander Updated v" + MANIFEST.version
                                , message: "Hello hello! Please refresh your tabs to use the latest, and have a great day. :o)"
                            }, function(id) {});
                        }
                    });
                }
            });
        }
    });


}
