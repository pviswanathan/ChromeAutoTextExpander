'use strict';

// GLOBAL CONSTANTS
var ATE_CONST = {
  APP_VERSION: '2.0.0'           // App version to check against shortcut database
  , APP_BACKUP_KEY: 'autoTextExpanderBackup'       // Local key for backups
  , APP_BACKUP_TIMESTAMP_KEY: 'autoTextExpanderBackupTimestamp' // Local backup timestamp
  , APP_EMERGENCY_BACKUP_KEY: 'autoTextExpanderEmergencyBackup' // Emergency local backup
  , APP_ID_PRODUCTION: 'iibninhmiggehlcdolcilmhacighjamp'
  , SHORTCUT_PREFIX: '@'             // Prefix to distinguish shortcuts vs metadata
  , SHORTCUT_TIMEOUT_KEY: 'scto'     // Synced key for shortcut typing timeout
  , SHORTCUT_VERSION_KEY: 'v#'       // Synced key for shortcut database version
  , INSERT_CLIPBOARD_TAG: '%clip%'    // Tag to paste clipboard contents in
  , INSERT_URL_TAG: '%url%'          // Tag to insert current URL in
  , INSERT_DATE_TAG: '%d('           // Tag to insert date from moment.js
  , INSERT_DATE_CLOSE_TAG: ')'       // Closing tag for insert-date
  , CURSOR_TRACKING_TAG: '?atec?'    // Way to track cursor location
};
ATE_CONST.CURSOR_TRACKING_HTML =     // HTML to insert into expansion
  (function() {
    var el = document.createElement('div');
    el.appendChild(document.createComment(CURSOR_TRACKING_TAG));
    return el.innerHTML;
  })();
var DEBUG = (!chrome || chrome.i18n.getMessage('@@extension_id') !== ATE_CONST.APP_ID_PROD);
