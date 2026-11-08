/* ============================================================
   溜达 LIUDA · 状态管理与界面渲染
   ------------------------------------------------------------
   单页应用：状态集中管理 + 全量重渲染，数据落在 localStorage，
   刷新后进度不丢。所有 mock 交互都会真实改变状态。
   ============================================================ */

const STORE_KEY = 'liuda.state.v1';

const GRADS = {
  market: 'linear-gradient(135deg,#ff9a6c,#ff5e8e)',
  exhibition: 'linear-gradient(135deg,#7f7bf5,#b16cea)',
  live: 'linear-gradient(135deg,#b16cea,#ff5e8e)',
  film: 'linear-gradient(135deg,#5b6cff,#7f7bf5)',
  hike: 'linear-gradient(135deg,#2dd4bf,#5eead4)',
  citywalk: 'linear-gradient(135deg,#f6d365,#fda085)',
  workshop: 'linear-gradient(135deg,#fbc2eb,#a18cd1)'
};
function grad(cat) { return GRADS[cat] || 'linear-gradient(135deg,#7f7bf5,#ff5e8e)'; }

const MOCK_PEOPLE = [
  { a: '🐻', n: '阿熊' }, { a: '🐰', n: '兔几' }, { a: '🦄', n: '独角' },
  { a: '🐿️', n: '松果' }, { a: '🐤', n: '小黄' }, { a: '🦎', n: '蜥蜴' },
  { a: '🐢', n: '慢慢' }, { a: '🐳', n: '鲸鱼' }
];

/* ---------------- 默认状态 ---------------- */
function defaultState() {
  return {
    tab: 'explore',
    filters: {
      cat: 'all', day: 'all', sort: 'score',
      maxPrice: 120, groupSize: 2,
      onlyFree: false, onlyIndoor: false, hideConflict: false
    },
    prefs: {
      weights: { saveMoney: 0.4, photo: 0.6, social: 0.5, energy: 0.3 },
      likedCats: [], dislikes: [], implicitCat: {}
    },
    weather: { fri: null, sat: null, sun: null },
    itinerary: [],
    checkins: [],
    joined: [],
    myTeams: [],
    simMembers: {},
    totalBudget: 240,
    guides: [],
    modal: null,
    toast: null
  };
}

let S = defaultState();
const seq = () => Math.random().toString(36).slice(2, 8);

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      S = Object.assign(defaultState(), parsed);
      S.filters = Object.assign(defaultState().filters, parsed.filters || {});
      S.prefs = Object.assign(defaultState().prefs, parsed.prefs || {});
      S.modal = null; S.toast = null;
    }
  } catch (e) { console.warn('state load failed', e); }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { }
}
function commit() { save(); render(); }
function toast(msg, type) {
  S.toast = { msg, type: type || 'ok' };
  render();
  clearTimeout(window.__toastT);
  window.__toastT = setTimeout(() => { S.toast = null; render(); }, 2300);
}

/* ---------------- 通用小工具 ---------------- */
const $ = sel => document.querySelector(sel);
function esc(s) { return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
function Ahref(id) { return ACTIVITY_MAP[id]; }
function isMine(t) { return S.myTeams.some(x => x.id === t.id); }
function myTeamsAll() {
  return S.myTeams.slice().reverse();
}
function myTeamIds() {
  return S.joined.concat(S.myTeams.map(t => t.id));
}
function findGuide(id) {
  return S.guides.find(g => g.id === id) || DB_GUIDES.find(g => g.id === id) || null;
}

/* ============================================================
   渲染入口
   ============================================================ */
function render() {
  renderTop();
  renderView();
  renderTab();
  renderModal();
  renderToast();
}

function renderTop() {
  const lv = levelInfo(S.checkins.length);
  const w = getWeather(S, 'sat');
  const cls = w.cond === 'rain' ? 'wx rain' : 'wx';
  $('#topbar').innerHTML = `
    <div class="tb-row">
      <div>
        <div class="brand">溜达 LIUDA</div>
        <div class="brand-sub">周末城市探索指南</div>
      </div>
      <div class="${cls}">
        <span>${w.emoji}</span><span>${esc(w.label)}</span>
      </div>
      <div class="icon-btn" title="等级">Lv.${lv.lv}</div>
    </div>`;
}

function renderTab() {
  const tabs = [
    { id: 'explore', i: '🧭', n: '探索' },
    { id: 'squad', i: '🤝', n: '组队', badge: myTeamIds().length },
    { id: 'checkin', i: '📍', n: '打卡', badge: S.checkins.length },
    { id: 'guides', i: '📖', n: '攻略' },
    { id: 'me', i: '🪪', n: '我的' }
  ];
  $('#tabbar').innerHTML = tabs.map(t => `
    <div class="t ${S.tab === t.id ? 'on' : ''}" data-act="tab" data-tab="${t.id}">
      <i>${t.i}</i><span>${t.n}</span>
      ${t.badge ? `<span class="dot">${t.badge}</span>` : ''}
    </div>`).join('');
}

function renderView() {
  const v = $('#view');
  switch (S.tab) {
    case 'explore': v.innerHTML = viewExplore(); break;
    case 'squad': v.innerHTML = viewSquad(); break;
    case 'checkin': v.innerHTML = viewCheckin(); break;
    case 'guides': v.innerHTML = viewGuides(); break;
    case 'me': v.innerHTML = viewMe(); break;
  }
  window.scrollTo(0, 0);
}

function renderModal() {
  const root = $('#modal-root');
  if (!S.modal) { root.innerHTML = ''; return; }
  const m = S.modal;
  let body = '';
  if (m.type === 'detail') body = modalDetail(m.id);
  else if (m.type === 'planner') body = modalPlanner();
  else if (m.type === 'teamCreate') body = modalTeamCreate();
  else if (m.type === 'checkin') body = modalCheckin(m.activityId);
  else if (m.type === 'guideNew') body = modalGuideNew();
  else if (m.type === 'guide') body = modalGuide(m.id);
  root.innerHTML = `${body}`;
}

function renderToast() {
  const root = $('#toast-root');
  root.innerHTML = S.toast ? `<div class="toast ${S.toast.type}">${esc(S.toast.msg)}</div>` : '';
}

/* ============================================================
   探索
   ============================================================ */
function viewExplore() {
  const f = S.filters;
  const list = recommend(S);
  const stats = itineraryStats(S);
  const risk = weatherRiskItems(S);
  const steps = [
    { e: '🧭', n: '挑活动', done: S.itinerary.length > 0 },
    { e: '🤝', n: '组个队', done: myTeamIds().length > 0 },
    { e: '📍', n: '去打卡', done: S.checkins.length > 0 },
    { e: '📖', n: '写攻略', done: S.guides.length > 0 }
  ];

  let html = `<div class="chain">`;
  steps.forEach((s, i) => {
    html += `<div class="step ${s.done ? 'done' : ''}"><div class="e">${s.e}</div><div class="n">${s.n}</div></div>`;
    if (i < steps.length - 1) html += `<span class="arrow">›</span>`;
  });
  html += `</div>`;

  const w = getWeather(S, 'sat');
  html += `
  <div class="hero-card">
    <h3>👋 周五了，周末怎么安排？</h3>
    <p>周六 <b style="color:var(--mint)">${esc(getWeather(S, 'sat').label)}</b>，
    周日 <b style="color:${getWeather(S, 'sun').cond === 'rain' ? 'var(--amber)' : 'var(--mint)'}">${esc(getWeather(S, 'sun').label)}</b>。
    按你现在的偏好，为你匹配到 <b style="color:var(--pink)">${list.length}</b> 个活动${S.itinerary.length ? `，行程已排 <b style="color:var(--mint)">${S.itinerary.length}</b> 项` : ''}。</p>
    <div class="rowbtn">
      <button class="btn sm" data-act="planner">🗓 我的周末行程 ${S.itinerary.length ? '(' + S.itinerary.length + ')' : ''}</button>
      <button class="btn sm ghost" data-act="tab" data-tab="squad">🤝 找搭子</button>
    </div>
    ${risk.length ? `<div class="warnbox" style="margin-top:10px">⚠️ 行程里有 ${risk.length} 个户外项目撞上雨天，<span class="link-ish" data-act="planner">去换 Plan B</span></div>` : ''}
  </div>`;

  /* 天气演示条 */
  html += `<div class="demo"><span class="lb">🌦 天气演示</span>`;
  ['sat', 'sun', 'fri'].forEach(d => {
    html += `<span class="day">${dayName(d)}</span><span class="grp">`;
    WEATHER_OPTIONS.forEach(o => {
      const on = (S.weather[d] || DB_WEATHER[d].cond) === o.cond;
      html += `<span class="wchip ${on ? 'on' : ''}" data-act="wx" data-day="${d}" data-cond="${o.cond}">${o.emoji}${esc(o.name)}</span>`;
    });
    html += `</span>`;
  });
  html += `</div>`;

  /* 筛选 */
  html += `<div class="filters">
    <div class="chiprow">
      <span class="chipx ${f.cat === 'all' ? 'on' : ''}" data-act="cat" data-cat="all">全部</span>
      ${CATS.map(c => `<span class="chipx ${f.cat === c.id ? 'on' : ''}" data-act="cat" data-cat="${c.id}"><span class="e">${c.emoji}</span>${c.name}</span>`).join('')}
    </div>
    <div class="chiprow">
      <span class="chipx ${f.day === 'all' ? 'on' : ''}" data-act="day" data-day="all">三天都看</span>
      ${DAYS.map(d => `<span class="chipx ${f.day === d.id ? 'on' : ''}" data-act="day" data-day="${d.id}">${d.name}</span>`).join('')}
    </div>
    <div class="ctrlrow">
      <span class="lb">人均预算</span>
      <input class="slider" type="range" min="0" max="300" step="10" value="${f.maxPrice}"
             data-inp="budget" data-act="noop">
      <span class="lb" data-out="budget">¥${f.maxPrice}</span>
      <span class="stepper">
        <button data-act="grp" data-d="-1">−</button>
        <span class="v">${f.groupSize}人</span>
        <button data-act="grp" data-d="1">＋</button>
      </span>
    </div>
    <div class="chiprow">
      <span class="chipx ${f.onlyFree ? 'on' : ''}" data-act="toggle" data-key="onlyFree">🆓 只看免费</span>
      <span class="chipx ${f.onlyIndoor ? 'on' : ''}" data-act="toggle" data-key="onlyIndoor">🏠 只看室内</span>
      <span class="chipx ${f.hideConflict ? 'on' : ''}" data-act="toggle" data-key="hideConflict">🚫 隐藏时间冲突</span>
      <span class="chipx ${f.sort === 'score' ? 'on' : ''}" data-act="sort" data-sort="score">⭐ 推荐度</span>
      <span class="chipx ${f.sort === 'price' ? 'on' : ''}" data-act="sort" data-sort="price">💸 价格</span>
      <span class="chipx ${f.sort === 'time' ? 'on' : ''}" data-act="sort" data-sort="time">🕑 时间</span>
      <span class="chipx ${f.sort === 'heat' ? 'on' : ''}" data-act="sort" data-sort="heat">🔥 热度</span>
    </div>
  </div>`;

  html += `<div class="sect"><h3>本周末推荐</h3><span class="c">${list.length} 个 · 匹配度实时计算</span></div>`;

  if (!list.length) {
    html += `<div class="empty"><span class="e">🥲</span>当前条件下没有找到活动<br>试着放宽预算，或取消「只看室内 / 免费」</div>`;
  } else {
    html += list.map(cardActivity).join('');
  }

  html += `<div class="smallnote">
    说明：推荐分 = 偏好 34% · 天气 22% · 预算 16% · 人数 14% · 距离 14%。
    数据为演示 mock，天气可在上方手动模拟。<a href="design.html" style="color:var(--mint)">查看产品方案 →</a>
  </div>`;
  return html;
}

function cardActivity(r) {
  const a = r.activity;
  const added = inItinerary(S, a.id);
  const cls = r.match >= 85 ? 'hi' : (r.match >= 65 ? 'mid' : 'low');
  const teams = allTeams(S).filter(t => t.activityId === a.id);
  let h = `<div class="card">
    <div class="cover" style="background:${grad(a.cat)}">
      <span class="badge-w">${dayName(a.day)} ${fmtRange(a)}</span>
      <span class="badge-r ${cls}">${r.match}% 匹配</span>
      <span class="t">${CATS.find(c => c.id === a.cat).emoji} ${esc(a.title)}</span>
    </div>
    <div class="info">
      <h4>${esc(a.title)}</h4>
      <div class="meta">
        <span>${esc(a.venue)}</span>
      </div>
      <div class="meta" style="margin-top:5px">
        <span>🚇 <b>${a.dist}km</b></span>
        <span>💸 人均 <em>${a.price === 0 ? '免费' : '¥' + a.price}</em></span>
        <span>👥 ${a.minP}-${a.maxP}人</span>
        <span>⭐ ${a.rating}</span>
      </div>
      <div class="why">${r.reasons.map(x => `<div>${esc(x)}</div>`).join('')}</div>
      ${r.conflict ? `<div class="warnbox">🕑 与行程「${esc(Ahref(r.conflict.activityId).title)}」时间重叠（${dayName(a.day)} ${fmtRange(a)}）</div>` : ''}
      ${a.outdoor && isRainy(S, a.day) ? `<div class="warnbox">🌧️ ${dayName(a.day)}有雨，户外项目有风险，建议看室内备选</div>` : ''}
      <div class="tags">${a.tags.map(t => `<span class="tg ${t === '室内备选' ? 'v' : (t === '出片' ? 'p' : (t === '免费' ? '' : 'a'))}">${esc(t)}</span>`).join('')}</div>
      <div class="acts">
        <button class="btn sm ${added ? 'ghost' : ''}" data-act="${added ? 'delPlan' : 'addPlan'}" data-id="${a.id}">${added ? '✓ 已在行程' : '＋ 加入行程'}</button>
        <button class="btn sm ghost" data-act="detail" data-id="${a.id}">详情</button>
        <button class="btn sm ghost" data-act="tab" data-tab="squad">找搭子${teams.length ? '(' + teams.length + ')' : ''}</button>
      </div>
    </div>
  </div>`;
  return h;
}

/* ============================================================
   周末行程（含冲突/预算/Plan B）
   ============================================================ */
function modalPlanner() {
  const st = itineraryStats(S);
  const risk = weatherRiskItems(S);
  let h = `<div class="scrim" data-scrim="1"><div class="sheet">
    <div class="sheet-head">
      <h3>🗓 我的周末行程</h3><span class="c" style="margin-left:auto;font-size:11.5px;color:var(--dim)">${st.items.length} 项 · ${st.hours}h</span>
      <span class="x" data-act="close">✕</span>
    </div>
    <div class="sheet-body">`;

  if (!st.items.length) {
    h += `<div class="empty"><span class="e">🗓</span>行程还是空的<br>去「探索」挑几个活动加入吧</div>`;
  } else {
    const totalBudgetCap = S.totalBudget || 240;
    const over = st.total > totalBudgetCap;
    h += `<div class="panel ${over ? 'warn' : 'mint'}">
      <h5>💰 预算合计 <span style="margin-left:auto">¥${st.total} / ¥${totalBudgetCap}</span></h5>
      <div style="height:7px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:6px">
        <div style="height:100%;width:${Math.min(100, Math.round(st.total / totalBudgetCap * 100))}%;background:var(--grad);border-radius:99px"></div>
      </div>
      <div class="stepper" style="margin-top:10px">
        <span class="lb" style="font-size:11px;color:var(--dim)">周末总预算</span>
        <button data-act="budgetCap" data-d="-20">−</button>
        <span class="v">¥${totalBudgetCap}</span>
        <button data-act="budgetCap" data-d="20">＋</button>
      </div>
      ${over ? `<div class="smallnote" style="color:var(--amber)">超出预算 ¥${st.total - totalBudgetCap}，可以替换其中一项，或提高预算。</div>` : ''}
    </div>`;

    /* 冲突检测 */
    let conflicts = [];
    for (let i = 0; i < st.items.length; i++) {
      for (let j = i + 1; j < st.items.length; j++) {
        const A = st.items[i].a, B = st.items[j].a;
        if (A.day === B.day && A.start < B.end && B.start < A.end) conflicts.push([A, B]);
      }
    }
    if (conflicts.length) {
      h += `<div class="panel warn"><h5>🕑 发现 ${conflicts.length} 处时间冲突</h5>`;
      conflicts.forEach(c => { h += `<p style="font-size:11.5px">· 「${esc(c[0].title)}」(${fmtRange(c[0])}) 与「${esc(c[1].title)}」(${fmtRange(c[1])}) 重叠</p>`; });
      h += `</div>`;
    }

    /* 天气风险 + Plan B */
    if (risk.length) {
      h += `<div class="panel warn"><h5>🌧️ ${risk.length} 项户外活动撞上雨天</h5>`;
      risk.forEach(x => {
        const alt = findIndoorAlternative(S, x.a);
        h += `<div style="margin-top:8px">
          <p style="font-size:11.5px">「${esc(x.a.title)}」 ${dayName(x.a.day)} ${fmtRange(x.a)} · 户外</p>
          ${alt
            ? `<p style="font-size:11.5px;color:var(--mint)">↳ 建议换成「${esc(alt.activity.title)}」${alt.activity.price === 0 ? '（免费）' : '（¥' + alt.activity.price + '）'} · ${alt.match}% 匹配</p>
               <button class="btn sm mint" style="margin-top:6px" data-act="planB" data-from="${x.item.id}" data-to="${alt.activity.id}">🔁 一键替换</button>`
            : `<p style="font-size:11.5px">暂无合适室内备选，建议调到同一天的其他时段。</p>`}
        </div>`;
      });
      h += `</div>`;
    }

    for (const d of DAYS) {
      const items = st.items.filter(x => x.a.day === d.id);
      if (!items.length) continue;
      h += `<div class="sect"><h3>${d.name}</h3><span class="c">${items.length} 项</span></div>`;
      items.forEach(x => {
        const a = x.a;
        h += `<div class="card">
          <div class="cover" style="height:66px;background:${grad(a.cat)}">
            <span class="badge-w">${fmtRange(a)}</span>
            <span class="t" style="font-size:12.5px">${esc(a.title)}</span>
          </div>
          <div class="info">
            <div class="meta">
              <span>💸 ${a.price === 0 ? '免费' : '¥' + a.price}</span>
              <span>🚇 ${a.dist}km</span>
              <span>${a.outdoor ? '🏞 户外' : '🏠 室内'}</span>
            </div>
            <div class="acts">
              <button class="btn sm ghost" data-act="detail" data-id="${a.id}">详情</button>
              <button class="btn sm ghost" data-act="delPlan" data-id="${a.id}">移出行程</button>
            </div>
          </div>
        </div>`;
      });
    }
  }

  h += `</div></div></div>`;
  return h;
}

/* ============================================================
   组队
   ============================================================ */
function viewSquad() {
  const all = allTeams(S);
  const mine = all.filter(t => isMine(t) || isJoined(S, t.id));
  const planIds = S.itinerary.map(i => i.activityId);
  const suggested = all.filter(t => !mine.includes(t) && planIds.includes(t.activityId));
  const others = all.filter(t => !mine.includes(t) && !suggested.includes(t));

  let h = `<div class="hero-card">
    <h3>🤝 找搭子，出发才有动力</h3>
    <p>一人一个小队上限 4–6 人，队伍只在活动当天有效。所有成员均学生认证 + 信用分 90+。</p>
    <div class="rowbtn"><button class="btn sm" data-act="teamCreate">＋ 发起新队伍</button></div>
  </div>`;

  h += `<div class="sect"><h3>我的队伍</h3><span class="c">${mine.length} 支</span></div>`;
  h += mine.length ? mine.map(teamCard).join('') : `<div class="empty"><span class="e">🤝</span>还没加入任何队伍<br>下面挑一个拼进去，或自己发起</div>`;

  if (suggested.length) {
    h += `<div class="sect"><h3>你行程里的活动 · 可拼队</h3><span class="c">${suggested.length} 支</span></div>`;
    h += suggested.map(teamCard).join('');
  }
  h += `<div class="sect"><h3>全部集结中</h3><span class="c">${others.length} 支</span></div>`;
  h += others.map(teamCard).join('');
  h += `<div class="smallnote">加入队伍后会在演示中随机有搭子响应 —— 用于验证「拼队成功」链路。</div>`;
  return h;
}

function teamCard(t) {
  const a = ACTIVITY_MAP[t.activityId];
  const members = teamMembers(S, t);
  const st = teamState(S, t);
  const joined = isJoined(S, t.id) || isMine(t);
  return `<div class="team ${isMine(t) ? 'mine' : ''}">
    <div class="top">
      <div class="avs">
        ${members.map(m => `<span class="${m.me ? 'me' : ''}" title="${esc(m.n)}">${m.a}</span>`).join('')}
        ${Array(Math.max(0, t.cap - members.length)).fill('<span style="background:transparent;border-style:dashed;color:var(--dim);font-size:12px">?</span>').join('')}
      </div>
      <div class="nm">
        <h5>${esc(t.name)}${isMine(t) ? ' <span class="tg v">队长：你</span>' : ''}</h5>
        <div class="s">${members.length}/${t.cap} 人 · ${esc(st.text)}</div>
      </div>
    </div>
    <div style="font-size:11.5px;color:var(--sub)">📍 ${esc(a.title)} · ${dayName(a.day)} ${fmtRange(a)}</div>
    <div class="tags">${t.tags.map(x => `<span class="tg ${x === 'i人友好' ? 'p' : (x === '特种兵' ? 'a' : 'v')}">${esc(x)}</span>`).join('')}</div>
    <div class="note">📌 ${esc(t.note || '')}<br>🤝 集合：${dayName(a.day)} ${esc(t.meet.time)} @ ${esc(t.meet.place)}</div>
    <div class="acts">
      ${joined
      ? `<button class="btn sm ghost" data-act="leaveTeam" data-id="${t.id}">退出队伍</button>`
      : `<button class="btn sm" data-act="joinTeam" data-id="${t.id}" ${st.cls === 'full' ? 'disabled' : ''}>${st.cls === 'full' ? '已满员' : '申请入队'}</button>`}
      <button class="btn sm ghost" data-act="detail" data-id="${a.id}">看活动</button>
    </div>
  </div>`;
}

function modalTeamCreate() {
  const m = S.modal;
  const d = m.draft;
  const acts = DB_ACTIVITIES;
  return `<div class="scrim" data-scrim="1"><div class="sheet">
    <div class="sheet-head"><h3>＋ 发起新队伍</h3><span class="x" data-act="close">✕</span></div>
    <div class="sheet-body">
      <div class="field">
        <label>要去哪个活动</label>
        <select data-inp="tcAct">
          ${acts.map(a => `<option value="${a.id}" ${d.activityId === a.id ? 'selected' : ''}>${dayName(a.day)} · ${esc(a.title)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>队伍名称</label>
        <input type="text" data-inp="tcName" value="${esc(d.name)}" placeholder="例：落日局，随意逛到天黑">
      </div>
      <div class="field">
        <label>人数上限：${d.cap} 人</label>
        <input class="slider" type="range" min="2" max="8" step="1" value="${d.cap}" data-inp="tcCap">
      </div>
      <div class="field">
        <label>队伍标签（决定谁能看懂你这队）</label>
        <div class="tgpick">
          ${TEAM_TAGS.map(t => `<span class="${d.tags.includes(t) ? 'on' : ''}" data-act="tcTag" data-tag="${t}">${esc(t)}</span>`).join('')}
        </div>
      </div>
      <div class="field">
        <label>集合时间</label>
        <input type="text" data-inp="tcTime" value="${esc(d.meetTime)}" placeholder="例：15:30">
      </div>
      <div class="field">
        <label>集合地点</label>
        <input type="text" data-inp="tcPlace" value="${esc(d.meetPlace)}" placeholder="例：地铁 7 号口">
      </div>
      <div class="field">
        <label>给搭子的一句话</label>
        <textarea data-inp="tcNote" placeholder="我们几点集合、要不要 AA、拍不拍照…">${esc(d.note)}</textarea>
      </div>
      <button class="btn block" data-act="submitTeam">🚀 发布队伍</button>
      <div class="smallnote">发布后会出现在「全部集结中」，演示里 4 秒后会有搭子响应入队。</div>
    </div>
  </div></div>`;
}

/* ============================================================
   打卡
   ============================================================ */
function viewCheckin() {
  const lv = levelInfo(S.checkins.length);
  const lit = litDistricts(S);
  const badges = unlockedBadges(S);
  const pending = S.itinerary.filter(i => !S.checkins.some(c => c.activityId === i.activityId));

  let h = `<div class="chain" style="margin-bottom:14px">
    <div class="step done"><div class="e">Lv.${lv.lv}</div><div class="n">${esc(lv.name)}</div></div>
    <span class="arrow">›</span>
    <div class="step done"><div class="e">📍</div><div class="n">${S.checkins.length} 次打卡</div></div>
    <span class="arrow">›</span>
    <div class="step ${lit.size ? 'done' : ''}"><div class="e">🗺️</div><div class="n">点亮 ${lit.size}/6 街区</div></div>
    <span class="arrow">›</span>
    <div class="step ${badges.length ? 'done' : ''}"><div class="e">🏅</div><div class="n">${badges.length} 枚徽章</div></div>
  </div>`;

  h += `<div class="map"><div class="grid"></div>`;
  DISTRICTS.forEach(d => {
    if (lit.has(d.id)) {
      h += `<div class="halo" style="left:${d.x}%;top:${d.y}%"></div><div class="pin" style="left:${d.x}%;top:${d.y}%">📍<span class="cap">${esc(d.name)}</span></div>`;
    } else {
      h += `<div class="pin" style="left:${d.x}%;top:${d.y}%;opacity:.22">📍<span class="cap">${esc(d.name)}</span></div>`;
    }
  });
  h += `<div class="legend">🌆 已点亮 ${lit.size} / ${DISTRICTS.length} 个街区</div></div>`;

  h += `<div class="panel mint">
    <h5>🏅 探索等级 Lv.${lv.lv}「${lv.name}」</h5>
    <div style="height:7px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:6px">
      <div style="height:100%;width:${Math.round(lv.progress * 100)}%;background:var(--grad);border-radius:99px"></div>
    </div>
    <p style="margin-top:8px;font-size:11.5px">${lv.next ? `再打卡 ${lv.next.remain} 次升级 <b style="color:var(--pink)">${lv.next.name}</b>` : '已达最高等级 🎉'}</p>
  </div>`;

  h += `<div class="sect"><h3>可打卡</h3><span class="c">来自你的周末行程</span></div>`;
  if (!pending.length) {
    h += `<div class="empty"><span class="e">🧭</span>${S.itinerary.length ? '行程里的活动都打过卡了，去探索页再加点' : '还没有行程，先去探索页挑几个活动'}</div>`;
  } else {
    h += pending.map(i => {
      const a = ACTIVITY_MAP[i.activityId];
      return `<div class="card">
        <div class="cover" style="height:60px;background:${grad(a.cat)}">
          <span class="badge-w">${dayName(a.day)} ${fmtRange(a)}</span>
          <span class="t" style="font-size:12.5px">${esc(a.title)}</span>
        </div>
        <div class="info">
          <div class="meta"><span>📍 ${esc(a.venue)}</span></div>
          <div class="acts"><button class="btn sm mint" data-act="checkin" data-id="${a.id}">📍 到达打卡</button></div>
        </div>
      </div>`;
    }).join('');
  }

  h += `<div class="sect"><h3>徽章墙</h3><span class="c">${badges.length}/${BADGES.length}</span></div>`;
  h += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:9px">`;
  BADGES.forEach(b => {
    const ok = badges.includes(b);
    h += `<div style="text-align:center;padding:11px 3px;border-radius:14px;background:var(--card);border:1px solid ${ok ? 'rgba(255,94,142,.4)' : 'var(--line)'};opacity:${ok ? 1 : .35}">
      <div style="font-size:20px">${b.emoji}</div>
      <div style="font-size:9.5px;color:var(--sub);margin-top:5px;line-height:1.4">${esc(b.name)}</div>
    </div>`;
  });
  h += `</div>`;

  if (S.checkins.length) {
    h += `<div class="sect"><h3>我的打卡记录</h3><span class="c">${S.checkins.length} 条</span></div>`;
    h += S.checkins.slice().reverse().map(c => {
      const a = ACTIVITY_MAP[c.activityId];
      return `<div class="ci">
        <div class="ph">${c.emoji}</div>
        <div class="bd">
          <h5>${esc(a.title)}</h5>
          <div class="s">${dayName(a.day)} ${fmtRange(a)} · 💸 ${a.price === 0 ? '免费' : '¥' + a.price} · <span class="rate">${'★'.repeat(c.rate)}${'☆'.repeat(5 - c.rate)}</span></div>
          <div class="t">${esc(c.note)}</div>
        </div>
      </div>`;
    }).join('');
    h += `<div class="smallnote">打卡会沉淀进你的兴趣画像，直接影响下次推荐 —— 这就是数据飞轮。</div>`;
  }
  return h;
}

function modalCheckin(actId) {
  const a = ACTIVITY_MAP[actId];
  const d = S.modal.draft;
  return `<div class="scrim" data-scrim="1"><div class="sheet">
    <div class="sheet-head"><h3>📍 打卡</h3><span class="x" data-act="close">✕</span></div>
    <div class="sheet-body">
      <div class="panel"><h5>${esc(a.title)}</h5>
        <p>${esc(a.venue)} · ${dayName(a.day)} ${fmtRange(a)}</p></div>
      <div class="field">
        <label>选一张封面</label>
        <div class="emopick">
          ${PHOTO_EMOJIS.map(e => `<span class="${d.emoji === e ? 'on' : ''}" data-act="ciEmoji" data-e="${e}">${e}</span>`).join('')}
        </div>
      </div>
      <div class="field">
        <label>此刻感受</label>
        <textarea data-inp="ciNote" placeholder="日落超好看 / 人太多记得早去 / 人均比攻略便宜…">${esc(d.note)}</textarea>
      </div>
      <div class="field">
        <label>评分</label>
        <div class="starpick">
          ${[1, 2, 3, 4, 5].map(n => `<span class="${d.rate >= n ? 'on' : ''}" data-act="ciStar" data-v="${n}">★</span>`).join('')}
        </div>
      </div>
      <button class="btn block mint" data-act="submitCheckin">✅ 提交打卡</button>
      <div class="smallnote">演示模式：解除「必须当天/到场」限制，直接记录。提交后会自动更新偏好画像与徽章。</div>
    </div>
  </div></div>`;
}

/* ============================================================
   攻略社区
   ============================================================ */
function viewGuides() {
  const feed = guidesFeed(S);
  let h = `<div class="hero-card">
    <h3>📖 你的周末，别人的攻略</h3>
    <p>打卡后可一键生成结构化攻略；看到别人的路线也能「一键复刻」成自己的行程 —— UGC 直接变成行程转化。</p>
    <div class="rowbtn">
      <button class="btn sm mint" data-act="guideNew" ${S.checkins.length ? '' : 'disabled'}>✍️ 从打卡生成攻略${S.checkins.length ? '' : '（先去打卡）'}</button>
    </div>
  </div>`;

  h += `<div class="sect"><h3>同城攻略榜</h3><span class="c">${feed.length} 篇</span></div>`;
  h += feed.map(({ g, mine }) => {
    const acts = guideActivities(g);
    const budget = guideBudget(g);
    return `<div class="post">
      <div class="pc" style="background:${grad(acts[0] ? acts[0].cat : 'market')}">
        <span class="ab">💸 人均 ¥${budget} · ${esc(g.energy || '轻松')}</span>
      </div>
      <div class="bd">
        <h5>${mine ? '<span class="tg p">我的攻略</span> ' : ''}${esc(g.title)}</h5>
        <div class="route">
          ${acts.map((a, i) => `${i ? '<span class="ar">›</span>' : ''}<span class="n">${esc(a.title)}</span>`).join('')}
        </div>
        <div class="tags">${(g.tags || []).map(t => `<span class="tg ${t === '出片' ? 'p' : (t === '免费' || t === '雨天' ? 'v' : '')}">${esc(t)}</span>`).join('')}</div>
        <div class="au" style="margin-top:9px">
          <span class="av">${g.avatar}</span><span>${esc(g.author)}</span>
          <span class="st"><span>❤️ ${g.likes}</span><span>⭐ ${g.stars}</span></span>
        </div>
        <div class="acts" style="display:flex;gap:8px;margin-top:10px">
          <button class="btn sm ghost" data-act="guide" data-id="${g.id}">查看详情</button>
          <button class="btn sm mint" data-act="copyGuide" data-id="${g.id}">🔁 一键复刻为行程</button>
        </div>
      </div>
    </div>`;
  }).join('');
  return h;
}

function modalGuide(id) {
  const g = findGuide(id);
  const acts = guideActivities(g);
  const budget = guideBudget(g);
  const copiedIds = S.itinerary.map(i => i.activityId);
  const missing = acts.filter(a => !copiedIds.includes(a.id)).length;
  return `<div class="scrim" data-scrim="1"><div class="sheet">
    <div class="sheet-head"><h3>📖 攻略详情</h3><span class="x" data-act="close">✕</span></div>
    <div class="sheet-body">
      <div class="card" style="margin-bottom:12px">
        <div class="cover" style="height:78px;background:${grad(acts[0].cat)}">
          <span class="badge-w">💸 人均 ¥${budget}</span>
          <span class="t" style="font-size:13px">${esc(g.title)}</span>
        </div>
        <div class="info"><h4>${esc(g.title)}</h4>
          <div class="meta"><span>${esc(g.author)}</span><span>❤️ ${g.likes}</span><span>⭐ ${g.stars}</span><span>${esc(g.energy || '')}</span></div>
        </div>
      </div>
      <div class="panel"><h5>🗺 路线（${acts.length} 站）</h5>
        ${acts.map((a, i) => `<p>${i + 1}. ${esc(a.title)} —— ${dayName(a.day)} ${fmtRange(a)} · ${a.price === 0 ? '免费' : '¥' + a.price} · ${esc(a.venue)}</p>`).join('')}
      </div>
      <div class="panel mint"><h5>💡 实战 Tips</h5><p>${esc(g.tips)}</p></div>
      <button class="btn block mint" data-act="copyGuide" data-id="${g.id}">🔁 复刻到我的行程（${missing} 站未加入）</button>
      <div class="smallnote">复刻会保留原攻略的路线与时间，冲突項目会被自动跳过。</div>
    </div>
  </div></div>`;
}

function modalGuideNew() {
  const d = S.modal.draft;
  const acts = d.activityIds.map(id => ACTIVITY_MAP[id]).filter(Boolean);
  const budget = d.activityIds.reduce((s, id) => s + ACTIVITY_MAP[id].price, 0);
  return `<div class="scrim" data-scrim="1"><div class="sheet">
    <div class="sheet-head"><h3>✍️ 生成我的攻略</h3><span class="x" data-act="close">✕</span></div>
    <div class="sheet-body">
      <div class="panel mint"><h5>已自动为你填好草稿</h5>
        <p>路线来自你的 ${acts.length} 次打卡，花费与标签自动算好，你只需要补一句「真实感受」。</p></div>
      <div class="field"><label>标题</label><input type="text" data-inp="gTitle" value="${esc(d.title)}"></div>
      <div class="field">
        <label>路线（可增删）</label>
        <div class="tgpick">
          ${d.activityIds.concat(S.checkins.map(c => c.activityId).filter(x => !d.activityIds.includes(x)))
      .concat(Object.keys(S.prefs.implicitCat).length ? [] : [])
      .map(id => {
        const a = ACTIVITY_MAP[id];
        const on = d.activityIds.includes(id);
        return `<span class="${on ? 'on' : ''}" data-act="gAct" data-a="${id}">${esc(a.title)}</span>`;
      }).join('')}
        </div>
      </div>
      <div class="field"><label>人均花费（已自动计算）</label>
        <input type="number" data-inp="gBudget" value="${budget}">
      </div>
      <div class="field"><label>体力强度</label>
        <select data-inp="gEnergy">
          ${['轻松', '中等', '硬核'].map(x => `<option ${d.energy === x ? 'selected' : ''}>${x}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>标签</label>
        <div class="tgpick">
          ${['出片', '¥100内', '雨天', '免费', 'i人友好', '特种兵', '避雷', '约会'].map(t => `<span class="${d.tags.includes(t) ? 'on' : ''}" data-act="gTag" data-tag="${t}">${t}</span>`).join('')}
        </div>
      </div>
      <div class="field"><label>正文 / 避雷</label>
        <textarea data-inp="gTips">${esc(d.tips)}</textarea></div>
      <button class="btn block" data-act="publishGuide">🚀 发布攻略</button>
    </div>
  </div></div>`;
}

/* ============================================================
   我的
   ============================================================ */
function viewMe() {
  const lv = levelInfo(S.checkins.length);
  const badges = unlockedBadges(S);
  const w = S.prefs.weights;
  const pct = k => Math.round(w[k] * 100) + '%';
  const rows = [
    { k: 'saveMoney', n: '省钱优先', d: '低价/免费活动权重更高' },
    { k: 'photo', n: '出片欲强', d: '拍照好看的地方优先' },
    { k: 'social', n: '社交驱动', d: '人多热闹的局优先' },
    { k: 'energy', n: '体力满分', d: '硬核户外线路优先' }
  ];
  let h = `<div class="hero-card" style="margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:12px">
      <div style="width:52px;height:52px;border-radius:18px;background:var(--grad2);display:flex;align-items:center;justify-content:center;font-size:26px">🦊</div>
      <div>
        <h3 style="font-size:16px">周末探索者</h3>
        <p style="font-size:11.5px">Lv.${lv.lv} ${esc(lv.name)} · ${S.checkins.length} 次打卡 · ${badges.length} 枚徽章</p>
      </div>
    </div>
  </div>`;

  h += `<div class="sect"><h3>偏好权重</h3><span class="c">拖动即时影响推荐</span></div>`;
  h += `<div class="panel">`;
  rows.forEach(r => {
    h += `<div class="prefrow">
      <div class="n">${r.n}<small>${r.d}</small></div>
      <input class="slider" type="range" min="0" max="100" value="${Math.round(w[r.k] * 100)}" data-inp="pref" data-k="${r.k}">
      <div class="v" data-out="pref-${r.k}">${pct(r.k)}</div>
    </div>`;
  });
  h += `</div>`;

  h += `<div class="sect"><h3>类别偏好</h3><span class="c">点击切换：喜欢 / 屏蔽</span></div>`;
  h += `<div class="panel"><div class="chiprow" style="flex-wrap:wrap;overflow:visible">`;
  CATS.forEach(c => {
    const like = S.prefs.likedCats.includes(c.id);
    const dis = S.prefs.dislikes.includes(c.id);
    const imp = S.prefs.implicitCat[c.id] || 0;
    h += `<span class="chipx ${like ? 'on' : (dis ? '' : '')}" data-act="catPref" data-cat="${c.id}" style="${dis ? 'text-decoration:line-through;opacity:.5' : ''}">
      ${c.emoji} ${c.name}${imp ? ` <span style="color:var(--mint)">+${imp}</span>` : ''}${like ? ' ♥' : (dis ? ' ✕' : '')}</span>`;
  });
  h += `</div><div class="smallnote">「+N」是你打卡沉淀出的隐式画像，打卡越多越准。</div></div>`;

  h += `<div class="sect"><h3>我的资产</h3></div>`;
  h += `<div class="panel">
    <div class="kv" style="background:transparent;border:none;padding:0;margin-bottom:10px">行程 ${S.itinerary.length} 项 · 队伍 ${myTeamIds().length} 支 · 打卡 ${S.checkins.length} 次 · 攻略 ${S.guides.length} 篇</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:9px">
      ${badges.length ? badges.map(b => `<div style="text-align:center;font-size:20px;padding:9px;border-radius:12px;background:var(--card2);border:1px solid rgba(255,94,142,.4)">${b.emoji}</div>`).join('') : '<div class="smallnote">还没有徽章，去打卡解锁吧</div>'}
    </div>
  </div>`;

  h += `<div class="sect"><h3>演示控制</h3></div>`;
  h += `<div class="panel">
    <p style="margin-bottom:10px">数据保存在本机浏览器。清空后可重新体验完整链路。</p>
    <button class="btn sm ghost" data-act="reset">${S.confirmReset ? '⚠️ 确认清空全部数据' : '🧹 重置演示数据'}</button>
  </div>`;
  h += `<div class="smallnote"><a href="design.html" style="color:var(--mint)">📄 查看产品设计说明书 →</a></div>`;
  return h;
}

/* ============================================================
   活动详情
   ============================================================ */
function modalDetail(id) {
  const a = ACTIVITY_MAP[id];
  const r = evaluate(a, S);
  const teams = allTeams(S).filter(t => t.activityId === a.id);
  const added = inItinerary(S, a.id);
  const w = getWeather(S, a.day);
  return `<div class="scrim" data-scrim="1"><div class="sheet full">
    <div class="dcover" style="background:${grad(a.cat)}">
      <div>
        <h2>${CATS.find(c => c.id === a.cat).emoji} ${esc(a.title)}</h2>
        <div class="sub">${esc(a.venue)} · ${r.match}% 匹配 ${w.emoji} ${esc(w.label)}</div>
      </div>
    </div>
    <div class="sheet-body">
      <div class="kvs">
        <div class="kv"><div class="k">时间</div><div class="v">${dayName(a.day)} ${fmtRange(a)}</div></div>
        <div class="kv"><div class="k">人均花费</div><div class="v"><em>${a.price === 0 ? '免费' : '¥' + a.price}</em></div></div>
        <div class="kv"><div class="k">距你</div><div class="v">${a.dist}km · ${esc(DISTRICT_MAP[a.district].name)}</div></div>
        <div class="kv"><div class="k">适合人数</div><div class="v">${a.minP}–${a.maxP} 人</div></div>
        <div class="kv"><div class="k">场地</div><div class="v">${a.outdoor ? '🏞 户外 · 受天气影响' : '🏠 室内 · 不受雨影响'}</div></div>
        <div class="kv"><div class="k">口碑</div><div class="v">⭐ ${a.rating} · ${a.heat} 人想去</div></div>
      </div>

      <div class="panel mint"><h5>✨ 为什么推荐给你</h5>
        ${evaluate(a, S).reasons.map(x => `<p>· ${esc(x)}</p>`).join('')}
      </div>

      <div class="panel"><h5>📝 玩法介绍</h5><p>${esc(a.desc)}</p></div>
      <div class="panel warn"><h5>⚠️ 注意事项</h5><p>${esc(a.tips)}</p></div>

      ${a.outdoor && isRainy(S, a.day)
      ? `<div class="panel warn"><h5>🌧️ ${dayName(a.day)}有雨</h5><p>这是户外项目。你可以加入行程后，在行程页用「一键替换 Plan B」换成同天的室内活动。</p></div>`
      : ''}

      <div class="tags">${a.tags.map(t => `<span class="tg ${t === '室内备选' ? 'v' : (t === '出片' ? 'p' : 'a')}">${esc(t)}</span>`).join('')}</div>

      ${teams.length ? `<div class="sect"><h3>已有 ${teams.length} 支队伍在集结</h3></div>${teams.map(teamCard).join('')}` : ''}

      <div style="display:flex;gap:9px;margin-top:6px;margin-bottom:8px">
        <button class="btn ${added ? 'ghost' : ''}" style="flex:1" data-act="${added ? 'delPlan' : 'addPlan'}" data-id="${a.id}">${added ? '✓ 已在行程' : '＋ 加入行程'}</button>
        <button class="btn mint" style="flex:1" data-act="teamCreate" data-id="${a.id}">🤝 组队出发</button>
      </div>
      <button class="btn ghost block" data-act="checkin" data-id="${a.id}">📍 直接打卡（演示）</button>
      <div class="smallnote">推荐分受你的偏好权重、天气、预算、人数、距离共同影响 —— 改任一条件，匹配度会实时变化。</div>
    </div>
  </div></div>`;
}

/* ============================================================
   交互
   ============================================================ */
document.addEventListener('click', e => {
  /* 关闭：点遮罩空白处（sheet 内部不响应） */
  if (e.target.dataset && e.target.dataset.scrim) { S.modal = null; return render(); }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'close') return;
  const id = el.dataset.id;

  switch (act) {
    case 'tab': S.tab = el.dataset.tab; break;

    /* 探索 */
    case 'cat': S.filters.cat = el.dataset.cat; break;
    case 'day': S.filters.day = el.dataset.day; break;
    case 'sort': S.filters.sort = el.dataset.sort; break;
    case 'toggle': S.filters[el.dataset.key] = !S.filters[el.dataset.key]; break;
    case 'grp': S.filters.groupSize = Math.max(1, Math.min(8, S.filters.groupSize + (+el.dataset.d))); break;
    case 'wx': S.weather[el.dataset.day] = el.dataset.cond; break;
    case 'detail': S.modal = { type: 'detail', id }; break;
    case 'planner': S.modal = { type: 'planner' }; break;
    case 'budgetCap': S.totalBudget = Math.max(40, (S.totalBudget || 240) + (+el.dataset.d)); break;

    /* 行程 */
    case 'addPlan': {
      const a = ACTIVITY_MAP[id];
      const conflict = itineraryConflict(a, S);
      S.itinerary.push({ id: seq(), activityId: id });
      const msg = conflict
        ? `已加入行程 ⚠️ 与「${conflict.activityId ? ACTIVITY_MAP[conflict.activityId].title : ''}」时间重叠，去行程页处理`
        : `已加入行程 · ${dayName(a.day)} ${fmtRange(a)}`;
      S.modal = null; commit(); toast(msg, conflict ? 'warn' : 'ok'); return;
    }
    case 'delPlan': {
      S.itinerary = S.itinerary.filter(i => i.activityId !== id);
      toast('已移出行程'); break;
    }
    case 'planB': {
      S.itinerary = S.itinerary.filter(i => i.id !== el.dataset.from);
      S.itinerary.push({ id: seq(), activityId: el.dataset.to });
      commit();
      toast('已替换为室内 Plan B', 'ok'); return;
    }

    /* 组队 */
    case 'teamCreate': {
      const act0 = id || (S.itinerary[0] && S.itinerary[0].activityId) || 'a1';
      S.modal = {
        type: 'teamCreate',
        draft: { activityId: act0, name: '', cap: 4, tags: ['AA制'], meetTime: '', meetPlace: '', note: '' }
      }; break;
    }
    case 'tcTag': {
      const d = S.modal.draft;
      const t = el.dataset.tag;
      d.tags = d.tags.includes(t) ? d.tags.filter(x => x !== t) : d.tags.concat(t);
      break;
    }
    case 'submitTeam': {
      const d = S.modal.draft;
      const nm = (d.name || '').trim();
      if (!nm) { toast('给队伍起个名字吧', 'warn'); return; }
      const tid = 'mt_' + seq();
      S.myTeams.push({
        id: tid, activityId: d.activityId, name: nm, cap: +d.cap, members: [{ a: '🦊', n: '你', me: true }],
        tags: d.tags.length ? d.tags : ['AA制'],
        meet: { time: d.meetTime || '待定', place: d.meetPlace || '待定' },
        note: d.note || '发起人还没写说明'
      });
      S.modal = null;
      if (!inItinerary(S, d.activityId)) S.itinerary.push({ id: seq(), activityId: d.activityId });
      commit();
      toast('队伍已发布，等其他同学来拼');
      simJoin(tid);
      return;
    }
    case 'joinTeam': {
      if (S.joined.includes(id)) break;
      S.joined.push(id);
      commit();
      toast('已申请入队，等队长确认');
      simJoin(id);
      return;
    }
    case 'leaveTeam': {
      S.joined = S.joined.filter(x => x !== id);
      S.myTeams = S.myTeams.filter(t => t.id !== id);
      toast('已退出队伍'); break;
    }

    /* 打卡 */
    case 'checkin': {
      if (!inItinerary(S, id)) S.itinerary.push({ id: seq(), activityId: id });
      S.modal = {
        type: 'checkin', activityId: id,
        draft: { emoji: '📷', note: '', rate: 5 }
      }; break;
    }
    case 'ciEmoji': S.modal.draft.emoji = el.dataset.e; break;
    case 'ciStar': S.modal.draft.rate = +el.dataset.v; break;
    case 'submitCheckin': {
      const d = S.modal.draft;
      const a = ACTIVITY_MAP[S.modal.activityId];
      if (!d.note.trim()) { toast('写一句感受再提交吧', 'warn'); return; }
      const before = unlockedBadges(S).length;
      S.checkins.push({
        id: seq(), activityId: a.id, emoji: d.emoji, note: d.note.trim(), rate: d.rate, ts: Date.now()
      });
      S.prefs.implicitCat[a.cat] = (S.prefs.implicitCat[a.cat] || 0) + 1;
      const after = unlockedBadges(S).length;
      S.modal = null;
      commit();
      toast(after > before
        ? `打卡成功，解锁新徽章 ${unlockedBadges(S)[after - 1].emoji}${unlockedBadges(S)[after - 1].name}`
        : `打卡成功 · 偏好画像已更新（${CATS.find(c => c.id === a.cat).name} +1）`);
      return;
    }

    /* 攻略 */
    case 'guideNew': {
      const acts = unique(S.checkins.map(c => c.activityId));
      if (!acts.length) { toast('先去打卡，才能生成攻略', 'warn'); return; }
      const list = acts.map(i => ACTIVITY_MAP[i]);
      const total = list.reduce((s, a) => s + a.price, 0);
      const tags = unique(list.reduce((acc, a) => acc.concat(a.tags), []))
        .filter(t => ['出片', 'i人友好', '特种兵', '免费', '日落', '室内备选'].includes(t));
      S.modal = {
        type: 'guideNew',
        draft: {
          activityIds: acts, tags: tags.concat(total <= 100 ? ['¥100内'] : []).slice(0, 4),
          energy: '中等',
          title: `${total === 0 ? '免费' : '¥' + total} 玩转${DISTRICT_MAP[list[0].district].name}：${list.map(a => a.title.split(' ')[0]).join(' + ')}`,
          tips: `这次走了 ${list.length} 站，人均 ¥${total}。\n\n路线：${list.map(a => `${a.title}（${fmtRange(a)}）`).join(' → ')}\n\n避雷：`,
          budget: total
        }
      }; break;
    }
    case 'gAct': {
      const d = S.modal.draft, aid = el.dataset.a;
      d.activityIds = d.activityIds.includes(aid) ? d.activityIds.filter(x => x !== aid) : d.activityIds.concat(aid);
      break;
    }
    case 'gTag': {
      const d = S.modal.draft, t = el.dataset.tag;
      d.tags = d.tags.includes(t) ? d.tags.filter(x => x !== t) : d.tags.concat(t);
      break;
    }
    case 'publishGuide': {
      const d = S.modal.draft;
      if (!d.activityIds.length) { toast('至少选一站路线', 'warn'); return; }
      S.guides.push({
        id: 'ug_' + seq(), author: '@你', avatar: '🦊', likes: 0, stars: 0, daysAgo: 0,
        title: d.title.trim() || '我的周末路线',
        activityIds: d.activityIds, budget: +d.budget || 0, energy: d.energy,
        tips: d.tips.trim(), tags: d.tags, ts: Date.now(), autoBudget: false
      });
      S.modal = null;
      commit();
      toast('攻略已发布，出现在同城榜单里啦');
      return;
    }
    case 'guide': S.modal = { type: 'guide', id }; break;
    case 'copyGuide': {
      const g = findGuide(id);
      if (!g) break;
      let added = 0, skipped = 0;
      guideActivities(g).forEach(a => {
        if (inItinerary(S, a.id)) { skipped++; return; }
        if (itineraryConflict(a, S)) { skipped++; return; }
        S.itinerary.push({ id: seq(), activityId: a.id });
        added++;
      });
      S.modal = null;
      commit();
      toast(added ? `已复刻 ${added} 站到你的行程${skipped ? `（${skipped} 站因冲突/已存在跳过）` : ''}` : '这些站你都已经安排上了', added ? 'ok' : 'warn');
      return;
    }

    /* 我的 */
    case 'catPref': {
      const c = el.dataset.cat;
      const p = S.prefs;
      if (p.dislikes.includes(c)) { p.dislikes = p.dislikes.filter(x => x !== c); }
      else if (p.likedCats.includes(c)) { p.likedCats = p.likedCats.filter(x => x !== c); p.dislikes.push(c); }
      else { p.likedCats.push(c); }
      break;
    }
    case 'reset': {
      if (!S.confirmReset) { S.confirmReset = true; break; }
      S = defaultState(); save(); toast('已重置，重新开始探索'); return;
    }
    case 'noop': return;
  }
  commit();
});

/* 表单输入实时写回 state（不触发重渲染，避免输入被打断） */
document.addEventListener('input', e => {
  const el = e.target;
  const k = el.dataset && el.dataset.inp;
  if (!k) return;
  if (k === 'budget') {
    S.filters.maxPrice = +el.value;
    const o = document.querySelector('[data-out="budget"]');
    if (o) o.textContent = '¥' + el.value;
  } else if (k === 'pref') {
    S.prefs.weights[el.dataset.k] = el.value / 100;
    const o = document.querySelector(`[data-out="pref-${el.dataset.k}"]`);
    if (o) o.textContent = Math.round(el.value) + '%';
  } else if (S.modal && S.modal.draft) {
    const d = S.modal.draft;
    if (k === 'tcName') d.name = el.value;
    else if (k === 'tcCap') d.cap = +el.value;
    else if (k === 'tcAct') d.activityId = el.value;
    else if (k === 'tcTime') d.meetTime = el.value;
    else if (k === 'tcPlace') d.meetPlace = el.value;
    else if (k === 'tcNote') d.note = el.value;
    else if (k === 'ciNote') d.note = el.value;
    else if (k === 'gTitle') d.title = el.value;
    else if (k === 'gBudget') d.budget = +el.value;
    else if (k === 'gEnergy') d.energy = el.value;
    else if (k === 'gTips') d.tips = el.value;
  }
});

/* range 松手时才重算列表 */
document.addEventListener('change', e => {
  if (e.target.dataset && (e.target.dataset.inp === 'budget' || e.target.dataset.inp === 'pref')) render();
});

function unique(arr) { return arr.filter((v, i) => arr.indexOf(v) === i); }

/* 演示：加入后随机来一个搭子 */
function simJoin(teamId) {
  setTimeout(() => {
    const all = allTeams(S);
    const t = all.find(x => x.id === teamId);
    if (!t) return;
    const cur = teamMembers(S, t).length;
    if (cur >= t.cap) return;
    const person = pick(MOCK_PEOPLE);
    S.simMembers[teamId] = (S.simMembers[teamId] || []).concat([person]);
    commit();
    toast(`${person.a} ${person.n} 加入了你的队伍`);
    if (teamMembers(S, t).length >= t.cap) {
      setTimeout(() => toast('🎉 队伍集结完毕，可以出发了'), 1500);
    }
  }, 4200);
}

load();
render();
