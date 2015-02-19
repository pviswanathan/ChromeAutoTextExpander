
// Document ready
$(function()
{
    // Constants
    var DEFAULT_SHORTCUT = "Shortcut"
      , DEFAULT_AUTOTEXT = "Expanded Text"
      , KEYCODE_ENTER = 13
      , KEYCODE_TAB = 9
	  , KEYCODE_ESC = 27
      , ANIMATION_FAST = 200
      , ANIMATION_NORMAL = 400
      , ANIMATION_SLOW = 1000
      , TIME_SHOW_CROUTON = 1000 * 2	            // 2 seconds
      , TIME_CLEAR_BUFFER_TIMEOUT = 750             // 750 ms
      , FIRST_RUN_KEY = 'autoTextExpanderFirstRun'  // Local key to check for first run
      , BACKUP_KEY = 'autoTextExpanderBackup'       // Local key for backups
      , BACKUP_TIMESTAMP_KEY = 'autoTextExpanderBackupTimestamp' // Local key backup timestamp
    ;

    // Variables
    var storageQuota        // Total bytes of sync storage allowed
      , itemStorageQuota    // Max size of a single item in sync storage
      , countQuota          // Max number of items you can store in sync storage
      , adjustedCountQuota  // Max number of items you can store minus metadata
      , metaData = {        // List of metadata keys we will store / retrieve
        "scto": TIME_CLEAR_BUFFER_TIMEOUT,  // default for ShortCut TimeOut
        "mig": false,                       // migrated shortcuts to new format yet
      }
    ;

    // Set version
    $('#version').text('v' + chrome.runtime.getManifest().version);

	// When user types into input fields
	$('#edit').on('keydown', 'input[type=text], textarea', editRowHandler);

    // Detect when user types ESC in document to close modal popups
    $(document).on('keydown', function(event) {
		var charCode = event.keyCode || event.which;
        if (charCode == KEYCODE_ESC) {
            $('.popup').fadeOut(ANIMATION_FAST, function() {
                $('.popup, .modal').remove();
            });
        }
    });

	// Need to do the onclick clearing here, inline js not allowed
	$('#edit').on('focus', 'input.shortcut', function(event) {
		if (this.value == DEFAULT_SHORTCUT) { this.value = ''; }
	});
	$('#edit').on('focus', 'textarea.autotext', function(event) {
		if (this.value == DEFAULT_AUTOTEXT) { this.value = ''; }
	});
	$('#edit').on('blur', 'input.shortcut', function(event) {
		if (this.value == '') { this.value = DEFAULT_SHORTCUT; }
	});
	$('#edit').on('blur', 'textarea.autotext', function(event) {
		if (this.value == '') { this.value = DEFAULT_AUTOTEXT; }
	});

    // Listen to slider changes
    $('#timeout').on('change mousemove', function(e) {
        updateShortcutTimeoutLabel($(this).val());
    });

	// Button handlers
	$('#restore').click(restoreShortcuts);
	$('#backup').click(backupShortcuts);
	$('#port').click(portShortcuts);
	$('#edit').on('click', '.remove', removeRow);
	$('.refreshButton').click(refreshShortcuts);
	$('.addButton').click(function(event) {
		var row = addRow(null, null, $(this).hasClass('append'));
		if (row) {
			row.find('.shortcut').focus().select();
		}
	});
	$('.saveButton').click(function(event) {
		saveShortcuts();
	});
	$('.backToTop').click(function(event) {
		event.preventDefault();
		$('html, body').animate({scrollTop: 0}, ANIMATION_NORMAL);
	});

	// Prevent form submit
	$('form').submit(function(event) {
		event.preventDefault();
	});

	// Tips link to show / hide tips
	$('#tipsLink').click(toggleTips);

	// Refresh and setup shortcuts
	refreshShortcuts();


//////////////////////////////////////////////////////////
// FUNCTIONS

    // Refresh shortcuts using locally stored shortcuts
    function refreshShortcuts()
    {
        // Get existing shortcuts
        chrome.storage.sync.get(null, function(data)
        {
            if (chrome.runtime.lastError) {	// Check for errors
                console.log(chrome.runtime.lastError);
                showCrouton("Error retrieving shortcuts!", 'red');
                return;
            }

            // Update storage quotas
            storageQuota = chrome.storage.sync.QUOTA_BYTES;
            itemStorageQuota = chrome.storage.sync.QUOTA_BYTES_PER_ITEM;
            countQuota = chrome.storage.sync.MAX_ITEMS;
            adjustedCountQuota = countQuota - Object.keys(metaData).length;
            refreshQuotaLabels(data);

            // Setup shortcuts
            setupShortcuts(data);
        });
    }

    // Refresh labels for storage quotas
    function refreshQuotaLabels(shortcuts)
    {
        console.log("refreshQuotaLabels");

        // Check that data is returned
        if (!$.isEmptyObject(shortcuts)) 
        {
            // Current quotas
            $('#totalStorage').text(JSON.stringify(shortcuts).length);
            $('#countStorage').text(Object.keys(shortcuts).length 
                                    - Object.keys(metaData).length);        
        }

        // Max quotas
        $('#totalQuota').text(storageQuota);
        $('#countQuota').text(adjustedCountQuota);
    }

    // Setup and populate edit table shortcuts
    function setupShortcuts(data, completionBlock)
    {
        console.log("setupShortcuts");

        var errors = false;					// Keep track of errors
        var reloadStartTime = new Date();	// Keep track of time
        $('.refreshButton').find('img').attr('src', 'images/refresh.gif');
        $('#edit').fadeOut(ANIMATION_FAST, function() {
            $(this).html('').fadeIn(ANIMATION_FAST, function()
            {
                if (!$.isEmptyObject(data)) // Check that data is returned
                {
                    // Loop through shortcuts and add to edit table,
                    //  case insensitive sorted by shortcut, sort in reverse
                    var keys = Object.keys(data);
                    keys.sort(function(a, b) {
                        return b.toLowerCase().localeCompare(a.toLowerCase());
                    });
                    $.each(keys, function(index, key) {
                        if (!addRow(key, data[key])) {
                            errors = true;
                            return false;	// Break out if over quota
                        }
                    });

                    // Add special class to these rows to indicate saved
                    $('tr').addClass('saved');
                }
                else	// No shortcuts? Check if first run on this computer
                {
                    chrome.storage.local.get(FIRST_RUN_KEY, function(firstRun)
                    {
                        if (chrome.runtime.lastError) {		// Check for errors
                            console.log(chrome.runtime.lastError);
                        }
                        else if (!firstRun[FIRST_RUN_KEY])		// First run
                        {
                            // Flag first run
                            firstRun[FIRST_RUN_KEY] = true;
                            chrome.storage.local.set(firstRun);

                            // Example shortcuts
                            addRow('d8 ', 'it is %d(MMMM Do YYYY, h:mm:ss a) right now');
                            addRow('sign@', '<strong>. Carlin</strong>\nChrome Extension Developer\nemail.me@carlinyuen.com');
                            addRow('hbd', "Hey! Just wanted to wish you a happy birthday; hope you had a good one!");
                            addRow('e@', 'email.me@carlinyuen.com');
                            addRow('brb', 'be right back');
                            addRow('p@', 'This is your final warning: %clip% ');

                            // Save
                            saveShortcuts();
                        }
                    });
                }

                // Set textarea height to fit content and resize as user types
                $('textarea').autosize();

                // Add extra input field if no existing shortcuts
                if (!$('tr').get().length) {
                    addRow().find('.shortcut').focus().select();
                }

                // Add some delay so it looks like it's doing some work
                var reloadTimeInMilliseconds = (new Date()).getTime() - reloadStartTime.getTime();
                var reloadIconRefreshDelay = (1000 - reloadTimeInMilliseconds);
                if (reloadIconRefreshDelay < 0) {
                    reloadIconRefreshDelay = 0;
                }

                // Done! Set reloader icon back and call custom completionBlock
                setTimeout(function()
                {
                    $('.refreshButton').find('img').attr('src', 'images/reload.png');

                    if (completionBlock) {
                        completionBlock(!errors);
                    }
                }, reloadIconRefreshDelay);
            });
        });

        // Update timestamp of backup
        updateBackupTimestamp();
    }

    // When a row in the edit table gets typed in
    function editRowHandler(event)
    {
        // Check to see if input pair is valid
        var keyCode = event.keyCode || event.which;
        var $target = $(event.target);
        var $input = $target.parents('tr');
        validateRow($input, function(errors)
        {
            if (errors.shortcut) {
                $input.find('.shortcut').addClass('error').attr('title', errors.shortcut);
            } else {
                $input.find('.shortcut').removeClass('error').removeAttr('title');
            }

            if (errors.autotext) {
                $input.find('.autotext').addClass('error').attr('title', errors.autotext);
            } else {
                $input.find('.autotext').removeClass('error').removeAttr('title');
            }
        });

        // If enter pressed on shortcut field, move to autotext
        if (keyCode == KEYCODE_ENTER && $target.hasClass('shortcut'))
        {
            event.preventDefault();		// prevent submitting form
            $target.parents('tr').find('.autotext').focus().select();
        }
    }

    // Remove shortcut row in edit table
    function removeRow(event) {
        $(this).parents('tr').fadeOut('fast', function() {$(this).remove();});
    }

    // Add new row to shortcuts edit table
    function addRow(shortcut, autotext, append)
    {
        if ($('tr').length >= chrome.storage.sync.MAX_ITEMS) {
            console.log(chrome.i18n.getMessage("ERROR_OVER_ITEM_QUOTA"));
            showCrouton(chrome.i18n.getMessage("ERROR_OVER_ITEM_QUOTA")
                + " Max # Items: " + chrome.storage.sync.MAX_ITEMS, 'red');
            return null;
        }

        var row = $(document.createElement('tr'))
            .append($(document.createElement('td'))
                //.attr('width', '92px')
                .append($(document.createElement('input'))
                    .attr('type', 'text')
                    .addClass('shortcut')
                    .attr('value', shortcut || DEFAULT_SHORTCUT)
                )
            )
            .append($(document.createElement('td'))
                .append($(document.createElement('textarea'))
                    .addClass('autotext')
                    .text(autotext || DEFAULT_AUTOTEXT)
                )
            )
            .append($(document.createElement('td'))
                //.attr('width', '16px')
                .append($(document.createElement('a'))
                    .attr('href', '#')
                    .addClass('remove')
                    .attr('title', 'Remove Shortcut')
                    .append($(document.createElement('img'))
                        .attr('src', 'images/remove.png')
                        .attr('alt', 'x')
                    )
                )
            )
            .hide();

        // Append or prepend
        if (append) {
            row.appendTo('#edit').fadeIn(ANIMATION_FAST);
        } else {
            row.prependTo('#edit').fadeIn(ANIMATION_FAST);
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
        if (!shortcut || shortcut == DEFAULT_SHORTCUT || !shortcut.length) {
            errors.shortcut = ' - Invalid shortcut text.';
        }
        if (!autotext || autotext == DEFAULT_AUTOTEXT || !autotext.length) {
            errors.autotext = ' - Invalid expanded text.';
        }

        // Check not over max size
        var itemSize = JSON.stringify({shortcut:autotext}).length;
        if (itemSize >= itemStorageQuota) {
            console.log(chrome.i18n.getMessage("ERROR_OVER_SPACE_QUOTA"));
            errors.autotext = " - Over max storage item size. Please reduce shortcut or autotext length.";
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
        console.log("saveShortcuts");

        // Collect list of valid shortcuts and check for duplicates
        var duplicates = [];
        var shortcuts = {};
        $('tr').each(function(index)
        {
            var $row = $(this);

            // If pair is valid, and no duplicates, add to list
            if (validateRow($row))
            {
                var shortcut = $row.find('.shortcut').val();
                if (!shortcuts[shortcut]) {
                    shortcuts[shortcut] = $row.find('.autotext').val();
                } else {
                    duplicates.push(shortcut);
                }
            }
        });

        // Check duplicates and warn user
        if (duplicates.length) 
        {
            console.log(chrome.i18n.getMessage("ERROR_DUPLICATE_ITEMS"));
            showModalPopup(chrome.i18n.getMessage("ERROR_DUPLICATE_ITEMS")
                + '\n - ' + duplicates.join('\n - '));
            return false;
        }

        // Check storage capacity
        if (JSON.stringify(shortcuts).length >= storageQuota) 
        {
            console.log(chrome.i18n.getMessage("ERROR_OVER_SPACE_QUOTA"));
            showCrouton(chrome.i18n.getMessage("ERROR_OVER_SPACE_QUOTA")
                + " Chrome max capacity: " + storageQuota + " characters", 'red');
            return false;
        }
        if (Object.keys(shortcuts).length >= countQuota) 
        {
            console.log(chrome.i18n.getMessage("ERROR_OVER_SPACE_QUOTA"));
            showCrouton(chrome.i18n.getMessage("ERROR_OVER_SPACE_QUOTA")
                + " Chrome max capacity: " + storageQuota + " characters", 'red');
            return false;
        }

        // Clear old shortcuts
        chrome.storage.sync.clear(function()
        {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError);
            }
            else	// Success! Shortcuts cleared
            {
                // Save data into storage
                chrome.storage.sync.set(shortcuts, function()
                {
                    if (chrome.runtime.lastError) {
                        console.log(chrome.runtime.lastError);
                        showCrouton("Error saving shortcuts!", 'red');
                    }
                    else	// Success! Shortcuts saved
                    {
                        console.log("saveShortcuts success:", shortcuts);

                        // Run through valid shortcuts and set them as saved
                        $('tr').each(function(index)
                        {
                            var $row = $(this);
                            if (shortcuts[$row.find('.shortcut').val()]) {
                                $row.addClass('saved');
                            }
                        });

                        // Run completion block if exists
                        if (completionBlock) {
                            completionBlock();
                        } else {
                            showCrouton('Shortcuts saved!');	// Indicate success saving
                        }
                    }
                });
            }
        });
    }

    // Save backup of shortcuts
    function backupShortcuts()
    {
        showModalPopup(chrome.i18n.getMessage("MESSAGE_BACKUP_WARNING") + " Continue?",
            function(response) {
                if (response)
                {
                    saveShortcuts(function() {
                        chrome.storage.sync.get(null, function(data)
                        {
                            if (chrome.runtime.lastError) {	// Check for errors
                                console.log(chrome.runtime.lastError);
                                showCrouton("Error retrieving shortcuts!", 'red');
                            }
                            else	// Save backup of shortcuts
                            {
                                var backup = {};
                                backup[BACKUP_KEY] = data;
                                backup[BACKUP_TIMESTAMP_KEY] = new Date().getTime();
                                chrome.storage.local.set(backup, function()
                                {
                                    if (chrome.runtime.lastError) {	// Check for errors
                                        console.log(chrome.runtime.lastError);
                                        showCrouton(chrome.i18n.getMessage("ERROR_BACKUP_FAILED"), 'red');
                                    }
                                    else {	// Show success
                                        showCrouton('Shortcuts backed up locally!');
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
        chrome.storage.local.get(BACKUP_TIMESTAMP_KEY, function(data)
        {
            if (chrome.runtime.lastError) {	// Check for errors
                console.log(chrome.runtime.lastError);
            }
            else if (data)	// Set date
            {
                var timestamp = data[BACKUP_TIMESTAMP_KEY];
                if (timestamp) {
                    var date = new Date(timestamp).toLocaleString();
                    console.log("Last local backup date: " + date);
                    $('#restore').text(date).removeClass('disabled');
                } else {
                    console.log("No last backup date");
                    $('#restore').text("never").addClass('disabled');
                }
            }
        });
    }

    // Updates the shortcut timeout label
    function updateShortcutTimeoutLabel(value) {
        $('#timeoutValue').text(' [' + value + 'ms]');
    }

    // Get custom shortcut timeout value and update the slider
    function updateShortcutTimeout() 
    {
        chrome.storage.sync.get(SHORTCUT_TIMEOUT_KEY, function(data)
        {
            if (chrome.runtime.lastError) {	// Check for errors
                console.log(chrome.runtime.lastError);
            }
            else if (data)	// Set custom shortcut timeout
            {
                var timeout = data[SHORTCUT_TIMEOUT_KEY];
                updateShortcutTimeoutLabel(timeout);
                $('#timeout').value(timeout);
            }
        });
    }

    // Save custom shortcut timeout value
    function saveShortcutTimeout(timeout) 
    {
        chrome.storage.sync.set(SHORTCUT_TIMEOUT_KEY, function()
        {
            if (chrome.runtime.lastError) {	// Check for errors
                console.log(chrome.runtime.lastError);
            }
            else
            {
            }
        });
    }

    // Restore shortcuts from backup
    function restoreShortcuts()
    {
        // Only enable if restore is not disabled
        if ($('#restore').hasClass('disabled')) {
            return showCrouton("You need to make a backup first!", 'red');
        }

        // Confirm restore
        showModalPopup(chrome.i18n.getMessage("MESSAGE_RESTORE_WARNING") + " Continue?",
            function(response) {
                if (response)
                {
                    chrome.storage.local.get(BACKUP_KEY, function(data)
                    {
                        if (chrome.runtime.lastError) {	// Check for errors
                            console.log(chrome.runtime.lastError);
                            showCrouton("Error retrieving backup!", 'red');
                        }
                        else	// Restore using backup shortcuts
                        {
                            console.log("Restoring shortcuts: ", data[BACKUP_KEY]);
                            chrome.storage.sync.set(data[BACKUP_KEY], function()
                            {
                                if (chrome.runtime.lastError) {	// Check for errors
                                    console.log(chrome.runtime.lastError);
                                    showCrouton(chrome.i18n.getMessage("ERROR_RESTORE_FAILED"), 'red');
                                }
                                else {	// Show success
                                    showCrouton('Shortcuts restored!');
                                    refreshShortcuts();
                                }
                            });
                        }
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
                showCrouton(chrome.i18n.getMessage("ERROR_IMPORT_INVALID_JSON"), 'red');
                return;
            }

            // Check if it's an array, has to be an object
            if ($.isArray(newShortcuts)) {
                showCrouton(chrome.i18n.getMessage("ERROR_IMPORT_NOT_OBJECT"), 'red');
                return;
            }

            // Go through and try to set them up as new shortcuts,
            // should go through built-in validation for item quotas.
            setupShortcuts(newShortcuts, function(success)
            {
                // Show message to user
                if (success) {
                    showCrouton(chrome.i18n.getMessage("MESSAGE_IMPORT_SUCCESS"), 'orange');
                } else {
                    showCrouton(chrome.i18n.getMessage("ERROR_IMPORT_ADDING_ROWS"), 'red');
                }

                // Set rows to unsaved style
                $('tr').removeClass('saved');
            });
        });
    }

    // Create and show and eventually hide a message crouton
    function showCrouton(message, color)
    {
        $('body').append($(document.createElement('div'))
            .addClass('crouton').addClass(color || 'green').text(message)
            .fadeIn(ANIMATION_FAST, function() {
                $(this).delay(TIME_SHOW_CROUTON).fadeOut(ANIMATION_FAST, function() {
                    $(this).remove();
                })
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
                .text(chrome.i18n.getMessage("TITLE_WARNING_POPUP"))
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
                console.log(chrome.runtime.lastError);
                showCrouton("Error retrieving shortcuts!", 'red');
            }
            else	// Parse json and show
            {
                console.log('showPortView', data);

                // Build and show modal
                $(document.createElement('div'))
                    .addClass('modal')
                    .hide()
                    .appendTo('body')
                    .fadeIn(ANIMATION_FAST)
                    .click(function() {
                        $('.popup').fadeOut(ANIMATION_FAST, function() {
                            $('.popup, .modal').remove();
                        });
                    });
                $(document.createElement('div'))
                    .addClass('popup').addClass('port')
                    .append($(document.createElement('h2'))
                        .text(chrome.i18n.getMessage("TITLE_PORT_VIEW_POPUP"))
                    )
                    .append($(document.createElement('p'))
                        .html(chrome.i18n.getMessage("TEXT_PORT_VIEW_POPUP"))
                    )
                    .append($(document.createElement('textarea'))
                        .attr('id', 'portJSON')
                        .val(JSON.stringify(data, undefined, 2))
                    )
                    .append($(document.createElement('span'))
                        .css('float', 'right')
                        .css('text-align', 'right')
                        .append($(document.createElement('button'))
                            .attr('type', 'button')
                            .css('display', 'inline-block')
                            .text('Cancel')
                            .click(function() {
                                $('.popup').fadeOut(ANIMATION_FAST, function() {
                                    $('.popup, .modal').remove();
                                });
                            })
                        )
                        .append($(document.createElement('button'))
                            .attr('type', 'button')
                            .css('margin-left', '4px')
                            .text('Save')
                            .click(function() {
                                $('.popup').fadeOut(ANIMATION_FAST, function() 
                                {
                                    if (completionBlock) {
                                        completionBlock($('#portJSON').val());
                                    }
                                    $('.popup, .modal').remove();
                                });
                            })
                        )
                    )
                    .hide()
                    .appendTo('body')
                    .fadeIn(ANIMATION_FAST);

                // Resize as user types
                $('#portJSON').autosize();
            }
        });
    }

    // Toggle to show and hide tips
    function toggleTips(event) {
        $('#tipsList').slideToggle();
    }

});
