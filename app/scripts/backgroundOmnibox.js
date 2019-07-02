'use strict';

// Constants & variables
var shortcutCache = {};                        // Cache for shortcuts

// Omnibox default first suggestion (instructions)
chrome.omnibox.setDefaultSuggestion({
  description: '<dim>Search shortcuts for:</dim> <match>%s</match>'
});
chrome.omnibox.onInputChanged.addListener(omniboxInput);
chrome.omnibox.onInputStarted.addListener(omniboxActivated);
chrome.omnibox.onInputEntered.addListener(omniboxSubmitted);

// On activation in omnibox
function omniboxActivated() {
  console.log('Omnibox omniboxActivated()');
  chrome.storage.sync.get(null, function(data) {
    console.log('caching latest shortcuts for performance');
    if (chrome.runtime.lastError) {	// Check for errors
      console.error(chrome.runtime.lastError);
    } else {
      console.log('cached shortcuts');
      shortcutCache = data;
    }
  });
}

// On omnibox input changed (user typing)
function omniboxInput(text, suggest)
{
  console.log('Omnibox onInputChanged:', text);
  var expansion = shortcutCache[SHORTCUT_PREFIX + text]; // Use text to check shortcuts for expansions
  if (expansion && expansion.length) // If exists, use expansion as suggestion
  {
    var suggestions = [];
    var description = '<match>' + text + '</match>'
      + '<dim> &#8594; ' + expansion.split('\"').join('&quot;')
        .split('\'').join('&apos;')
        .split('<').join('&lt;')
        .split('>').join('&gt;')
        .split('&').join('&amp;')
      + '</dim>';
    suggestions.push({
      content: expansion,
      description: description,
    });
    suggest(suggestions);   // Send suggestions to callback
  }
}

// On omnibox suggestion accepted
function omniboxSubmitted(text, disposition)
{
  console.log('Omnibox onInputEntered:', text, disposition);

  // If the entered text is a shortcut, expand it and jump
  var expansion = shortcutCache[SHORTCUT_PREFIX + text];
  if (expansion && expansion.length) { // If exists, update text with expansion
    text = expansion;
  }

  // Check text for URL format prefix, otherwise add it
  if (text.indexOf('http') != 0) {
    text = 'http://' + text;
  }
  console.log('url:', text);

  // Update / open tab according to disposition
  switch (disposition)
  {
    default:    // Default to updating current tab
    case 'currentTab':
      chrome.tabs.update({url: text});
      break;

    case 'newForegroundTab':
      chrome.tabs.create({url: text});
      break;

    case 'newBackgroundTab':
      chrome.tabs.create({url: text, active: false});
      break;
  }
}
