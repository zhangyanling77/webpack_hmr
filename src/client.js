
let socket = io('/')

class Emitter{
  constructor(){
    this.listeners = {}
  }
  on(type, listener) {
    this.listeners[type] = listener
  }

  emit(type){
    this.listeners[type] && this.listeners[type]()
  }
}

let hotEmitter = new Emitter()

const onConnected = () => {
  console.log("客户端链接成功")
}

let currentHash // 这一次的hash值
let hotCurrentHash // 上一次的hash值

socket.on('hash', (hash) => {
  currentHash = hash
})

socket.on('ok', () => {
  reloadApp(true)
})

hotEmitter.on('webpackHotUpdate', () => {
  if(!hotCurrentHash || hotCurrentHash == currentHash) {
    return hotCurrentHash = currentHash
  } 
  hotCheck()
})
// 检查热更新
function hotCheck() {
  hotDownloadManifest().then(update => {
    let chunkIds = Object.keys(update.c)
    chunkIds.forEach(chunkId => {
      hotDownloadUpdateChunk(chunkId)
    })
  })
}

// JSONP方式下载文件
function hotDownloadUpdateChunk(chunkId) {
  let script = document.createElement('script')
  script.charset = 'utf-8'
  script.src = `/${chunkId}.${hotCurrentHash}.hot-update.js`
  document.head.appendChild(script)
}

// 此方法用来取询问服务器，到底这次编译相对于上一次改变了哪些模块哪些chunk
function hotDownloadManifest() {
  return new Promise((resolve, reject) => {
    let request = new XMLHttpRequest()
    // 放置上一次编译到这一次编译的更改
    let requestPath = `/${hotCurrentHash}/.hot-update.json`
    request.open('GET', requestPath, true)
    request.onreadystatechange = function(){
      if(request.readyState === 4) {
        let update = JSON.parse(request.responseText)
        resolve(update)
      }
    }
    request.send(null)

  })
}

// 当收到ok事件后，会重新刷新
function reloadApp(hot) {
  if(hot) {
    // 热更新
    hotEmitter.emit('webpackHotUpdate')
  } else {
    // 刷新整个
    window.location.reload()
  }
}

window.hotCreateModule = function(moduleId) {
  let hot = {
    _acceptedDependencies: {},
    accept: function(deps, callback) {
      for(let i = 0; i < deps.length; i++){
        hot._acceptedDependencies[deps[i]] = callback
      }
    }
  }

  return hot
}
// 当客户端将最新代码拉倒浏览器后
window.webpackHotUpdate = function(chunkId, moreModules) {
  // 循环拉老的模块
  for(let moduleId in moreModules){
    // 从模块缓存中取到老的模块定义
    let oldModule = __webpack_require__.c[moduleId]
    // 哪些模块引用了这个模块 =》parents
    // 这个模块引用了哪些模块=》children
    let {parents, children} = oldModule
    // 更新位最新代码，缓存更新
    let module = __webpack_require__.c[moduleId] = {
      i: moduleId,
      l: false,
      exports: {},
      parents,
      children,
      hot: window.hotCreateModule(moduleId)
    }

    moreModules[moduleId].call(module.exports, module, module.exports, __webpack_require__)

    module.l = true // 状态变为已加载，即给module.exports赋值成功了

    // 热更新
    parents.forEach(parent => {
      //
      let parentModule = __webpack_require__.c[parent]
      // 
      parentModule && parentModule.hot && parentModule.hot._acceptedDependencies[moduleId] && parentModule.hot._acceptedDependencies[moduleId]()
    })
    // 更新hash
    hotCurrentHash = currentHash
  }
} 

socket.on('connect', onConnected)
