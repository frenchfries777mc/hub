/* 사이트(frenchfries777.com)를 앱 창으로 열어요. 사이트가 업데이트되면 앱도 바로 따라와요. */
const { app, BrowserWindow, shell } = require('electron');
const HOME = 'https://frenchfries777.com/';
function make() {
  const w = new BrowserWindow({ width: 1280, height: 800, backgroundColor: '#0e0e0e', autoHideMenuBar: true, icon: require('path').join(__dirname, 'icon.png') });
  w.loadURL(HOME);
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\/([a-z0-9-]+\.)?frenchfries777\.com\//.test(url)) return { action: 'allow' };
    shell.openExternal(url); return { action: 'deny' };
  });
}
app.whenReady().then(() => { make(); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) make(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
