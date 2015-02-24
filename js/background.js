// Constants
var MANIFEST = chrome.runtime.getManifest()     // Manifest reference
    , OLD_STORAGE_KEY = 'autoTextExpanderShortcuts'
    , OLD_SHORTCUT_VERSION_KEY = 'v'
    , TEST_OLD_APP_VERSION
;
console.log('Initializing ATE v' + MANIFEST.version);


//////////////////////////////////////////////////////////
// TESTING

// Test shortcut database version mismatch
function testVersionMismatch(completionBlock)
{
    console.log('testVersionMismatch');

    chrome.storage.sync.get(null, function(data) 
    {
	    if (chrome.runtime.lastError) {	// Check for errors
            console.log(chrome.runtime.lastError);
        } 
        else 
        {
            // Set an older shortcut version and store it back
            data[SHORTCUT_VERSION_KEY] = '1.7.0';

            chrome.storage.sync.set(data, function() {
                if (chrome.runtime.lastError) {	// Check for errors
                    console.log(chrome.runtime.lastError);
                } 
                else 
                {
                    console.log('test setup complete');
                    if (completionBlock) {
                        completionBlock();
                    }
                }
            });
        }
    });
}

// Test shortcut database loss
function testDataLoss(completionBlock)
{
    console.log('testDataLoss');

    chrome.storage.sync.clear(function() 
    {
	    if (chrome.runtime.lastError) {	// Check for errors
            console.log(chrome.runtime.lastError);
        } else {
            console.log('test setup complete');
            if (completionBlock) {
                completionBlock();
            }
        }
    });
}

// Test pre-v1.2.0 database migration
function testV120Migration(completionBlock)
{
    console.log('testV120Migration');
    TEST_OLD_APP_VERSION = '1.1.0';

    var shortcuts = {};
    shortcuts[OLD_STORAGE_KEY] = {
        "e@" : "email.me@carlinyuen.com",
        "brb " : "be right back",
        "hbd" : "Just wanted to wish you a very merry happy birthday!",
    };

    chrome.storage.sync.clear(function() 
    {
	    if (chrome.runtime.lastError) {	// Check for errors
            console.log(chrome.runtime.lastError);
        } else {
            chrome.storage.sync.set(shortcuts, function() {
                if (chrome.runtime.lastError) {	// Check for errors
                    console.log(chrome.runtime.lastError);
                } 
                else 
                {
                    console.log('test setup complete');
                    if (completionBlock) {
                        completionBlock();
                    }
                }
            });
        }
    });
}

// Test pre-v1.7.0 database migration
function testV170Migration(completionBlock)
{
    console.log('testV170Migration');
    TEST_OLD_APP_VERSION = '1.6.0';

    var shortcuts = {
        'd8 ' : 'it is %d(MMMM Do YYYY, h:mm:ss a) right now',
        'sig@' : '<strong>. Carlin</strong>\nChrome Extension Developer\nemail.me@carlinyuen.com',
        'hbd' : "Hey! Just wanted to wish you a happy birthday; hope you had a good one!",
        'e@' : 'email.me@carlinyuen.com',
        'brb' : 'be right back',
        'p@' : 'This is your final warning: %clip% ',
    };

    chrome.storage.sync.clear(function() 
    {
	    if (chrome.runtime.lastError) {	// Check for errors
            console.log(chrome.runtime.lastError);
        } else {
            chrome.storage.sync.set(shortcuts, function() {
                if (chrome.runtime.lastError) {	// Check for errors
                    console.log(chrome.runtime.lastError);
                } 
                else 
                {
                    console.log('test setup complete');
                    if (completionBlock) {
                        completionBlock();
                    }
                }
            });
        }
    });
}

// Test v1.7.0 to v1.7.1 database migration
function testV171Migration(completionBlock)
{
    console.log('testV171Migration');
    TEST_OLD_APP_VERSION = '1.7.0';

    var shortcuts = {
        '@d8 ' : 'it is %d(MMMM Do YYYY, h:mm:ss a) right now',
        '@sig@' : '<strong>. Carlin</strong>\nChrome Extension Developer\nemail.me@carlinyuen.com',
        '@hbd' : "Hey! Just wanted to wish you a happy birthday; hope you had a good one!",
        '@e@' : 'email.me@carlinyuen.com',
        '@brb' : 'be right back',
        '@p@' : 'This is your final warning: %clip% ',
        'scto' : 1000,
        'v' : '1.7.0',
    };

    chrome.storage.sync.clear(function() 
    {
	    if (chrome.runtime.lastError) {	// Check for errors
            console.log(chrome.runtime.lastError);
        } else {
            chrome.storage.sync.set(shortcuts, function() {
                if (chrome.runtime.lastError) {	// Check for errors
                    console.log(chrome.runtime.lastError);
                } 
                else 
                {
                    console.log('test setup complete');
                    if (completionBlock) {
                        completionBlock();
                    }
                }
            });
        }
    });
}


//////////////////////////////////////////////////////////
// ACTIONS

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

// On first install or upgrade, make sure to inject into all tabs
chrome.runtime.onInstalled.addListener(function(details)
{
	console.log("onInstalled: " + details.reason);

	// Action to take depending on reason
	var executeFunction;
	switch (details.reason)
	{
		case "install":
			executeFunction = injectScript;		// Inject content script
			break;

		case "update":  // Don't reinject script, sometimes doesn't work and have two copies
		default: 
            break;
	}

	// Only act on if was fresh install
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

// Check synced shortcuts
chrome.storage.sync.get(null, function(data)
{
    console.log('checking shortcuts...');

	if (chrome.runtime.lastError) {	// Check for errors
		console.log(chrome.runtime.lastError);
	} else if (!data || Object.keys(data).length == 0) {
        // If no shortcuts exist, show options page (should show emergency backup restore)
		chrome.tabs.create({url: "options.html"});
	} else if (data[SHORTCUT_VERSION_KEY] && data[SHORTCUT_VERSION_KEY] != MANIFEST.version) {
        // If version is off, try to initiate upgrade
        processVersionUpgrade(data[SHORTCUT_VERSION_KEY]);
    }
});

// Testing
testV170Migration(function() {
    processVersionUpgrade(TEST_OLD_APP_VERSION);
});
//testDataLoss();


//////////////////////////////////////////////////////////
// FUNCTIONS

// Execute our content script into the given tab
function injectScript(tab)
{
	// Insanity check
	if (!tab || !tab.id) {
		console.log("Injecting into invalid tab:", tab);
		return;
	}

	// Loop through content scripts and execute in order
    var contentScripts = MANIFEST.content_scripts[0].js;
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

// Function for anything extra that needs doing related to new version upgrade
function processVersionUpgrade(oldVersion)
{
    console.log('processVersionUpgrade:', oldVersion);

    // Make backup of synced data before proceeding
    makeEmergencyBackup(function() {
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
                upgradeShortcutsToV120([upgradeShortcutsToV170, upgradeShortcutsToLatest]);
                break;

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
                upgradeShortcutsToV170([upgradeShortcutsToLatest]);
                break;

            case '1.7.0':
                upgradeShortcutsToV171([upgradeShortcutsToLatest]);
                break;

            case '1.7.1':
            default:
                upgradeShortcutsToLatest();
        }
    });
}

// Make backup of all saved synced data
function makeEmergencyBackup(completionBlock)
{
    chrome.storage.sync.get(null, function(data)
    {
        if (chrome.runtime.lastError) 	 // Check for errors
        {
            console.log("SERIOUS ERROR: COULD NOT MAKE EMERGENCY BACKUP BEFORE UPGRADE");
            console.log(chrome.runtime.lastError);
        }
        else   // Store backup into emergency local storage
        {
            // Setup backup
            var backup = {};
            backup[APP_EMERGENCY_BACKUP_KEY] = data;
            chrome.storage.local.set(backup, function() {
                if (chrome.runtime.lastError) 	// Check for errors
                {
                    console.log("SERIOUS ERROR: COULD NOT MAKE EMERGENCY BACKUP BEFORE UPGRADE");
                    console.log(chrome.runtime.lastError);
                }
                else 	// Backup success
                {
                    console.log("Emergency backup before migration created.");
                    if (completionBlock) {
                        completionBlock();
                    }
                }
            });
        }
    });
}

// Restore synced data from emergency backup
function restoreEmergencyBackup(completionBlock)
{
    chrome.storage.local.get(APP_EMERGENCY_BACKUP_KEY, function(data)
    {
        if (chrome.runtime.lastError) 	 // Check for errors
        {
            console.log("SERIOUS ERROR: COULD NOT GET EMERGENCY BACKUP");
            console.log(chrome.runtime.lastError);
        }
        else   // Restore backup to synced storage
        {
            chrome.storage.sync.set(data[APP_EMERGENCY_BACKUP_KEY], function() {
                if (chrome.runtime.lastError) 	// Check for errors
                {
                    console.log("SERIOUS ERROR: COULD NOT RESTORE EMERGENCY BACKUP");
                    console.log(chrome.runtime.lastError);
                }
                else 	// Restore success
                {
                    console.log("Emergency backup restored.");
                    if (completionBlock) {
                        completionBlock();
                    }
                }
            });
        }
    });
}

// Migration of shortcuts to v1.2.0 format
function upgradeShortcutsToV120(completionBlocks)
{
    console.log("upgradeShortcutsToV120");

    // If old database still exists, port old shortcuts over to new shortcut syntax
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
            $.each(oldDataStore, function(key, value) 
            {
                console.log('migrating:', key, '=>', value);
                newDataStore[key] = value;
            });

            // Delete old data, add new data
            chrome.storage.sync.remove(OLD_STORAGE_KEY, function() 
            {
                if (chrome.runtime.lastError) 	// Check for errors
                {
                    console.log(chrome.runtime.lastError);
                    restoreEmergencyBackup();
                } 
                else {
                    chrome.storage.sync.set(newDataStore, function() 
                    {
                        if (chrome.runtime.lastError) 	// Check for errors
                        {
                            console.log(chrome.runtime.lastError);
                            restoreEmergencyBackup();
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

                            // Call first completion block, and pass the rest on
                            if (completionBlocks && completionBlocks.length)
                            {
                                var block = completionBlocks.shift();
                                block(completionBlocks);
                            }
                        }
                    });
                }
            });
        }
        else    // Call first completion block, and pass the rest on
        {
            if (completionBlocks && completionBlocks.length)
            {
                var block = completionBlocks.shift();
                block(completionBlocks);
            }
        }
    });
}

// Migration of shortcuts to v1.7.0 format
function upgradeShortcutsToV170(completionBlocks)
{
    console.log("upgradeShortcutsToV170");

    // Add shortcut prefix to shortcuts -- we assume that shortcuts are in 
    //  post-v1.2.0 format and they haven't been upgraded / prefixed yet
    chrome.storage.sync.get(null, function(data)
    {
        if (chrome.runtime.lastError) {	// Check for errors
            console.log(chrome.runtime.lastError);
        }
            
        // Loop through and apply prefix to all keys
        var newDataStore = {};
        $.each(data, function(key, value) 
        {
            console.log('prefixing:', key, 'to', SHORTCUT_PREFIX + key);
            newDataStore[SHORTCUT_PREFIX + key] = value;
        });

        // Add metadata for shortcut version (using new key actually)
        newDataStore[SHORTCUT_VERSION_KEY] = '1.7.0';

        // Delete old data, replace with new data
        chrome.storage.sync.clear(function() {
            if (chrome.runtime.lastError) { 	// Check for errors
                console.log(chrome.runtime.lastError);
            } else {
                chrome.storage.sync.set(newDataStore, function() {
                    if (chrome.runtime.lastError) 	// Check for errors
                    {
                        console.log(chrome.runtime.lastError);
                        restoreEmergencyBackup();
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

                        // Call first completion block, and pass the rest on
                        if (completionBlocks && completionBlocks.length)
                        {
                            var block = completionBlocks.shift();
                            block(completionBlocks);
                        }
                    }
                });
            }
        });
    });

}

// Moves version shortcut to new format to avoid accientally tripping it
function upgradeShortcutsToV171(completionBlocks)
{
    console.log("upgradeShortcutsToLatest");

    // Upgrade shortcut database version
    chrome.storage.sync.get(null, function(data)
    {
        if (chrome.runtime.lastError) {	// Check for errors
            console.log(chrome.runtime.lastError);
        }
        else if (!$.isEmptyObject(data)) // Check that data is returned
        {
            console.log("updating database version to", MANIFEST.version);

            // Update metadata for shortcut version to manifest version
            delete data[OLD_SHORTCUT_VERSION_KEY];
            data[SHORTCUT_VERSION_KEY] = MANIFEST.version;

            // Delete old data, replace with new data
            chrome.storage.sync.clear(function() {
                if (chrome.runtime.lastError) { 	// Check for errors
                    console.log(chrome.runtime.lastError);
                } else {
                    chrome.storage.sync.set(data, function() {
                        if (chrome.runtime.lastError) 	// Check for errors
                        {
                            console.log(chrome.runtime.lastError);
                            restoreEmergencyBackup();
                        }
                        else	// Done with migration
                        {
                            // Call first completion block, and pass the rest on
                            if (completionBlocks && completionBlocks.length)
                            {
                                var block = completionBlocks.shift();
                                block(completionBlocks);
                            }
                        }
                    });
                }
            });
        }
    });
}


// Updates the shortcut database with the latest version number
function upgradeShortcutsToLatest(completionBlocks)
{
    console.log("upgradeShortcutsToLatest");

    // Upgrade shortcut database version
    chrome.storage.sync.get(null, function(data)
    {
        if (chrome.runtime.lastError) {	// Check for errors
            console.log(chrome.runtime.lastError);
        }
        else if (!$.isEmptyObject(data)) // Check that data is returned
        {
            console.log("updating database version to", MANIFEST.version);

            // Update metadata for shortcut version to manifest version
            data[SHORTCUT_VERSION_KEY] = MANIFEST.version;

            // Delete old data, replace with new data
            chrome.storage.sync.clear(function() {
                if (chrome.runtime.lastError) { 	// Check for errors
                    console.log(chrome.runtime.lastError);
                } else {
                    chrome.storage.sync.set(data, function() {
                        if (chrome.runtime.lastError) 	// Check for errors
                        {
                            console.log(chrome.runtime.lastError);
                            restoreEmergencyBackup();
                        }
                        else	// Done with migration
                        {
                            console.log("upgrade complete!");

                            // Fire off notification about upgrade
                            chrome.notifications.create("", {
                                type: "basic"
                                , iconUrl: "images/icon128.png"
                                , title: "AutoTextExpander Updated v" + MANIFEST.version
                                , message: "Hello hello! Please refresh your tabs to use the latest, and have a great day. :o)"
                            }, function(id) {});

                            // Call first completion block, and pass the rest on
                            if (completionBlocks && completionBlocks.length)
                            {
                                var block = completionBlocks.shift();
                                block(completionBlocks);
                            }
                        }
                    });
                }
            });
        }
    });
}


