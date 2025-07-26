const path = require('path');

module.exports = [
  // Main process
  {
    target: 'electron-main',
    entry: './src/main/main.ts',
    output: {
      path: path.resolve(__dirname, 'dist/main'),
      filename: 'main.js',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.node$/,
          use: 'node-loader',
        },
      ],
    },
    node: {
      __dirname: false,
      __filename: false,
    },
    externals: {
      electron: 'commonjs electron',
      sqlite3: 'commonjs sqlite3',
      // Exclude native modules from bundling
      '../build/Release/keyboard_native.node': 'commonjs ../build/Release/keyboard_native.node',
      './build/Release/keyboard_native.node': 'commonjs ./build/Release/keyboard_native.node',
      'build/Release/keyboard_native.node': 'commonjs build/Release/keyboard_native.node',
    },
  },
  // Preload script
  {
    target: 'electron-preload',
    entry: './src/main/preload.ts',
    output: {
      path: path.resolve(__dirname, 'dist/main'),
      filename: 'preload.js',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
    node: {
      __dirname: false,
      __filename: false,
    },
    externals: {
      electron: 'commonjs electron',
    },
  }
];