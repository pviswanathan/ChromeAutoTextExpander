'use strict';

// Constants & variables
const MANIFEST = chrome.runtime.getManifest()     // Manifest reference
  , OLD_STORAGE_KEY = 'autoTextExpanderShortcuts' // For shortcut DB migration
  , OLD_SHORTCUT_VERSION_KEY = 'v'            // For shortcut DB migration
;
var oldAppVersion;                // For testing upgrades from older versions
console.log('Initializing ATE v' + MANIFEST.version, chrome.i18n.getMessage('@@ui_locale'));


//////////////////////////////////////////////////////////
// ACTIONS

// On first install or upgrade, make sure to inject into all tabs
chrome.runtime.onInstalled.addListener(function(details)
{
  console.log('onInstalled: ' + details.reason);

  // If first time install
  if (details.reason == 'install')
  {
    chrome.runtime.openOptionsPage(); // Open options page -- since Chrome 40
    chrome.tabs.query({}, function(tabs) { // Inject script into all open tabs
      for (var i = 0, l = tabs.length; i < l; ++i) {
        injectScript(tabs[i]);
      }
    });
  }
  // If upgrading to new version number
  else if (details.reason == 'update'
    && details.previousVersion != MANIFEST.version) {
    processVersionUpgrade(details.previousVersion);
  }
  // All other - probably reloaded extension
  else {
    checkShortcutsDatabase();
  }
});

// If upgrade notification was clicked
chrome.notifications.onClicked.addListener(function (notificationID) {
  chrome.runtime.openOptionsPage();   // Bring to options page
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
    processVersionUpgrade(oldAppVersion);
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
  console.log('testVersionMismatch');

  chrome.storage.sync.get(null, function(data)
  {
    if (chrome.runtime.lastError) {	// Check for errors
      console.error(chrome.runtime.lastError);
    }
    else
    {
      // Set an older shortcut version and store it back
      data[SHORTCUT_VERSION_KEY] = '1.7.0';

      chrome.storage.sync.set(data, function() {
        if (chrome.runtime.lastError) {	// Check for errors
          console.error(chrome.runtime.lastError);
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
      console.error(chrome.runtime.lastError);
    } else {
      chrome.storage.local.remove([APP_BACKUP_KEY, APP_BACKUP_TIMESTAMP_KEY], function()
      {
        if (chrome.runtime.lastError) {	// Check for errors
          console.error(chrome.runtime.lastError);
        } else {
          console.log('test setup complete');
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
  console.log('testV120Migration');
  oldAppVersion = '1.1.0';

  var shortcuts = {};
  shortcuts[OLD_STORAGE_KEY] = {
    'e@' : 'email.me@carlinyuen.com',
    'brb ' : 'be right back',
    'hbd' : 'Just wanted to wish you a very merry happy birthday!',
  };

  chrome.storage.sync.clear(function()
  {
    if (chrome.runtime.lastError) {	// Check for errors
      console.error(chrome.runtime.lastError);
    } else {
      chrome.storage.sync.set(shortcuts, function() {
        if (chrome.runtime.lastError) {	// Check for errors
          console.error(chrome.runtime.lastError);
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
  oldAppVersion = '1.6.0';

  var shortcuts = {
    'd8 ' : 'it is %d(MMMM Do YYYY, h:mm:ss a) right now',
    'sig@' : '<strong>. Carlin</strong>\nChrome Extension Developer\nemail.me@carlinyuen.com',
    'hbd' : 'Hey! Just wanted to wish you a happy birthday; hope you had a good one!',
    'e@' : 'email.me@carlinyuen.com',
    'brb' : 'be right back',
    'p@' : 'This is your final warning: %clip% ',
  };

  chrome.storage.sync.clear(function()
  {
    if (chrome.runtime.lastError) {	// Check for errors
      console.error(chrome.runtime.lastError);
    } else {
      chrome.storage.sync.set(shortcuts, function() {
        if (chrome.runtime.lastError) {	// Check for errors
          console.error(chrome.runtime.lastError);
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
  oldAppVersion = '1.7.0';

  var shortcuts = {
    '@d8 ' : 'it is %d(MMMM Do YYYY, h:mm:ss a) right now',
    '@sig@' : '<strong>. Carlin</strong>\nChrome Extension Developer\nemail.me@carlinyuen.com',
    '@hbd' : 'Hey! Just wanted to wish you a happy birthday; hope you had a good one!',
    '@e@' : 'email.me@carlinyuen.com',
    '@brb' : 'be right back',
    '@p@' : 'This is your final warning: %clip% ',
    'scto' : 1000,
    'v' : '1.7.0',
  };

  chrome.storage.sync.clear(function()
  {
    if (chrome.runtime.lastError) {	// Check for errors
      console.error(chrome.runtime.lastError);
    } else {
      chrome.storage.sync.set(shortcuts, function() {
        if (chrome.runtime.lastError) {	// Check for errors
          console.error(chrome.runtime.lastError);
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
// FUNCTIONS

// Execute our content script into the given tab
function injectScript(tab)
{
  // Insanity check
  if (!tab || !tab.id) {
    console.log('Injecting into invalid tab:', tab);
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

// Check shortcuts database
function checkShortcutsDatabase()
{
  //runTests();

  // Check synced shortcuts in case of need to update, show options, etc.
  chrome.storage.sync.get(null, function(data)
  {
    console.log('checking shortcuts...');

    if (chrome.runtime.lastError) {	// Check for errors
      console.error(chrome.runtime.lastError);
    } else if (!data || Object.keys(data).length == 0) {
      // If no shortcuts exist, show options page (should show emergency backup restore)
      chrome.runtime.openOptionsPage();
    } else if (data[SHORTCUT_VERSION_KEY]
      && data[SHORTCUT_VERSION_KEY] != MANIFEST.version) {
      // If version is off, try to initiate upgrade
      processVersionUpgrade(data[SHORTCUT_VERSION_KEY]);
    }
  });

  //runTests();
}

// Function for anything extra that needs doing related to new version upgrade
function processVersionUpgrade(oldVersion)
{
  console.log('processVersionUpgrade:', oldVersion);

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
        upgradeNotes.push({ title:'-', message:'New database storage format' });
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
        upgradeNotes.push({title:'-', message:'New database storage format'});
      case '1.7.0':
        upgradeNotes.push({title:'-', message:'New database storage format'});
      case '1.8.0':
        upgradeNotes.push({title:'-', message:'Added support for Google Inbox'});
        upgradeNotes.push({title:'-', message:'Added support for Google Translate'});
        upgradeNotes.push({title:'-', message:'Added support for MailChimp'});
        upgradeNotes.push({title:'-', message:'Added support for Confluence'});
      case '1.8.1':
        upgradeNotes.push({title:'-', message:'Fix for Salesforce support'});
        upgradeNotes.push({title:'-', message:'Add new Textarea for demoing'});
        upgradeNotes.push({title:'-', message:'Slight optimizations'});
      case '1.8.2':
      case '1.8.3':
        upgradeNotes.push({title:'-', message:'Change sync error popups to banners'});
        upgradeNotes.push({title:'-', message:'Fix handling of trailing spaces'});
        upgradeNotes.push({title:'-', message:'Add auto-capitalization/-all-caps'});
        upgradeNotes.push({title:'-', message:'Updating banners to be dismissable'});
      case '1.8.4':
        upgradeNotes.push({title:'-', message:'Fix Inbox support'});
        upgradeNotes.push({title:'-', message:'Raise shortcut detection limit to 10s'});
        upgradeNotes.push({title:'-', message:'Fix for @ shortcut prefix issue'});
      case '1.8.5':
        upgradeNotes.push({title:'-', message:'Add omnibox (url bar!) support'});
        upgradeNotes.push({title:'-', message:'Allow consecutive shortcuts to fire'});
        upgradeNotes.push({title:'-', message:'Add support for O365 OWA'});
        upgradeNotes.push({title:'-', message:'Add support for G+ communities'});
      case '1.9.0':
        upgradeNotes.push({title:'-', message:'Fix for O365 OWA'});
      case '1.9.1':
        upgradeNotes.push({title:'-', message:'Fix for Zendesk Inbox'});
      case '1.9.2':
        upgradeNotes.push({title:'-', message:'Fix for Zendesk.com'});
      case '1.9.3':
        upgradeNotes.push({title:'-', message:'Support for Salesforce.com CKEditor'});
      case '1.9.5':
        upgradeNotes.push({title:'-', message:'Support for Hangouts, Facebook'});
        upgradeNotes.push({title:'-', message:'Toggle on/off from icon'});

        // Upgrade database to latest version and supply version notes
        upgradeShortcutsToLatest(upgradeNotes);
        break;

      default:
        console.log('unexpected version number:', oldVersion);
        break;
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
      console.error('SERIOUS ERROR: COULD NOT MAKE EMERGENCY BACKUP BEFORE UPGRADE');
      console.error(chrome.runtime.lastError);
    }
    else   // Store backup into emergency local storage
    {
      // Setup backup
      var backup = {};
      backup[APP_EMERGENCY_BACKUP_KEY] = data;
      chrome.storage.local.set(backup, function() {
        if (chrome.runtime.lastError) 	// Check for errors
        {
          console.error('SERIOUS ERROR: COULD NOT MAKE EMERGENCY BACKUP BEFORE UPGRADE');
          console.error(chrome.runtime.lastError);
        }
        else 	// Backup success
        {
          console.log('Emergency backup before migration created.');
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
      console.error('SERIOUS ERROR: COULD NOT GET EMERGENCY BACKUP');
      console.error(chrome.runtime.lastError);
    }
    else   // Restore backup to synced storage
    {
      chrome.storage.sync.set(data[APP_EMERGENCY_BACKUP_KEY], function() {
        if (chrome.runtime.lastError) 	// Check for errors
        {
          console.error('SERIOUS ERROR: COULD NOT RESTORE EMERGENCY BACKUP');
          console.error(chrome.runtime.lastError);
        }
        else 	// Restore success
        {
          console.log('Emergency backup restored.');
          if (completionBlock) {
            completionBlock();
          }
        }
      });
    }
  });
}

// Updates the shortcut database with the latest version number, and support an optional message
function upgradeShortcutsToLatest(upgradeNotesList)
{
  console.log('upgradeShortcutsToLatest:', upgradeNotesList);

  // Upgrade shortcut database version
  chrome.storage.sync.get(null, function(data)
  {
    if (chrome.runtime.lastError) {	// Check for errors
      console.error(chrome.runtime.lastError);
    }
    else if (data && Object.keys(data).length) // Check that data is returned
    {
      console.log('updating database version to', MANIFEST.version);

      // Update metadata for shortcut version to manifest version
      data[SHORTCUT_VERSION_KEY] = MANIFEST.version;

      // Delete old data, replace with new data
      chrome.storage.sync.clear(function() {
        if (chrome.runtime.lastError) { 	// Check for errors
          console.error(chrome.runtime.lastError);
        } else {
          chrome.storage.sync.set(data, function() {
            if (chrome.runtime.lastError) 	// Check for errors
            {
              console.error(chrome.runtime.lastError);
              restoreEmergencyBackup();
            }
            else	// Done with migration
            {
              console.log('upgrade complete!');

              // Add upgrade message
              upgradeNotesList.unshift({
                title: 'Please reload tabs, have a great day!',
                message: ''
              });

              // Fire off notification about upgrade
              chrome.notifications.create('', {
                type: 'list'
                , iconUrl: 'images/icon128.png'
                , title: 'AutoTextExpander Updated v' + MANIFEST.version
                , message: 'Hello! Please refresh your tabs to use the latest, and have a great day. :o)'
                , items: upgradeNotesList
                , isClickable: true
              }, function(id) {});

              chrome.runtime.reload();  // reload the extension & background.js
            }
          });
        }
      });
    }
  });
}
