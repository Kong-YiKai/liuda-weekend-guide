# 溜达 LIUDA · 周末城市探索指南 —— 部署文档

> 给后续接手的 AI / 协作者：照本文档操作即可部署本项目。
> ⚠️ **2026-11-08 更新**：项目已迁到 GitHub（https://github.com/Kong-YiKai/liuda-weekend-guide），
> 原 WorkBuddy 托管链接已下线。用户将换**自有域名自部署**，本文档以自部署为主线。

---

## 0. 现状（重要：先读）

| 项目 | 值 |
|---|---|
| 源码仓库（唯一事实来源） | `https://github.com/Kong-YiKai/liuda-weekend-guide`（分支 main） |
| 本地项目目录 | `D:\Workplace\Other\城市app` |
| 入口文件 | `index.html`（零依赖静态应用，无构建步骤） |
| 历史链接 | `liuda-weekend-guide.app.workbuddy.host` —— **已下线，不要再引用** |
| 当前状态 | 待用户选定目标托管平台 + 自有域名 |

**核心规则：改动一律先 commit 并 push 到 GitHub，再谈部署。push 走本机 7897 代理**：

```bash
git -c http.proxy=http://127.0.0.1:7897 -c https.proxy=http://127.0.0.1:7897 push
```

（`~/.gitconfig` 里残留死代理 `socks5h://127.0.0.1:10808`，直连 github.com 会被 RST，必须用上面的 `-c` 覆盖，不要去改用户全局 gitconfig。）

**发布前务必跑一遍测试**（改动 index.html / js 之后）：

```bash
node smoke.js    # 推荐引擎 + 业务逻辑冒烟（纯 Node，无依赖）
node e2e.js      # UI 端到端：jsdom 里真实点击完整链路（需已装 jsdom）
```

`e2e.js` 覆盖：筛选、天气切换、加入行程、冲突检测、Plan B 替换、建队/入队、打卡、徽章、
攻略生成与复刻、偏好反哺、弹层开关、重置。全绿（33/33 且无运行时错误）再发布。

### 文件结构

```
index.html        入口（只负责壳：topbar / view / tabbar / modal / toast）
styles.css        全部样式（深色霓虹风，移动端 first，桌面上限宽 440px）
js/data.js        Mock 数据：活动 14 个 / 街区 / 天气 / 队伍 / 攻略 / 徽章规则
js/engine.js      推荐引擎（五因子打分、行程冲突、Plan B、等级徽章）
js/app.js         状态管理 + 渲染 + 交互（数据存 localStorage，key: liuda.state.v1）
design.html       产品设计说明书页（首页底部有入口链接）
public/           Cloudflare Worker 静态资源副本 —— 改动后必须同步！
smoke.js / e2e.js 测试脚本
wrangler.json     Cloudflare Workers 配置（assets -> ./public）
```

改了根目录任何文件后，同步到 `public/`：

```bash
cp index.html styles.css design.html public/ && cp js/*.js public/js/
```

---

## 1. 自部署路径（用户自有域名）

项目是纯静态站点（无构建、无依赖），任何静态托管/服务器都能跑。两条推荐路径：

### 1.1 Cloudflare（推荐，国内/全球都快，支持自定义域）

**方式一：GitHub 集成（后续免维护，push 即自动发布）**

1. 用户在 Cloudflare 控制台 → Pages → Connect to Git，选 `Kong-YiKai/liuda-weekend-guide`
2. 构建配置：Framework preset = `None`，Build command 留空，Output directory = `public`
3. Pages 设置里绑定自有域名（Custom domain）
4. 之后每次 push 到 main 自动部署

**方式二：CLI（wrangler，本地一键）**

项目已配好 `wrangler.json`（assets 指向 `./public`），wrangler 4.152.0 装在受管 node 工作区：

```bash
# 改动后先同步 public/
cd "D:/Workplace/Other/城市app"
cp index.html styles.css design.html public/ && cp js/*.js public/js/

# 网络条件确认（不通则先解决网络，见第 3 节坑表）
curl -s -o /dev/null -w "%{http_code}" -x http://127.0.0.1:7897 https://api.cloudflare.com/client/v4

# 登录（首次）
"C:/Users/KON/.workbuddy/binaries/node/workspace/node_modules/.bin/wrangler.cmd" login
# 或用 Token（CI 推荐）：
# export CLOUDFLARE_API_TOKEN=<token>  CLOUDFLARE_ACCOUNT_ID=<account id>

# 部署（Workers 静态资源）
"C:/Users/KON/.workbuddy/binaries/node/workspace/node_modules/.bin/wrangler.cmd" deploy
# 或 Pages：
# .../wrangler.cmd pages deploy ./public --project-name liuda-weekend-guide
```

绑域名：控制台对应 Worker/Pages 项目 → Settings → Domains → 添加自有域。

### 1.2 自建服务器（Nginx 极简）

```bash
# 服务器上
git clone https://github.com/Kong-YiKai/liuda-weekend-guide.git /var/www/liuda
# Nginx：
#   server { listen 443 ssl; server_name <自有域名>;
#            root /var/www/liuda; index index.html; }
# 更新：cd /var/www/liuda && git pull
```

证书用 certbot 或 acme.sh 均可。无需 Node/Python 运行时。

---

## 2. 本地预览

```bash
cd "D:/Workplace/Other/城市app"
python -m http.server 8080     # http://127.0.0.1:8080
# 或直接双击 index.html
```

改完先本地确认，再跑测试 → push → 部署。

---

## 3. 已知坑（本机环境，务必先看）

| 现象 | 原因 | 解法 |
|---|---|---|
| git push 报 `Failed to connect to proxy 127.0.0.1:10808` | `~/.gitconfig` 残留死代理 `socks5h://127.0.0.1:10808` | 用第 0 节的 `git -c http.proxy=http://127.0.0.1:7897 ... push`，**不要改用户全局 gitconfig** |
| github.com 直连 `Connection was reset` | 直连被干扰 | 同上，走 7897 |
| `npm error 502 Bad Gateway` | registry.npmjs.org 不通 | 加 `--registry=https://registry.npmmirror.com` |
| wrangler 报 `fetch failed` | 沙箱注入 `HTTP_PROXY/HTTPS_PROXY=http://127.0.0.1:56242` 拦截 api.cloudflare.com | 先 `unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy`，并用**沙箱外 Shell** 执行 |
| 沙箱外 Cloudflare API 仍超时 | TUN 未生效 / 出口节点不稳 | 走 7897 代理验证：`curl -I -x http://127.0.0.1:7897 https://api.cloudflare.com/client/v4` |
| GitHub App 集成账号 `403 Resource not accessible by integration` | 该集成账号无建仓权限 | 用 git credential manager 里的 OAuth token 调 REST API（建库成功过） |

---

## 4. 给接手 AI 的最小执行清单

1. 确认要改的文件（根目录或 js/）。
2. 完成改动并保存落盘；同步 `public/`（第 0 节命令）。
3. `node smoke.js && node e2e.js` 全绿。
4. `git add -A && git commit -m "..."` 后用第 0 节的代理方式 push。
5. 已接 Cloudflare GitHub 集成：push 即完成部署；CLI 方式则再跑 `wrangler deploy`。
6. **不要**重新引用已下线的 workbuddy.host 链接；**不要**改用户全局 gitconfig；不要建第二个仓库。
