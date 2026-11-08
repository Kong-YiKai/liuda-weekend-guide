/* ============================================================
   溜达 LIUDA · Mock 数据层
   ------------------------------------------------------------
   真实环境下，activities 来自活动聚合服务，weather 来自天气 API，
   teams / guides 来自后端。此处全部用 mock 数据，结构与接口保持一致。
   ============================================================ */

const CATS = [
  { id: 'market', name: '市集', emoji: '🎪' },
  { id: 'exhibition', name: '展览', emoji: '🖼️' },
  { id: 'live', name: '演出', emoji: '🎸' },
  { id: 'film', name: '放映', emoji: '🎬' },
  { id: 'hike', name: '徒步', emoji: '⛰️' },
  { id: 'citywalk', name: 'CityWalk', emoji: '🚶' },
  { id: 'workshop', name: '手作', emoji: '🪡' }
];

const DAYS = [
  { id: 'fri', name: '周五夜', short: '周五' },
  { id: 'sat', name: '周六', short: '周六' },
  { id: 'sun', name: '周日', short: '周日' }
];

/* 城市街区（地图用的是相对百分比坐标） */
const DISTRICTS = [
  { id: 'west', name: '西岸滨江', x: 22, y: 44 },
  { id: 'old', name: '老城厢', x: 48, y: 56 },
  { id: 'campus', name: '大学城', x: 74, y: 72 },
  { id: 'bay', name: '江湾', x: 60, y: 26 },
  { id: 'garden', name: '植物园', x: 34, y: 74 },
  { id: 'downtown', name: '市中心', x: 54, y: 14 }
];

/* 活动库：outdoor=true 表示受天气影响 */
const DB_ACTIVITIES = [
  {
    id: 'a1', cat: 'market', title: '秋日艺术市集 · 落日专场', venue: '西岸滨江艺术中心 户外草坪',
    district: 'west', day: 'sat', start: 14, end: 20, price: 45, minP: 2, maxP: 4, outdoor: true,
    dist: 3.2, rating: 4.8, heat: 1280,
    tags: ['出片', '美食', 'i人友好', '日落'],
    styles: { photo: 0.95, social: 0.6, energy: 0.3 },
    desc: '80+ 独立摊主：陶艺、插画、手冲、限定周边。16:30 之后光线最好，建议带一张野餐垫。',
    tips: '周末人多，建议地铁前往；摊位部分只收现金，备一点零钱。'
  },
  {
    id: 'a2', cat: 'exhibition', title: '沉浸式数字艺术展「幻」', venue: '市中心 当代艺术馆 B2',
    district: 'downtown', day: 'sat', start: 10, end: 18, price: 88, minP: 1, maxP: 4, outdoor: false,
    dist: 6.5, rating: 4.6, heat: 930,
    tags: ['出片', '室内备选', '约会'],
    styles: { photo: 0.88, social: 0.45, energy: 0.12 },
    desc: '360° 投影 + 镜面迷宫，学生票 ¥68（现场出示学生证）。工作日人少，周末建议 10 点开门先进。',
    tips: '穿浅色衣服拍照更出片，深色会被投影淹没。'
  },
  {
    id: 'a3', cat: 'live', title: '周末拼盘 Livehouse', venue: 'MAO · 市中心馆',
    district: 'downtown', day: 'sat', start: 19.5, end: 22.5, price: 120, minP: 2, maxP: 6, outdoor: false,
    dist: 7.1, rating: 4.5, heat: 640,
    tags: ['社交', '室内备选', '深夜'],
    styles: { photo: 0.4, social: 0.95, energy: 0.8 },
    desc: '4 支本地乐队，预售 ¥120 / 现场 ¥150。前排容易挤，社恐选后排吧台位。',
    tips: '演出结束约 22:30，末班地铁 23:10，注意时间。'
  },
  {
    id: 'a4', cat: 'hike', title: '江湾骑行 8km · 新手线', venue: '江湾绿道 起点集合',
    district: 'bay', day: 'sun', start: 8, end: 11, price: 0, minP: 2, maxP: 6, outdoor: true,
    dist: 5.4, rating: 4.7, heat: 420,
    tags: ['免费', '日出', '治愈'],
    styles: { photo: 0.62, social: 0.5, energy: 0.9 },
    desc: '全程平路无爬坡，共享单车可解决。8 点的光很干净，中途有补给点。',
    tips: '自备水；风大建议带件薄外套。'
  },
  {
    id: 'a5', cat: 'citywalk', title: '老城厢 CityWalk · 弄堂线', venue: '老城厢 城隍庙地铁 2 号口',
    district: 'old', day: 'sat', start: 10, end: 12.5, price: 0, minP: 1, maxP: 6, outdoor: true,
    dist: 4.2, rating: 4.9, heat: 1510,
    tags: ['免费', 'i人友好', '出片', '历史'],
    styles: { photo: 0.8, social: 0.35, energy: 0.45 },
    desc: '免费公益讲解 2.5 小时，串起 6 条弄堂与 3 处老建筑改造院落。需小程序预约名额。',
    tips: '名额常在周四放出，记得抢；路上基本无遮挡，注意防晒。'
  },
  {
    id: 'a6', cat: 'workshop', title: '手作银戒指工坊', venue: '大学城 银工坊工作室',
    district: 'campus', day: 'sun', start: 14, end: 16.5, price: 188, minP: 1, maxP: 2, outdoor: false,
    dist: 1.2, rating: 4.8, heat: 380,
    tags: ['约会', '手残友好', '室内备选'],
    styles: { photo: 0.72, social: 0.55, energy: 0.1 },
    desc: '含材料 + 老师指导 2.5 小时，做完当场带走。可刻字，适合和重要的人一起来。',
    tips: '别穿长袖，锉抖音屑会沾；提前一周预约。'
  },
  {
    id: 'a7', cat: 'citywalk', title: '温室植物园晨拍', venue: '植物园 热带温室',
    district: 'garden', day: 'sat', start: 9, end: 11.5, price: 30, minP: 1, maxP: 4, outdoor: true,
    dist: 8.0, rating: 4.6, heat: 520,
    tags: ['出片', '摄影党', '治愈'],
    styles: { photo: 0.92, social: 0.2, energy: 0.3 },
    desc: '温室 9 点开门，人最少、水汽最足，逆光拍叶片绝了。学生半价 ¥30。',
    tips: '镜头容易起雾，进园前用布包一下。'
  },
  {
    id: 'a8', cat: 'market', title: '二手黑胶集市', venue: '老城厢 织造仓库 2F',
    district: 'old', day: 'sun', start: 13, end: 18, price: 0, minP: 1, maxP: 4, outdoor: false,
    dist: 4.8, rating: 4.4, heat: 460,
    tags: ['免费', 'i人友好', '室内备选', '淘宝'],
    styles: { photo: 0.5, social: 0.45, energy: 0.2 },
    desc: '入场免费，20+ 摊位的二手黑胶、CD 与老杂志。淘碟人均约 ¥60，可以试听。',
    tips: '带现金谈价更容易；早去挑品相好的。'
  },
  {
    id: 'a9', cat: 'hike', title: '山顶日落徒步 · 进阶线', venue: '江湾 北山登山口 集合',
    district: 'bay', day: 'sat', start: 15, end: 20, price: 25, minP: 2, maxP: 8, outdoor: true,
    dist: 12.5, rating: 4.9, heat: 780,
    tags: ['日落', '特种兵', '出片'],
    styles: { photo: 0.9, social: 0.6, energy: 1.0 },
    desc: '往返 9km，爬升 420m，17:50 山顶日落。大巴往返车费 AA 约 ¥25，下山可打车。',
    tips: '必须带头灯；新手慎报，建议先走 A4 新手线。'
  },
  {
    id: 'a10', cat: 'film', title: '独立电影放映 + 导演交流', venue: '老城厢 小客厅放映厅',
    district: 'old', day: 'sun', start: 19, end: 22, price: 45, minP: 1, maxP: 4, outdoor: false,
    dist: 4.5, rating: 4.7, heat: 310,
    tags: ['文艺', 'i人友好', '室内备选'],
    styles: { photo: 0.3, social: 0.5, energy: 0.15 },
    desc: '放映 110 分钟，映后 30 分钟导演连线交流。限定 40 座，售罄率高。',
    tips: '提前 15 分钟到，位置随便坐；映后交流很值。'
  },
  {
    id: 'a11', cat: 'exhibition', title: '夜游美术馆（周五夜场）', venue: '市中心 现代美术馆',
    district: 'downtown', day: 'fri', start: 18.5, end: 21.5, price: 80, minP: 1, maxP: 4, outdoor: false,
    dist: 6.8, rating: 4.5, heat: 540,
    tags: ['浪漫', '出片', '室内备选', '深夜'],
    styles: { photo: 0.9, social: 0.5, energy: 0.1 },
    desc: '周五延长开放至 21:30，夜场票 ¥80 含一杯酒水。人少、灯光氛围好。',
    tips: '21:00 停止入场；周五夜班车次少，结伴返程。'
  },
  {
    id: 'a12', cat: 'live', title: '江畔落日露营音乐会', venue: '西岸滨江 露营区',
    district: 'west', day: 'sun', start: 16, end: 21, price: 158, minP: 2, maxP: 6, outdoor: true,
    dist: 3.6, rating: 4.8, heat: 1120,
    tags: ['社交', '出片', '露营', '日落'],
    styles: { photo: 0.85, social: 0.9, energy: 0.5 },
    desc: '含帐篷位 + 饮品券 x2，两支乐队 + 一串 Open Mic。日落时段氛围最好。',
    tips: '营地禁止外食；夜里江边风大，带毯子。'
  },
  {
    id: 'a13', cat: 'citywalk', title: '早市早餐探店团', venue: '老城厢 早市街口',
    district: 'old', day: 'sun', start: 7.5, end: 10, price: 35, minP: 2, maxP: 4, outdoor: true,
    dist: 5.0, rating: 4.6, heat: 390,
    tags: ['美食', '特种兵', '治愈'],
    styles: { photo: 0.6, social: 0.6, energy: 0.4 },
    desc: '串 4 家老字号早餐：豆浆油条、生煎、粢饭糕、糖水。人均 ¥35 吃到撑。',
    tips: '建议 7:30 到，8:30 后排队明显；现金更快。'
  },
  {
    id: 'a14', cat: 'citywalk', title: '猫咖书店下午局', venue: '大学城 猫咖·独立书店',
    district: 'campus', day: 'sun', start: 13, end: 17, price: 42, minP: 1, maxP: 4, outdoor: false,
    dist: 1.2, rating: 4.7, heat: 700,
    tags: ['治愈', 'i人友好', '室内备选', '猫'],
    styles: { photo: 0.6, social: 0.25, energy: 0.05 },
    desc: '含一杯饮品 + 撸猫 2 小时，二楼是二手书区。下雨天的完美备选。',
    tips: '周末猫会营业性罢工，下午 2–4 点最活跃。'
  }
];

/* 天气：默认 forecast，可在演示里切换（用于验证天气感知推荐） */
const DB_WEATHER = {
  fri: { cond: 'cloudy', temp: 20, label: '多云 20°C', emoji: '☁️' },
  sat: { cond: 'sunny', temp: 18, label: '晴 18°C', emoji: '☀️' },
  sun: { cond: 'rain', temp: 14, label: '小雨 14°C', emoji: '🌧️' }
};
const WEATHER_OPTIONS = [
  { cond: 'sunny', name: '晴', emoji: '☀️', temp: 18 },
  { cond: 'cloudy', name: '多云', emoji: '☁️', temp: 20 },
  { cond: 'rain', name: '小雨', emoji: '🌧️', temp: 14 }
];

/* 已有队伍（mock） */
const DB_TEAMS = [
  {
    id: 't1', activityId: 'a1', name: '落日场拍照局', cap: 4,
    members: [{ a: '🦊', n: '栗子不加糖' }, { a: '🐨', n: '小满' }, { a: '🐸', n: 'Green' }],
    tags: ['摄影党', '需互拍', '信用分95'], meet: { time: '15:30', place: '地铁 7 号口' },
    note: '带了反光板和长焦，轮流互拍，日落前一定到草坪。'
  },
  {
    id: 't2', activityId: 'a1', name: 'i人友好局：各逛各的', cap: 4,
    members: [{ a: '🐷', n: '墩墩' }, { a: '🦉', n: '夜航西' }],
    tags: ['i人友好', '不强行社交', '信用分92'], meet: { time: '16:00', place: '市集正门' },
    note: '进园各自逛，18:30 集合吃个饭就散，全程无强制尬聊。'
  },
  {
    id: 't3', activityId: 'a1', name: '特种兵快闪：市集+夜宵', cap: 4,
    members: [
      { a: '🐻', n: 'Bear' }, { a: '🐤', n: '小黄' }, { a: '🐙', n: '八爪' }, { a: '🐳', n: '鲸鱼' }
    ],
    tags: ['特种兵', '信用分98'], meet: { time: '14:00', place: '草坪中央大树' },
    note: '市集结束后直奔夜市，预计 22:30 收工。'
  },
  {
    id: 't4', activityId: 'a9', name: '北山日落组队，缺 1 个男生背水', cap: 6,
    members: [{ a: '🐐', n: '山鬼' }, { a: '🐿️', n: '松果' }, { a: '🦎', n: '蜥蜴' }],
    tags: ['特种兵', '日落', '信用分96'], meet: { time: '14:40', place: '大学城地铁 B 口' },
    note: '本周第六次去了，路线很熟，跟紧不掉队。'
  },
  {
    id: 't5', activityId: 'a3', name: '拼盘搭子，前排冲一冲', cap: 5,
    members: [{ a: '🐯', n: 'Tiger' }, { a: '🦄', n: '独角' }],
    tags: ['社交', '蹦迪', '信用分90'], meet: { time: '19:00', place: 'Livehouse 门口' },
    note: '都买了预售票，到场直接进。结束后可一起夜宵。'
  },
  {
    id: 't6', activityId: 'a5', name: '公益讲解＋后续溜达', cap: 5,
    members: [{ a: '🐢', n: '慢慢' }, { a: '🦊', n: '栗子不加糖' }, { a: '🐰', n: '兔几' }],
    tags: ['i人友好', '出片', '免费', '信用分97'], meet: { time: '9:45', place: '2 号口便利店' },
    note: '听完讲解去吃碗糖水，不强求。'
  },
  {
    id: 't7', activityId: 'a2', name: '数字展早场 10 点档', cap: 4,
    members: [{ a: '🐳', n: '鲸鱼' }],
    tags: ['摄影党', '信用分93'], meet: { time: '9:50', place: '艺术馆正门' },
    note: '早场人少，镜面迷宫可以拍到空镜。'
  }
];

/* 社区攻略（mock）。activityIds 是结构化的「路线」，支持一键复刻 */
const DB_GUIDES = [
  {
    id: 'g1', author: '@栗子不加糖', avatar: '🦊', likes: 1240, stars: 862, daysAgo: 1,
    title: '¥52 玩转西岸一天：市集 + 落日 + 夜市',
    activityIds: ['a1', 'a12'], budget: 52, energy: '中等',
    tips: '16:00 进市集先扫一圈摊位，17:40 转草坪占位置看日落，19:00 出园去夜市。别在正门口买吃的，贵三分一。',
    tags: ['出片', '¥100内', '2人成行']
  },
  {
    id: 'g2', author: '@夜航西', avatar: '🦉', likes: 980, stars: 1510, daysAgo: 2,
    title: '雨天 Plan B：室内半日，一分不多花',
    activityIds: ['a8', 'a10'], budget: 105, energy: '轻松',
    tips: '下雨天别硬扛户外。黑胶集市 13:00 进场慢慢淘，17:30 出来吃晚饭，19:00 放映正好。记得带现金更方便谈价。',
    tags: ['室内备选', '雨天', '文艺']
  },
  {
    id: 'g3', author: '@山鬼', avatar: '🐐', likes: 762, stars: 940, daysAgo: 4,
    title: '新手第一次上北山：别踩我这三个坑',
    activityIds: ['a9', 'a4'], budget: 25, energy: '硬核',
    tips: '头灯必带，我第一次没带抹黑下山很惨。16:30 前必须登顶，17:50 日落只有很短窗口。回程打车比大巴快。',
    tags: ['特种兵', '日落', '避雷']
  }
];

/* 徽章：check(state) 返回 true 即解锁 */
const BADGES = [
  { id: 'b1', name: '首次出门', emoji: '🎉', desc: '完成第 1 次打卡', check: s => s.checkins.length >= 1 },
  { id: 'b2', name: '看展新手', emoji: '🎭', desc: '打卡过任意展览', check: s => hasCat(s, 'exhibition') },
  { id: 'b3', name: '市集猎人', emoji: '🧋', desc: '累计 2 次市集打卡', check: s => countCat(s, 'market') >= 2 },
  { id: 'b4', name: '日落收藏家', emoji: '🌄', desc: '打卡过带日落标签的活动', check: s => hasTag(s, '日落') },
  { id: 'b5', name: '特种兵认证', emoji: '⚡', desc: '累计 3 次户外高强度打卡', check: s => countOutdoorEnergy(s) >= 3 },
  { id: 'b6', name: '城市漫游者', emoji: '🗺️', desc: '点亮 3 个不同街区', check: s => litDistricts(s).size >= 3 },
  { id: 'b7', name: '社交牛ver.1', emoji: '🤝', desc: '加入或发起 2 支队伍', check: s => s.myTeams.length + s.joined.length >= 2 },
  { id: 'b8', name: '攻略组代表', emoji: '📖', desc: '发布 1 篇攻略', check: s => s.guides.length >= 1 }
];

/* 探索等级 */
const LEVELS = [
  { min: 0, name: '新到’city', next: '街区常客' },
  { min: 2, name: '街区常客', next: '城市玩家' },
  { min: 5, name: '城市玩家', next: '城市显眼包' },
  { min: 9, name: '城市显眼包', next: '周末市长' },
  { min: 14, name: '周末市长', next: '已封顶' }
];

/* 打卡可选封面 */
const PHOTO_EMOJIS = ['📷', '🌅', '🍂', '🎭', '🧋', '🎸', '⛰️', '🎬', '🖼️', '🌧️', '🐱', '☕'];

/* 队伍可选标签 */
const TEAM_TAGS = ['i人友好', '摄影党', '特种兵', '美食优先', '佛系逛', 'AA制', '需要搭伴'];

/* ---------- 工具函数（被徽章规则使用） ---------- */
function checkedActivities(s) {
  return s.checkins.map(c => ACTIVITY_MAP[c.activityId]).filter(Boolean);
}
function hasCat(s, cat) { return checkedActivities(s).some(a => a.cat === cat); }
function countCat(s, cat) { return checkedActivities(s).filter(a => a.cat === cat).length; }
function hasTag(s, tag) { return checkedActivities(s).some(a => a.tags.includes(tag)); }
function countOutdoorEnergy(s) {
  return checkedActivities(s).filter(a => a.outdoor && a.styles.energy >= 0.8).length;
}
function litDistricts(s) {
  const set = new Set(checkedActivities(s).map(a => a.district));
  return set;
}
