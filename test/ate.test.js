// ate.js tests
'use strict';

// Prevent mocking these two functions
jest
  .dontMock('fs')
  .dontMock('vm')
  .dontMock('jQuery')
  .dontMock('sinon-chrome');

// Mock out Chrome's extension APIs
import vm from 'vm';
import fs from 'fs';
import chrome from 'sinon-chrome';
beforeEach(() => {
  window.chrome = chrome;
  chrome.runtime.sendMessage.flush();
});
afterEach(() => {
  chrome.flush();
  delete window.chrome;
});

// Setup
import jQuery from '../app/vendor/scripts/jquery-2.1.1-simplified.min.js'
var html = fs.readFileSync('../app/options.html').toString();

describe('ate.js', function() {

  test('gmail.com', function() {
  });
});
