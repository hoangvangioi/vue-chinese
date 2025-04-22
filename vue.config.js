const { defineConfig } = require('@vue/cli-service')
const webpack = require('webpack')

module.exports = defineConfig({
  transpileDependencies: [],
  devServer: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://213.180.0.36:47932',
        changeOrigin: true,
        secure: false,
        pathRewrite: {
          '^/api': '/api'
        },
        logLevel: 'debug'
      }
    },
    // Thêm cấu hình để sửa lỗi "Invalid Host header" khi dùng ngrok
    allowedHosts: "all",
    client: {
      webSocketURL: {
        hostname: "0.0.0.0",
        pathname: "/ws",
        port: 8080,
      },
    },
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    }
  },
  // Cấu hình cho môi trường production
  publicPath: process.env.NODE_ENV === 'production' ? './' : '/',
  configureWebpack: {
    devtool: 'source-map',
    // Thêm biến môi trường cho API URL trong production
    plugins: [
      // Định nghĩa biến môi trường cho production
      new webpack.DefinePlugin({
        'process.env': {
          API_URL: JSON.stringify(process.env.NODE_ENV === 'production' 
            ? 'http://213.180.0.36:47932' // URL API cho production
            : '')
        }
      })
    ]
  }
})
