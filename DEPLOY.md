# 溜达 LIUDA · 周末城市探索指南 —— 部署文档

> 给后续接手的 AI / 协作者：照本文档操作即可把改动重新发布到**已有的那个链接**，无需新建应用、无需重新确认。

---

## 0. 现有线上状态（重要：先读）

| 项目 | 值 |
|---|---|
| 线上链接（唯一，保持不变） | `https://liuda-weekend-guide.app.workbuddy.host/?sharecode=Q4WEDNE5M5` |
| 应用 ID（一般不用手动传） | `wbapp_X3LVKPbAKEmpCgfRy2oZ1R` |
| 项目目录（决定发布目标） | `D:\Workplace\Other\城市app` |
| 入口文件 | `index.html`（根目录，零依赖静态应用） |
| 部署形态 | `web-page`（静态站点，内置发布通道托管） |
| 管理入口 | 设置 → 数据管理 → 应用 |

**核心规则：发布目标由 `directory` 决定，不要传 `appId` 去"指定"目标，也不要尝试新建第二个应用。**
同一个目录重复发布 = 覆盖同一链接的内容，链接本身不会变。这是预期行为，不是 bug。

**发布前务必跑一遍测试**（改动 index.html / js 之后）：

```bash
node smoke.js    # 推荐引擎 + 业务逻辑冒烟（纯 Node，无依赖）
node e2e.js      # UI 端到端：jsdom 里真实点击完整链路（需本机 node workspace 已装 jsdom）
```

`e2e.js` 会覆盖：筛选、天气切换、加入行程、冲突检测、Plan B 替换、建队/入队、打卡、徽章、
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
```

改了根目录任何文件后，同步到 `public/`：

```bash
cp index.html styles.css design.html public/ && cp js/*.js public/js/
```

---

## 1. 方式 A：更新到现有链接（推荐，30 秒内完成）

适用场景：改了 `index.html` 的内容/样式，要把新版推上线。

### 步骤

1. **确认文件已落盘**：所有改动必须先写完保存到磁盘，再发部署（工具会把目录原样打包上传，文件还在写入就会上传半成品）。
2. 加载发布能力：调用工具搜索 `workbuddy_sites_deploy`（延迟加载工具，需先 ToolSearch 拿到 schema，再 DeferExecuteTool 调用）。
3. 按下述参数调用发布：

```json
{
  "action": "deploy",
  "directory": "D:/Workplace/Other/城市app",
  "language": "static",
  "entryHtml": "index.html",
  "appName": "溜达·周末城市探索指南",
  "domainPrefix": "liuda-weekend-guide",
  "userAskedToPublish": true
}
```

4. 返回结果里取 `shareLink` 给用户 —— 它就是上表那个链接（同一条，不会变）。
   若 `verified` 为 `false`，等几秒再重试访问即可。

### 参数说明（别乱改）

| 参数 | 为什么是这个值 |
|---|---|
| `directory` | 绝对路径，决定"覆盖哪个应用"。**不要改路径、不要复制到新目录**，否则会生成一个新链接，旧的分享链接就废了 |
| `language: static` | 纯静态单文件，不需要服务端。别改成 node/python，否则会被当作需要安装的后端项目 |
| `entryHtml` | 单应用目录可不传，但根目录与 `public/` 下各有一个 `index.html`，显式指认根目录这个更安全 |
| `appName` / `domainPrefix` | 仅首次创建生效；后续发布保持原样即可（重复发布不会让名字漂移） |
| `userAskedToPublish` | 只有用户**本轮最新消息**明确要求发布/上线/同步线上时才置 `true`。漏传且已有线上链接时会被拦截要求确认，此时照提示去问用户，不要用这个开关去绕过校验 |

### 下线与作废

需要把链接停掉时：`action: "unpublish"` + 同一个 `directory`（不要传 appId，除非返回候选列表要求选择）。下线后链接立即失效，属于破坏性操作，用户没明说就先确认。

---

## 2. 方式 B：部署到 Cloudflare（备选，用户原始诉求）

项目已按 Cloudflare Workers 静态资源规范配好，命令行同样适用 Pages。当前未完成的原因**只是本机网络到 Cloudflare API 不通**，配置本身无问题。

### 已就绪的文件

```
wrangler.json          # Worker + assets 静态托管配置（assets.directory -> ./public）
public/index.html      # Worker 静态资源目录
```

`wrangler.json` 内容：

```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "liuda-weekend-guide",
  "compatibility_date": "2026-10-01",
  "assets": {
    "directory": "./public",
    "not_found_handling": "single-page-application"
  }
}
```

> 注意：`public/index.html` 是独立副本，**改完根目录 `index.html` 后要同步过去**：
> `cp index.html public/index.html`

### 部署命令

wrangler 已安装在受管 node 工作区（版本 4.152.0），直接跑：

```bash
# 先同步到 Worker 资源目录
cp "D:/Workplace/Other/城市app/index.html" "D:/Workplace/Other/城市app/public/index.html"

# 免登录临时部署（最快，产出临时预览地址）
"C:/Users/KON/.workbuddy/binaries/node/workspace/node_modules/.bin/wrangler.cmd" deploy --temporary
```

如需绑定到自己的 Cloudflare 账号（正式 `workers.dev` 域名 / 自定义域）：

```bash
# 方式 1：浏览器 OAuth
"C:/Users/KON/.workbuddy/binaries/node/workspace/node_modules/.bin/wrangler.cmd" login

# 方式 2：API Token（CI / 无人值守推荐）
export CLOUDFLARE_API_TOKEN=<你的 token>
export CLOUDFLARE_ACCOUNT_ID=<你的 account id>
"C:/Users/KON/.workbuddy/binaries/node/workspace/node_modules/.bin/wrangler.cmd" deploy

# 或者用 Cloudflare Pages
"C:/Users/KON/.workbuddy/binaries/node/workspace/node_modules/.bin/wrangler.cmd" pages deploy ./public --project-name liuda-weekend-guide
```

### 换地址为 Pages 时的收尾

若最终切到 Cloudflare 正式域名，需要更新本文档第 0 节的链接，并告知用户旧链接是否保留（方式 A 发布的链接仍独立存在，互不影响）。

---

## 3. 本地预览

```bash
# 任选其一
cd "D:/Workplace/Other/城市app"
python -m http.server 8080
# 或直接双击 index.html
```

浏览器打开 `http://127.0.0.1:8080`。改完先在本地确认外观，再执行第 1 节发布，避免线上被打回多次。

---

## 4. 已知坑（本机环境，务必先看）

| 现象 | 原因 | 解法 |
|---|---|---|
| `npm error 502 Bad Gateway` | registry.npmjs.org 在本机网络下不通 | 加 `--registry=https://registry.npmmirror.com` |
| wrangler 报 `fetch failed` / "connectivity issue" | 沙箱注入了 `HTTP_PROXY/HTTPS_PROXY=http://127.0.0.1:56242`，该代理拦截通往 api.cloudflare.com 的请求 | 先 `unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy`，并用**沙箱外 Shell** 执行（否则沙箱网络策略仍会拦） |
| 沙箱外 `api.cloudflare.com` 仍超时（curl 返回 000） | TUN/系统代理没生效，国际流量出不去；本机仅 7897 端口在监听且出口节点 TLS 握手失败 | 先确认 VPN 出口可用（`curl -I https://api.cloudflare.com/client/v4` 要有响应）。网络不通时不要反复重试 wrangler，改用第 1 节方式 A 交付 |
| 看不到 `shareLink` | 一般是疲劳帐号/配额问题 | 看返回的 `code` 与 `retryable`；`false` 时不要自行重试，按提示让用户处理（重新登录、释放配额等） |
| 站点内容没更新是因为传早了 | 文件尚未写盘就发布 | 严格保证"先写完再发布"，见第 1 节步骤 1 |

---

## 5. 给接手 AI 的最小执行清单

1. 确认要更新的是 `D:\Workplace\Other\城市app\index.html`。
2. 完成内容改动并保存落盘。
3. 本地跑一遍 http server 自检（可选但推荐）。
4. ToolSearch 找 `workbuddy_sites_deploy` → DeferExecuteTool 按第 1 节参数调用。
5. 把返回的 `shareLink` 给用户，并提示可在「设置 → 数据管理 → 应用」管理。
6. **不要**新建应用、不要改 `directory`、不要为了让 CAM 校验通过而伪造 `userAskedToPublish`。
