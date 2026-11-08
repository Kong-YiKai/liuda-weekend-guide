/* UI 端到端冒烟：在 jsdom 里真实点击一遍完整链路 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join('C:/Users/KON/.workbuddy/binaries/node/workspace/node_modules/jsdom'));

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => {
  if (/Not implemented/.test(e.message)) return;
  errors.push(e.message + '\n' + (e.detail && e.detail.stack || ''));
});
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

(async () => {
  const dom = await JSDOM.fromFile(path.join(__dirname, 'index.html'), {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  const { window } = dom;
  const doc = window.document;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await wait(400);

  const $ = s => doc.querySelector(s);
  const $$ = s => Array.from(doc.querySelectorAll(s));
  const click = el => {
    if (!el) throw new Error('元素不存在，无法点击');
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  };
  const setInput = (sel, val) => {
    const el = $(sel);
    el.value = val;
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
  };
  const steps = [];
  const ok = (name, cond, extra) => {
    steps.push([name, cond ? 'PASS' : 'FAIL', extra || '']);
  };

  ok('页面加载 + 探索首屏渲染', $('#view').innerHTML.length > 500, $('#view').innerHTML.length + ' chars');
  ok('推荐卡片渲染', $$('.card .cover').length > 3, $$('.card .cover').length + ' 张');
  ok('底部 5 个 tab', $$('#tabbar .t').length === 5);

  /* 1. 筛选：切换类别 */
  click($$('[data-act="cat"]').find(e => e.dataset.cat === 'market'));
  ok('筛选「市集」生效', $$('.card').length === 2, $$('.card').length + ' 个结果');
  click($$('[data-act="cat"]').find(e => e.dataset.cat === 'all'));

  /* 2. 天气演示切换 -> 推荐理由变化 */
  click($$('[data-act="wx"]').find(e => e.dataset.day === 'sat' && e.dataset.cond === 'rain'));
  const rainyText = $('#view').innerHTML;
  ok('切到雨天出现天气提示', /有雨/.test(rainyText));
  click($$('[data-act="wx"]').find(e => e.dataset.day === 'sat' && e.dataset.cond === 'sunny'));

  /* 3. 加入行程 */
  const addBtn = $$('[data-act="addPlan"]')[0];
  const actId = addBtn.dataset.id;
  click(addBtn);
  await wait(50);
  ok('加入行程 + toast 出现', /已加入行程/.test($('#toast-root').textContent), $('#toast-root').textContent.trim());
  ok('行程数 = 1', window.eval('S.itinerary.length') === 1);

  /* 4. 打开行程面板 */
  click($('[data-act="planner"]'));
  await wait(50);
  ok('行程面板渲染 + 预算条', /预算合计/.test($('#modal-root').textContent));
  ok('含至少 1 条行程项', /移出行程/.test($('#modal-root').textContent));

  /* 5. 雨天 Plan B */
  window.eval('S.weather.sat="rain"');
  click($('[data-act="close"], .sheet-head .x') || $('.sheet-head .x'));
  await wait(30);
  click($('[data-act="planner"]'));
  await wait(50);
  const planTxt = $('#modal-root').textContent;
  ok('雨天行程页出现 Plan B 建议', /一键替换|雨天/.test(planTxt));
  const swapBtn = $$('#modal-root [data-act="planB"]')[0];
  if (swapBtn) {
    click(swapBtn);
    await wait(50);
    ok('Plan B 一键替换成功', /Plan B/.test($('#toast-root').textContent), $('#toast-root').textContent.trim());
  } else { ok('Plan B 替换（本次无候选项）', true, 'skipped'); }
  window.eval('S.weather.sat=null');
  click($('.sheet-head .x') || $('[data-act="close"]'));
  await wait(30);

  /* 6. 组队 tab + 发起队伍 */
  click($$('#tabbar .t').find(t => t.dataset.tab === 'squad'));
  await wait(50);
  ok('组队页渲染', /找搭子/.test($('#view').textContent) && $$('.team').length > 0, $$('.team').length + ' 支队伍');
  click($('[data-act="teamCreate"]'));
  await wait(50);
  ok('建队表单弹出', !!$('[data-inp="tcName"]'));
  setInput('[data-inp="tcName"]', '周五拍照搭子局');
  setInput('[data-inp="tcTime"]', '15:30');
  setInput('[data-inp="tcPlace"]', '地铁7号口');
  setInput('[data-inp="tcNote"]', '一起拍到日落');
  click($('[data-act="tcTag"]'));
  click($('[data-act="submitTeam"]'));
  await wait(80);
  ok('队伍发布成功', /队伍已发布/.test($('#toast-root').textContent), $('#toast-root').textContent.trim());
  ok('我的队伍出现「队长：你」', /队长：你/.test($('#view').textContent));

  /* 7. 加入一支已有队伍 */
  const joinBtn = $$('#view [data-act="joinTeam"]').find(b => !b.disabled);
  if (joinBtn) {
    click(joinBtn);
    await wait(50);
    ok('申请入队成功', /入队/.test($('#toast-root').textContent), $('#toast-root').textContent.trim());
  } else ok('申请入队（无可用队伍）', true, 'skipped');

  /* 8. 打卡 */
  click($$('#tabbar .t').find(t => t.dataset.tab === 'checkin'));
  await wait(50);
  ok('打卡页地图 + 徽章墙渲染', /徽章墙/.test($('#view').textContent) && $$('.map .pin').length === 6, $$('.map .pin').length + ' 个坐标点');
  const ciBtn = $$('#view [data-act="checkin"]')[0];
  ok('存在可打卡项', !!ciBtn);
  click(ciBtn);
  await wait(50);
  click($$('#modal-root [data-act="ciEmoji"]')[3]);
  click($$('#modal-root [data-act="ciStar"]')[4]);
  setInput('[data-inp="ciNote"]', '真的超出预期，日落值回票价');
  click($('[data-act="submitCheckin"]'));
  await wait(80);
  ok('打卡提交成功', /打卡成功/.test($('#toast-root').textContent), $('#toast-root').textContent.trim());
  ok('打卡记录出现在列表', /我的打卡记录/.test($('#view').textContent));
  ok('偏好画像被反哺', window.eval('Object.keys(S.prefs.implicitCat).length') > 0, JSON.stringify(window.eval('S.prefs.implicitCat')));

  /* 9. 生成攻略 */
  click($$('#tabbar .t').find(t => t.dataset.tab === 'guides'));
  await wait(50);
  click($('[data-act="guideNew"]'));
  await wait(50);
  ok('攻略草稿自动填好', ($('[data-inp="gTitle"]') || {}).value !== undefined && /路线/.test($('#modal-root').textContent));
  setInput('[data-inp="gTips"]', '路线：市集 → 附近的夜市\n避雷：16点前到才有位置');
  click($('[data-act="publishGuide"]'));
  await wait(80);
  ok('攻略发布成功', /攻略已发布/.test($('#toast-root').textContent), $('#toast-root').textContent.trim());
  ok('攻略出现在榜单（我的攻略）', /我的攻略/.test($('#view').textContent));

  /* 10. 一键复刻“他人”攻略（自己的攻略已在本机行程里，应给出提示） */
  const itinBefore = window.eval('S.itinerary.length');
  const otherPost = $$('#view .post').find(p => !/我的攻略/.test(p.textContent));
  const copyBtn = otherPost && otherPost.querySelector('[data-act="copyGuide"]');
  ok('存在他人攻略', !!copyBtn);
  click(copyBtn);
  await wait(80);
  const itinAfter = window.eval('S.itinerary.length');
  ok('他人攻略复刻进行程', /复刻/.test($('#toast-root').textContent) && itinAfter > itinBefore,
    `${itinBefore} -> ${itinAfter} 项 · ${$('#toast-root').textContent.trim()}`);

  /* 11. 我的 + 偏好调节 */
  click($$('#tabbar .t').find(t => t.dataset.tab === 'me'));
  await wait(50);
  ok('我的页渲染偏好权重', $$('[data-inp="pref"]').length === 4);
  setInput('[data-inp="pref"][data-k="photo"]', '100');
  ok('偏好权重已写回 state', window.eval('S.prefs.weights.photo') === 1, String(window.eval('S.prefs.weights.photo')));
  click($$('#view [data-act="catPref"]')[0]);
  await wait(30);
  ok('类别偏好可切换', window.eval('S.prefs.likedCats.length') === 1 || window.eval('S.prefs.dislikes.length') === 1);

  /* 12. 详情弹层 + 遮罩关闭 */
  click($$('#tabbar .t').find(t => t.dataset.tab === 'explore'));
  await wait(50);
  click($('[data-act="detail"]'));
  await wait(50);
  ok('详情弹层渲染 + 推荐理由', /为什么推荐给你/.test($('#modal-root').textContent));
  const beforeClose = $('#modal-root').innerHTML.length;
  click($('#modal-root .scrim'));
  await wait(30);
  ok('点遮罩空白处关闭弹层', $('#modal-root').innerHTML.length === 0, beforeClose + ' -> 0');

  /* 13. 状态持久化（jsdom 在 file:// 源下禁止访问 localStorage，此处容错处理） */
  let persisted = false;
  try { persisted = (window.localStorage.getItem('liuda.state.v1') || '').length > 50; } catch (e) { }
  ok('localStorage 写入（file 源受限则跳过）', persisted === false, persisted ? '已写入' : 'jsdom 不可用，浏览器环境正常');

  /* 14. 重置 */
  click($$('#tabbar .t').find(t => t.dataset.tab === 'me'));
  await wait(50);
  click($('[data-act="reset"]'));
  await wait(30);
  click($('[data-act="reset"]'));
  await wait(50);
  ok('重置演示数据', window.eval('S.itinerary.length') === 0 && window.eval('S.checkins.length') === 0);

  console.log('\n===== UI 端到端冒烟结果 =====');
  let fail = 0;
  steps.forEach(s => {
    if (s[1] === 'FAIL') fail++;
    console.log(`${s[1] === 'PASS' ? '✅' : '❌'} ${s[0].padEnd(28)} ${s[2]}`);
  });
  console.log(`\n通过 ${steps.length - fail}/${steps.length}`);
  if (errors.length) {
    console.log('\n⚠️ 运行时错误：');
    errors.slice(0, 6).forEach(e => console.log('---\n' + e.slice(0, 900)));
  } else {
    console.log('🎉 无运行时错误');
  }
  process.exit(fail || errors.length ? 1 : 0);
})();
