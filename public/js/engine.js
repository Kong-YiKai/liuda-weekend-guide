/* ============================================================
   溜达 LIUDA · 推荐引擎 + 业务逻辑
   ------------------------------------------------------------
   核心是一个可解释的多因子打分器：
     偏好(34%) + 天气(22%) + 预算(16%) + 人数(14%) + 距离(14%)
   每个因子都会产出一句人话理由，用户能看到「为什么推给我」。
   ============================================================ */

const ACTIVITY_MAP = {};
DB_ACTIVITIES.forEach(a => { ACTIVITY_MAP[a.id] = a; });

const CAT_MAP = {};
CATS.forEach(c => { CAT_MAP[c.id] = c; });

const DISTRICT_MAP = {};
DISTRICTS.forEach(d => { DISTRICT_MAP[d.id] = d; });

const W_FACTORS = { pref: 0.34, weather: 0.22, budget: 0.16, people: 0.14, dist: 0.14 };

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

/* ---------- 天气 ---------- */
function getWeather(state, day) {
  const override = state.weather[day];
  const base = DB_WEATHER[day];
  if (override) {
    const opt = WEATHER_OPTIONS.find(o => o.cond === override);
    if (opt) return { cond: opt.cond, temp: opt.temp, label: opt.name + ' ' + opt.temp + '°C', emoji: opt.emoji };
  }
  return base;
}
function isRainy(state, day) { return getWeather(state, day).cond === 'rain'; }

/* ---------- 单项因子打分 ---------- */

/* 偏好：类别亲和（显式喜好 + 打卡沉淀的隐式画像）× 风格滑杆（省钱/出片/社交/体力） */
function scorePref(a, state) {
  const implicit = state.prefs.implicitCat[a.cat] || 0;   // 打卡沉淀
  const liked = state.prefs.likedCats.includes(a.cat);
  const disliked = state.prefs.dislikes.includes(a.cat);
  if (disliked) return { s: 0.05, reason: `⚠️ 你屏蔽了「${CAT_MAP[a.cat].name}」类` };

  let catAff = 0.5 + Math.min(0.3, implicit * 0.1);
  if (liked) catAff = Math.min(1, catAff + 0.25);

  // 风格偏好：把 activity 的 style 向量与用户权重做加权
  const w = state.prefs.weights;
  const sumW = w.saveMoney + w.photo + w.social + w.energy || 1;
  const saveFit = a.price === 0 ? 1 : clamp01(1 - a.price / 260);
  const styleFit =
    (w.saveMoney * saveFit + w.photo * a.styles.photo + w.social * a.styles.social + w.energy * a.styles.energy) / sumW;

  const s = clamp01(catAff * 0.6 + styleFit * 0.4);
  const hitTags = [];
  if (w.saveMoney >= 0.7 && a.price === 0) hitTags.push('免费');
  if (w.photo >= 0.7 && a.styles.photo >= 0.85) hitTags.push('超级出片');
  if (w.social >= 0.7 && a.styles.social >= 0.85) hitTags.push('社交局');
  if (w.energy >= 0.7 && a.styles.energy >= 0.85) hitTags.push('特种兵行程');
  const reason = hitTags.length
    ? `🎯 命中你的偏好：${hitTags.join('、')}`
    : `🎯 ${CAT_MAP[a.cat].name}类 · 契合你的兴趣画像`;
  return { s, reason };
}

/* 天气：户外项目雨天直接失分，室内项目雨天加分 */
function scoreWeather(a, state) {
  const w = getWeather(state, a.day);
  if (a.outdoor) {
    const map = { sunny: 0.96, cloudy: 0.74, rain: 0.12 };
    const s = map[w.cond];
    return {
      s,
      reason: s > 0.7
        ? `☀️ ${w.label}，户外正合适`
        : `🌧️ ${DAYS.find(d => d.id === a.day).name}有雨，户外不推荐`
    };
  }
  const map = { sunny: 0.66, cloudy: 0.82, rain: 0.98 };
  const s = map[w.cond];
  return { s, reason: s > 0.9 ? `🌧️ ${DAYS.find(d => d.id === a.day).name}有雨，室内备选首选` : `🏠 室内不受天气影响` };
}

/* 预算：在人均预算内满分，超出线性衰减到 0 */
function scoreBudget(a, state) {
  const b = state.filters.maxPrice;
  if (a.price <= b) return { s: 1, reason: `💸 人均 ¥${a.price}${a.price === 0 ? '（免费）' : ''}，在你 ¥${b} 预算内` };
  const s = clamp01(1 - (a.price - b) / Math.max(1, b));
  return { s, reason: `💸 人均 ¥${a.price}，超出你的 ¥${b} 预算` };
}

/* 人数：落在活动适合区间内满分 */
function scorePeople(a, state) {
  const n = state.filters.groupSize;
  if (n >= a.minP && n <= a.maxP) {
    return { s: 1, reason: `👥 适合 ${a.minP}-${a.maxP} 人，正好 ${n} 人局` };
  }
  const gap = n < a.minP ? a.minP - n : n - a.maxP;
  const s = clamp01(1 - gap * 0.35);
  return {
    s,
    reason: n < a.minP ? `👥 建议至少 ${a.minP} 人，你只有 ${n} 人` : `👥 最多 ${a.maxP} 人，你们 ${n} 人有点多`
  };
}

function scoreDist(a, state) {
  const s = clamp01(1 - (a.dist - 1) / 16);
  const r = a.dist <= 2 ? `🚶 就在学校附近 ${a.dist}km` : `🚇 距你 ${a.dist}km`;
  return { s, reason: r };
}

/* ---------- 综合打分 ---------- */
function evaluate(a, state) {
  const parts = {
    pref: scorePref(a, state),
    weather: scoreWeather(a, state),
    budget: scoreBudget(a, state),
    people: scorePeople(a, state),
    dist: scoreDist(a, state)
  };
  let score = 0;
  for (const k in W_FACTORS) score += W_FACTORS[k] * parts[k].s;

  const conflict = itineraryConflict(a, state);
  if (conflict) score *= 0.32;

  score = clamp01(score);
  return {
    activity: a,
    score,
    match: Math.min(99, Math.round(score * 100)),
    conflict,
    reasons: [parts.pref.reason, parts.weather.reason, parts.budget.reason, parts.people.reason]
      .filter(Boolean)
      .slice(0, 3)
  };
}

/* ---------- 行程冲突 ---------- */
function inItinerary(state, id) { return state.itinerary.some(i => i.activityId === id); }

function itineraryConflict(a, state) {
  return state.itinerary.find(i => {
    const b = ACTIVITY_MAP[i.activityId];
    return b.id !== a.id && b.day === a.day && a.start < b.end && b.start < a.end;
  }) || null;
}

/* 行程所在天是否有户外项目撞上雨天 */
function weatherRiskItems(state) {
  return state.itinerary
    .map(i => ({ item: i, a: ACTIVITY_MAP[i.activityId] }))
    .filter(x => x.a.outdoor && isRainy(state, x.a.day));
}

/* 为一个冲突/受天气影响的项目找最佳室内替代。
   注意：被替换的那一项本身还在行程里，查冲突时要先把它摘出来，否则自己跟自己永远冲突。 */
function findIndoorAlternative(state, activity) {
  const without = Object.assign({}, state, {
    itinerary: state.itinerary.filter(i => i.activityId !== activity.id)
  });
  return DB_ACTIVITIES
    .filter(a => a.id !== activity.id && !a.outdoor && a.day === activity.day && !inItinerary(state, a.id))
    .filter(a => !itineraryConflict(a, without))
    .map(a => evaluate(a, without))
    .filter(x => x.score > 0.3)
    .sort((x, y) => y.score - x.score)[0] || null;
}

/* ---------- 推荐主入口：筛选 + 排序 ---------- */
function recommend(state) {
  const f = state.filters;
  let list = DB_ACTIVITIES.filter(a => {
    if (f.cat !== 'all' && a.cat !== f.cat) return false;
    if (f.onlyFree && a.price !== 0) return false;
    if (f.onlyIndoor && a.outdoor) return false;
    if (f.day !== 'all' && a.day !== f.day) return false;
    if (a.price > f.maxPrice * 1.25) return false;      // 明显超预算的隐藏，留出一点弹性
    if (f.hideConflict && itineraryConflict(a, state)) return false;
    return true;
  });

  const scored = list.map(a => evaluate(a, state));

  if (f.sort === 'score') scored.sort((x, y) => y.score - x.score);
  else if (f.sort === 'time') scored.sort((x, y) => dayOrder(x.activity.day) - dayOrder(y.activity.day) || x.activity.start - y.activity.start);
  else if (f.sort === 'price') scored.sort((x, y) => x.activity.price - y.activity.price);
  else if (f.sort === 'heat') scored.sort((x, y) => y.activity.heat - x.activity.heat);

  return scored;
}

function dayOrder(d) { return DAYS.findIndex(x => x.id === d); }

/* ---------- 队伍 ---------- */
function allTeams(state) {
  return state.myTeams.concat(DB_TEAMS);
}
function isJoined(state, teamId) { return state.joined.includes(teamId); }
function teamMembers(state, t) {
  const sim = state.simMembers[t.id] || [];
  const me = isJoined(state, t.id) ? [{ a: '🦊', n: '你', me: true }] : [];
  return t.members.concat(sim, me);
}
function effectiveMembers(state, t) { return Math.min(t.cap, teamMembers(state, t).length); }
function isFull(state, t) { return effectiveMembers(state, t) >= t.cap; }
function teamState(state, t) {
  const n = effectiveMembers(state, t);
  if (n >= t.cap) return { text: '已满员 · 蹲候补', cls: 'full' };
  return { text: `差 ${t.cap - n} 人`, cls: '' };
}

/* ---------- 货币 / 时间格式 ---------- */
function fmtTime(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}:${mm === 0 ? '00' : mm}`;
}
function fmtRange(a) { return `${fmtTime(a.start)}–${fmtTime(a.end)}`; }
function dayName(id) { return DAYS.find(d => d.id === id).name; }

/* ---------- 行程统计 ---------- */
function itineraryStats(state) {
  const items = state.itinerary
    .map(i => ({ item: i, a: ACTIVITY_MAP[i.activityId] }))
    .sort((x, y) => dayOrder(x.a.day) - dayOrder(y.a.day) || x.a.start - y.a.start);
  const total = items.reduce((sum, x) => sum + x.a.price, 0);
  const hours = items.reduce((sum, x) => sum + (x.a.end - x.a.start), 0);
  return { items, total, hours: Math.round(hours * 10) / 10 };
}

/* ---------- 等级 / 徽章 ---------- */
function levelInfo(count) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (count >= LEVELS[i].min) idx = i;
  const cur = LEVELS[idx];
  const nextMin = idx + 1 < LEVELS.length ? LEVELS[idx + 1].min : null;
  const cnt = count;
  return {
    lv: idx + 1,
    name: cur.name,
    next: nextMin === null ? null : { name: LEVELS[idx + 1].name, remain: nextMin - cnt },
    progress: nextMin === null ? 1 : clamp01((cnt - cur.min) / Math.max(1, nextMin - cur.min))
  };
}
function unlockedBadges(state) { return BADGES.filter(b => b.check(state)); }

/* ---------- 攻略 ---------- */
function guidesFeed(state) {
  return state.guides
    .map(g => ({ g, mine: true }))
    .concat(DB_GUIDES.map(g => ({ g, mine: false })))
    .sort((x, y) => (y.g.ts || 0) - (x.g.ts || 0));
}
function guideActivities(g) { return g.activityIds.map(id => ACTIVITY_MAP[id]).filter(Boolean); }
function guideBudget(g) {
  const acts = guideActivities(g);
  if (g.autoBudget) return acts.reduce((s, a) => s + a.price, 0);
  return g.budget;
}
