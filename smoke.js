/* 逻辑冒烟测试（node smoke.js）：验证引擎与链路逻辑，不涉及 DOM */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'js/data.js'), 'utf8'), ctx, { filename: 'data.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'js/engine.js'), 'utf8'), ctx, { filename: 'engine.js' });

const run = code => vm.runInContext(code, ctx);

const state = run(`({
  tab:'explore',
  filters:{cat:'all',day:'all',sort:'score',maxPrice:120,groupSize:2,onlyFree:false,onlyIndoor:false,hideConflict:false},
  prefs:{weights:{saveMoney:.4,photo:.6,social:.5,energy:.3},likedCats:[],dislikes:[],implicitCat:{}},
  weather:{fri:null,sat:null,sun:null},
  itinerary:[],checkins:[],joined:[],myTeams:[],simMembers:{},guides:[],
  modal:null,toast:null
})`);
/* 把 state 注入 vm 全局，供后续表达式引用 */
ctx.__st = state;
vm.runInContext('var state = __st;', ctx);

const log = (k, v) => console.log(String(k).padEnd(34), v);

console.log('--- 1. 活动库 ---');
log('活动数量', run('DB_ACTIVITIES.length'));
log('全文 sick 检查', run('DB_ACTIVITIES.every(a=>a.title&&a.venue&&a.desc&&a.tips)'));
log('价格/时间合法', run('DB_ACTIVITIES.every(a=>a.end>a.start&&a.price>=0)'));

console.log('\n--- 2. 推荐引擎 ---');
const top = run('recommend(state).slice(0,3).map(r=>({t:r.activity.title,m:r.match}))');
console.log(top);
log('推荐数量(默认条件)', run('recommend(state).length'));
log('全部カテゴリ覆盖', run('new Set(DB_ACTIVITIES.map(a=>a.cat)).size'));
log('雨天时户外项排位下降', (() => {
  state.weather.sat = 'rain';
  const before = run('recommend(state).find(r=>r.activity.id==="a1").match');
  state.weather.sat = 'sunny';
  const after = run('recommend(state).find(r=>r.activity.id==="a1").match');
  return `${before} (雨) -> ${after} (晴)`;
})());
log('室内项雨天上升', (() => {
  state.weather.sat = 'rain';
  const r = run('recommend(state).find(r=>r.activity.id==="a2").match');
  state.weather.sat = null;
  const s = run('recommend(state).find(r=>r.activity.id==="a2").match');
  return `${r} (雨) -> ${s} (默认晴)`;
})());

console.log('\n--- 3. 筛选 ---');
state.filters.cat = 'market'; log('只看市集', run('recommend(state).length'));
state.filters.onlyFree = true; log('市集+免费', run('recommend(state).length'));
state.filters.cat = 'all'; state.filters.onlyFree = false;
state.filters.maxPrice = 40; log('预算¥40以内', run('recommend(state).length'));
state.filters.maxPrice = 120;

console.log('\n--- 4. 行程 / 冲突 / 预算 ---');
state.itinerary = [{ id: 'i1', activityId: 'a1' }, { id: 'i2', activityId: 'a3' }];
log('行程统计', JSON.stringify(run('itineraryStats(state)').items.length + ' 项 / ¥' + run('itineraryStats(state).total')));
log('检测冲突(a1 与 a2 同天重叠)', run('!!itineraryConflict(ACTIVITY_MAP["a2"],state)'));
log('无冲突项(a5 与已有行程)', run('!!itineraryConflict(ACTIVITY_MAP["a5"],state)'));

console.log('\n--- 5. Plan B ---');
state.weather.sat = 'rain';
log('雨天风险项', run('weatherRiskItems(state).length'));
const alt = run('JSON.stringify(findIndoorAlternative(state,ACTIVITY_MAP["a1"]).activity.title)');
log('为户外项找室内替代', alt);
state.weather.sat = null;

console.log('\n--- 6. 组队 ---');
state.joined = ['t1'];
log('队伍总数', run('allTeams(state).length'));
log('t1 人数(含我)', run('effectiveMembers(state,DB_TEAMS.find(t=>t.id==="t1"))'));
log('t1 状态', run('JSON.stringify(teamState(state,DB_TEAMS.find(t=>t.id==="t1")))'));
state.myTeams = [{
  id: 'mt1', activityId: 'a2', name: '测试队', cap: 4,
  members: [{ a: '🦊', n: '你' }], tags: ['AA制'], meet: { time: '10:00', place: '正门' }, note: 'x'
}];
log('我的队伍出现', run('allTeams(state).some(t=>t.id==="mt1")'));

console.log('\n--- 7. 打卡 / 徽章 / 等级 ---');
state.checkins = [
  { id: 'c1', activityId: 'a1', emoji: '📷', note: '很好', rate: 5, ts: 1 },
  { id: 'c2', activityId: 'a8', emoji: '🎭', note: '淘到宝', rate: 4, ts: 2 },
  { id: 'c3', activityId: 'a9', emoji: '⛰️', note: '累死', rate: 5, ts: 3 }
];
log('等级', run('JSON.stringify(levelInfo(state.checkins.length))'));
log('已解锁徽章', run('unlockedBadges(state).map(b=>b.name).join("/")'));
log('点亮街区', run('Array.from(litDistricts(state)).join("/")'));

console.log('\n--- 8. 攻略 ---');
state.guides = [{
  id: 'ug1', author: '@你', avatar: '🦊', likes: 0, stars: 0, title: '我的路线',
  activityIds: ['a1', 'a3'], budget: 165, energy: '中等', tips: 'x', tags: [], ts: 9, autoBudget: false
}];
log('攻略 Feed 条数', run('guidesFeed(state).length'));
log('攻略预算', run('guideBudget(guidesFeed(state)[0].g)'));
log('复刻目标活动数', run('guideActivities(state.guides[0]).length'));

console.log('\n--- 9. 偏好反哺 ---');
state.prefs.implicitCat.market = 2;
log('市场类匹配度提升', (() => {
  const s1 = run('recommend(state).find(r=>r.activity.id==="a1").match');
  state.prefs.implicitCat.market = 0;
  const s2 = run('recommend(state).find(r=>r.activity.id==="a1").match');
  state.prefs.implicitCat.market = 2;
  return `${s2} (无画像) -> ${s1} (打卡2次)`;
})());
state.prefs.dislikes.push('market');
log('屏蔽后匹配度', run('recommend(state).find(r=>r.activity.id==="a1").match'));

console.log('\n✅ 冒烟测试完成，无异常抛出');
