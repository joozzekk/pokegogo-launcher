export enum FTPChannel {
  LIST_FILES = 'ftp:list-files',
  CREATE_FOLDER = 'ftp:create-folder',
  UPLOAD_FILE = 'ftp:upload-file',
  UPLOAD_FOLDER = 'ftp:upload-folder',
  ZIP_FOLDER = 'ftp:zip-folder',
  UNZIP_FILE = 'ftp:unzip-file',
  REMOVE_FILE = 'ftp:remove-file',
  REMOVE_FOLDER = 'ftp:remove-folder',
  SET_HASH_FLAG = 'ftp:set-hash-flag',
  GET_LOGS = 'ftp:get-logs',
  READ_FILE = 'ftp:read-file',
  READ_IMAGE = 'ftp:read-image',
  UPLOAD_FOLDER_PROGRESS = 'ftp:upload-folder-progress',
  ZIP_PROGRESS = 'ftp:zip-progress'
}
