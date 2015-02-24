var SHORTCUT_PREFIX = '@'               // Prefix to distinguish shortcuts vs metadata
    , SHORTCUT_TIMEOUT_KEY = 'scto'     // Synced key for shortcut typing timeout
    , SHORTCUT_VERSION_KEY = 'v#'       // Synced key for shortcut database version
    , APP_VERSION = '1.7.1'             // App version to check against shortcut database
    , APP_FIRST_RUN_KEY = 'autoTextExpanderFirstRun'  // Local key to check for first run
    , APP_BACKUP_KEY = 'autoTextExpanderBackup'       // Local key for backups
    , APP_BACKUP_TIMESTAMP_KEY = 'autoTextExpanderBackupTimestamp' // Local backup timestamp
    , APP_EMERGENCY_BACKUP_KEY = 'autoTextExpanderEmergencyBackup' // Emergency local backup
    , APP_ID_PRODUCTION = 'iibninhmiggehlcdolcilmhacighjamp'
    , DEBUG = (chrome.i18n.getMessage('@@extension_id') !== APP_ID_PRODUCTION)
;


