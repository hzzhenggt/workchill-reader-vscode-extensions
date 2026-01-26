const fs = require('fs');
const path = require('path');
const { saveReadingProgress, getReadingProgress } = require('./src/services/progress');

// 测试进度保存功能
async function testProgressSave() {
  console.log('开始测试进度保存功能...');
  
  // 创建一个临时测试文件
  const testBookPath = path.join(__dirname, 'test-book.txt');
  const testContent = '测试内容\n这是第一行\n这是第二行\n这是第三行\n这是第四行\n这是第五行\n这是第六行\n这是第七行\n这是第八行\n这是第九行\n这是第十行\n这是第十一行\n这是第十二行\n这是第十三行\n这是第十四行\n这是第十五行\n这是第十六行\n这是第十七行\n这是第十八行\n这是第十九行\n这是第二十行';
  
  fs.writeFileSync(testBookPath, testContent);
  
  try {
    // 保存进度
    console.log('保存阅读进度...');
    saveReadingProgress(testBookPath, 5, 20);
    
    // 检查进度文件是否生成
    const progressFilePath = testBookPath + '.进度.json';
    if (fs.existsSync(progressFilePath)) {
      console.log('✓ 进度文件生成成功:', progressFilePath);
      
      // 读取进度文件内容
      const progressContent = fs.readFileSync(progressFilePath, 'utf-8');
      const progress = JSON.parse(progressContent);
      console.log('✓ 进度文件内容:', progress);
      
      // 验证上下文是否保存
      if (progress.context && progress.context.length > 0) {
        console.log('✓ 上下文内容保存成功，长度:', progress.context.length);
        console.log('✓ 上下文内容:', progress.context);
      } else {
        console.error('✗ 上下文内容保存失败');
      }
      
    } else {
      console.error('✗ 进度文件生成失败');
    }
    
  } catch (error) {
    console.error('✗ 测试失败:', error.message);
  } finally {
    // 清理测试文件
    fs.unlinkSync(testBookPath);
    const progressFilePath = testBookPath + '.进度.json';
    if (fs.existsSync(progressFilePath)) {
      fs.unlinkSync(progressFilePath);
    }
    console.log('测试结束，清理完成');
  }
}

// 运行测试
testProgressSave();
