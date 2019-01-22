/**
 * @func 开发环境配置
 */

const webpack = require('webpack');

module.exports = {
  devServer:{
    port:8088,
    open:true,
    contentBase:'./dist',
  },
  plugins:[
    new webpack.DefinePlugin({
      
    })
  ]
}