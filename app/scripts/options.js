'use strict';

// Options module, passed jQuery object by doc ready
var ateOptionsModule = (function($)
{
  // Constants
  var FIRST_RUN_KEY = 'autoTextExpanderFirstRun'  // Check for first run

    , DATE_MACRO_DEMO_FORMAT = 'MMMM Do YYYY'

    , DEFAULT_SHORTCUT_FILLER = 'Shortcut'
    , DEFAULT_AUTOTEXT_FILLER = 'Expanded Text'
    , DEFAULT_CLEAR_BUFFER_TIMEOUT = 750          // Default to 750ms

    , KEYCODE_ENTER = 13
    , KEYCODE_TAB = 9
    , KEYCODE_ESC = 27

    , IMAGE_REFRESH_ICON = 'images/reload-2x.png'
    , IMAGE_REMOVE_ICON = 'images/trash-2x.png'

    // Total bytes of sync storage allowed
    , QUOTA_STORAGE = chrome.storage.sync.QUOTA_BYTES
    // Max size of a single item
    , QUOTA_ITEM_STORAGE = chrome.storage.sync.QUOTA_BYTES_PER_ITEM
    // Max number of items you can store
    , QUOTA_ITEM_COUNT = chrome.storage.sync.MAX_ITEMS

    , ANIMATION_FAST = 200
    , ANIMATION_NORMAL = 400
    , ANIMATION_SLOW = 1000
    , TIME_SHOW_CROUTON = 1000 * 3	              // Show croutons for 3s
  ;

  // Variables
  var adjustedCountQuota  // Max number of items you can store minus metadata
    , metadata = {}       // List of metadata keys we will store / retrieve
    , cachedInputValue    // Track value of input field that user focused on
  ;


  function init()
  {
    // Setup metadata defaults
    metadata[ATE_CONST.SHORTCUT_TIMEOUT_KEY] = DEFAULT_CLEAR_BUFFER_TIMEOUT;
    metadata[ATE_CONST.SHORTCUT_VERSION_KEY] = ATE_CONST.APP_VERSION;

    // Setup UI
    setupUI();
    setupShortcutEditor();
    setupSettingsPanels();

    // Check if we opened the options page with a hash
    var hash = window.location.hash;
    if (hash) {
      console.log('Hash:', hash);
      if (hash == '#tipsLink') {  // If it is #tipsLink, trigger tips
        $(hash).click();
      }
    }

    // Reload shortcuts
    refreshShortcuts();
  }

  // Set various dynamic UI fields: version, omnibar keyword, etc.
  function setupUI()
  {
    // Tips
    $('#tipsList').html(chrome.i18n.getMessage('TEXT_TIPS_LIST'));
    $('#versionHistory').text('v' + ATE_CONST.APP_VERSION);
    $('#omniboxKeyword').text(chrome.i18n.getMessage('KEYWORD_OMNIBAR_TRIGGER'));
    $('#cursorTag').text(ATE_CONST.CURSOR_TRACKING_HTML);
    $('#clipboardTag').text(ATE_CONST.INSERT_CLIPBOARD_TAG);
    $('#insertUrlTag').text(ATE_CONST.INSERT_URL_TAG);
    $('#insertDateTag').text(ATE_CONST.INSERT_DATE_TAG + 'dateformat' + ATE_CONST.INSERT_DATE_CLOSE_TAG);
    $('#insertDateFormat').text(ATE_CONST.INSERT_DATE_TAG + DATE_MACRO_DEMO_FORMAT + ATE_CONST.INSERT_DATE_CLOSE_TAG);
    $('#insertDateDemo').text((function(){
      var mo = moment();
      mo.locale(chrome.i18n.getMessage('@@ui_locale'));
      return mo.format(DATE_MACRO_DEMO_FORMAT);
    })());

    // Settings
    $('#backupButton').html(chrome.i18n.getMessage('TITLE_BACKUP_BUTTON'));
    $('#restoreButton').html(chrome.i18n.getMessage('TITLE_RESTORE_BUTTON'));
    $('#importButton').html(chrome.i18n.getMessage('TITLE_IMPORT_BUTTON'));
    $('#timeoutButton').html(chrome.i18n.getMessage('TITLE_TIMEOUT_BUTTON'));
    $('#blacklistButton').html(chrome.i18n.getMessage('TITLE_BLACKLIST_BUTTON'));
    $('#importPanel .title').text(chrome.i18n.getMessage('TITLE_IMPORT_PANEL'));
    $('#importPanel .description').html(chrome.i18n.getMessage('TEXT_IMPORT_PANEL'));
    $('#timeoutPanel .title').text(chrome.i18n.getMessage('TITLE_TIMEOUT_PANEL'));
    $('#timeoutPanel .description').html(chrome.i18n.getMessage('TEXT_TIMEOUT_PANEL'));
    $('#timeoutDefault').text(DEFAULT_CLEAR_BUFFER_TIMEOUT);
    $('#blacklistPanel .title').text(chrome.i18n.getMessage('TITLE_BLACKLIST_PANEL'));
    $('#blacklistPanel .description').html(chrome.i18n.getMessage('TEXT_BLACKLIST_PANEL'));

    // Event handlers
    $('.backToTop').click(function(event) {
      event.preventDefault();
      $('html, body').animate({scrollTop: 0}, ANIMATION_NORMAL);
    });
    $('#tipsLink').click(function (event) {
      $('#tipsList').slideToggle();
    });
  }

  // When user types into input fields
  function setupShortcutEditor()
  {
    // Edit handling
    $('#edit').on('keydown', 'input[type=text], textarea', editRowKeydownHandler);
    $('#edit').on('keyup', 'input[type=text], textarea', editRowKeyupHandler);
    $('#edit').on('focus', 'input.shortcut', function(event) {
      if (this.value == DEFAULT_SHORTCUT_FILLER) {
        this.value = '';
      }
      cachedInputValue = this.value;
    });
    $('#edit').on('focus', 'textarea.autotext', function(event) {
      if (this.value == DEFAULT_AUTOTEXT_FILLER) {
        this.value = '';
      }
      cachedInputValue = this.value;
    });
    $('#edit').on('blur', 'input.shortcut', function(event) {
      if (this.value == '') {
        this.value = DEFAULT_SHORTCUT_FILLER;
      } else if (cachedInputValue != this.value) {
        saveShortcuts();
      }
    });
    $('#edit').on('blur', 'textarea.autotext', function(event) {
      if (this.value == '') {
        this.value = DEFAULT_AUTOTEXT_FILLER;
      } else if (cachedInputValue != this.value) {
        saveShortcuts();
      }
    });
    $('#edit').on('click', '.remove', removeRow);

    // Action buttons
    $('.saveButton')
      .html(chrome.i18n.getMessage('TITLE_SAVE_BUTTON'))
      .click(function(event) {
        saveShortcuts();
      });
    $('.refreshButton')
      .html(chrome.i18n.getMessage('TITLE_REFRESH_BUTTON'))
      .click(refreshShortcuts);
    $('.addButton')
      .html(chrome.i18n.getMessage('TITLE_ADD_BUTTON'))
      .click(function(event) {
        var row = addRow(null, null, $(this).hasClass('append'));
        if (row) {
          row.find('.shortcut').focus().select();
        }
      });

    // Prevent form submit
    $('form').submit(function(event) {
      event.preventDefault();
    });
  }

  // Setup settings panels
  function setupSettingsPanels()
  {
    // Detect when user types ESC in document to close modal popups
    $(document).on('keydown', function(event)
    {
      var charCode = event.keyCode || event.which;
      if (charCode == KEYCODE_ESC) {
        togglePanel();
      }
    });

    // Listen to slider changes
    $('#timeoutSlider').on('change', function(e)
    {
      var timeout = $(this).val();
      metadata[ATE_CONST.SHORTCUT_TIMEOUT_KEY] = timeout;
      updateShortcutTimeoutLabel(timeout);
      saveShortcuts();
    });
    $('#timeoutSlider').on('mousemove', function(e)
    {
      var timeout = $(this).val();
      metadata[ATE_CONST.SHORTCUT_TIMEOUT_KEY] = timeout;
      updateShortcutTimeoutLabel(timeout);
    });

    $('#restoreButton').click(restoreShortcuts);
    $('#backupButton').click(backupShortcuts);
    $('#importButton').click(function(event) {
      portShortcuts();
      togglePanel('#importPanel');
    });
    $('#timeoutButton').click(function(event) {
      togglePanel('#timeoutPanel');
    });
    $('#blacklistButton').click(function(event) {
      togglePanel('#blacklistPanel');
    });
    $('.panelCancelButton').click(function(event) {
      togglePanel();
    });
  }

  // Refresh shortcuts using locally stored shortcuts
  function refreshShortcuts()
  {
    // Get existing shortcuts
    chrome.storage.sync.get(null, function(data)
    {
      if (chrome.runtime.lastError) {	// Check for errors
        console.error(chrome.runtime.lastError);
        showCrouton('Error retrieving shortcuts!', 'red');
        return;
      }

      // Update storage quotas
      adjustedCountQuota = QUOTA_ITEM_COUNT - Object.keys(metadata).length;
      refreshQuotaLabels(data);

      processMetadata(data);
      setupShortcuts(data);
    });
  }

  // Refresh labels for storage quotas
  function refreshQuotaLabels(shortcuts)
  {
    console.log('refreshQuotaLabels');

    // Check that data is returned
    if (!$.isEmptyObject(shortcuts))
    {
      // Current quotas
      $('#totalStorage').text(JSON.stringify(shortcuts).length);
      $('#countStorage').text(Object.keys(shortcuts).length
                              - Object.keys(metadata).length);
    }

    // Max quotas
    $('#totalQuota').text(QUOTA_STORAGE);
    $('#countQuota').text(adjustedCountQuota);
  }

  // Process any metadata stored with shortcuts
  function processMetadata(data)
  {
    console.log('processMetadata');

    // Check for shortcut timeout
    var shortcutTimeout = data[ATE_CONST.SHORTCUT_TIMEOUT_KEY];
    if (shortcutTimeout) {  // If exists, replace metadata
      metadata[ATE_CONST.SHORTCUT_TIMEOUT_KEY] = shortcutTimeout;
    } else {    // Otherwise, use metadata default value
      shortcutTimeout = metadata[ATE_CONST.SHORTCUT_TIMEOUT_KEY];
    }
    updateShortcutTimeoutLabel(shortcutTimeout);
    $('#timeoutSlider').val(shortcutTimeout);
    console.log('shortcutTimeout:', shortcutTimeout);

    // Check that the shortcut database version matches app version
    var shortcutVersion = data[ATE_CONST.SHORTCUT_VERSION_KEY];
    console.log('database version:', shortcutVersion);
    if (shortcutVersion && shortcutVersion != metadata[ATE_CONST.SHORTCUT_VERSION_KEY])
    {
      // Warn user that their shortcuts aren't synced yet, they should refresh
      console.error(chrome.i18n.getMessage('WARNING_SHORTCUT_VERSION_MISMATCH'));
      alert(chrome.i18n.getMessage('WARNING_SHORTCUT_VERSION_MISMATCH'));
      console.error('Database version:', shortcutVersion);
      console.error('Extension version:', metadata[ATE_CONST.SHORTCUT_VERSION_KEY]);
    }
  }

  // Setup and populate edit table shortcuts
  function setupShortcuts(data, completionBlock)
  {
    console.log('setupShortcuts');

    var errors = false;					// Keep track of errors
    var refreshStartTime = new Date();	// Keep track of time
    $('.refreshButton').find('img').attr('src', 'images/refresh.gif');
    $('#edit').fadeOut(ANIMATION_FAST, function() {
      $(this).find('tbody').html('');
      $(this).fadeIn(ANIMATION_FAST, function()
      {
        if (!$.isEmptyObject(data)) // Check that data is returned
        {
          // Loop through shortcuts and add to edit table,
          //  case insensitive sorted by shortcut, sort in reverse
          var keys = Object.keys(data);
          keys.sort(function(a, b) {
            return b.toLowerCase().localeCompare(a.toLowerCase());
          });
          $.each(keys, function(index, key)
          {
            // Only apply shortcuts
            if (key.indexOf(ATE_CONST.SHORTCUT_PREFIX) === 0)
            {
              var shortcut = key.substr(ATE_CONST.SHORTCUT_PREFIX.length);
              if (!addRow(shortcut, data[key]))
              {
                errors = true;
                return false;	// Break out if over quota
              }
            }
          });

          // Add special class to these rows to indicate saved
          $('tbody > tr').addClass('saved');

          // Set textarea height to fit content and resize as user types
          $('textarea').autosize();
        }
        else	// No shortcuts? Check if first run on this computer
        {
          chrome.storage.local.get(FIRST_RUN_KEY, function(firstRun)
          {
            if (chrome.runtime.lastError) {		// Check for errors
              console.error(chrome.runtime.lastError);
            }
            else if (!firstRun[FIRST_RUN_KEY])		// First run
            {
              // Flag first run
              firstRun[FIRST_RUN_KEY] = true;
              chrome.storage.local.set(firstRun);

              // Example shortcuts
              addRow('p@', 'This is your final warning: %clip% ');
              addRow('sign@', '<strong>. Carlin</strong>\nChrome Extension Developer\n<a href="mailto:email.me@carlinyuen.com">email.me@carlinyuen.com</a>');
              addRow('hbd', 'Hey! Just wanted to wish you a happy birthday; hope you had a good one!');
              addRow('d8', 'it is %d(MMMM Do YYYY, h:mm:ss a) right now');
              addRow('e@', 'your.email@gmail.com');
              addRow('brb ', 'be right back');

              // Save
              saveShortcuts();

              // Set textarea height to fit content and resize as user types
              $('textarea').autosize();
            }
            else    // First run already happened, why no shortcuts??
            {
              // Add extra input field if no existing shortcuts
              if (!$('tbody > tr').length) {
                addRow().find('.shortcut').focus().select();
              }

              getLocalBackup(function (data) {    // Check local backup
                if (!data || $.isEmptyObject(data)) {   // No local backup
                  getEmergencyBackup(function (data) {    // Check emergency
                    if (!$.isEmptyObject(data)) {   // Has backup
                      //  prompt user to use emergency backup
                      promptEmergencyRestore();
                    }
                  });
                }
              });
            }
          });
        }

        // Add some delay so it looks like it's doing some work
        var refreshTimeInMilliseconds = (new Date()).getTime() - refreshStartTime.getTime();
        var refreshIconRefreshDelay = (1000 - refreshTimeInMilliseconds);
        if (refreshIconRefreshDelay < 0) {
          refreshIconRefreshDelay = 0;
        }

        // Done! Set refresher icon back and call custom completionBlock
        setTimeout(function()
        {
          $('.refreshButton').find('img').attr('src', IMAGE_REFRESH_ICON);

          if (completionBlock) {
            completionBlock(!errors);
          }
        }, refreshIconRefreshDelay);
      });
    });

    // Update timestamp of backup
    updateBackupTimestamp();
  }

  // When a row in the edit table gets typed in
  function editRowKeyupHandler(event)
  {
    // Check to see if input pair is valid
    var keyCode = event.keyCode || event.which;
    var $target = $(event.target);
    var $input = $target.parents('tr');
    var $shortcut = $input.find('.shortcut');
    var $autotext = $input.find('.autotext');
    validateRow($input, function(errors)
    {
      // Show / hide error state for shortcut input
      if (errors.shortcut) {
        $shortcut.addClass('error').attr('title', errors.shortcut);
      } else {
        $shortcut.removeClass('error').removeAttr('title');
      }

      // Show / hide error state for autotext textarea
      if (errors.autotext) {
        $autotext.addClass('error').attr('title', errors.autotext);
      } else {
        $autotext.removeClass('error').removeAttr('title');
      }
    });
  }

  // When a row in the edit table gets typed in
  function editRowKeydownHandler(event)
  {
    // Check to see if input pair is valid
    var keyCode = event.keyCode || event.which;
    var $target = $(event.target);

    // If enter pressed on shortcut field, move to autotext
    if (keyCode == KEYCODE_ENTER && $target.hasClass('shortcut'))
    {
      event.preventDefault();		// prevent submitting form
      $target.parents('tr').find('.autotext').focus().select();
    }
  }

  // Remove shortcut row in edit table
  function removeRow(event) {
    var $this = $(this);
    showModalPopup(chrome.i18n.getMessage('MESSAGE_REMOVE_ROW_POPUP') + chrome.i18n.getMessage('PROMPT_CONTINUE'),
    function(response) {
      if (response) {
        $this.parents('tr').fadeOut(ANIMATION_FAST, function() {
          $(this).remove();
        });
      }
    }, true);
  }

  // Add new row to shortcuts edit table
  function addRow(shortcut, autotext, append)
  {
    if ($('tbody > tr').length >= adjustedCountQuota) {
      console.log(chrome.i18n.getMessage('ERROR_OVER_ITEM_QUOTA'));
      showCrouton(chrome.i18n.getMessage('ERROR_OVER_ITEM_QUOTA')
      + ' Max # Items: ' + adjustedCountQuota, 'red');
      return null;
    }

    var row = $(document.createElement('tr'))
      .append($(document.createElement('td'))
        .append($(document.createElement('input'))
          .attr('type', 'text')
          .addClass('shortcut')
          .attr('value', shortcut || DEFAULT_SHORTCUT_FILLER)
        )
      )
      .append($(document.createElement('td'))
        .append($(document.createElement('textarea'))
          .addClass('autotext')
          .text(autotext || DEFAULT_AUTOTEXT_FILLER)
        )
      )
      .append($(document.createElement('td'))
        .append($(document.createElement('a'))
          .addClass('remove')
          .attr('title', 'Remove Shortcut')
          .append($(document.createElement('img'))
            .attr('src', IMAGE_REMOVE_ICON)
            .attr('alt', 'x')
          )
        )
      )
      .hide();

    // Append or prepend
    if (append) {
      row.appendTo('#edit > tbody').fadeIn(ANIMATION_FAST);
    } else {
      row.prependTo('#edit > tbody').fadeIn(ANIMATION_FAST);
    }
    return row;
  }

  // Validate if row has valid shortcut info
  function validateRow($input, callback)
  {
    // Check for errors
    var errors = {};
    var shortcut = $input.find('.shortcut').val();
    var autotext = $input.find('.autotext').val();

    // Check not empty
    if (!shortcut || shortcut == DEFAULT_SHORTCUT_FILLER || !shortcut.length) {
      errors.shortcut = ' - Invalid shortcut text.';
    }
    if (!autotext || autotext == DEFAULT_AUTOTEXT_FILLER || !autotext.length) {
      errors.autotext = ' - Invalid expanded text.';
    }

    // Check not over max size when stored
    var testObject = {};
    testObject[shortcut] = autotext;
    var itemSize = JSON.stringify(testObject).length;
    if (itemSize >= QUOTA_ITEM_STORAGE)
    {
      console.log(chrome.i18n.getMessage('ERROR_OVER_SPACE_QUOTA'));
      errors.autotext = ' - Over max storage item size. Please reduce shortcut or autotext length.';
    }

    // Callback if given
    if (callback) {
      callback(errors);
    }
    return !errors.shortcut && !errors.autotext;
  }

  // Save shortcuts to chrome sync data
  function saveShortcuts(completionBlock)
  {
    console.log('saveShortcuts');
    var duplicates = [];
    var data = {};

    // Add metadata properties
    $.each(metadata, function(key, value) {
      data[key] = value;
    });

    // Collect list of valid shortcuts and check for duplicates
    $('tbody > tr').each(function(index)
    {
      var $row = $(this);
      if (validateRow($row))
      {
        // If pair is valid, and no duplicates, add to list
        var shortcut = SHORTCUT_PREFIX + $row.find('.shortcut').val();
        if (!data[shortcut]) {
          data[shortcut] = $row.find('.autotext').val();
        } else {
          duplicates.push(shortcut);
        }
      }
    });

    // Check duplicates and warn user
    if (duplicates.length)
    {
      console.log(chrome.i18n.getMessage('ERROR_DUPLICATE_ITEMS'));
      showModalPopup(chrome.i18n.getMessage('ERROR_DUPLICATE_ITEMS')
        + '\n - ' + duplicates.join('\n - '));
      return false;
    }

    // Check storage capacity
    if (JSON.stringify(data).length >= QUOTA_STORAGE)
    {
      console.log(chrome.i18n.getMessage('ERROR_OVER_SPACE_QUOTA'));
      showCrouton(chrome.i18n.getMessage('ERROR_OVER_SPACE_QUOTA')
      + ' Chrome max capacity: ' + QUOTA_STORAGE + ' characters', 'red');
      return false;
    }
    if (Object.keys(data).length >= QUOTA_ITEM_COUNT)
    {
      console.log(chrome.i18n.getMessage('ERROR_OVER_SPACE_QUOTA'));
      showCrouton(chrome.i18n.getMessage('ERROR_OVER_SPACE_QUOTA')
      + ' Chrome max capacity: ' + QUOTA_STORAGE + ' characters', 'red');
      return false;
    }

    // Clear old synced data
    chrome.storage.sync.clear(function()
    {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      }
      else	// Success! Old data cleared
      {
        // Save data into storage
        chrome.storage.sync.set(data, function()
        {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            showCrouton('Error saving shortcuts!', 'red');
          }
          else	// Success! Data saved
          {
            console.log('saveShortcuts success:', data);

            // Run through valid shortcuts and set them as saved
            $('tbody > tr').each(function(index)
            {
              var $row = $(this);
              if (data[SHORTCUT_PREFIX + $row.find('.shortcut').val()]) {
                $row.addClass('saved');
              }
            });

            $('textarea').autosize();   // Set textarea height to fit content
            refreshQuotaLabels(data);   // Update quota labels

            // Run completion block if exists
            if (completionBlock) {
              completionBlock();
            } else {
              showCrouton('Shortcuts & settings saved!', 'green', true);
            }
          }
        });
      }
    });
  }

  // Save backup of shortcuts
  function backupShortcuts()
  {
    showModalPopup(chrome.i18n.getMessage('MESSAGE_BACKUP_WARNING') + chrome.i18n.getMessage('PROMPT_CONTINUE'),
    function(response) {
      if (response)
      {
        saveShortcuts(function() {
          chrome.storage.sync.get(null, function(data)
          {
            if (chrome.runtime.lastError) {	// Check for errors
              console.error(chrome.runtime.lastError);
              showCrouton('Error retrieving shortcuts!', 'red');
            }
            else	// Save backup of shortcuts
            {
              var backup = {};
              backup[ATE_CONST.APP_BACKUP_KEY] = data;
              backup[ATE_CONST.APP_BACKUP_TIMESTAMP_KEY] = new Date().getTime();
              chrome.storage.local.set(backup, function()
              {
                if (chrome.runtime.lastError) {	// Check for errors
                  console.error(chrome.runtime.lastError);
                  showCrouton(chrome.i18n.getMessage('ERROR_BACKUP_FAILED'), 'red');
                }
                else {	// Show success
                  showCrouton('Shortcuts backed up locally!', 'green', true);
                  updateBackupTimestamp();
                }
              });
            }
          });
        });
      }
    }, true);
  }

  // Update backup timestamp time
  function updateBackupTimestamp()
  {
    chrome.storage.local.get(ATE_CONST.APP_BACKUP_TIMESTAMP_KEY, function(data)
    {
      if (chrome.runtime.lastError) {	// Check for errors
        console.error(chrome.runtime.lastError);
      }
      else if (data)	// Set date
      {
        var timestamp = data[ATE_CONST.APP_BACKUP_TIMESTAMP_KEY];
        if (timestamp) {
          var date = new Date(timestamp).toLocaleString();
          console.log('Last local backup date: ' + date);
          $('#backupDate').text(date);
          $('#restoreButton').removeClass('disabled');
        } else {
          console.log('No last backup date');
          $('#backupDate').text('never');
          $('#restoreButton').addClass('disabled');
        }
      }
    });
  }

  // Updates the shortcut timeout label
  function updateShortcutTimeoutLabel(value) {
    $('#timeoutValue').text(' [' + value + 'ms]');
  }

  // Get local backup, completionBlock parameter is required and should take an object
  function getLocalBackup(completionBlock)
  {
    chrome.storage.local.get(ATE_CONST.APP_BACKUP_KEY, function(data)
    {
      if (chrome.runtime.lastError)	// Check for errors
      {
        console.error(chrome.runtime.lastError);
        showCrouton('Error retrieving backup!', 'red');
      }
      else {  // Pass data along
        completionBlock(data);
      }
    });
  }

  // Get emergency local backup, completionBlock parameter required and should take an object
  function getEmergencyBackup(completionBlock)
  {
    chrome.storage.local.get(ATE_CONST.APP_EMERGENCY_BACKUP_KEY, function(data)
    {
      if (chrome.runtime.lastError)	// Check for errors
      {
        console.error(chrome.runtime.lastError);
        showCrouton('Error retrieving backup!', 'red');
      }
      else {  // Pass data along
        completionBlock(data);
      }
    });
  }

  // Prompt user for restoring synced data via emergency backup
  function promptEmergencyRestore()
  {
    showModalPopup(chrome.i18n.getMessage('MESSAGE_EMERGENCY_RESTORE_WARNING'),
    function(response) {
      if (response)
      {
        getEmergencyBackup(function(data)	// Restore using emergency backup
        {
          console.log('Restoring emergency backup shortcuts: ',
          data[ATE_CONST.APP_EMERGENCY_BACKUP_KEY]);
          chrome.storage.sync.set(data[ATE_CONST.APP_EMERGENCY_BACKUP_KEY], function()
          {
            if (chrome.runtime.lastError) 	// Check for errors
            {
              console.error(chrome.runtime.lastError);
              showCrouton(chrome.i18n.getMessage('ERROR_RESTORE_FAILED'), 'red');
            }
            else 	// Show success
            {
              showCrouton('Shortcuts restored!', 'green', true);
              refreshShortcuts();
            }
          });
        });
      }
    }, true);
  }

  // Toggle to show settings panel with given id, and hide other panels
  function togglePanel(id) {
    if ($(id).is(':hidden'))
    {
      $('.panel').slideUp(ANIMATION_FAST);
      $(id).slideDown(ANIMATION_NORMAL);
    }
    else {
      $('.panel').slideUp(ANIMATION_FAST);
    }
  }

  // Restore shortcuts from backup
  function restoreShortcuts()
  {
    // Only enable if restore is not disabled
    if ($('#restoreButton').hasClass('disabled')) {
      return showCrouton('You need to make a backup first!', 'red');
    }

    // Confirm restore
    showModalPopup(chrome.i18n.getMessage('MESSAGE_RESTORE_WARNING') + chrome.i18n.getMessage('PROMPT_CONTINUE'),
    function(response) {
      if (response)
      {
        getLocalBackup(function(data)	// Restore using backup shortcuts
        {
          console.log('Restoring shortcuts: ', data[ATE_CONST.APP_BACKUP_KEY]);
          chrome.storage.sync.set(data[ATE_CONST.APP_BACKUP_KEY], function()
          {
            if (chrome.runtime.lastError) 	// Check for errors
            {
              console.error(chrome.runtime.lastError);
              showCrouton(chrome.i18n.getMessage('ERROR_RESTORE_FAILED'), 'red');
            }
            else 	// Show success
            {
              showCrouton('Shortcuts restored!', 'green', true);
              refreshShortcuts();
            }
          });
        });
      }
    }, true);
  }

  // Import / export shortcuts option
  function portShortcuts()
  {
    showPortView(function(newShortcuts)
    {
      console.log('new shortcuts:', newShortcuts);

      // Check if it's valid json, parse it
      try {
        newShortcuts = JSON.parse(newShortcuts);
      } catch (exception) {
        showCrouton(chrome.i18n.getMessage('ERROR_IMPORT_INVALID_JSON'), 'red');
        return;
      }

      // Check if it's an array, has to be an object
      if ($.isArray(newShortcuts)) {
        showCrouton(chrome.i18n.getMessage('ERROR_IMPORT_NOT_OBJECT'), 'red');
        return;
      }

      // Loop through and add prefix to shortcuts and metadata to new store
      var shortcuts = {};
      $.each(newShortcuts, function(key, value) {
        shortcuts[ATE_CONST.SHORTCUT_PREFIX + key] = value;
      });
      shortcuts[ATE_CONST.SHORTCUT_VERSION_KEY] = metadata[ATE_CONST.SHORTCUT_VERSION_KEY];

      // Go through and try to set them up as new shortcuts,
      // should go through built-in validation for item quotas.
      setupShortcuts(shortcuts, function(success)
      {
        // Show message to user
        if (success) {
          showCrouton(chrome.i18n.getMessage('MESSAGE_IMPORT_SUCCESS'), 'orange', true);
          togglePanel();
        } else {
          showCrouton(chrome.i18n.getMessage('ERROR_IMPORT_ADDING_ROWS'), 'red');
        }

        // Set rows to unsaved style
        $('tbody > tr').removeClass('saved');
      });
    });
  }

  // Create and show a warning message crouton that can be dismissed or autohide
  function showCrouton(message, color, autohide)
  {
    $('body').append($(document.createElement('div'))
      .addClass('crouton').addClass(color || 'green').text(message)
      .fadeIn(ANIMATION_FAST, function() {
        if (autohide) {
          $(this).delay(TIME_SHOW_CROUTON).fadeOut(ANIMATION_FAST, function() {
            $(this).remove();
          })
        } else {   // Show a close button
          $(this).append($(document.createElement('button'))
            .addClass('closeButton').text('x')
            .click(function(e) {
              $(this).parents('.crouton').fadeOut(ANIMATION_FAST, function() {
                $(this).remove();
              });
            })
          );
        }
      })
    );
  }

  // Create and show modal popup with action button
  function showModalPopup(message, completionBlock, isConfirm)
  {
    $(document.createElement('div'))
      .addClass('modal')
      .hide()
      .appendTo('body')
      .fadeIn(ANIMATION_FAST)
      .click(function() {
        $('.popup').fadeOut(ANIMATION_FAST, function()
        {
          $('.popup, .modal').remove();
          if (completionBlock) {
            completionBlock(false);
          }
        });
      });
    $(document.createElement('div'))
      .addClass('popup')
      .append($(document.createElement('h2'))
        .text(chrome.i18n.getMessage('TITLE_WARNING_POPUP'))
      )
      .append($(document.createElement('p'))
        .html(message.replace(/\n/g, '<br />'))
      )
      .append($(document.createElement('span'))
        .css('float', 'right')
        .css('text-align', 'right')
        .append($(document.createElement('button'))
          .attr('type', 'button')
          .css('display', (isConfirm ? 'inline-block' : 'none'))
          .text('Cancel')
          .click(function()
          {
            $('.popup').fadeOut(ANIMATION_FAST, function() {
              $('.popup, .modal').remove();
              if (completionBlock) {
                completionBlock(false);
              }
            });
          })
        )
        .append($(document.createElement('button'))
          .attr('type', 'button')
          .css('margin-left', '4px')
          .text('Ok')
          .click(function()
          {
            $('.popup').fadeOut(ANIMATION_FAST, function() {
              $('.popup, .modal').remove();
              if (completionBlock) {
                completionBlock(true);
              }
            });
          })
        )
      )
      .hide()
      .appendTo('body')
      .fadeIn(ANIMATION_FAST);
  }

  // Create and show modal with import / export optiopns
  function showPortView(completionBlock)
  {
    // Get existing shortcuts
    chrome.storage.sync.get(null, function(data)
    {
      if (chrome.runtime.lastError) {	// Check for errors
        console.error(chrome.runtime.lastError);
        showCrouton('Error retrieving shortcuts!', 'red');
      }
      else	// Parse json and show
      {
        console.log('showPortView', data);

        // Collect just the shortcuts, minus the prefix
        var shortcuts = {};
        $.each(data, function(key, value) {
          if (key.indexOf(ATE_CONST.SHORTCUT_PREFIX) === 0) {
            shortcuts[key.substr(ATE_CONST.SHORTCUT_PREFIX.length)] = value;
          }
        });

        // Update UI text area with the code
        $('#importJSON').val(JSON.stringify(shortcuts, undefined, 2));
        $('#importJSON').autosize();

        // Save new shortcuts
        $('#importJSONButton').off('click').click(function(event) {
          if (completionBlock) {
            completionBlock($('#importJSON').val());
          }
        });
      }
    });
  }

  return {
    init: init,
    showCrouton: showCrouton,
    showCrouton: showModalPopup,
  };
});

// Document ready
$(ateOptionsModule.init);
