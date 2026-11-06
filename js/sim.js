// Krater Kombinatı — simülasyon çekirdeği
// Tarayıcıda window.KK, node'da module.exports olarak kullanılır.
(function (root) {
  'use strict';

  // ---- Sabitler -----------------------------------------------------------
  const DUR = 300;          // maç süresi (sn)
  const TURN = 15;          // karar aralığı (sn)
  const PREP = 15;          // saat başlamadan önceki ilk oylama
  const TURNS = DUR / TURN; // 20 karar: t = 0, 15, ..., 285
  const NIGHT_START = 135, NIGHT_END = 195;
  const START_MONEY = 100;

  const M = { BEKLE: 0, SUPURGE: 1, FIRIN: 2, PRES: 3, GUNES: 4, BATARYA: 5, KARARTMA: 6 };
  const MACHINES = [
    { id: 0, key: 'bekle',   name: 'Biriktir', cost: 0,   short: 'Bu tur alma' },
    { id: 1, key: 'supurge', name: 'Süpürge',  cost: 40,  short: '+2 toz/sn' },
    { id: 2, key: 'firin',   name: 'Fırın',    cost: 120, short: '2 toz → 2 cam /sn · 2⚡' },
    { id: 3, key: 'pres',    name: 'Pres',     cost: 300, short: 'toz + cam → 2 kristal /sn · 4⚡' },
    { id: 4, key: 'gunes',   name: 'Güneş',    cost: 60,  short: '+3⚡ gündüz' },
    { id: 5, key: 'batarya', name: 'Batarya',  cost: 60,  short: '600 kJ depolar' },
    { id: 6, key: 'karartma', name: 'Karartma', cost: 200, growth: 1, limit: 2, short: 'Rakibin panelleri 15 sn kapalı · maçta 2 hak' },
  ];
  const N_OPT = MACHINES.length;

  const R = {
    tozPerSweeper: 2,   // toz/sn
    furnaceRate: 2,     // toz/sn → cam/sn
    furnacePow: 1,      // ⚡ / (toz/sn)  → tam kapasite 2⚡
    pressRate: 1,       // pres başına: 1 toz + 1 cam → 2 kristal /sn
    pressPow: 4,        // ⚡ / (birim/sn)
    panel: 3,           // ⚡ gündüz
    battCap: 600,       // ⚡·sn
    costGrowth: 1.12,   // aynı makineden her alımda fiyat artışı
  };
  const PRICE = { toz: 1, cam: 4, kristal: 10 };

  const EVENTS = [
    { key: 'meteor', name: 'Meteor yağmuru', text: 'İki taraf da 1 güneş paneli kaybetti!', soon: 'Bu turun sonunda iki taraf da 1 güneş paneli kaybedecek.', dur: 0 },
    { key: 'firtina', name: 'Toz fırtınası', text: '30 sn: süpürgeler 2 kat toz, paneller yarı güç.', soon: 'Bu turun sonunda başlıyor: 30 sn süpürgeler 2 kat toz, paneller yarı güç.', dur: 30 },
    { key: 'kriz', name: 'Kristal krizi', text: '30 sn: kristal 10₺ yerine 5₺.', soon: 'Bu turun sonunda başlıyor: 30 sn kristal 10₺ yerine 5₺.', dur: 30 },
    { key: 'patlama', name: 'Güneş patlaması', text: '30 sn: paneller 2 kat enerji.', soon: 'Bu turun sonunda başlıyor: 30 sn paneller 2 kat enerji.', dur: 30 },
  ];

  // ---- Rastgelelik (tohumlu) ----------------------------------------------
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Maç başına bir olay; 30 sn'lik etkisi geceye taşmasın diye sadece gündüz turlarında.
  const EVENT_TURNS = [5, 6, 7, 13, 14, 15];
  function planEvent(rand) {
    const e = EVENTS[Math.floor(rand() * EVENTS.length)];
    const turn = EVENT_TURNS[Math.floor(rand() * EVENT_TURNS.length)];
    return Object.assign({}, e, { t: turn * TURN });
  }

  // ---- Durum ----------------------------------------------------------------
  function newSide() {
    return {
      money: START_MONEY,
      m: [0, 0, 0, 0, 0, 0, 0],
      batt: 0,
      bo: -1e9,            // karartma bitiş zamanı (sn)
      tot: { toz: 0, cam: 0, kristal: 0, earned: 0 },
      flow: null,
      log: [],
    };
  }

  function clone(s) {
    return { money: s.money, m: s.m.slice(), batt: s.batt, bo: s.bo, tot: Object.assign({}, s.tot), flow: null, log: [] };
  }

  // Karartma: tarafın panelleri bu süre boyunca üretmez (batarya çalışır).
  function sideEnv(env, s, t) {
    if (t < s.bo) return Object.assign({}, env, { solarMul: 0, blackout: true });
    return env;
  }
  function blackout(s, t) { s.bo = t + TURN; }

  function isNight(t) { return t >= NIGHT_START && t < NIGHT_END; }

  function envAt(t, ev) {
    const env = { night: isNight(t), tozMul: 1, solarMul: 1, price: PRICE, active: null };
    if (ev && ev.dur > 0 && t >= ev.t && t < ev.t + ev.dur) {
      env.active = ev;
      if (ev.key === 'firtina') { env.tozMul = 2; env.solarMul = 0.5; }
      if (ev.key === 'patlama') { env.solarMul = 2; }
      if (ev.key === 'kriz') { env.price = { toz: PRICE.toz, cam: PRICE.cam, kristal: PRICE.kristal / 2 }; }
    }
    return env;
  }

  // Bir saniyelik akışı hesaplar (oranlar sabit, dt ile çarpılır).
  function step(s, dt, env) {
    const S = s.m[1], F = s.m[2], P = s.m[3], G = s.m[4], B = s.m[5];
    const T = R.tozPerSweeper * S * env.tozMul;          // toplanan toz/sn
    const fCap = R.furnaceRate * F;                       // fırın kapasitesi toz/sn
    const y0 = Math.min(P * R.pressRate, fCap, T / 2);    // pres birimi/sn (enerji sınırsızken)
    const x0 = Math.min(fCap, T - y0);                    // fırına giren toz/sn
    const need = x0 * R.furnacePow + y0 * R.pressPow;     // gereken ⚡
    const supply = env.night ? 0 : R.panel * G * env.solarMul;
    const cap = R.battCap * B;

    let f = 1, battFlow = 0;
    if (need <= 0) {
      battFlow = Math.min(supply, (cap - s.batt) / dt);
    } else if (supply >= need) {
      battFlow = Math.min(supply - need, (cap - s.batt) / dt);
    } else {
      const deficit = need - supply;
      const fromBatt = Math.min(s.batt / dt, deficit);
      battFlow = -fromBatt;
      f = (supply + fromBatt) / need;
    }
    s.batt = Math.max(0, Math.min(cap, s.batt + battFlow * dt));

    const x = x0 * f, y = y0 * f;
    const raw = T - x - y;            // ham satılan toz
    const camSold = x - y;            // prese gitmeyen cam
    const kristal = 2 * y;
    const rate = raw * env.price.toz + camSold * env.price.cam + kristal * env.price.kristal;

    s.money += rate * dt;
    s.tot.toz += T * dt; s.tot.cam += x * dt; s.tot.kristal += kristal * dt; s.tot.earned += rate * dt;

    // Darboğaz teşhisi (arayüz için)
    const warn = [];
    if (need > 0 && f < 0.999) warn.push({ k: 'power', sev: f < 0.5 ? 'crit' : 'warn', pct: f });
    if (P > 0 && y0 < P * R.pressRate - 1e-9) {
      if (fCap < P * R.pressRate && fCap <= T / 2) warn.push({ k: 'cam', sev: 'warn' });
      else warn.push({ k: 'toz', sev: 'warn' });
    } else if (F > 0 && x0 < fCap - 1e-9) {
      warn.push({ k: 'toz', sev: 'info' });
    }
    if (raw > 0.01 && (F > 0 || P > 0) && f >= 0.999 && x0 >= fCap - 1e-9 && F > 0) warn.push({ k: 'rawExcess', sev: 'info', v: raw });

    s.flow = {
      T, x, y, raw, camSold, kristal, rate, f, need, supply, battFlow, cap,
      furnUtil: F ? x / fCap : 0, pressUtil: P ? y / (P * R.pressRate) : 0, warn,
    };
    return s.flow;
  }

  function costOf(s, id) {
    if (!id) return 0;
    return Math.round(MACHINES[id].cost * Math.pow(MACHINES[id].growth || R.costGrowth, s.m[id]));
  }

  function usesLeft(s, id) { const lim = MACHINES[id].limit; return lim == null ? Infinity : lim - s.m[id]; }
  function canBuy(s, id) { return id > 0 && usesLeft(s, id) > 0 && s.money >= costOf(s, id); }

  function buy(s, id) {
    if (!id) return { ok: true, id: 0 };
    const c = costOf(s, id);
    if (usesLeft(s, id) <= 0) return { ok: false, id, reason: 'hak' };
    if (s.money < c) return { ok: false, id, reason: 'para' };
    s.money -= c; s.m[id]++;
    return { ok: true, id };
  }

  function applyInstantEvent(s, ev) {
    if (ev.key === 'meteor' && s.m[4] > 0) {
      s.m[4]--;
      s.batt = Math.min(s.batt, R.battCap * s.m[5]);
    }
  }

  // ---- Yapay zekâ / sahte chat değerlendirmesi -----------------------------
  const DAY_ENV = { night: false, tozMul: 1, solarMul: 1, price: PRICE, active: null };

  // Basit kural: darboğazı gider, yoksa pres ekle; oyun sonunda kendini ödemeyecekse alma.
  function ruleMove(s, t) {
    const left = DUR - t;
    const S = s.m[1], F = s.m[2], P = s.m[3];
    const c = clone(s); c.batt = 0;
    const fl = step(c, 1, DAY_ENV);
    let want;
    if (fl.need > fl.supply + 1e-9) want = 4;
    else if (P > 0 && fl.y < P * R.pressRate - 1e-9) want = (R.furnaceRate * F < P && R.furnaceRate * F <= fl.T / 2) ? 2 : 1;
    else if (F > 0 && fl.x < R.furnaceRate * F - 1e-9) want = 1;
    else if (S < 2) want = 1;
    else if (F === 0) want = 2;
    else if (s.m[5] === 0 && t >= 60 && t < NIGHT_START - 10) want = 5;  // geceden önce bir batarya
    else if (s.m[5] > 0 && t < NIGHT_START - 10 && fl.supply < fl.need + 4.5 * s.m[5]) want = 'sarj'; // bataryayı dolduracak fazla panel
    else want = 3;
    if (want === 5) return canBuy(s, 5) ? 5 : 0;
    if (want === 'sarj') return canBuy(s, 4) ? 4 : 0;

    // Potansiyel kazanç (enerji sınırsız varsayımıyla) kendini ödemiyorsa alma.
    let gain;
    if (want === 4) {
      const c2 = clone(s); c2.batt = 0; c2.m[4]++;
      gain = step(c2, 1, DAY_ENV).rate - fl.rate;
    } else {
      const a = clone(s); a.batt = 0; a.m[4] += 50;
      const b = clone(a); b.m[want]++;
      gain = step(b, 1, DAY_ENV).rate - step(a, 1, DAY_ENV).rate;
    }
    if (gain * left < costOf(s, want) * 1.05) return 0;
    if (!canBuy(s, want)) return 0;
    return want;
  }

  // t anındaki (tur sınırı) durumdan oyun sonuna kadar oynar: önce `first` alımları, sonra kural.
  function rollout(s0, t0, ev, first, dt, threat) {
    const s = clone(s0);
    dt = dt || 0.5;
    const known = ev && ev.known ? ev : null;
    let t = t0, k = 0;
    while (t < DUR - 1e-9) {
      if (Math.abs(t - (t0 + k * TURN)) < 1e-6) {
        if (known && known.dur === 0 && Math.abs(t - known.t) < 1e-6 && t > t0 + 1e-6) applyInstantEvent(s, known);
        if (threat && threat.indexOf(t) >= 0) blackout(s, t);
        buy(s, k < first.length ? first[k] : ruleMove(s, t));
        k++;
      }
      step(s, dt, sideEnv(envAt(t, known), s, t));
      t = Math.round((t + dt) * 1000) / 1000;
    }
    return s.money;
  }

  // Her seçenek için: bu tur onu al, sonraki tur en iyisini al, sonra kurala göre devam et.
  // Değerler "kendi param − rakibin parası" farkına göre karşılaştırılabilir: makine seçenekleri
  // rakibi etkilemez; karartmanın değerine rakibe verdiği zarar eklenir.
  // Rakibin kalan karartma haklarını maçın son gündüz turlarında kullanacağını varsayar.
  function threatTimes(opp, t) {
    const out = [];
    let left = opp ? Math.min(R.threatN == null ? 1 : R.threatN, usesLeft(opp, M.KARARTMA)) : 0;
    for (let k = TURNS - 1; k >= 0 && left > 0; k--) {
      const tb = k * TURN;
      if (tb < t) break;
      if (isNight(tb) || isNight(tb + TURN - 1)) continue;
      out.push(tb); left--;
    }
    return out;
  }

  function evaluate(s, t, ev, opp) {
    const vals = [];
    const threat = R.threat === false ? [] : threatTimes(opp, t);
    for (let a = 0; a < N_OPT; a++) {
      if (a > 0 && !canBuy(s, a)) { vals.push(null); continue; }
      if (a === M.KARARTMA && !opp) { vals.push(null); continue; }
      let best = -Infinity;
      for (let b = 0; b < 6; b++) {
        const v = rollout(s, t, ev, [a, b], 0.5, threat);
        if (v > best) best = v;
      }
      if (a === M.KARARTMA) {
        const dark = clone(opp); blackout(dark, t);
        best += rollout(opp, t, ev, []) - rollout(dark, t, ev, []);
      }
      vals.push(best);
    }
    return vals;
  }

  function bestMove(s, t, ev, opp) {
    const vals = evaluate(s, t, ev, opp);
    let bi = 0;
    for (let i = 1; i < N_OPT; i++) if (vals[i] != null && vals[i] > vals[bi] + 1e-6) bi = i;
    return { id: bi, vals };
  }

  // Yapılan seçimi en iyi seçimle karşılaştırır. vals: evaluate() çıktısı.
  const GRADE = { green: 40, red: 200 };
  function grade(vals, id, ok) {
    const eff = ok ? id : 0;
    let bestId = 0;
    for (let i = 1; i < vals.length; i++) if (vals[i] != null && vals[i] > vals[bestId] + 1e-6) bestId = i;
    const loss = Math.max(0, vals[bestId] - vals[eff]);
    const level = loss <= GRADE.green ? 'g' : loss <= GRADE.red ? 'm' : 'r';
    return { loss, bestId, level };
  }

  const api = {
    DUR, TURN, PREP, TURNS, NIGHT_START, NIGHT_END, START_MONEY,
    M, MACHINES, N_OPT, R, PRICE, EVENTS,
    rng, planEvent, newSide, clone, isNight, envAt, sideEnv, blackout, step, costOf, usesLeft, canBuy, buy, applyInstantEvent, threatTimes,
    ruleMove, rollout, evaluate, bestMove, grade, GRADE,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KK = api;
})(typeof window !== 'undefined' ? window : globalThis);
