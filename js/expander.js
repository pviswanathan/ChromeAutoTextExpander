// Prevent conflicts
jQuery.noConflict();

// Encapsulated anonymous function
(function($) {

	// Variables & Constants
	var OK = 0
		, KEYCODE_BACKSPACE = 8
		, KEYCODE_TAB = 9
		, KEYCODE_RETURN = 13
		, KEYCODE_SPACEBAR = 32
		, TIME_CLEAR_BUFFER_TIMEOUT = 750
		, TIME_CHECK_EDITABLE_ELEMENTS = 1000 * 30	// Every 30 seconds
        , TIME_OUTLOOK_EDITOR_CHECK = 500
		, DATE_MACRO_REGEX = /%d\(/g
		, DATE_MACRO_CLOSE_TAG = ')'
		, CLIP_MACRO_REGEX = /%clip%/g
		, WHITESPACE_REGEX = /(\s)/
		, BASECAMP_DOMAIN_REGEX = /basecamp.com/
		, EVERNOTE_DOMAIN_REGEX = /evernote.com/
		, FACEBOOK_DOMAIN_REGEX = /facebook.com/
		, GMAIL_DOMAIN_REGEX = /mail.google.com/
		, OUTLOOK_DOMAIN_REGEX = /mail.live.com/
		, EVENT_NAME_KEYPRESS = 'keypress.auto-expander'
		, EVENT_NAME_KEYUP = 'keyup.auto-expander'
		, EVENT_NAME_BLUR = 'blur.auto-expander'
		, EVENT_NAME_FOCUS = 'focus.auto-expander'
		, EVENT_NAME_LOAD = 'load.auto-expander'
		, EVENT_NAME_INSERTED = 'DOMNodeInserted'
        , SELECTOR_EDITABLE_BODY = 'body[contenteditable=true]'
		, SELECTOR_INPUT = 'div[contenteditable=true],body[contenteditable=true],textarea,input'
        , SELECTOR_GMAIL_EDIT = 'div.aoI'
        , SELECTOR_OUTLOOK_EDIT = '#ComposeRteEditor_surface'
        , SELECTOR_EVERNOTE_EDIT = '#gwt-debug-noteEditor'
        , SELECTOR_BASECAMP_EDIT = 'iframe.wysihtml5-sandbox'
		, OLD_STORAGE_KEY = 'autoTextExpanderShortcuts'
		, APP_ID_PRODUCTION = 'iibninhmiggehlcdolcilmhacighjamp'
		, DEBUG = (chrome.i18n.getMessage('@@extension_id') !== APP_ID_PRODUCTION)
	;

	var typingBuffer = [];		// Keep track of what's been typed before timeout
	var typingTimer;			// Keep track of time between keypresses
	var typingTimeout;		 	// Delay before we clear buffer
	var keyPressEvent;			// Keep track of keypress event to prevent re-firing
	var keyUpEvent;				// Keep track of keyup event to prevent re-firing
	var clipboard;				// Keep track of what's in the clipboard

	// Custome log function
	function debugLog() {
		if (DEBUG && console) {
			console.log.apply(console, arguments);
		}
	}

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
		var charCode = event.keyCode || event.which;
		if (charCode == KEYCODE_RETURN) {	// If return, clear and get out
			return clearTypingBuffer();
		}

		// Clear timer if still running, and start it again
		clearTypingTimer();
		typingTimer = setTimeout(clearTypingBuffer, typingTimeout);

		// Add new character to typing buffer
		var char = String.fromCharCode(charCode);
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

		// Get key that was lifted on
		var charCode = event.keyCode || event.which;

		// When user types backspace, pop character off buffer
		if (charCode == KEYCODE_BACKSPACE)
		{
			// Clear timer and restart
			clearTypingTimer();
			typingTimer = setTimeout(clearTypingBuffer, typingTimeout);

			// Remove last character typed
			typingBuffer.pop();
		}

		// If user uses tab or return, clear and get out
		if (charCode == KEYCODE_TAB || charCode == KEYCODE_RETURN) {
			return clearTypingBuffer();
		}
	}

    // Updates buffer clear timeout from custom value
    function updateBufferTimeout()
    {
		chrome.storage.sync.get("BUFFERTIMEOUT", function (data)
		{
			// Check for errors
			if (chrome.runtime.lastError) {
				console.log(chrome.runtime.lastError);
			}
			// Check that data is returned and shortcut library exists
			else if (!$.isEmptyObject(data)) {
                // TODO: set value
                // typingTimeout = data['value'];
            } else {  // Use default value on error / no custom value set
                typingTimeout = TIME_CLEAR_BUFFER_TIMEOUT;
            }
        });
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
	function clearTypingBuffer(event)
	{
		// Clear timer
		clearTypingTimer();

		// Clear buffer
		typingBuffer.length = 0;
	}

	// Check to see if text in argument corresponds to any shortcuts
	function checkShortcuts(lastChar, textBuffer, textInput)
	{
 		debugLog("checkShortcuts:", lastChar, textBuffer);

		// Get shortcuts
		var shortcut = textBuffer.join('');
		chrome.storage.sync.get(shortcut, function (data)
		{
			// Check for errors
			if (chrome.runtime.lastError) {
				console.log(chrome.runtime.lastError);
			}
			// Check that data is returned and shortcut library exists
			else if (!$.isEmptyObject(data))
			{
				// Check if shortcut exists and should be triggered
				var autotext = data[shortcut];

				if (autotext)	// Shortcut exists! Expand and replace text
				{
					// Update / get clipboard text
					getClipboardData(function()
					{
						// Handle clipboard pastes
						autotext = processClips(autotext);

						// Handle moment.js dates
						autotext = processDates(autotext);

						// Add whitespace if was last character
						if (WHITESPACE_REGEX.test(lastChar)) {
							autotext += lastChar;
						}

						// Setup for processing
						var domain = window.location.host;
						var $textInput = $(textInput);
						var cursorPosition = $textInput.getCursorPosition()
						var text;

                        debugLog("textInput: ", $textInput);

						// If input or textarea field, can easily change the val
						if ($textInput.is("textarea") || $textInput.is("input")) {
                            replaceTextRegular(shortcut, autotext, cursorPosition, $textInput);
						}
						else	// Trouble... editable divs & special cases
						{
                            // Check special domains
							if (FACEBOOK_DOMAIN_REGEX.test(domain)) {
                                replaceTextFacebook(shortcut, autotext, 
                                                    cursorPosition, $textInput);
                            } else if (OUTLOOK_DOMAIN_REGEX.test(domain)) {
                                replaceTextOutlook(shortcut, autotext);
                            } else if (EVERNOTE_DOMAIN_REGEX.test(domain)) {
                                replaceTextEvernote(shortcut, autotext);
                            } else if (BASECAMP_DOMAIN_REGEX.test(domain)) {
                                replaceTextBasecamp(shortcut, autotext);
							} else {
                                debugLog("Domain:", domain);
								replaceTextEditableDiv(shortcut, autotext, cursorPosition);
							}
						}
					});	// END - getClipboardData()
				}	// END - if (autotext)
			}	// END - if (!$.isEmptyObject(data))

			// If last character is a space, clear buffer
			if (lastChar == " ") {
				clearTypingBuffer();
			}
		});
	}

    // Specific handler for regular textarea and input elements
    function replaceTextRegular(shortcut, autotext, cursorPosition, $textInput)
    {
        // Fix for input[type=email] and input[type=number]
        if (cursorPosition === 0
            && $textInput.is('input[type="email"],input[type="number"]')) {
            cursorPosition = $textInput.val().length;
        }

        $textInput.val(replaceText(
            $textInput.val(),
            shortcut,
            autotext,
            cursorPosition
        ));
        $textInput.setCursorPosition(cursorPosition
            - shortcut.length + autotext.length);
    }

    // Handler for replacing text in editable divs
    function replaceTextEditableDiv(shortcut, autotext, cursorPosition)
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
            debugLog($textNode);
            debugLog(node);

            // Update cursor position
            setCursorPositionInNode(node,
                lines[lines.length - 1].length);
        }
    }

    // Specific handler for Facebook element replacements
    function replaceTextFacebook(shortcut, autotext, cursorPosition, $textInput)
    {
        debugLog("Domain: Facebook");

        // Check if it is the search bar vs comments
        if ($textInput.parents('div.textInput').length) 
        {
            debugLog('facebook search bar');
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
        else if ($textInput.parents('div.UFICommentContainer').length) {
            debugLog('facebook comments');

            // TODO: this doesn't work, probably due to ReactJS framework, doesn't allow expansion to stay
            /*
            // Get spans in the comment container div, and find the right one to replace
            $textNode = recursiveFindContainingTextNode($textInput, shortcut);
            node = $textNode.get(0);
            debugLog($textNode);
            debugLog(node);

            // Replace text in node
            var text = replaceText(
                $textNode.text(),
                shortcut,
                autotext,
                cursorPosition
            );
            node.nodeValue = text;

            // Set cursor position?
            */
        } 
        else 
        {
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
    }

    // Specific handler for Basecamp iframe replacements
    function replaceTextBasecamp(shortcut, autotext)
    {
        debugLog("Domain: Basecamp");

        // Get the focused / selected text node
        var iframeWindow = $(SELECTOR_BASECAMP_EDIT)
            .get(0).contentWindow;
        var node = findFocusedNode(iframeWindow);
        var $textNode = $(node);
        debugLog($textNode);

        // Pass onto editable iframe text handler
        replaceTextEditableIframe(shortcut, autotext, node, $textNode, iframeWindow);
    }

    // Specific handler for Outlook iframe replacements
    function replaceTextOutlook(shortcut, autotext)
    {
        debugLog("Domain: Outlook");

        // Get the focused / selected text node
        var iframeWindow = $(SELECTOR_OUTLOOK_EDIT)
            .get(0).contentWindow;
        var node = findFocusedNode(iframeWindow);
        var $textNode = $(node);
        debugLog($textNode);

        // Pass onto editable iframe text handler
        replaceTextEditableIframe(shortcut, autotext, node, $textNode, iframeWindow);
    }

    // Specific handler for Evernote iframe replacements
    function replaceTextEvernote(shortcut, autotext)
    {
        debugLog("Domain: Evernote");

        // Get the focused / selected text node
        var iframeWindow = $(SELECTOR_EVERNOTE_EDIT)
            .find('iframe').get(0).contentWindow;
        var node = findFocusedNode(iframeWindow);
        var $textNode = $(node);
        debugLog($textNode);

        // Pass onto editable iframe text handler
        replaceTextEditableIframe(shortcut, autotext, node, $textNode, iframeWindow);
    }

    // Reusable handler for editable iframe text replacements
    function replaceTextEditableIframe(shortcut, autotext, node, $textNode, iframeWindow)
    {
        // Find focused div instead of what's receiving events
        $textInput = $(node.parentNode);
        debugLog($textInput);

        // Get and process text, update cursor position
        cursorPosition = $textInput.getCursorPosition(iframeWindow);
        text = replaceText($textNode.text(),
            shortcut, autotext, cursorPosition);

        // If autotext is single line, simple case
        if (autotext.indexOf('\n') < 0)
        {
            // Set text node in element
            var newNode = document.createTextNode(text);
            node.parentNode.replaceChild(newNode, node);

            // Update cursor position - TODO: can't get this to work
            setCursorPositionInNode(newNode,
                cursorPosition - shortcut.length + autotext.length, iframeWindow);
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
            debugLog($textNode);
            debugLog(node);

            // Update cursor position - TODO: can't get this to work
            setCursorPositionInNode(node,
                lines[lines.length - 1].length, iframeWindow);
        }
    }

	// Replacing shortcut with autotext in text at cursorPosition
	function replaceText(text, shortcut, autotext, cursorPosition)
	{
		debugLog("cursorPosition:", cursorPosition);
		debugLog("currentText:", text);
		debugLog("shortcut:", shortcut);
		debugLog("expandedText:", autotext);

		// Replace shortcut based off cursorPosition
		return [text.slice(0, cursorPosition - shortcut.length),
			autotext, text.slice(cursorPosition)].join('');
	}

    // Recursive search for node containing text
    function recursiveFindContainingTextNode($div, text)  {
        var $result = recursiveFindContainingTextNodeHelper($div, text, 0);
        return ($result.value.get(0).nodeValue.indexOf(text) >= 0) ? $result.value : null;
    }
    // Recursive helper for containing search
    function recursiveFindContainingTextNodeHelper($div, text, level) 
    {
        // If it has children, recurse
        var children = $div.children()
            , childResults = [];
        for (var i = 0; i < children.length; ++i) {
            childResults.push(
                recursiveFindContainingTextNodeHelper($(children[i]), text, level + 1)
            );
        }

        // Get value for existing node
        var value = findContainingTextNode($div, text);

        // Compare to children, get deepest level
        var maxDepth = level;
        for (var i = 0, result; i < childResults.length; ++i) {
            result = childResults[i];
            if (result.value && result.level > maxDepth) {
                maxDepth = result.level;
                value = result.value;
            }
        }

        // Return deepest result
        return {level: maxDepth, value: value};
    }
	// Find node that has text contents that contains text
	function findContainingTextNode($div, text)
	{
		var result = $div.contents().filter(function() {
				return (this.nodeType == 3)						// Return all text nodes
					&& (this.nodeValue.indexOf(text) >= 0);	    // containing text
			}).last();  // Return last (deepest) match
        return ((result.length == 0) || $.isEmptyObject(result)) ? null : result;
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
	//  Optional passed window to perform selection find on
	function findFocusedNode(win)
	{
		// Use default window if not given window to search in
		if (!win) {
			win = window;
		}

		// Look for selection
		if (win.getSelection) {
			var selection = win.getSelection();
			if (selection.rangeCount) {
				return selection.getRangeAt(0).startContainer;
			}
		}
		return null;
	}

	// Sets cursor position for a specific node, and optional
    //  parameter to set what the window/document should be
	function setCursorPositionInNode(node, pos, win, doc)
	{
        debugLog('setCursorPositionInNode:', pos);

        // Setup variables
		var sel, range;
        if (!win) {
            win = window;
        }
        if (!doc) {
            doc = document;
        }

        // Check for getSelection(), if not available, try createTextRange
		if (win.getSelection && doc.createRange) 
        {
			range = doc.createRange();
 			range.setEnd(node, pos);
			range.setStart(node, pos);
			sel = win.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
		} 
        else if (doc.body.createTextRange) 
        {
			range = doc.body.createTextRange();
			range.setEnd(node, pos);
			range.setStart(node, pos);
			range.select();
		}
	}

	// Process and replace clip tags with content from clipboard
	function processClips(text)
	{
		debugLog('processClips', text);

		// Find all indices of opening tags
		var clipTags = [];
		while (result = CLIP_MACRO_REGEX.exec(text)) {
			clipTags.push(result.index);
		}

		// Only continue if we have any tags
		if (!clipTags.length) {
			return text;
		}
		debugLog('clipTags:', clipTags);

		// Loop through and replace clip tags with clipboard pasted text
		var processedText = [text.slice(0, clipTags[0])];
		console.log(processedText);
		for (var i = 0, len = clipTags.length; i < len; ++i)
		{
			processedText.push(clipboard);
		    console.log('pre', processedText);
			processedText.push(text.slice(clipTags[i] + 6,	// 6 for "%clip%"
				(i == len - 1) ? undefined : clipTags[i+1]));
		    console.log('post', processedText);
		}

		// Return processed dates
		return processedText.join('');
	}

	// Process and replace date tags and formats with moment.js
	function processDates(text)
	{
		var dateOpenTags = [], dateCloseTags = [];

		// Find all indices of opening tags
		while (result = DATE_MACRO_REGEX.exec(text)) {
			dateOpenTags.push(result.index);
		}

		// Only continue if we have any tags
		if (!dateOpenTags.length) {
			return text;
		}

		// Find matching closing tag for each date
		for (var i = 0, len = dateOpenTags.length; i < len; ++i) {
			dateCloseTags[i] = text.indexOf(
				DATE_MACRO_CLOSE_TAG, dateOpenTags[i] + 1);
		}

		// Only continue if we have matching tags
		if (dateOpenTags.length != dateCloseTags.length) {
			return text;
		}

		// Loop through and replace date tags with formatted text
		var processedText = [text.slice(0, dateOpenTags[0])];
		for (var i = 0, len = dateOpenTags.length; i < len; ++i)
		{
			processedText.push(moment().format(text.slice(
				dateOpenTags[i] + 3, dateCloseTags[i])));		// 3 for "%d("
			processedText.push(text.slice(dateCloseTags[i] + 1,	// 1 for ")"
				(i == len - 1) ? undefined : dateOpenTags[i+1]));
		}

		// Return processed dates
		return processedText.join('');
	}

	// Check if page has editable elements - based off PopChrom
	function hasEditableElements() {
		return $(document).find(SELECTOR_INPUT).length;
	}

	// Get what's stored in the clipboard
	function getClipboardData(completionBlock) {
		chrome.runtime.sendMessage({
			request:"getClipboardData"
		}, function(data) {
			console.log('getClipboardData:', data);
			clipboard = data.paste;
			if (completionBlock) {
				completionBlock();
			}
		});
	}

    // Add event listeners to specific div
    function refreshListenersOnDiv($target)
    {
        debugLog('refreshListeners:', $target);
        $target.off(EVENT_NAME_KEYPRESS).on(EVENT_NAME_KEYPRESS, SELECTOR_INPUT, keyPressHandler);
        $target.off(EVENT_NAME_KEYUP).on(EVENT_NAME_KEYUP, SELECTOR_INPUT, keyUpHandler);
		$target.off(EVENT_NAME_BLUR).on(EVENT_NAME_BLUR, SELECTOR_INPUT, clearTypingBuffer);
    }

	// Add event listeners to iframe - based off PopChrom
	function addListenersToIframe($target)
	{
		// Attach to iframe's contents
		try 
        {
			$target.contents().on(EVENT_NAME_KEYPRESS, SELECTOR_INPUT, keyPressHandler);
			$target.contents().on(EVENT_NAME_KEYUP, SELECTOR_INPUT, keyUpHandler);
		} 
        catch (exception) {
			console.log(exception);
		}

		// Attach to its load event in case it hasn't loaded yet
		$target.on(EVENT_NAME_LOAD, function(event)		// On load
		{
			debugLog("Attempting to attach listeners to new iframe");
			var $iframe = $(this);
			try 
            {
				$iframe.contents().on(EVENT_NAME_KEYPRESS,
					SELECTOR_INPUT, keyPressHandler);
				$iframe.contents().on(EVENT_NAME_KEYUP,
					SELECTOR_INPUT, keyUpHandler);

				// Special cases
				var domain = $iframe.contents().get(0).location.host;
				debugLog('iframe location:', domain);

				if (EVERNOTE_DOMAIN_REGEX.test(domain))
				{
					$iframe.contents().find(SELECTOR_EDITABLE_BODY)
						.on(EVENT_NAME_KEYPRESS, keyPressHandler);
					$iframe.contents().find(SELECTOR_EDITABLE_BODY)
						.on(EVENT_NAME_KEYUP, keyUpHandler);
				}
			} 
            catch (exception) {
				console.log(exception);
			}
		});
	}

	// Attach listener to keypresses
	function addListeners()
	{
		// Add to editable divs, textareas, inputs
		var $document = $(document);
        var domain = window.location.host;

		$document.on(EVENT_NAME_KEYPRESS, SELECTOR_INPUT, keyPressHandler);
		$document.on(EVENT_NAME_KEYUP, SELECTOR_INPUT, keyUpHandler);
		$document.on(EVENT_NAME_BLUR, SELECTOR_INPUT, clearTypingBuffer);

        // Special case for Gmail.com
        if (GMAIL_DOMAIN_REGEX.test(domain)) 
        {
            debugLog("Domain: Gmail");
            SELECTOR_INPUT += ',div.editable';

            // Annoying way to do this, but need to check for focus on div.aoI
            $document.on(EVENT_NAME_FOCUS, SELECTOR_GMAIL_EDIT, function(event) 
            {
                debugLog('focused on message editor');
                // Check that it is the dialog
                if ($(event.target).parents('div[role=dialog]').length) {
                    refreshListenersOnDiv($(event.target).parents(SELECTOR_GMAIL_EDIT));
                }
            });
        }

        // Special case for Outlook.com
        if (OUTLOOK_DOMAIN_REGEX.test(domain)) 
        {
            debugLog("Domain: Outlook");

            // Super annoying way to do this, need to check for #ComposeRteEditor_surface
            var editorCheck = setInterval(function() {
                var $target = $(SELECTOR_OUTLOOK_EDIT);
                if ($target.length) {
                    clearInterval(editorCheck);
                    addListenersToIframe($target);
                }
            }, TIME_OUTLOOK_EDITOR_CHECK);
        }

		// Attach to future iframes
		$document.on(EVENT_NAME_INSERTED, function(event) 
        {
			var $target = $(event.target);
			if ($target.is('iframe')) 
            {
                debugLog('inserted:', $target);
				addListenersToIframe($target);
			}
		});

		// Attach to existing iframes as well - this needs to be at the end
		//  because sometimes this breaks depending on cross-domain policy
		$document.find('iframe').each(function(index) {
			addListenersToIframe($(this));
		});
	}

	// Detach listener for keypresses
	function removeListeners() 
    {
		$(document).off(EVENT_NAME_KEYPRESS);
		$(document).off(EVENT_NAME_KEYUP);
		$(document).off(EVENT_NAME_LOAD);
		$(document).off(EVENT_NAME_BLUR);
	}

	// Document ready function
	$(function() 
    {
        updateBufferTimeout();  // Get custom timeout for clearing typing buffer
		addListeners();         // Add listener to track when user types
	});

})(jQuery);


/////////////////////////////////////////////////////////////////////////////////
// Utility Functions

// Cross-browser solution for setting cursor position
(function($) {
	$.fn.setCursorPosition = function(pos) {
        console.log('setCursorPosition:', pos);
		var input = $(this).get(0);
		var sel, range;
		if ($(this).is('input') || $(this).is('textarea')) {
			try {	// Needed for new input[type=email] failing
				if (input.setSelectionRange) {
					input.setSelectionRange(pos, pos);
				} else if (input.createTextRange) {
					range = input.createTextRange();
					range.collapse(true);
					range.moveEnd('character', pos);
					range.moveStart('character', pos);
					range.select();
				}
			} catch (exception) {
				console.log('setCursorPosition', exception);
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
    $.fn.getCursorPosition = function(win, doc) {
		var el = $(this).get(0);
		var pos = 0, sel;
		if (!win) { win = window; }
		if (!doc) { doc = document; }
		if ($(this).is('input') || $(this).is('textarea')) {
			try {	// Needed for new input[type=email] failing
				if (el.selectionStart) {
					pos = el.selectionStart;
				} else if (doc.selection) {
					el.focus();
					sel = doc.selection.createRange();
					var SelLength = doc.selection.createRange().text.length;
					Sel.moveStart('character', -el.value.length);
					pos = Sel.text.length - SelLength;
				}
			} catch (exception) {
				console.log('getCursorPosition:', exception);
			}
		} else {	// Other elements
			if (win.getSelection) {
				sel = win.getSelection();
				if (sel.rangeCount) {
					pos = sel.getRangeAt(0).endOffset;
				}
			} else if (doc.selection && doc.selection.createRange) {
				sel = doc.selection.createRange();
				var tempEl = doc.createElement("span");
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

