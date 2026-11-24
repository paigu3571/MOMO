# 别扯了！我的电子手办成精了

MOMO 手办物理挑战 · 从夯到拉。工单 B V0.3 申请试玩版。

## 玩法

点击「开始」后，每局从 6 个挑战中抽取 3 个。按题面拖动呆毛、弹簧飘带、桃子挂件、脸颊、袖口或小腿外侧。支持鼠标和触摸，右侧刻度显示实际拉伸倍率。关卡反馈显示 1.5 秒，三关结束后按平均分评级。可以保存 1080 × 1920 PNG 结果卡、再来一次或进入自由玩。

小腿只响应外侧向外的横向拖拽。中轴、内缘和膝盖固定，最大 1.25 倍，底图保留深色长袜。袖口最大 1.5 倍，固定肩线一侧。游戏使用全身镜头。

线上试玩见 [MOMO Demo](https://paigu3571.github.io/MOMO/)。

## 本地试玩

在本目录开启任意静态 HTTP 服务。例如执行 `python -m http.server 8787 --bind 127.0.0.1` 后打开 [本地试玩](http://127.0.0.1:8787/)。浏览器需要 WebGL 2 和 ES Module。运行页面本身无需安装依赖或打包。

URL 加 `?debug=1` 可选择第一关和隐藏可动长袜层，用于验证底图和判定。正式试玩链接可直接打开。

## GitHub Pages

1. 将**本目录内容**放进公开仓库 `paigu3571/MOMO` 的 `main` 分支根目录，保留 `.nojekyll`。
2. 在仓库的 **Settings → Pages** 选择 **Deploy from a branch**，分支用 **main**，目录用 **/ (root)**。
3. 等待部署完成，从 Pages 设置页打开站点。用桌面浏览器和手机浏览器分别试玩。TOY 送审前在 B 站 App 内再走一局，并测试结果卡下载。

所有资源走本站相对路径，部署在仓库子路径时也能正常加载。发布设置见 [GitHub Pages 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 来源与授权

| 内容 | 来源与授权 |
| --- | --- |
| 角色、部件、表情、图标 | 项目原创设定。工单 A 的 AI 辅助生成与修绘 PNG，经拆层验收和 WebP 85 转换 |
| 房间背景 | 工单 A 的 AI 生成素材。与角色图层及程序排版一起合成封面 |
| 游戏代码、界面、音效 | MOMO 项目自制。音效由 Web Audio 实时合成 |
| Three.js r186 | 来自官方 npm 包 three@0.186.1，MIT。许可见 [vendor/three.LICENSE](vendor/three.LICENSE) |

代码、界面和美术随本 Demo 提供试玩使用。Three.js 保留其上游 MIT 许可。本 Demo 不引用 B 站品牌素材、外部字体、第三方 CDN 或外部音频。
