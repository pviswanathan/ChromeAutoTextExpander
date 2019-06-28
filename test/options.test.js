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

  test('jquery init', function() {
    expect(typeof window.jQuery).toBe('function');
  });

  test('moment init', function() {
    expect(typeof window.moment).toBe('function');
  });

  test('constants init', function() {
    expect(APP_ID_PRODUCTION).toBe('iibninhmiggehlcdolcilmhacighjamp');
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
