// ate.js tests
'use strict';

// Mock out Chrome's extension APIs
import vm from 'vm';
import fs from 'fs';
import chrome from 'sinon-chrome';
window.chrome = chrome;

describe('initialization', function() {
  it('should pass', function() {
    expect(true).toBeTruthy();
  });
  // describe('jquery init', function() {
  //   it('should be available as a function', function() {
  //     expect(typeof window.jQuery).to.equal('function');
  //   });
  // });
  // describe('moment init', function() {
  //   it('should be available as a function', function() {
  //     expect(typeof window.moment).to.equal('function');
  //   });
  // });
  // describe('constants init', function() {
  //   it('should have PROD chrome extension ID', function() {
  //     expect(APP_ID_PRODUCTION).to.equal('iibninhmiggehlcdolcilmhacighjamp');
  //   });
  // });
});
