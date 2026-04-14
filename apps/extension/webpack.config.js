/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (_env, argv) => ({
  mode: argv.mode || 'development',
  devtool: argv.mode === 'production' ? false : 'inline-source-map',

  entry: {
    popup: './src/popup/popup.ts',
    'content-linkedin': './src/content/linkedin.ts',
    'content-yemenhr': './src/content/yemenhr.ts',
    'content-hiretrack': './src/content/hiretrack.ts',
    background: './src/background/service-worker.ts',
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },

  resolve: {
    extensions: ['.ts', '.js'],
  },

  plugins: [
    new MiniCssExtractPlugin({ filename: '[name].css' }),
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
        { from: 'src/popup/popup.html', to: '.' },
        { from: 'icons', to: 'icons' },
      ],
    }),
  ],

  // Prevent webpack from bundling chrome.* APIs
  externals: {},
});
