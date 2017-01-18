const resolve = require('path').resolve;

module.exports = {
  entry: './assets/entry.js',
  output: {
    path: './assets',
    filename: './bundle.js'
  },
  resolve: {
    root: resolve('./_js')
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      exclude: /node_modules/,
      query: {
        presets: ['es2015']
      }
    }]
  }
}
