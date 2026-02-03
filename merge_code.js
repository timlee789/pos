const fs = require('fs');
const path = require('path');

// 합칠 파일 확장자
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css'];
// 제외할 폴더
const IGNORE_DIRS = ['node_modules', '.next', '.git', 'dist', 'build'];
// 타겟 폴더 (소스코드 위치)
const SRC_DIR = './src';
// 결과 파일명
const OUTPUT_FILE = 'full_project_code.txt';

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (EXTENSIONS.includes(path.extname(file))) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

function mergeFiles() {
  if (!fs.existsSync(SRC_DIR)) {
    console.log(`❌ Error: '${SRC_DIR}' 폴더를 찾을 수 없습니다.`);
    return;
  }

  const allFiles = getAllFiles(SRC_DIR);
  let content = "Project: The Collegiate Grill POS System\nDescription: Full Source Code Context\n\n";

  allFiles.forEach(filePath => {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      // AI가 파일 경로를 잘 알아보도록 헤더 추가
      content += `\n${'='.repeat(50)}\n`;
      content += `FILE PATH: ${filePath}\n`;
      content += `${'='.repeat(50)}\n`;
      content += fileContent + "\n";
    } catch (err) {
      console.log(`Skipping file ${filePath}: ${err.message}`);
    }
  });

  fs.writeFileSync(OUTPUT_FILE, content, 'utf8');
  console.log(`✅ 성공! 모든 코드가 '${OUTPUT_FILE}' 파일 하나로 합쳐졌습니다.`);
}

mergeFiles();