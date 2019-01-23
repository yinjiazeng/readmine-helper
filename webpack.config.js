const path = require('path');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const webpackMerge = require('webpack-merge');
const dev = require('./webpack.dev');
const prod = require('./webpack.prod');
const theme = require('./theme');

//是否是生产环境构建
const ENV_PROD = process.env.NODE_ENV === 'production';
const config = ENV_PROD ? prod : dev;

const extractText = new ExtractTextPlugin({
  filename:'./style/[name].css?v=[contenthash:7]',
  allChunks:true
});

const plugins = [
  extractText,
  new CopyWebpackPlugin([{
    from: __dirname + '/public/',
    to:__dirname +'/dist'
  }]),
  new CleanWebpackPlugin(['./dist'])
]

const entrys = {};

['options', 'background', 'content'].forEach(function(name){
  if(['options'].includes(name)){
    let filename = `./${name}.html`
    let template = `./tpl/${name}.ejs`
    plugins.push(
      new HTMLWebpackPlugin({
        filename:filename,
        template:template,
        chunks:[name],
        minify:{
          //移除空白
          collapseWhitespace:true,
          //压缩css
          minifyCSS:true,
          //压缩js
          minifyJS:true
        }
      })
    )
  }
  entrys[name] = [
    `nuijs/core/nui`, 
    `babel-polyfill`, 
    `./src/${name}/index`
  ]
})

module.exports = webpackMerge(config, {
  entry:entrys,
  plugins:plugins,
  resolve:{
    extensions:['.js', '.less', '.css']
  },
  module:{
    rules:[
        {
          test:/\.js$/,
          exclude:/node_modules/,
          use:[{
            loader:'babel-loader',
            options: {
              plugins:[
                'transform-runtime',
                [
                  'import', {
                    'libraryName': 'antd',
                    'libraryDirectory': 'es', 
                    'style': true 
                  }
                ]
              ],
              presets:[
                'es2015',
                'react',
                'stage-0'
              ]
            }
          }]
        },
        {
          test:/\.js$/,
          use:[{
            loader:'nui-loader'
          }]
        },
        {
          test:/\.less$/,
          use:extractText.extract({
            use:[{
              loader:'css-loader',
              options:{
                minimize:ENV_PROD
              }
            }, {
              loader:'less-loader',
              options:{
                javascriptEnabled:true,
                modifyVars:theme
              }
            }]
          })
        },
        {
          test:/\.(svg|ttf|woff|eot)(\?.*)?$/,
          use: [
            {
              loader:'file-loader',
              options:{
                name:'[name].[hash:7].[ext]',
                publicPath:'./font/',
                outputPath:'font/'
              }
            }
          ]
        },
        {
          test:/\.(png|jpe?g|gif)(\?.*)?$/,
          use: [
            {
              loader:'file-loader',
              options:{
                name:'[name].[hash:7].[ext]',
                publicPath:'./images/',
                outputPath:'images/'
              }
            }
          ]
        }
      ]
  },
  output:{
    filename:'./script/[name].js?v=[chunkHash:7]',
    path:path.resolve(__dirname, './dist')
  }
})