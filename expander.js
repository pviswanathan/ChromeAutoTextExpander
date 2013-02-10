
// Global Variables & Constants
var OK = 0;
var STORAGE_KEY = 'autoTextExpanderShortcuts';

var typingBuffer = [];		// Keep track of what's been typed before timeout
var typingTimeout = 500;	// Half a second
var typingTimer;			// Keep track of time between keypresses

// Document ready function
$(function()
{
	// Add listener to when user types
	$(document).on('keypress', 'textarea,input[type=text]', keyPressHandler);
});

// When user presses a key
function keyPressHandler(event)
{
	var char = String.fromCharCode(event.which);

	// Clear timer if still running, and start it again
	clearTypingTimer();
	typingTimer = setTimeout(clearTypingBuffer, typingTimeout);

	// Add new character to typing buffer
	typingBuffer.push(char);

	// Check typed text for shortcuts
	checkShortcuts(char, typingBuffer, event.target);
}

// Clears the typing timer
function clearTypingTimer()
{
	// Clear timer handle
	if (typingTimer) {
		clearTimeout(typingTimer);
		typingTimer = null;
	}
}

// Clears the typing buffer
function clearTypingBuffer()
{
	// Clear timer
	clearTypingTimer();

	// Clear buffer
	typingBuffer.length = 0;
}

// Check to see if text in argument corresponds to any shortcuts
function checkShortcuts(lastChar, textBuffer, textInput)
{
	// Get shortcuts
	chrome.storage.sync.get(STORAGE_KEY, function(data)
	{
		// Check that data is returned and shortcut library exists
		if (data && data[STORAGE_KEY])
		{
			// Check if shortcut exists and should be triggered
			var shortcut = textBuffer.join('');
			var autotext = data[STORAGE_KEY][shortcut];

			if (autotext)	// Shortcut exists! Expand and replace text
			{
				var text = $(textInput).val();
				$(textInput).val(text.substr(0, text.length - textBuffer.length)
					+ autotext + (lastChar == " " ? " " : ""));
			}
		}

		// If last character is a space, clear buffer
		if (lastChar == " ") {
			clearTypingBuffer();
		}
	});
}

