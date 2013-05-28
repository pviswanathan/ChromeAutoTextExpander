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
	$('#edit').on('focus', 'input', editRowHandler);
	$('#input').on('keydown', 'input', inputHandler);

	// Button handlers
	$('#refresh').click(setupShortcuts);
	$('#edit').on('click', '.remove', removeRow);
	$('#add').click(function(event) {
		event.preventDefault();
		addRow();
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
			$.each(data[STORAGE_KEY], function(key, value)
			{
				$(document.createElement('tr'))
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
							.attr('value', key)
						)
					)
					.append($(document.createElement('td'))
						.append($(document.createElement('input'))
							.attr('type', 'text')
							.addClass('autotext')
							.attr('value', value)
						)
					)
					.appendTo('#edit');
			});
		}

		// Add input fields
		$(document.createElement('tr'))
			.attr("id", "input")
			.append($(document.createElement('td'))
				.attr('width', '16px')
			)
			.append($(document.createElement('td'))
				.attr('width', '92px')
				.append($(document.createElement('input'))
					.attr('type', 'text')
					.addClass('shortcut')
					.attr('value', DEFAULT_SHORTCUT)
				)
			)
			.append($(document.createElement('td'))
				.append($(document.createElement('input'))
					.attr('type', 'text')
					.addClass('autotext')
					.attr('value', DEFAULT_AUTOTEXT)
				)
			)
			.appendTo('#edit');

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

// When a row in the edit table gets focused on or typed in
function editRowHandler(event)
{
	// Check to see if input pair is valid
	var $input = $(event.target).parents('tr');
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
}

// When the last input field is being typed into
function inputHandler(event)
{
	// If enter pressed on either field
	if (event.which == KEYCODE_ENTER)
	{
		event.preventDefault();		// prevent submitting form
		if (validateRow($(event.target).parents('tr'))) {
			addRow();
		}
	}
	else if (event.which > 47 && event.which < 91)	// Regular character
	{
		// If input fields typed into, change color
		var text = $(event.target).val();
		if (text != DEFAULT_SHORTCUT && text != DEFAULT_AUTOTEXT) {
			$(event.target).css('color', '#444');
		} else {	// Default text coloring
			$(event.target).css('color', '#aaa');
		}
	}
	else if (event.which == KEYCODE_TAB && $(this).hasClass('autotext'))
	{
		// If both fields are filled out, add new row
		if (validateRow($(event.target).parents('tr'))) {
			addRow();
		}
	}
}

// Remove shortcut row in edit table
function removeRow(event)
{
	$(this).parents('tr').fadeOut('fast', function() {$(this).remove();});
}

// Add new row to shortcuts edit table
function addRow(callback)
{
	// Create new row and set coloring
	var $input = $('#input');
	$input.clone().removeAttr("id").insertBefore($input).find('input').css('color', '#444');

	// Reset text & color for input row
	$input.find('input').css('color', '#aaa').val(DEFAULT_AUTOTEXT).removeClass('error');
	$input.find('.shortcut').val(DEFAULT_SHORTCUT);

	// Call callback if given
	if (callback) {
		callback();
	}
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
	var pairs = $('tr').get();
	var shortcuts = {};
	for (var i = pairs.length - 1, pair = pairs[i]; i >= 0; pair = pairs[--i])
	{
		// If pair is valid, add to list
		if (validateRow($(pair))) {
			shortcuts[$(pair).find('.shortcut').val()] = $(pair).find('.autotext').val();
		}
	}

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
