System.config({
  transpiler: false,
  paths: {
    '*': 'node_modules/*',
    'root:*': '/*',
  },
  packageConfigPaths: [
    '*/package.json',
    '@*/*/package.json',
  ],
  map: {
    'app': 'root:.dest/arrange',
    'rxjs/Rx': 'rxjs/bundles/Rx.umd.js',
  },
  packages: {
    'app': { main: 'main' },
    '@angular/core': { main: 'bundles/core.umd' },
    '@angular/common': { main: 'bundles/common.umd' },
    '@angular/compiler': { main: 'bundles/compiler.umd' },
    '@angular/platform-browser': { main: 'bundles/platform-browser.umd' },
    '@angular/platform-browser-dynamic': { main: 'bundles/platform-browser-dynamic.umd' },
    'symbol-observable': { main: 'index', map: 'symbol-observable' },
  }
});