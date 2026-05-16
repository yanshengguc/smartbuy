<div align="center">

<img src="https://img.shields.io/badge/status-active-brightgreen?style=flat" alt="status">
<img src="https://img.shields.io/badge/license-MIT-blue?style=flat" alt="license">
<img src="https://img.shields.io/badge/model-MiMo%20%7C%20DeepSeek%20%7C%20GPT%20%7C%20Claude-orange?style=flat" alt="models">
<img src="https://img.shields.io/badge/WeChat-Mini%20Program-07C160?style=flat&logo=wechat" alt="miniapp">

</div>

 🛒 智选助手 SmartBuy

> AI 驱动的购物决策工具 —— 输入预算、需求和纠结的产品，自动对比参数、白话解读、给出推荐。
 ✨ 特色

- **零门槛使用** — 管理员配置一次，用户打开即用，老人小孩都会
- **多模型兼容** — 支持 MiMo / DeepSeek / OpenAI / Anthropic / 通义千问 等 OpenAI 兼容接口
- **管理端隔离** — 点击标题 5 次进入管理端，密码保护，普通用户看不到任何设置
- **一键分享** — 生成配置链接，微信转发点开即用
- **图片上传** — 拍参数标签自动识别对比
- **微信小程序** — 原生开发，无需服务器，API 直连

 快速开始
用户端
```
打开链接 → 输入购物问题 → 看分析结果 → 做决定
```
管理端
```
点标题 5 次 → 输密码(默认 0000) → 填 API Key → 保存 → 复制链接分发给用户
```
 📸 界面

| 用户端 | 对话中 | 管理端 |
|--------|--------|--------|
| 欢迎引导页 | 对比表格 + 白话分析 + 推荐 | API 多 provider 配置面板 |
🛠 技术栈

```
前端：HTML5 + CSS3 + JavaScript（零依赖）
小程序：微信原生框架
API：OpenAI 兼容接口（多模型切换）
存储：localStorage / wx.Storage（纯前端持久化）
```

 📁 项目结构

```
smartbuy/
├── index.html        # Web 主页面（用户端 + 管理端弹窗）
├── style.css         # 完整 UI 样式
├── script.js         # 核心逻辑（聊天、API、图片、Markdown）
├── README.md
└── miniapp/          # 微信小程序原生版
    ├── app.js/json/wxss
    └── pages/
        ├── index/     # 聊天页面
        └── admin/     # 管理端页面
```
 配置示例

| 服务商 | Base URL | 免费额度 |
|--------|----------|----------|
| 小米 MiMo | `https://token-plan-cn.xiaomimimo.com/v1` | 100 万亿 Token 激励计划 |
| DeepSeek | `https://api.deepseek.com/v1` | 注册送 500 万 Token |
| 月之暗面 | `https://api.moonshot.cn/v1` | 注册送 15 元 |
| 阿里百炼 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | 新用户免费额度 |

 部署

纯静态文件，任意托管：

- **GitHub Pages** — Settings → Pages → main 分支，保存即上线
- **本地使用** — 浏览器直接打开 `index.html`
- **微信小程序** — 微信开发者工具导入 `miniapp/` 目录
 License

MIT — 随意使用、修改、分发

