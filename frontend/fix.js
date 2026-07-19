const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.tsx') || dirFile.endsWith('.ts')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const fixFile = (path) => {
  let content = fs.readFileSync(path, 'utf8');
  let newContent = content.split('\\`').join('`').split('\\$').join('$');
  if (content !== newContent) {
    fs.writeFileSync(path, newContent, 'utf8');
    console.log('Fixed:', path);
  }
};

const files = walkSync('src');

files.forEach(f => {
  fixFile(f);
});
