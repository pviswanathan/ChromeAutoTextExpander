
// Prevent conflicts
jQuery.noConflict();

// Cross-browser solution for setting cursor position
(function($) {
	$.fn.setCursorPosition = function(pos) {
		if ($(this).get(0).setSelectionRange) {
			$(this).get(0).setSelectionRange(pos, pos);
		} else if ($(this).get(0).createTextRange) {
			var range = $(this).get(0).createTextRange();
			range.collapse(true);
			range.moveEnd('character', pos);
			range.moveStart('character', pos);
			range.select();
		}
	}
})(jQuery);

// Cross-browser solution for getting cursor position
(function($) {
    $.fn.getCursorPosition = function() {
        var el = $(this).get(0);
        var pos = 0;
        if('selectionStart' in el) {
            pos = el.selectionStart;
        } else if('selection' in document) {
            el.focus();
            var Sel = document.selection.createRange();
            var SelLength = document.selection.createRange().text.length;
            Sel.moveStart('character', -el.value.length);
            pos = Sel.text.length - SelLength;
        }
        return pos;
    }
})(jQuery);

// Encapsulated anonymouse function
(function($) {

	// Global Variables & Constants
	var OK = 0;
	var BACKSPACE_CODE = 8;
	var WHITESPACE_REGEX = /(\s)/;
	var LISTENER_EVENT = 'keypress.auto-expander';
	var STORAGE_KEY = 'autoTextExpanderShortcuts';
	var GOOGLE_DOMAIN = /mail.google.com/;
	var FACEBOOK_DOMAIN = /facebook.com/;

	var typingBuffer = [];		// Keep track of what's been typed before timeout
	var typingTimeout = 500;	// Half a second
	var typingTimer;			// Keep track of time between keypresses

	// When user presses a key
	function keyPressHandler(event)
	{
		event.stopPropagation();

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

	// Replacing text
	function replaceText(text, shortcut, autotext, cursorPosition)
	{
		console.log("replaceText:", text, shortcut, autotext, cursorPosition);
		var replacePosition = cursorPosition - shortcut.length;
		var replaceText = text.substr(0, replacePosition)
			+ autotext + text.substr(cursorPosition);
		console.log(replaceText);
		return replaceText;
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
					// Setup - add whitespace if was last character
					autotext += (WHITESPACE_REGEX.test(lastChar) ? lastChar : "");
					var $textInput = $(textInput);
					var text;

					// If input or textarea field, can easily change the val
					if ($textInput.is("textarea") || $textInput.is("input"))
					{
						var cursorPosition = $textInput.getCursorPosition()
						$textInput.val(replaceText(
							$textInput.val(),
							shortcut,
							autotext,
							cursorPosition
						));
						$textInput.setCursorPosition(cursorPosition + (autotext.length - shortcut.length));
					}
					else if ($textInput.is("div"))	// More trouble, special cases
					{
						// Test what domain is, use special cases
						console.log($textInput);
						var domain = window.location.host;
						if (GOOGLE_DOMAIN.test(domain))
						{
							$textInput = $textInput.find('div.gmail_default').first();
							text = $textInput.html();
						}
						else if (FACEBOOK_DOMAIN.test(domain))
						{
							$textInput = $textInput.find('span').first();
							text = $textInput.html();
						}
						else	// Not sure, try something
						{
							text = $textInput.html();
						}

						console.log(text);
						var newText = text.replace(shortcut, autotext)
							+ (WHITESPACE_REGEX.test(lastChar) ? lastChar : "");
						console.log($textInput, newText);
						$textInput.html(newText);
					}
				}
			}

			// If last character is a space, clear buffer
			if (lastChar == " ") {
				clearTypingBuffer();
			}
		});
	}

	// Attach listener to keypresses
	function addListeners() {
		$(document).on(LISTENER_EVENT, 'div,textarea,input[type=text]', keyPressHandler);
	}

	// Detach listener for keypresses
	function removeListeners() {
		$(document).off(LISTENER_EVENT);
	}

	// Document ready function
	$(function()
	{
		// Add listener to when user types
		addListeners();

		// Show page action if ready function ran
		chrome.runtime.sendMessage({request: "showPageAction"});
	});

})(jQuery);

