/**
 * @func 生产或者测试环境配置
 */

const webpack = require('webpack');
const UglifyjsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  plugins:[
      new UglifyjsPlugin({
        parallel: true,
        cache: true,
        uglifyOptions: {
          output: {
            comments: false,
            beautify: false,
          },
          compress: {
            drop_console: true,
            drop_debugger: true,
            warnings: false,
          }
        }
      }),
      new webpack.DefinePlugin({
        'process.env':{  
          'NODE_ENV': JSON.stringify('production')  
        }
    })
  ]
}