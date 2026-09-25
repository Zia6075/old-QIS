// Cleans previous electron-builder output before packaging.
// This prevents EBUSY/copyfile errors when old win-unpacked resources are still present.

const fs = require('fs');
const path = require('path');

const installerDir = path.join(__dirname, 'installer');

try {
  if (fs.existsSync(installerDir)) {
    fs.rmSync(installerDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 500,
    });
    console.log('✅ Previous installer folder cleaned:', installerDir);
  } else {
    console.log('✅ Installer folder is already clean.');
  }
} catch (error) {
  console.error('\n❌ Could not clean previous installer output.');
  console.error('Reason:', error.message);
  console.error('\nPlease close these before building again:');
  console.error('1) QIS HR System app / any old win-unpacked .exe');
  console.error('2) File Explorer window opened inside electron\\installer or win-unpacked');
  console.error('3) Any image viewer opened on dist\\logo.png');
  console.error('4) Antivirus scan if it is locking the folder temporarily');
  console.error('\nThen manually delete this folder and run build again:');
  console.error(installerDir);
  process.exit(1);
}
