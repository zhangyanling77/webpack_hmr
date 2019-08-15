const path = require('path')
const express = require('express')
const mime = require('mime')
const webpack = require('webpack')
const MemoryFileSystem = require('memory-fs')

const config = require('./webpack.config.js')

// webpack的编译任务
let compiler = webpack(config)


class Server {
  constructor(compiler) {
    this.compiler = compiler;
    let sockets = []
    let lastHash;// 每次编译完成后都会产生一个stats对象，其中有一个hash值代表这一次编译结果
    // hash就是一个32位的字符串
    compiler.hooks.done.tap('webpack-dev-server', stats => {
      lastHash = stats.hash
      sockets.forEach(socket => {
        // 先向客户端发送最新的hash
        // 每次编译都会产生一个hash值，而热更新每次不仅产生hash，还产生两个补丁。
        // 里面描述了从上一次结果到这一次结果都有哪些chunk和模块发生了变化
        socket.emit('hash', stats.hash)
        // 再向客户端发送一个ok
        socket.emit('ok')
      })
    })

    let app = new express()
    // 以监控的方式启动一次webpack编译，当编译成功后执行回调
    compiler.watch({}, err => {
      console.log('又一次编译任务成功完成了')
    })

    let fs = new MemoryFileSystem()
    // 如果complier输出文件系统改为MemoryFileSystem， 则以后产出的文件都将打包到内存中去
    compiler.outputFileSystem = fs

    function middleware(req, res, next){
      if(req.url === '/favicon.ico') {
        return res.sendStatus(404)
      }
      let filename = path.join(config.output.path, req.url.slice(1))
      let stat = fs.statSync(filename)
      if(stat.isFile()) { // 判断是否存在这个文件，如果存在直接把读取发给浏览器
        let content = fs.readFileSync(filename)
        let contentType = mime.getType(filename)
        res.setHeader('Content-Type', contentType)
        res.statusCode = res.statusCode || 200
        res.send(content)
      } else {
        // next() 
        return res.sendStatus(404)
      }
    }

    app.use(middleware)

    this.server = require('http').createServer(app)

    let io = require('socket.io')(this.server)
    // 启动一个websocket服务器，等待连接到来之后socket
    io.on('connection', (socket) => {
      sockets.push(socket)
      socket.emit('hash', lastHash)
      socket.emit('ok')
    })
  }

  listen(port) {
    this.server.listen(port, () => {
      console.log(`服务器已经在端口${port}上启动了`)
    })
  }
}


let server = new Server(compiler)

server.listen(8000)
