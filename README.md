# 流程设计器 - 流程历史查看


### 使用Raphaël.js 绘制,可支持几乎所有浏览器
    Firefox 3.0+
    Safari 3.0+
    Chrome 5.0+
    Opera 9.5+ 
    Internet Explorer 6.0+

#### 使用原生js编写,不依赖jQuery
```javascript
  new WorkflowHistory(Object config);
```
----------------------
### 前端基于gulp构建的服务器

####使用说明

1. 安装NodeJS
1. 下载项目后,进去workflowHistory目录,按Shift+鼠标右键 -> 在此处打开命令窗口 执行 `npm install` 命令
1. 待所有node插件安装完成后，执行 `gulp` 命令
1. 访问 `localhost:3030`  查看效果


####目录结构
* workflow		`静态文件目录(html,js,css...)`
* gulpfile.js 	`gulp配置文件`
* package.json 	`nodejs 程序描述`