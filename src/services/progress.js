const fs = require('fs');
const path = require('path');

/**
 * 保存阅读进度到书籍同名的进度文件中
 * @param {string} bookPath 书籍路径
 * @param {number} currentLine 当前行索引
 * @param {number} totalLines 总行数
 */
function saveReadingProgress(bookPath, currentLine, totalLines) {
  try {
    // 创建与书籍同名的进度文件路径
    const progressFilePath = bookPath + '.进度.json';
    
    // 读取书籍内容，获取上下文
    const bookContent = fs.readFileSync(bookPath, 'utf-8');
    const lines = bookContent.split('\n').filter(x => x !== '');
    
    // 生成上下文内容（当前行前后的内容，总共约200字）
    let context = '';
    const contextLines = 10; // 前后各取10行
    const startContextLine = Math.max(0, currentLine - contextLines);
    const endContextLine = Math.min(lines.length - 1, currentLine + contextLines);
    
    for (let i = startContextLine; i <= endContextLine; i++) {
      context += lines[i] + '\n';
    }
    
    // 截取约200字的上下文
    const context200 = context.substring(0, 200) + (context.length > 200 ? '...' : '');
    
    // 计算进度百分比（小数3位）
    const progressPercent = totalLines > 1 ? 
      (currentLine / (totalLines - 1) * 100).toFixed(3) : 
      '0.000';
    
    // 构建进度对象
    const progress = {
      currentLine,
      timestamp: new Date().getTime(),
      totalLines,
      context: context200,
      progressPercent,
      lastTime: new Date().toISOString()
    };
    
    // 写入进度文件
    fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.error('保存阅读进度失败:', error.message);
  }
}

/**
 * 获取所有书籍的阅读进度
 * @param {string} bookFolderPath 书籍目录路径（可选，用于测试）
 * @returns {Object} 所有书籍的阅读进度
 */
function getReadingProgress(bookFolderPath = null) {
  try {
    const progress = {};
    
    // 尝试从vscode配置中获取书籍目录路径
    let folderPath = bookFolderPath;
    if (!folderPath) {
      try {
        const vscode = require('vscode');
        const config = vscode.workspace.getConfiguration('workchill');
        folderPath = config.get('bookFolder') || '';
      } catch (error) {
        // 在非VSCode环境中运行时，忽略vscode模块错误
        return progress;
      }
    }
    
    if (!folderPath || !fs.existsSync(folderPath)) {
      return progress;
    }
    
    // 遍历书籍目录下的所有文件
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      if (['.txt', '.epub'].includes(path.extname(file).toLowerCase())) {
        const bookPath = path.join(folderPath, file);
        const progressFilePath = bookPath + '.进度.json';
        
        // 如果进度文件存在，读取进度信息
        if (fs.existsSync(progressFilePath)) {
          try {
            const bookProgress = JSON.parse(fs.readFileSync(progressFilePath, 'utf-8'));
            progress[bookPath] = bookProgress;
          } catch (error) {
            console.error(`读取进度文件失败 ${progressFilePath}:`, error.message);
          }
        }
      }
    }
    
    return progress;
  } catch (error) {
    console.error('获取阅读进度失败:', error.message);
    return {};
  }
}

module.exports = {
  saveReadingProgress,
  getReadingProgress
}; 