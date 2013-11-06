// Prevent conflicts
jQuery.noConflict();

// Encapsulated anonymous function
(function($) {

	// Variables & Constants
	var OK = 0;
	var KEYCODE_BACKSPACE = 8;
	var KEYCODE_RETURN = 13;
	var KEYCODE_SPACEBAR = 32;
	var DEFAULT_TYPING_TIMEOUT = 750;	// Delay before we clear buffer
	var DATE_MACRO_REGEX = /%d\(/g;
	var DATE_MACRO_CLOSE_TAG = ')';
	var WHITESPACE_REGEX = /(\s)/;
	var FACEBOOK_DOMAIN_REGEX = /facebook.com/;
	var EVENT_NAME_KEYPRESS = 'keypress.auto-expander';
	var EVENT_NAME_KEYUP = 'keyup.auto-expander';
	var EVENT_NAME_LOAD = 'load.auto-expander';
	var OLD_STORAGE_KEY = 'autoTextExpanderShortcuts';

	var typingBuffer = [];		// Keep track of what's been typed before timeout
	var typingTimer;			// Keep track of time between keypresses

	var keyPressEvent;			// Keep track of keypress event to prevent re-firing
	var keyUpEvent;				// Keep track of keyup event to prevent re-firing

	// When user presses a key
	function keyPressHandler(event)
	{
		// Make sure it's not the same event firing over and over again
		if (keyPressEvent == event) {
			return;
		} else {
			keyPressEvent = event;
		}

		// Get character that was typed
		var charCode = event.which;
		var char = String.fromCharCode(charCode);

		// Clear timer if still running, and start it again
		clearTypingTimer();
		typingTimer = setTimeout(clearTypingBuffer, typingTimeout);

		// Add new character to typing buffer
		typingBuffer.push(char);

		// Check typed text for shortcuts
		checkShortcuts(char, typingBuffer, event.target);
	}

	// When user lifts up on a key, to catch backspace
	function keyUpHandler(event)
	{
		// Make sure it's not the same event firing over and over again
		if (keyUpEvent == event) {
			return;
		} else {
			keyUpEvent = event;
		}

		// When user types backspace, pop character off buffer
		if (event.keyCode == KEYCODE_BACKSPACE)
		{
			// Clear timer and restart
			clearTypingTimer();
			typingTimer = setTimeout(clearTypingBuffer, typingTimeout);

			// Remove last character typed
			typingBuffer.pop();
		}
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
 		console.log("checkShortcuts:", lastChar, textBuffer);

		// Get shortcuts
		chrome.storage.sync.get(OLD_STORAGE_KEY, function(data)
		{
			// Check for errors
			if (chrome.runtime.lastError) {
				console.log(chrome.runtime.lastError);
			}
			// Check that data is returned and shortcut library exists
			else if (data && data[OLD_STORAGE_KEY])
			{
				// Check if shortcut exists and should be triggered
				var shortcut = textBuffer.join('');
				var autotext = data[OLD_STORAGE_KEY][shortcut];

				if (autotext)	// Shortcut exists! Expand and replace text
				{
					// Handle moment.js dates
					autotext = processDates(autotext);

					// Add whitespace if was last character
					autotext += (WHITESPACE_REGEX.test(lastChar) ? lastChar : "");

					// Setup for processing
					var domain = window.location.host;
					var $textInput = $(textInput);
					var cursorPosition = $textInput.getCursorPosition()
					var text;

					// If input or textarea field, can easily change the val
					if ($textInput.is("textarea") || $textInput.is("input"))
					{
						$textInput.val(replaceText(
							$textInput.val(),
							shortcut,
							autotext,
							cursorPosition
						));
						$textInput.setCursorPosition(cursorPosition
							- shortcut.length + autotext.length);
					}
					else	// Trouble... editable divs & special cases
					{
						// If on Facebook.com
						if (FACEBOOK_DOMAIN_REGEX.test(domain))
						{
							if ($textInput.find('span').get().length) {
								$textInput = $textInput.find('span').first();
							}

							// Get text and replace it
							text = $textInput.text();
							$textInput.text(replaceText(
								text,
								shortcut,
								autotext,
								cursorPosition
							));

							// Set new cursor position
							$textInput.setCursorPosition(
								cursorPosition - shortcut.length + autotext.length);
						}

						// All other elements
						else	//if ($textInput.is('[contenteditable]'))
						{
							// Get the focused / selected text node
							var node = findFocusedNode();
							var $textNode = $(node);

							// Find focused div instead of what's receiving events
							$textInput = $(node.parentNode);

							// Get and process text
							text = replaceText($textNode.text(),
								shortcut, autotext, cursorPosition);

							// If autotext is single line, simple case
							if (autotext.indexOf('\n') < 0)
							{
								// Set text node in element
								node = document.createTextNode(text);
								$textNode.replaceWith(node);

								// Update cursor position
								setCursorPositionInNode(node,
									cursorPosition - shortcut.length + autotext.length);
							}
							else	// Multiline expanded text
							{
								// Split text by lines
								var lines = text.split('\n');

								// For simplicity, join with <br> tag instead
								$textNode.replaceWith(lines.join('<br>'));

								// Find the last added text node
								$textNode = findMatchingTextNode($textInput,
									lines[lines.length - 1]);
								node = $textNode.get(0);
								console.log($textNode);
								console.log(node);

								// Update cursor position
								setCursorPositionInNode(node,
									lines[lines.length - 1].length);
							}
						}
					}
				}
			}

			// If last character is a space, clear buffer
			if (lastChar == " ") {
				clearTypingBuffer();
			}
		});
	}

	// Replacing shortcut with autotext in text at cursorPosition
	function replaceText(text, shortcut, autotext, cursorPosition)
	{
		console.log("cursorPosition:", cursorPosition);
		console.log("currentText:", text);
		console.log("shortcut:", shortcut);
		console.log("expandedText:", autotext);

		// Replace shortcut based off cursorPosition
		return [text.slice(0, cursorPosition - shortcut.length),
			autotext, text.slice(cursorPosition)].join('');
	}

	// Find node that has text contents that matches text
	function findMatchingTextNode($div, text)
	{
		return $div.contents().filter(function() {
				return (this.nodeType == 3)						// Return all text nodes
					&& (this.nodeValue.length == text.length);	// with same text length
			}).filter(function() {
				return (this.nodeValue == text);	// Filter for same text
			}).first();
	}

	// Find node that user is editing right now, for editable divs
	function findFocusedNode()
	{
		if (window.getSelection) {
			var selection = window.getSelection();
			if (selection.rangeCount) {
				return selection.getRangeAt(0).startContainer;
			}
		}
		return null;
	}

	// Sets cursor position for a specific node
	function setCursorPositionInNode(node, pos)
	{
		var sel, range;
		if (window.getSelection && document.createRange) {
			range = document.createRange();
 			range.setEnd(node, pos);
			range.setStart(node, pos);
			sel = window.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
		} else if (document.body.createTextRange) {
			range = document.body.createTextRange();
			range.setEnd(node, pos);
			range.setStart(node, pos);
			range.select();
		}
	}

	// Process and replace date tags and formats with moment.js
	function processDates(text)
	{
		var dateOpenTags = [], dateCloseTags = [];

		// Find all indices of opening tags
		while (result = DATE_MACRO_REGEX.exec(text)) {
			dateOpenTags.push(result.index);
		}

		if (!dateOpenTags.length) {
			return text;
		}

		// Find matching closing tag for each date
		for (var i = 0, len = dateOpenTags.length; i < len; ++i) {
			dateCloseTags[i] = text.indexOf(
				DATE_MACRO_CLOSE_TAG, dateOpenTags[i] + 1);
		}

		// Loop through and replace date tags with formatted text
		var processedText = [text.slice(0, dateOpenTags[0])];
		for (var i = 0, len = dateOpenTags.length; i < len; ++i)
		{
			processedText.push(moment().format(text.slice(
				dateOpenTags[i] + 3, dateCloseTags[i])));
			processedText.push(text.slice(dateCloseTags[i] + 1,
				(i == len - 1) ? undefined : dateOpenTags[i+1]));
		}

		// Return processed dates
		return processedText.join('');
	}

	// Attach listener to keypresses
	function addListeners()
	{
		// Add to editable divs, textareas, inputs
		$(document).on(EVENT_NAME_KEYPRESS,
			'div[contenteditable=true],textarea,input', keyPressHandler);
		$(document).on(EVENT_NAME_KEYUP,
			'div[contenteditable=true],textarea,input', keyUpHandler);

		// Attach to iframes as well
		$(document).find('iframe').each(function(index) {
			$(this).contents().on(EVENT_NAME_KEYPRESS,
				'div[contenteditable=true],textarea,input', keyPressHandler);
			$(this).contents().on(EVENT_NAME_KEYUP,
				'div[contenteditable=true],textarea,input', keyUpHandler);
		});

		// Attach to future iframes
		$(document).on(EVENT_NAME_LOAD, 'iframe', function(e) {
			$(this).contents().on(EVENT_NAME_KEYPRESS,
				'div[contenteditable=true],textarea,input', keyPressHandler);
			$(this).contents().on(EVENT_NAME_KEYUP,
				'div[contenteditable=true],textarea,input', keyUpHandler);
		});

		// Show page action if handlers attach
		chrome.runtime.sendMessage({request: "showPageAction"});
	}

	// Detach listener for keypresses
	function removeListeners() {
		$(document).off(EVENT_NAME_KEYPRESS);
		$(document).off(EVENT_NAME_KEYUP);
	}

	// Document ready function
	$(function() {
		addListeners();		// Add listener to track when user types
	});

})(jQuery);


/////////////////////////////////////////////////////////////////////////////////
// Utility Functions

// Cross-browser solution for setting cursor position
(function($) {
	$.fn.setCursorPosition = function(pos) {
		var input = $(this).get(0);
		var sel, range;
		if ($(this).is('input') || $(this).is('textarea')) {
			if (input.setSelectionRange) {
				input.setSelectionRange(pos, pos);
			} else if (input.createTextRange) {
				range = input.createTextRange();
				range.collapse(true);
				range.moveEnd('character', pos);
				range.moveStart('character', pos);
				range.select();
			}
		} else {	// Other elements
			var node = input.childNodes[0];	// Need to get text node
			if (window.getSelection && document.createRange) {
				range = document.createRange();
				range.selectNodeContents(input);
				range.collapse(true);
				range.setEnd(node, pos);
				range.setStart(node, pos);
				sel = window.getSelection();
				sel.removeAllRanges();
				sel.addRange(range);
			} else if (document.body.createTextRange) {
				range = document.body.createTextRange();
				range.moveToElementText(input);
				range.collapse(true);
				range.setEnd(node, pos);
				range.setStart(node, pos);
				range.select();
			}
		}
	}
})(jQuery);

// Cross-browser solution for getting cursor position
(function($) {
    $.fn.getCursorPosition = function() {
		var el = $(this).get(0);
		var pos = 0, sel;
		if ($(this).is('input') || $(this).is('textarea')) {
			if('selectionStart' in el) {
				pos = el.selectionStart;
			} else if('selection' in document) {
				el.focus();
				sel = document.selection.createRange();
				var SelLength = document.selection.createRange().text.length;
				Sel.moveStart('character', -el.value.length);
				pos = Sel.text.length - SelLength;
			}
		} else {	// Other elements
			if (window.getSelection) {
				sel = window.getSelection();
				if (sel.rangeCount) {
					pos = sel.getRangeAt(0).endOffset;
				}
			} else if (document.selection && document.selection.createRange) {
				sel = document.selection.createRange();
				var tempEl = document.createElement("span");
				el.insertBefore(tempEl, el.firstChild);
				var tempRange = sel.duplicate();
				tempRange.moveToElementText(tempEl);
				tempRange.setEndPoint("EndToEnd", sel);
				pos = tempRange.text.length;
			}
		}
		return pos;
    }
})(jQuery);

