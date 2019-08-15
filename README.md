# webpack_hmr
手动简易实现webpack热更新


服务端部分：

步骤:
1.启动webpack-dev-server服务器
2.创建webpack实例
3.创建Server服务器
4.添加webpack的done事件回调
  编译完成向客户端发送消息
5.创建express应用app
6.添加webpack-dev-middleware中间件
  中间件负责返回生成的文件
  启动webpack编译
7.设置文件系统为内存文件系统
8.创建http服务器并启动服务
9.使用sockjs在浏览器和服务端之间建立一个websocket长连接
  创建socket服务器


客户端部分：（重要内容）

步骤：
1.webpack-dev-server/client-src/default/index.js会监听此hash消息，会保存此hash值
2.客户端接收到ok的消息，会执行reloadApp方法来更新
3.在reloadApp中进行判断，是否支持热更新，如果支持的话emitwebpackHotUpdate事件。
  如果不支持则直接刷新浏览器
4.在webpack/hot/dev-server.js会监听 webpackHotUpdate 事件，然后执行check() 方法进行检查
5.在check方法里会调用module.hot.check方法
6.它通过调用 JsonMainTemplate.runtime 的 hotDownloadManifest 方法，向server端发送ajax请求，
  服务端返回一个 Manifest文件，该Manifest文件包含了所有要更新的模块的hash 值和chunk 名
7.调用JsonMainTemplate.runtime 的 hotDownloadUpdateChunk 方法通过JSONP请求获取到最新模块代码
8.补丁JS取回来后会调用JsonMainTemplate.runtime.js 的 webpackHotUpdate 方法，
  里面会调用hotAddUpdateChunk 方法，用新的模块替换掉旧的模块
9.然后会调用 HotModuleReplacement.runtime.js 的hotAddUpdateChunk 方法更新模块代码
10.然后调用hotApply方法进行热更新
