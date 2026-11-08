# 溜达 LIUDA · 周末城市探索指南

面向大学生的周末决策 App demo：把你所在城市的展览 / 市集 / 演出 / CityWalk / 徒步，
按 **偏好 × 天气 × 预算 × 人数** 拼成「本周末专属行程」，支持组队出发、地图打卡、攻略一键复刻。

> 纯静态、零依赖、无构建 —— 克隆下来用浏览器打开 `index.html` 就能跑。

## 快速开始

```bash
# 直接双击 index.html，或
python -m http.server 8080    # http://127.0.0.1:8080
```

## 完整逻辑链路

```
推荐(可解释) → 加入行程(冲突/预算检测) → 雨天 Plan B → 组队出发
   ↑                                                     ↓
偏好权重/隐式画像 ← 攻略一键复刻 ← 发布攻略 ← 打卡(街区点亮/徽章/等级)
```

- **推荐引擎**：偏好 34% · 天气 22% · 预算 16% · 人数 14% · 距离 14%，每张卡片给出「为什么推荐给你」
- **天气感知**：顶部可模拟切换三天天气，户外/室内项目匹配度实时变化
- **数据飞轮**：打卡会沉淀隐式偏好画像，直接改变下一次推荐
- 数据存在浏览器 localStorage，刷新不丢；「我的」页可一键重置演示数据

## 结构

```
index.html / styles.css
js/data.js     Mock 数据（14 个活动、街区、天气、队伍、攻略、徽章规则）
js/engine.js   推荐引擎（打分、冲突检测、Plan B、等级徽章）
js/app.js      状态管理 + 渲染 + 交互
design.html    产品设计说明书
smoke.js       引擎逻辑冒烟测试（node smoke.js）
e2e.js         jsdom 端到端测试（node e2e.js）
public/        Cloudflare Worker 静态资源副本
wrangler.json  Cloudflare Workers 配置
DEPLOY.md      部署交接文档
```

## 测试

```bash
node smoke.js
node e2e.js      # 需 jsdom：npm install jsdom
```

## 部署

见 [DEPLOY.md](DEPLOY.md)。支持任意静态托管；Cloudflare 静态资源目录在 `public/`。
