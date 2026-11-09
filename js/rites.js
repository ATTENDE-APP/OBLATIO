// 聖事禮典 — sacramental rites for OBLATIO.
// v1 (Fr. Gervais, 9 Nov 2026): 婚姻聖事 from the Hong Kong Liturgy Commission texts only (data/rites.json, build/rites/build_marriage.py).
// One form per screen: an options panel (form, the couple's names, readings, prayers), the sticky step bar and presider mode of 祝福禮典,
// and for 第一式 (the wedding Mass) the common parts of Mass from the Missal's 彌撒常規 (missal.json ordo).
import { loadMissal } from './missal.js';
import { bindBlessings } from './blessings.js';

let R = null, M = null;
let store = { get: (k, d) => d, set() {} };
export function setStore(s) { store = s; }
export async function loadRites(base = 'data/') {
  if (!R) R = await (await fetch(base + 'rites.json')).json();
  if (!M) M = await loadMissal(base);
  return R;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SACRAMENTS = [
  { id: 'marriage', name: '婚姻聖事' }, { name: '聖洗聖事' }, { name: '堅振聖事' }, { name: '修和聖事' }, { name: '病人傅油聖事' }, { name: '殯葬禮' }];

// ---------- names ----------
const PH = { G: '新郎的名字', B: '新娘的名字', CH: '聖堂名稱' };
const names = () => store.get('rnames', null) || {};
function nm(k) { return (names()[k] || '').trim(); }
function inl(s) {
  return esc(s)
    .replace(/（([^（）]{1,24})）/g, (m, x) => `<span class="ri">（${x}）</span>`)
    .replace(/✠/g, '<span class="ri">✠</span>').replace(/【答】/g, '<span class="ri">【答】</span>')
    .replace(/\{(GB|G|B|CH)\}/g, (m, k) => {
      if (k === 'GB') { const g = nm('g'), b = nm('b'); return g || b ? `<span class="r-nm">${esc(g || '（新郎）')}、${esc(b || '（新娘）')}</span>` : '<span class="r-ph">（新郎、新娘的名字）</span>'; }
      const v = nm(k.toLowerCase()); return v ? `<span class="r-nm">${esc(v)}</span>` : `<span class="r-ph">（${PH[k]}）</span>`;
    });
}
const ACT = /按手|伸手|伸開雙手|戒指套|握著手|跪|起立|簽署|鼓掌|十字/;
const P = (sp, t) => `<p class="m-p">${sp ? `<span class="spk">${esc(sp)}：</span>` : ''}${inl(t)}</p>`;

// ---------- blocks ----------
let MASS = false;
const spk = (sp) => (MASS && sp === '主禮' ? '主祭' : sp);
function line(b) {
  if (b.k === 'sec') return `<h2 class="m-sec" data-step="${esc(b.t)}">${esc(b.t)}</h2>`;
  if (b.k === 'h') return `<h3 class="m-h">${esc(b.t)}</h3>`;
  if (b.k === 'rub') return `<p class="rub${ACT.test(b.t) ? ' act' : ''}">${inl(b.t)}</p>`;
  if (b.k === 'note') return `<details class="b-intro"><summary>說明</summary>${b.p.map((x) => `<p>${esc(x)}</p>`).join('')}</details>`;
  return P(spk(b.sp || ''), b.t);
}
const lines = (bs) => bs.map(line).join('');
// the Missal's 彌撒常規 blocks: {t: s|r|h|c, sp, x}, speakers also inside the text (「…同在。信友：也與你的心靈同在。」)
const OSPK = /(主祭|信友|全體|執事或主祭|執事|主教)\s*[：:]/g;
function ob(bs) {
  return bs.map((b) => {
    if (b.t === 'h') return `<h3 class="m-h">${esc(b.x)}</h3>`;
    if (b.t === 'r') return `<p class="rub">${inl(b.x)}</p>`;
    if (b.t === 'c') return `<p class="m-cons">${b.x.split('\n').map(inl).join('<br>')}</p>`;
    const parts = []; let cur = b.sp || '', last = 0;
    b.x.replace(OSPK, (m, w, off) => { if (off > 0) parts.push([cur, b.x.slice(last, off)]); cur = w; last = off + m.length; return m; });
    parts.push([cur, b.x.slice(last)]);
    return parts.filter(([, t]) => t.trim()).map(([w, t]) => P(w, t.trim())).join('');
  }).join('');
}

// ---------- readings ----------
function reading(D, id, label, sp) {
  const r = D.read[id]; if (!r) return '';
  if (r.kind === 'ps') return `<h3 class="m-h">答唱詠 <span class="tag">${esc(r.ref)}</span></h3>` + P('答', r.resp) +
    r.st.map((x) => `<p class="m-p"><span class="spk">領：</span>${inl(x)} <span class="ri">【答】</span></p>`).join('');
  let h = `<h3 class="m-h">${esc(label)}<span class="r-theme">（${esc(r.theme)}）</span> <span class="tag">${esc(r.ref)}</span></h3>`;
  if (r.kind === 'gos') h += P(sp, '願主與你們同在。') + P('全體', '也與你的心靈同在。') + P(sp, r.book + '。') + P('全體', '主，願祢受讚美。');
  else h += `<p class="rub">${esc(r.book)}</p>`;
  h += r.p.map((x, i) => P('', x + (i === r.p.length - 1 ? '　——上主的話。' : ''))).join('');
  return h + P('全體', r.kind === 'gos' ? '基督，我們讚美祢。' : '感謝天主。');
}
function readings(D, st) {
  const sp = MASS ? '執事或主祭' : '主禮', a = D.acc[st.acc] || D.acc.a1;
  return reading(D, st.ot, '讀經一', sp) + reading(D, st.ps, '', sp) + (st.nt ? reading(D, st.nt, '讀經二', sp) : '') +
    `<h3 class="m-h">福音前歡呼 <span class="tag">${esc(a.ref)}</span></h3><p class="rub act">（請起立）</p>` +
    P('領', '亞肋路亞。') + P('眾', '亞肋路亞。') + P('領', a.t) + P('眾', '亞肋路亞。') + reading(D, st.gos, '福音', sp);
}

// ---------- the wedding Mass: Eucharistic Prayer with the wedding preface and inserts ----------
const EPN = { I: '感恩經第一式', II: '感恩經第二式', III: '感恩經第三式' };
function eucharisticPrayer(D, st) {
  const E = M.ordo.eucharistic_prayers, pf = D.pref[st.pf] || D.pref.p1;
  let h = `<h2 class="m-sec" data-step="感恩經">${EPN[st.ep] || EPN.II}</h2>`;
  h += ob(E.II.slice(1, 5));                                   // 頌謝詞 dialogue
  h += `<h3 class="m-h">${esc(pf.label)}</h3>` + pf.p.map((x, i) => P(i ? '' : '主祭', x)).join('');
  h += ob(E.II.slice(6, 8));                                   // 歡呼歌
  if (st.ep === 'I') {
    const SEAS = /^(耶誕節|主顯節|復活夜|耶穌升天節|五旬節主日)/; let skip = false; const out = [];
    for (const b of E.I.slice(1)) {
      if (b.t === 'h') { if (SEAS.test(b.x)) skip = true; else if (!/^(主祭一人祈求|可由)/.test(b.x)) skip = false; }
      if (skip) continue;
      if (/^（伸手）上主，我們懇求祢，惠然收納祢的僕人/.test(b.x)) { out.push({ t: 'r', x: '婚禮感恩祭專用：' }, { t: 's', sp: '主祭', x: '（伸手）' + D.ep1 + '（合掌）（因我們的主基督。阿們。）' }); continue; }
      out.push(b);
    }
    h += ob(out);
  } else if (st.ep === 'III') {
    h += ob(E.III.slice(1).filter((b) => !/追思彌撒內可用|從人世將他/.test(b.x)));
  } else {
    const body = E.II.slice(8).filter((b) => !/從人世將他/.test(b.x));
    const k = body.findIndex((b) => /全體聖職人員/.test(b.x));
    h += ob(body.slice(0, k + 1)) + `<p class="rub">婚禮感恩祭專用：</p>` + P('', D.ep2) + ob(body.slice(k + 1));
  }
  return h;
}

// ---------- options ----------
function defaults(r) {
  const o = r.opts, d = {};
  for (const k of ['collect', 'nuptial', 'final', 'vows', 'ring']) if (o[k]) d[k] = o[k][0];
  if (o.readings) Object.assign(d, o.readings);
  if (o.one) d.one = o.one;
  if (r.mass) Object.assign(d, { ep: o.ep, pf: o.pf, gloria: o.gloria });
  return d;
}
const stateOf = (r) => ({ ...defaults(r), ...(store.get('ropt.' + r.id, null) || {}) });

function slot(D, s, st) {
  const O = M.ordo, alt = (k) => (D.alt[k][st[k]] || Object.values(D.alt[k])[0]).b;
  switch (s) {
    case 'ordo:sign': return ob(O.sign);
    case 'ordo:greet': return ob(O.greeting[0]);
    case 'ordo:gloria': return +st.gloria ? ob(O.gloria.filter((b) => !/^按禮規/.test(b.x))) : '<p class="rub">（本次不念光榮頌）</p>';
    case 'ordo:offertory': return ob(O.offertory.map((b) => (/收納我和你們共同奉獻的聖祭/.test(b.x) ? { ...b, x: D.offInvite + '（合掌）' } : b)));
    case 'ordo:communion': return ob(O.communion_rite);
    case 'ordo:pater': { const b = O.communion_rite.find((x) => /^我們的天父/.test(x.x)); return P('全體', b.x + '阿們。'); }
    case 'readings': return readings(D, st);
    case 'one': { const r = D.read[st.one]; return reading(D, st.one, r && r.kind === 'gos' ? '福音' : '讀經', '主禮'); }
    case 'ep': return eucharisticPrayer(D, st);
    default: return D.alt[s] ? lines(alt(s)) : '';
  }
}

function optLabel(D, id) { const r = D.read[id]; return r ? `${r.ref}${r.theme ? '　' + r.theme : ''}` : '不讀'; }
function panel(D, r, st) {
  const sel = (key, label, opts, val) => `<label class="mopt"><span>${esc(label)}</span><select data-ro="${key}">${opts.map(([v, t]) =>
    `<option value="${esc(String(v))}"${String(v) === String(val) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  const o = r.opts, out = [];
  const altSel = (k, label) => { if (o[k] && o[k].length > 1) out.push(sel(k, label, o[k].map((i) => [i, D.alt[k][i].label]), st[k])); };
  altSel('collect', '集禱經');
  if (o.readings) {
    out.push(sel('ot', '讀經一', D.rd.ot.map((i) => [i, optLabel(D, i)]), st.ot), sel('ps', '答唱詠', D.rd.ps.map((i) => [i, D.read[i].ref]), st.ps),
      sel('nt', '讀經二', D.rd.nt.map((i) => [i, optLabel(D, i)]), st.nt), sel('acc', '福音前歡呼', D.rd.acc.map((i) => [i, D.acc[i].ref + '　' + D.acc[i].t.slice(0, 10) + '…']), st.acc),
      sel('gos', '福音', D.rd.gos.map((i) => [i, optLabel(D, i)]), st.gos));
  }
  if (o.one) out.push(sel('one', '讀經', D.one.map((i) => [i, optLabel(D, i)]), st.one));
  altSel('vows', '許諾'); altSel('ring', '祝福戒指');
  if (r.mass) out.push(sel('gloria', '光榮頌', [[1, '念'], [0, '不念']], st.gloria), sel('ep', '感恩經', Object.entries(EPN), st.ep),
    sel('pf', '頌謝詞', Object.entries(D.pref).map(([k, v]) => [k, v.label]), st.pf));
  altSel('nuptial', '隆重祝福'); altSel('final', '禮成祝福');
  const n = names(), needCH = r.blocks.some((b) => (b.t || '').includes('{CH}'));
  const inp = (k, label, ph) => `<label class="r-in"><span>${label}</span><input data-rn="${k}" value="${esc(n[k] || '')}" placeholder="${ph}" autocomplete="off"></label>`;
  const sum = [nm('g') && nm('b') ? `${nm('g')}、${nm('b')}` : '', r.mass ? EPN[st.ep] : ''].filter(Boolean).join('・');
  return `<details class="mpanel r-opts"${store.get('rOptsClosed', false) ? '' : ' open'}><summary>婚禮選項 <small>${esc(sum)}</small></summary>
  <label class="mopt wide"><span>儀式</span><select data-ro="rite">${D.rites.map((x) => `<option value="${x.id}"${x.id === r.id ? ' selected' : ''}>${esc(x.title)}</option>`).join('')}</select></label>
  <div class="r-names">${inp('g', '新郎', '名字')}${inp('b', '新娘', '名字')}${needCH ? inp('ch', '聖堂', '聖堂名稱') : ''}</div>
  ${out.length ? `<div class="mopts">${out.join('')}</div>` : ''}
  <div class="mbtns"><button class="pill" data-r="reset">恢復預設</button><button class="pill" data-r="clear">清除名字</button><button class="pill" data-b="print">列印</button></div></details>`;
}

// ---------- views ----------
function renderIndex() {
  return `<h1 class="mtitle">聖事禮典</h1><div class="b-grid">${SACRAMENTS.map((s) => s.id
    ? `<div class="b-card"><a href="#" class="b-main" data-sac="${s.id}"><span class="b-tt">${esc(s.name)}</span><span class="b-cnt">${R[s.id].rites.length} 式</span><span class="b-arr" aria-hidden="true">›</span></a></div>`
    : `<div class="b-card r-soon"><div class="b-main"><span class="b-tt">${esc(s.name)}</span><small>籌備中</small></div></div>`).join('')}</div>
  <div class="notes b-src"><p>經文取自香港教區禮儀委員會。在彌撒中舉行的禮儀，常用部分取自香港《彌撒經書》彌撒常規。</p></div>`;
}
function renderMarriage() {
  const D = R.marriage;
  const r = D.rites.find((x) => x.id === store.get('rrite', 'm1')) || D.rites[0];
  const st = stateOf(r); MASS = r.mass;
  const body = r.blocks.map((b) => (b.k === 'slot' ? slot(D, b.s, st) : line(b))).join('');
  const hasSec = r.blocks.some((b) => b.k === 'sec');
  const steps = hasSec ? r.blocks.filter((b) => b.k === 'sec').map((b) => b.t) : [];
  let html = body;
  if (!hasSec) html = html.replace(/<h3 class="m-h">([^<]*)<\/h3>/g, (m, t) => (steps.includes(t) ? m : (steps.push(t), `<h3 class="m-h" data-step="${t}">${t}</h3>`)));
  if (r.mass) steps.splice(steps.indexOf('領主禮'), 0, '感恩經');
  return `<p class="b-crumb"><a href="#" data-b="index">‹ 聖事禮典</a>　婚姻聖事</p>` +
    `<h1 class="mtitle">${esc(r.title)}</h1><p class="r-sub">${esc(r.sub)}</p>` + panel(D, r, st) +
    `<div class="b-sticky"><div class="b-where"><span class="b-here">${esc(r.title)}</span><button class="b-pres" data-b="presider" aria-pressed="false">主禮模式</button></div>` +
    (steps.length > 1 ? `<nav class="b-steps" aria-label="禮儀步驟">${steps.map((s) => `<button data-step-go="${esc(s)}">${esc(s)}</button>`).join('')}</nav>` : '') + '</div>' +
    `<div class="mass b-rite" data-rid="r-${r.id}">${html}</div>` +
    `<div class="notes b-src"><p>${esc(r.src)}</p><p>${esc(D.src)}</p></div>`;
}
export function renderRites() { return store.get('rview', '') === 'marriage' ? renderMarriage() : renderIndex(); }

/** wire the view. ctx: { rerender() } */
export function bindRites(el, ctx) {
  const keep = () => { const y = window.scrollY; ctx.rerender(); window.scrollTo(0, y); };
  el.querySelectorAll('[data-sac]').forEach((a) => a.onclick = (e) => { e.preventDefault(); store.set('rview', a.dataset.sac); ctx.rerender(); window.scrollTo(0, 0); });
  const r = R.marriage.rites.find((x) => x.id === store.get('rrite', 'm1')) || R.marriage.rites[0];
  el.querySelectorAll('select[data-ro]').forEach((s) => s.onchange = () => {
    if (s.dataset.ro === 'rite') { store.set('rrite', s.value); ctx.rerender(); return; }
    const o = store.get('ropt.' + r.id, null) || {}; o[s.dataset.ro] = s.value; store.set('ropt.' + r.id, o); keep();
  });
  el.querySelectorAll('input[data-rn]').forEach((i) => i.onchange = () => { const n = names(); n[i.dataset.rn] = i.value.trim(); store.set('rnames', n); keep(); });
  el.querySelectorAll('[data-r="reset"]').forEach((b) => b.onclick = () => { store.set('ropt.' + r.id, null); keep(); });
  el.querySelectorAll('[data-r="clear"]').forEach((b) => b.onclick = () => { store.set('rnames', null); keep(); });
  const pan = el.querySelector('details.r-opts');
  if (pan) pan.addEventListener('toggle', () => store.set('rOptsClosed', !pan.open));
  // step bar, presider mode, print: as in 祝福禮典
  bindBlessings(el, { open: () => { store.set('rview', ''); ctx.rerender(); window.scrollTo(0, 0); }, rerender: ctx.rerender });
}
