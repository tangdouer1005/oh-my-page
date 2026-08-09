# Oh My Page

一个专注于搜索和常用网站的极简浏览器起始页。

在线地址：<https://tangdouer1005.github.io/oh-my-page/>

## 功能

- 默认使用 Google，并可切换百度与 Bing
- 添加、修改、删除和拖动排序常用网站
- 自动读取 favicon，支持上传自定义图标
- 鼠标悬停显示网站备注
- 配置保存在浏览器本地
- 通过 JSON 文件导入、导出配置
- 搜索结果和网站均在新标签页打开

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

访问开发服务器输出的本地地址即可。

## 检查

```bash
npm test
npm run build:pages
```

项目使用 vinext 开发，并通过 Vite 生成 GitHub Pages 静态版本。每次推送到 `main` 分支后，GitHub Actions 会自动发布最新页面。
