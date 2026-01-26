const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { getBookFolderPath, updateConfig } = require('../config');
const bookReader = require('../services/bookReader');
const { handleEpubFile } = require('../services/epubReader');
const { getReadingProgress } = require('../services/progress');

function handleWebviewMessage(message, panel) {
  switch (message.command) {
    case 'selectDirectory':
      handleSelectDirectory(panel);
      break;
    case 'saveSettings':
      handleSaveSettings(message);
      break;
    case 'selectFile':
      handleSelectFile(message, panel);
      break;
    case 'setProgress':
      handleSetProgress(message, panel);
      break;
    case 'setDefaultBook':
      handleSetDefaultBook(message, panel);
      break;
    case 'clearDefaultBook':
      handleClearDefaultBook(panel);
      break;
  }
}

async function handleSelectDirectory(panel) {
  const folderUri = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
  });

  if (folderUri && folderUri[0]) {
    await updateConfig('bookFolder', folderUri[0].fsPath);
    updateFileList(panel);
  }
}

function updateFileList(panel) {
  const bookFolderPath = getBookFolderPath();
  if (!bookFolderPath || !fs.existsSync(bookFolderPath)) {
    panel.webview.postMessage({
      command: 'updateFileList',
      currentFolder: bookFolderPath || '未设置书籍目录',
      files: []
    });
    return;
  }
  
  const progress = getReadingProgress();
  const files = fs.readdirSync(bookFolderPath)
    .filter(file => ['.txt', '.epub'].includes(path.extname(file).toLowerCase()))
    .map(file => {
      const filePath = path.join(bookFolderPath, file);
      return {
        name: file,
        path: filePath,
        progress: progress[filePath] || {}
      };
    });

  panel.webview.postMessage({
    command: 'updateFileList',
    currentFolder: bookFolderPath,
    files: files
  });
}

async function handleSaveSettings(message) {
  try {
    await updateConfig('linesPerPage', parseInt(message.linesPerPage));
    await updateConfig('fontSize', parseInt(message.fontSize));
    await updateConfig('fontColor', message.fontColor);
    vscode.window.showInformationMessage('设置已保存并生效');
  } catch (error) {
    console.error('保存设置失败:', error.message);
    vscode.window.showErrorMessage('保存设置失败: ' + error.message);
  }
}

async function handleSetDefaultBook(message, panel) {
  try {
    const filePath = message.file;
    await updateConfig('defaultBook', filePath);
    
    // 获取文件名
    const fileName = path.basename(filePath);
    vscode.window.showInformationMessage(`已将 "${fileName}" 设置为默认书籍\n\n按 Ctrl+0 (Mac: Cmd+0) 可直接打开该书籍阅读`);
    
    // 更新设置面板中的默认书籍显示
    panel.webview.postMessage({
      command: 'updateSettings',
      settings: {
        defaultBook: filePath,
        linesPerPage: getConfig().get('linesPerPage') || 1,
        fontSize: getConfig().get('fontSize') || 14,
        fontColor: getConfig().get('fontColor') || '#A8A8A8',
        bookFolderPath: getBookFolderPath()
      }
    });
  } catch (error) {
    console.error('设置默认书籍失败:', error.message);
    vscode.window.showErrorMessage('设置默认书籍失败: ' + error.message);
  }
}

async function handleClearDefaultBook(panel) {
  try {
    await updateConfig('defaultBook', '');
    vscode.window.showInformationMessage('默认书籍已清除');
    
    // 更新设置面板中的默认书籍显示
    panel.webview.postMessage({
      command: 'updateSettings',
      settings: {
        defaultBook: '',
        linesPerPage: getConfig().get('linesPerPage') || 1,
        fontSize: getConfig().get('fontSize') || 14,
        fontColor: getConfig().get('fontColor') || '#A8A8A8',
        bookFolderPath: getBookFolderPath()
      }
    });
  } catch (error) {
    console.error('清除默认书籍失败:', error.message);
    vscode.window.showErrorMessage('清除默认书籍失败: ' + error.message);
  }
}

async function handleSelectFile(message, panel) {
  const ext = path.extname(message.file).toLowerCase();
  if (ext === '.epub') {
    await handleEpubFile(message.file);
  } else {
    console.log(message.file);
    
    bookReader.readTxt(message.file, message.startLine || 0);
  }
  panel.dispose();
}

async function handleSetProgress(message, panel) {
  try {
    const filePath = message.file;
    const newLine = message.line;
    const ext = path.extname(filePath).toLowerCase();
    
    // 对于epub文件，需要处理对应的txt文件
    let actualFilePath = filePath;
    if (ext === '.epub') {
      actualFilePath = filePath.replace('.epub', '.txt');
      // 如果txt文件不存在，先转换epub文件
      if (!fs.existsSync(actualFilePath)) {
        await handleEpubFile(filePath);
      }
    }
    
    // 读取文件内容，获取总行数
    const content = fs.readFileSync(actualFilePath, 'utf-8');
    const lines = content.split('\n').filter(x => x !== '');
    const totalLines = lines.length;
    
    // 确保新行号在有效范围内
    const validLine = Math.max(0, Math.min(newLine, totalLines - 1));
    
    // 保存新的进度
    const { saveReadingProgress } = require('../services/progress');
    saveReadingProgress(actualFilePath, validLine, totalLines);
    
    // 更新文件列表，显示新的进度
    updateFileList(panel);
    
    // 显示成功消息
    vscode.window.showInformationMessage(`阅读进度已更新为第 ${validLine} 行`);
  } catch (error) {
    console.error('设置阅读进度失败:', error.message);
    vscode.window.showErrorMessage('设置阅读进度失败: ' + error.message);
  }
}

module.exports = {
  handleWebviewMessage,
  updateFileList
}; 