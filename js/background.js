// Constants & variables
var MANIFEST = chrome.runtime.getManifest()     // Manifest reference
    , OLD_STORAGE_KEY = 'autoTextExpanderShortcuts' // For shortcut DB migration
    , OLD_SHORTCUT_VERSION_KEY = 'v'            // For shortcut DB migration
    , TEST_OLD_APP_VERSION                      // For testing upgrades from older versions
    , shortcutCache = {}                        // Cache for shortcuts
;
console.log('Initializing ATE v' + MANIFEST.version, chrome.i18n.getMessage('@@ui_locale'));

// Custom log function
function debugLog() {
    if (DEBUG && console) {
        console.log.apply(console, arguments);
    }
}


//////////////////////////////////////////////////////////
// ACTIONS

// Listen for whether or not to show the pageAction icon
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
{
	debugLog(request);
	debugLog(sender);

	switch (request.request)
	{
		case "getClipboardData":
			sendResponse({ paste:pasteFromClipboard() });
			break;

		default:
			console.log("Unknown request received:", request);
			break;
	}
});

// Omnibox default first suggestion (instructions)
chrome.omnibox.setDefaultSuggestion({
    description: '<dim>Search shortcuts for:</dim> <match>%s</match>'
});

// On activation in omnibox
chrome.omnibox.onInputStarted.addListener(function ()
{
    debugLog('Omnibox onInputStarted()');

    // Get and cache latest shortcuts for performance
    chrome.storage.sync.get(null, function(data)
    {
        debugLog('caching shortcuts...');

        if (chrome.runtime.lastError) {	// Check for errors
            console.log(chrome.runtime.lastError);
        } else {
            shortcutCache = data;
        }
    });
});

// On omnibox input changed (user typing)
chrome.omnibox.onInputChanged.addListener(function (text, suggest)
{
    debugLog('Omnibox onInputChanged:', text);

    // Use text to check shortcuts for expansions
    var expansion = shortcutCache[SHORTCUT_PREFIX + text];

    // If exists, surface expansion as suggestion
    if (expansion && expansion.length)
    {
        var suggestions = [];

        // Process expansion
        var description = '<match>' + text + '</match>'
            + '<dim> &#8594; ' + expansion.split('"').join('&quot;')
                .split("'").join('&apos;')
                .split('<').join('&lt;')
                .split('>').join('&gt;')
                .split('&').join('&amp;')
            + '</dim>';
        suggestions.push({
            content: expansion,
            description: description,
        });

        // Send suggestions to callback
        suggest(suggestions);
    }
});

// On omnibox suggestion accepted
chrome.omnibox.onInputEntered.addListener(function (text, disposition)
{
    debugLog('Omnibox onInputEntered:', text, disposition);

    // If the entered text is a shortcut, expand it and jump
    var expansion = shortcutCache[SHORTCUT_PREFIX + text];

    // If exists, update text with expansion instead
    if (expansion && expansion.length) {
        text = expansion;
    }

    // Check text for URL format prefix, otherwise add it
    if (text.indexOf('http') != 0) {
        text = 'http://' + text;
    }
    debugLog('url:', text);

    // Update / open tab according to disposition
    switch (disposition)
    {
        default:    // Default to updating current tab
        case "currentTab":
            chrome.tabs.update({url: text});
            break;

        case "newForegroundTab":
            chrome.tabs.create({url: text});
            break;

        case "newBackgroundTab":
            chrome.tabs.create({url: text, active: false});
            break;
    }
});

// On first install or upgrade, make sure to inject into all tabs
chrome.runtime.onInstalled.addListener(function(details)
{
	console.log("onInstalled: " + details.reason);

    // On first install
	if (details.reason == "install")
    {
        // Open up options page
        chrome.tabs.create({url: "options.html"});

	    // Inject script into all open tabs
		chrome.tabs.query({}, function(tabs)
		{
			debugLog("Executing on tabs: ", tabs);
			for (var i = 0, l = tabs.length; i < l; ++i) {
				injectScript(tabs[i]);
			}
		});
	}

	// If upgrading to new version number
    else if (details.reason == "update" && details.previousVersion != MANIFEST.version) {
        processVersionUpgrade(details.previousVersion);
	}

    else    // All other - reloaded extension
    {
        // Run testing if need be
        //runTests();

        // Check synced shortcuts in case of need to update, show options, etc.
        chrome.storage.sync.get(null, function(data)
        {
            debugLog('checking shortcuts...');

            if (chrome.runtime.lastError) {	// Check for errors
                console.log(chrome.runtime.lastError);
            } else if (!data || Object.keys(data).length == 0) {
                // If no shortcuts exist, show options page (should show emergency backup restore)
                chrome.tabs.create({url: "options.html"});
            } else if (data[SHORTCUT_VERSION_KEY]
                    && data[SHORTCUT_VERSION_KEY] != MANIFEST.version) {
                // If version is off, try to initiate upgrade
                processVersionUpgrade(data[SHORTCUT_VERSION_KEY]);
            }
        });

        // Run testing if need be
        //runTests();
    }
});

// If upgrade notification was clicked
chrome.notifications.onClicked.addListener(function (notificationID)
{
    // Show options page
    openOrFocusOptionsPage('#tipsLink');
});

// Show options page when browser action is clicked
//  Source: http://adamfeuer.com/notes/2013/01/26/chrome-extension-making-browser-action-icon-open-options-page/
chrome.browserAction.onClicked.addListener(function(tab) {
    openOrFocusOptionsPage();
});


//////////////////////////////////////////////////////////
// TESTING

function runTests()
{
    /*
    testVersionMismatch(function() {
        // Do nothing
    });
    // */
    /*
    testV170Migration(function() {
        processVersionUpgrade(TEST_OLD_APP_VERSION);
    });
    // */
    /*
    testDataLoss(function() {
        // Do nothing
    });
    // */
}

// Test shortcut database version mismatch
function testVersionMismatch(completionBlock)
{
    debugLog('testVersionMismatch');

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
                    debugLog('test setup complete');
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
    debugLog('testDataLoss');

    chrome.storage.sync.clear(function()
    {
	    if (chrome.runtime.lastError) {	// Check for errors
            console.log(chrome.runtime.lastError);
        } else {
            chrome.storage.local.remove([APP_BACKUP_KEY, APP_BACKUP_TIMESTAMP_KEY], function()
            {
                if (chrome.runtime.lastError) {	// Check for errors
                    console.log(chrome.runtime.lastError);
                } else {
                    debugLog('test setup complete');
                    if (completionBlock) {
                        completionBlock();
                    }
                }
            });
        }
    });
}

// Test pre-v1.2.0 database migration
function testV120Migration(completionBlock)
{
    debugLog('testV120Migration');
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
                    debugLog('test setup complete');
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
    debugLog('testV170Migration');
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
                    debugLog('test setup complete');
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
    debugLog('testV171Migration');
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
                    debugLog('test setup complete');
                    if (completionBlock) {
                        completionBlock();
                    }
                }
            });
        }
    });
}


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
    // Create element to paste content into
	document.querySelector('body').innerHTML += '<textarea id="clipboard"></textarea>';
	var clipboard = document.getElementById('clipboard');
    clipboard.select();

    // Execute paste
	var result;
    if (document.execCommand('paste', true)) {
        result = clipboard.value;
    }

    // Cleanup and return value
	clipboard.parentNode.removeChild(clipboard);
    return result;
}

// Opens or focuses on the options page if open
function openOrFocusOptionsPage(params)
{
    // Check params is valid string
    if (!params) {
        params = "";
    }

    // Get the url for the extension options page
    var optionsUrl = chrome.extension.getURL('options.html');
    chrome.tabs.query({ 'url': optionsUrl }, function(tabs)
    {
        if (tabs.length)    // If options tab is already open, focus on it
        {
            debugLog("options page found:", tabs[0].id);
            chrome.tabs.update(tabs[0].id, {
                selected: true,
                url: optionsUrl + params,
            });
        }
        else {  // Open the options page otherwise
            chrome.tabs.create({url: optionsUrl + params});
        }
    });
}

// Function for anything extra that needs doing related to new version upgrade
function processVersionUpgrade(oldVersion)
{
    debugLog('processVersionUpgrade:', oldVersion);

    // Make backup of synced data before proceeding
    makeEmergencyBackup(function()
    {
        var upgradeNotes = [];   // Upgrade version notes

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
                upgradeShortcutsToV120([
                    upgradeShortcutsToV170,
                    upgradeShortcutsToV171,
                    upgradeShortcutsToLatest
                ]);
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
                upgradeShortcutsToV170([
                    upgradeShortcutsToV171,
                    upgradeShortcutsToLatest
                ]);
                break;

            case '1.7.0':
                upgradeShortcutsToV171([
                    upgradeShortcutsToLatest
                ]);
                break;

            case '1.8.0':
                upgradeNotes.push({ title:"-", message:"Added support for Google Inbox" });
                upgradeNotes.push({ title:"-", message:"Added support for Google Translate" });
                upgradeNotes.push({ title:"-", message:"Added support for MailChimp" });
                upgradeNotes.push({ title:"-", message:"Added support for Confluence" });

            case '1.8.1':
                upgradeNotes.push({ title:"-", message:"Fix for Salesforce support" });
                upgradeNotes.push({ title:"-", message:"Add new Textarea for demoing" });
                upgradeNotes.push({ title:"-", message:"Slight optimizations" });

            case '1.8.2':
            case '1.8.3':
                upgradeNotes.push({ title:"-", message:"Change sync error popups to banners" });
                upgradeNotes.push({ title:"-", message:"Fix handling of trailing spaces" });
                upgradeNotes.push({ title:"-", message:"Add auto-capitalization/-all-caps" });
                upgradeNotes.push({ title:"-", message:"Updating banners to be dismissable" });

            case '1.8.4':
                upgradeNotes.push({ title:"-", message:"Fix Inbox support" });
                upgradeNotes.push({ title:"-", message:"Raise shortcut detection limit to 10s" });
                upgradeNotes.push({ title:"-", message:"Fix for @ shortcut prefix issue" });

            case '1.8.5':
                upgradeNotes.push({ title:"-", message:"Add omnibox (url bar!) support" });
                upgradeNotes.push({ title:"-", message:"Allow consecutive shortcuts to fire" });
                upgradeNotes.push({ title:"-", message:"Add support for O365 OWA" });
                upgradeNotes.push({ title:"-", message:"Add support for G+ communities" });

            case '1.9.0':
                upgradeNotes.push({ title:"-", message:"Fix for O365 OWA" });

            case '1.9.1':
                upgradeNotes.push({ title:"-", message:"Fix for Zendesk Inbox" });

            case '1.9.2':
                upgradeNotes.push({ title:"-", message:"Fix for Zendesk.com" });

            case '1.9.3':
                upgradeNotes.push({ title:"-", message:"Support for Salesforce.com CKEditor" });

            // case '1.9.4':
            //     upgradeNotes.push({ title:"-", message:"Support for domain blacklist" });
            //     upgradeNotes.push({ title:"-", message:"Better iframe handling" });
            //     upgradeNotes.push({ title:"-", message:"Toggle on/off from icon" });
            //     upgradeNotes.push({ title:"-", message:"Working indicator" });

                // Upgrade database to latest version and supply version notes
                upgradeShortcutsToLatest(upgradeNotes);
                break;

            default: break;
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
                    debugLog("Emergency backup before migration created.");
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
                    debugLog("Emergency backup restored.");
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
            for (var key in oldDataStore) {
                if (oldDataStore.hasOwnProperty(key)) {
                    var value = oldDataStore[key];
                    debugLog('migrating:', key, '=>', value);
                    newDataStore[key] = value;
                }
            }

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
                                , isClickable: true
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
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                debugLog('prefixing:', key, 'to', SHORTCUT_PREFIX + key);
                newDataStore[SHORTCUT_PREFIX + key] = data[key];
            }
        }

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
                            , isClickable: true
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
    console.log("upgradeShortcutsToV171");

    // Upgrade shortcut database version
    chrome.storage.sync.get(null, function(data)
    {
        if (chrome.runtime.lastError) {	// Check for errors
            console.log(chrome.runtime.lastError);
        }
        else if (data && Object.keys(data).length) // Check that data is returned
        {
            debugLog("updating database version to", MANIFEST.version);

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


// Updates the shortcut database with the latest version number, and support an optional message
function upgradeShortcutsToLatest(upgradeNotesList)
{
    console.log("upgradeShortcutsToLatest:", upgradeNotesList);

    // Upgrade shortcut database version
    chrome.storage.sync.get(null, function(data)
    {
        if (chrome.runtime.lastError) {	// Check for errors
            console.log(chrome.runtime.lastError);
        }
        else if (data && Object.keys(data).length) // Check that data is returned
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
                            debugLog("upgrade complete!");

                            // Add upgrade message
                            upgradeNotesList.unshift({
                                title: "Please reload tabs, have a great day!",
                                message: ""
                            });

                            // Fire off notification about upgrade
                            chrome.notifications.create("", {
                                type: "list"
                                , iconUrl: "images/icon128.png"
                                , title: "AutoTextExpander Updated v" + MANIFEST.version
                                , message: "Hello! Please refresh your tabs to use the latest, and have a great day. :o)"
                                , items: upgradeNotesList
                                , isClickable: true
                            }, function(id) {});
                        }
                    });
                }
            });
        }
    });
}
