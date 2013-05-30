// Global Variables
var DEFAULT_SHORTCUT = "Shortcut"
  , DEFAULT_AUTOTEXT = "Expanded Text"
  , KEYCODE_ENTER = 13
  , KEYCODE_TAB = 9
  , STORAGE_KEY = 'autoTextExpanderShortcuts';


// Document ready
$(function()
{
	// When user types into input fields
	$('#edit').on('keydown', 'input', editRowHandler);

	// Button handlers
	$('#refresh').click(setupShortcuts);
	$('#edit').on('click', '.remove', removeRow);
	$('#add').click(function(event) {
		event.preventDefault();
		addRow().find('.shortcut').focus().select();
	});
	$('#save').click(function(event) {
		event.preventDefault();
		saveShortcuts();
	});

	// Prevent form submit
	$('form').submit(function(event) {
		event.preventDefault();
	});

	// Setup shortcut edit table
	setupShortcuts();
});

// Setup and populate edit table shortcuts
function setupShortcuts()
{
	// Clear table
	$('#edit').html('');
	$('#refresh').find('img').attr('src', 'images/refresh.gif');
	var reloadStartTime = new Date();	// Keep track of time

	// Get existing shortcuts
	chrome.storage.sync.get(STORAGE_KEY, function(data)
	{
		// Check that data is returned and shortcut library exists
		if (data && data[STORAGE_KEY])
		{
			// Loop through shortcuts and add to edit table
			$.each(data[STORAGE_KEY], function(key, value) {
				addRow(key, value);
			});

			// Add special class to these rows to indicate saved
			$('tr').addClass('saved');

			// Set textareas to be scroll height
			$('textarea').each(function(index) {
				$(this).css('min-height', this.scrollHeight);
			});
		}
		else	// First time? Add some defaults
		{
			addRow('thx', 'thanks');
			addRow('brb', 'be right back');
			addRow('lol', 'haha');
			addRow('ure', "you're");
			addRow('jk', 'just kidding');
			addRow('sh ', 'should');
			addRow('w ', 'with');
			addRow('w?', 'what do you think?');
			addRow('SIG ', '. Carlin\nChrome Extension Developer\nemail.me@carlinyuen.com');
		}

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

		// Done! Set reloader icon back to default reload
		setTimeout(function() {
			$('#refresh').find('img').attr('src', 'images/reload.png');
		}, reloadIconRefreshDelay);

	});
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
			$input.find('.shortcut').addClass('error');
		} else {
			$input.find('.shortcut').removeClass('error');
		}

		if (errors.autotext) {
			$input.find('.autotext').addClass('error');
		} else {
			$input.find('.autotext').removeClass('error');
		}
	});

	// If enter pressed on shortcut field, move to autotext
	console.log($target, keyCode, KEYCODE_ENTER, KEYCODE_TAB);
	if (keyCode == KEYCODE_ENTER && $target.hasClass('shortcut'))
	{
		event.preventDefault();		// prevent submitting form
		$target.parents('tr').find('.autotext').focus().select();
	}

	// Can't seem to capture TAB key though!
	else if (keyCode == KEYCODE_TAB && $target.hasClass('autotext')) {
		addRow().find('.shortcut').focus().select();
	}
}

// Remove shortcut row in edit table
function removeRow(event) {
	$(this).parents('tr').fadeOut('fast', function() {$(this).remove();});
}

// Add new row to shortcuts edit table
function addRow(shortcut, autotext)
{
	return $(document.createElement('tr'))
		.append($(document.createElement('td'))
			.attr('width', '16px')
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
		.append($(document.createElement('td'))
			.attr('width', '92px')
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
		.appendTo('#edit');
}

// Validate if row has valid shortcut info
function validateRow($input, callback)
{
	// Check for errors
	var errors = {};
	var shortcut = $input.find('.shortcut').val();
	var autotext = $input.find('.autotext').val();
	if (!shortcut || shortcut == DEFAULT_SHORTCUT || !shortcut.length) {
		errors.shortcut = ' - Invalid shortcut text.';
	}
	if (!autotext || autotext == DEFAULT_AUTOTEXT || !autotext.length) {
		errors.autotext = ' - Invalid expanded text.';
	}

	// Callback if given
	if (callback) {
		callback(errors);
	}
	return !errors.shortcut && !errors.autotext;
}

// Save shortcuts to chrome sync data
function saveShortcuts()
{
	// Collect list of valid shortcuts
	var shortcuts = {};
	$('tr').each(function(index)
	{
		var $row = $(this);

		// If pair is valid, add to list
		if (validateRow($row)) {
			shortcuts[$row.find('.shortcut').val()] = $row.find('.autotext').val();
		}
	});

	// Save data into storage
	var data = {};
	data[STORAGE_KEY] = shortcuts;
	chrome.storage.sync.set(data, function()
	{
		if (chrome.runtime.lastError) {
			console.log(chrome.runtime.lastError);
		}
		else	// Success! Shortcuts saved
		{
			console.log("saveShortcuts success:", data);

			// Indicate success saving
			showCrouton('Shortcuts saved!');

			// Refresh
			setupShortcuts();
		}
	});
}

// Create and show and eventually hide a message crouton
function showCrouton(message)
{
	$('body').append($(document.createElement('div'))
		.addClass('crouton').addClass('green').text(message)
		.fadeIn('fast', function() {
			$(this).delay(1000).slideUp('fast', function() {
				$(this).remove();
			})
		})
	);
}
