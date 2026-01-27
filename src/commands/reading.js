const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { handleEpubFile } = require('../services/epubReader');
const bookReader = require('../services/bookReader');

function registerReadingCommands() {
  const commands = [];

  // 注册开始阅读命令
  commands.push(
    vscode.commands.registerCommand('ttt-eye.startReading', async () => {
      const { getDefaultBook } = require('../config');
      const bookFolderPath = vscode.workspace.getConfiguration('ttt-eye').get('bookFolder');
      
      // 尝试获取默认书籍
      let defaultBook = getDefaultBook();
      
      // 如果有默认书籍且文件存在，直接使用
      if (defaultBook && fs.existsSync(defaultBook)) {
        const ext = path.extname(defaultBook).toLowerCase();
        // 检查书籍是否有阅读进度
        const { getReadingProgress } = require('../services/progress');
        const progress = getReadingProgress();
        const bookProgress = progress[defaultBook] || {};
        const startLine = bookProgress.currentLine || 0;
        
        if (ext === '.epub') {
          await handleEpubFile(defaultBook);
        } else {
          bookReader.readTxt(defaultBook, startLine);
        }
        return;
      }
      
      // 没有默认书籍或默认书籍不存在时，按原流程处理
      if (!bookFolderPath) {
        vscode.window.showErrorMessage('请先选择书籍目录');
        return;
      }

      // 获取书籍目录下的文件列表
      const bookFiles = fs.readdirSync(bookFolderPath)
        .filter(file => ['.txt', '.epub'].includes(path.extname(file).toLowerCase()));

      if (bookFiles.length === 0) {
        vscode.window.showErrorMessage('书籍目录中没有找到可用的书籍文件');
        return;
      }

      // 让用户选择书籍
      const selectedBook = await vscode.window.showQuickPick(bookFiles);
      if (!selectedBook) return;

      const bookPath = path.join(bookFolderPath, selectedBook);
      const ext = path.extname(selectedBook).toLowerCase();

      // 检查书籍是否有阅读进度
      const { getReadingProgress } = require('../services/progress');
      const progress = getReadingProgress();
      const bookProgress = progress[bookPath] || {};
      const startLine = bookProgress.currentLine || 0;

      if (ext === '.epub') {
        await handleEpubFile(bookPath);
      } else {
        bookReader.readTxt(bookPath, startLine);
      }
    })
  );

  // 注册停止阅读命令
  commands.push(
    vscode.commands.registerCommand('ttt-eye.stopReading', () => {
      bookReader.stop();
    })
  );

  // 注册下一页命令
  commands.push(
    vscode.commands.registerCommand('ttt-eye.nextLine', () => {
      bookReader.nextPage();
    })
  );

  // 注册上一页命令
  commands.push(
    vscode.commands.registerCommand('ttt-eye.previousLine', () => {
      bookReader.previousPage();
    })
  );

  return commands;
}

module.exports = {
  registerReadingCommands
}; 