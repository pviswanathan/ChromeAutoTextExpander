// Global Variables
var DEFAULT_SHORTCUT = "Shortcut"
  , DEFAULT_AUTOTEXT = "Expanded Text"
  , KEYCODE_ENTER = 13
  , KEYCODE_TAB = 9;


// Document ready
$(function()
{
	// When user types into input fields
	$('#edit').on('keydown', 'input', editRowHandler);
	$('#edit').on('focus', 'input', editRowHandler);
	$('#input').on('keydown', 'input', inputHandler);

	// Button handlers
	$('#add').click(function(event) {
		event.preventDefault();
		addRow();
	});
});

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

// Add new row to shortcuts database
function addRow(callback)
{
	// Create new row and set coloring
	var $input = $('#input');
	$input.clone().removeAttr("id").insertBefore($input).find('input').css('color', '#444');

	// Reset text & color for input row
	$input.find('input').css('color', '#aaa').val(DEFAULT_AUTOTEXT).removeClass('error');
	$input.find('.shortcut').val(DEFAULT_SHORTCUT);

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

	console.log(errors);

	// Callback if given
	if (callback) {
		callback(errors);
	}
	return !errors.shortcut && !errors.autotext;
}
