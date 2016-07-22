const fs = require('fs-extra');

// .destフォルダを削除する。
fs.removeSync('./.dest');

// appフォルダにある『末尾が'.ts'か'.tsx'ではない』ファイルを.destフォルダにコピーする。
fs.copySync('./app', './.dest', { filter: /^(?!.*\.ts(x|)$)/ });