'use strict';

// Constants & variables
var shortcutCache = {};                        // Cache for shortcuts

// Omnibox default first suggestion (instructions)
chrome.omnibox.setDefaultSuggestion({
  description: '<dim>Search shortcuts for:</dim> <match>%s</match>'
});

// On activation in omnibox
chrome.omnibox.onInputStarted.addListener(function ()
{
  console.log('Omnibox onInputStarted()');

  // Get and cache latest shortcuts for performance
  chrome.storage.sync.get(null, function(data)
  {
    console.log('caching shortcuts...');

    if (chrome.runtime.lastError) {	// Check for errors
      console.log(chrome.runtime.lastError);
    } else {
      shortcutCache = data;
    }
  });
});

// On omnibox input changed (user typing)
chrome.omnibox.onInputChanged.addListener(function (text, suggest)
{
  console.log('Omnibox onInputChanged:', text);

  // Use text to check shortcuts for expansions
  var expansion = shortcutCache[SHORTCUT_PREFIX + text];

  // If exists, surface expansion as suggestion
  if (expansion && expansion.length)
  {
    var suggestions = [];

    // Process expansion
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

    // Send suggestions to callback
    suggest(suggestions);
  }
});

// On omnibox suggestion accepted
chrome.omnibox.onInputEntered.addListener(function (text, disposition)
{
  console.log('Omnibox onInputEntered:', text, disposition);

  // If the entered text is a shortcut, expand it and jump
  var expansion = shortcutCache[SHORTCUT_PREFIX + text];

  // If exists, update text with expansion instead
  if (expansion && expansion.length) {
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
});
