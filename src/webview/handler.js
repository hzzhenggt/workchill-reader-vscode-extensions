const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { getBookFolderPath, updateConfig, getConfig } = require('../config');
const bookReader = require('../services/bookReader');
const { handleEpubFile } = require('../services/epubReader');
const { getReadingProgress } = require('../services/progress');
const logger = require('../utils/logger');

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
  // 发送文件列表到Webview
  logger.log('Updating file list:', files);
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
    logger.log('Settings saved:', message); 
  } catch (error) {
    logger.error('保存设置失败:', error.message);
    vscode.window.showErrorMessage('保存设置失败: ' + error.message);
  }
}

async function handleSetDefaultBook(message, panel) {
  try {
    let filePath = message.file;
    // 尝试解码base64编码的文件路径
    try {
      filePath = decodeBase64(filePath);
    } catch (error) {
      // 如果解码失败，使用原始路径
      logger.warn('Failed to decode base64 path, using original:', filePath);
    }
    
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
    logger.error('设置默认书籍失败:', error.message);
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
    logger.error('清除默认书籍失败:', error.message);
    vscode.window.showErrorMessage('清除默认书籍失败: ' + error.message);
  }
}

// base64解码函数
function decodeBase64(encoded) {
  return decodeURIComponent(escape(Buffer.from(encoded, 'base64').toString()));
}

async function handleSelectFile(message, panel) {
  let filePath = message.file;
  // 尝试解码base64编码的文件路径
  try {
    filePath = decodeBase64(filePath);
  } catch (error) {
    // 如果解码失败，使用原始路径
    logger.warn('Failed to decode base64 path, using original:', filePath);
  }
  
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.epub') {
    await handleEpubFile(filePath);
  } else {
    logger.log('Selected file:', filePath);
    
    bookReader.readTxt(filePath, message.startLine || 0);
  }
  panel.dispose();
}

async function handleSetProgress(message, panel) {
  try {
    let filePath = message.file;
    // 尝试解码base64编码的文件路径
    try {
      filePath = decodeBase64(filePath);
    } catch (error) {
      // 如果解码失败，使用原始路径
      logger.warn('Failed to decode base64 path, using original:', filePath);
    }
    
    const newLine = message.line;
    const ext = path.extname(filePath).toLowerCase();
    // 对于epub文件，需要处理对应的txt文件
    let actualFilePath = filePath;
    if (ext === '.epub') {
      actualFilePath = filePath.replace('.epub', '.txt');
      if (!fs.existsSync(actualFilePath)) {
        await handleEpubFile(filePath);
      }
    }
    
    logger.log('Setting progress for file:', actualFilePath);
    
    const content = fs.readFileSync(actualFilePath, 'utf-8');
    const lines = content.split('\n').filter(x => x !== '');
    const totalLines = lines.length;
    const validLine = Math.max(0, Math.min(newLine, totalLines - 1));
    const { saveReadingProgress } = require('../services/progress');
    saveReadingProgress(actualFilePath, validLine, totalLines);
    updateFileList(panel);
    vscode.window.showInformationMessage(`阅读进度已更新为第 ${validLine} 行`);
  } catch (error) {
    logger.error('设置阅读进度失败:', error.message);
    vscode.window.showErrorMessage('设置阅读进度失败: ' + error.message);
  }
}

module.exports = {
  handleWebviewMessage,
  updateFileList
}; 