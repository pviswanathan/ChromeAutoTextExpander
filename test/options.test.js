// options.js tests
'use strict';

// Prevent mocking these two functions
jest
  .dontMock('fs')
  .dontMock('vm')
  .dontMock('jquery')
  .dontMock('sinon-chrome');

// Mock out Chrome's extension APIs
import vm from 'vm';
import fs from 'fs';
import $ from 'jquery';
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
var html = fs.readFileSync('./app/options.html').toString();

describe('options.js', function() {
  document.documentElement.innerHTML = html;

  test('jquery init', function(done) {
    setTimeout(function() {
      expect(typeof document.defaultView.jQuery).toBe('function');
      done();
    }, 3000);
  });

  test('moment init', function() {
    setTimeout(function() {
      expect(typeof document.defaultView.moment).toBe('function');
      done();
    }, 3000);
  });

  test('constants init', function() {
    expect(document.defaultView.APP_ID_PRODUCTION).toBe('iibninhmiggehlcdolcilmhacighjamp');
  });

  // test('add a shortcut', function() {
  //   expect($('#err').hasClass('hidden')).toBeTruthy();
  // });

  // test('delete a shortcut', function() {
  //   expect($('#err').hasClass('hidden')).toBeTruthy();
  // });

  // test('import shortcuts', function() {
  //   expect($('#err').hasClass('hidden')).toBeTruthy();
  // });

  // test('export shortcuts', function() {
  //   expect($('#err').hasClass('hidden')).toBeTruthy();
  // });

});
