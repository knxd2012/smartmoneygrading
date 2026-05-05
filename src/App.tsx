import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ──────────────────────────── Types ──────────────────────────── */
type MatchInfo = { id: string; league: string; home: string; away: string; time: string };
type ScanProgress = { current: number; total: number; label: string };
type AnalysisResult = { score: number; htmlOutput: string };

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = window as any;

/* ──────────────────────── Constants ──────────────────────────── */
const PINNACLE_ID = "153114200";

const HOT_LEAGUES = [
  "英超","西甲","德甲","意甲","法甲","歐冠","歐霸","歐協聯","歐洲聯賽",
  "英冠","英甲","西乙","德乙","意乙","法乙","英足總","英聯盃","國王盃",
  "荷甲","葡超","蘇超","土超","俄超","比甲","瑞士超","奧甲","丹麥超","挪超","瑞典超","芬超","波蘭超",
  "美職業","美職聯","巴西甲","巴甲","阿甲","墨西超","哥倫甲","智利甲","解放者杯","南美杯","自由盃",
  "日職聯","日職乙","日皇盃","韓K聯","韓職","澳超","澳洲甲","中超","亞冠","亞洲盃","非洲盃","美洲盃",
  "世界盃","國際友誼","歐國聯",
];

const BOOT_LINES = [
  '<span class="text-pink-400 font-bold">══════════════════════════════════════════</span>',
  '<span class="text-cyan-400 font-bold">⬢ Smart Money V29 — 終極純淨連線版</span>',
  '<span class="text-slate-500">核心：V13 概率模型 + EV 1.0 + 出手判定</span>',
  '<span class="text-slate-500">輸出反轉（最新置頂）· 切片器已就緒</span>',
  '<span class="text-pink-400 font-bold">══════════════════════════════════════════</span>',
];

/* ──────────── V17 微觀特徵切片器規則（完全不動）──────────── */
const V17_RULES: Record<string, { GOLDEN: { type: string; val: string; roi: string; desc: string }[]; TRAPS: { type: string; val: string; roi: string; desc: string }[] }> = {
  HOME: {
    GOLDEN: [
      { type:"Pat_L", val:"順階梯", roi:"+13.0%", desc:"主隊穩定降水，莊家防範賠付" },
      { type:"Pat_L", val:"缺失", roi:"+8.7%", desc:"軌跡不明顯但籌碼穩定" },
      { type:"Pat_L", val:"凹陷誘盤", roi:"+5.4%", desc:"主隊先降後升誘空，實則能打出" },
      { type:"Pat_M", val:"缺失", roi:"+8.7%", desc:"客隊無明顯軌跡" },
      { type:"Pat_M", val:"A<B<C", roi:"+6.9%", desc:"客隊持續升水示弱" },
      { type:"Pat_M", val:"A>B<C", roi:"+6.0%", desc:"客隊先降後升誘空" },
      { type:"Cross", val:"-+++", roi:"+21.1%", desc:"主隊降水，客隊狂升嚇退散戶" },
      { type:"Cross", val:"+---", roi:"+18.0%", desc:"客隊連降誘盤，主隊逆勢打出" },
      { type:"Cross", val:"++-+", roi:"+12.7%", desc:"複雜震盪洗盤，主隊最終勝出" },
      { type:"Fav", val:"Away", roi:"+6.4%", desc:"客隊是強隊，但主隊爆冷倒打" },
    ],
    TRAPS: [
      { type:"Pat_M", val:"A>B>C", roi:"-0.6%", desc:"客隊持續降水，主隊有壓" },
      { type:"Cross", val:"-+--", roi:"-2.1%", desc:"典型亞盤誘上盤，主隊極易被逼平" },
      { type:"Cross", val:"++--", roi:"-4.9%", desc:"主升客降，盲目相信主勝會死" },
    ],
  },
  DRAW: {
    GOLDEN: [
      { type:"Pat_L", val:"凹陷誘盤", roi:"+11.2%", desc:"主隊先降後升，客隊無力" },
      { type:"Pat_L", val:"反階梯", roi:"+6.7%", desc:"主隊連升示弱，客隊卻無法打穿" },
      { type:"Pat_M", val:"A>B<C", roi:"+10.8%", desc:"客隊先降後升誘空" },
      { type:"Pat_M", val:"A>B>C", roi:"+7.9%", desc:"客隊持續降水防平" },
      { type:"Cross", val:"----", roi:"+22.0%", desc:"主客齊降水，莊家兩邊造熱掩護和局" },
      { type:"Fav", val:"Home", roi:"+10.1%", desc:"主隊強隊卻打不穿，下盤逼平" },
    ],
    TRAPS: [
      { type:"Pat_L", val:"缺失", roi:"-11.8%", desc:"無明顯軌跡的和局預測多為雜訊" },
      { type:"Pat_M", val:"缺失", roi:"-11.8%", desc:"無明顯軌跡的和局預測多為雜訊" },
      { type:"Cross", val:"++++", roi:"-17.1%", desc:"主客齊升水，此時極少出現平局" },
      { type:"Cross", val:"++--", roi:"-17.1%", desc:"客隊強勢降水，和局防線脆弱" },
      { type:"Fav", val:"Away", roi:"-20.4%", desc:"強勢客隊作客，極少接受和局" },
    ],
  },
  AWAY: {
    GOLDEN: [
      { type:"Pat_L", val:"順階梯", roi:"+16.6%", desc:"主隊穩定打出" },
      { type:"Pat_L", val:"凹陷誘盤", roi:"+16.5%", desc:"主隊假動作洗盤後順利打穿" },
      { type:"Pat_L", val:"反階梯", roi:"+15.0%", desc:"深盤反向阻盤，客隊爆冷" },
      { type:"Pat_L", val:"缺失", roi:"+10.3%", desc:"無明顯軌跡，常規打出" },
      { type:"Pat_L", val:"雙峰擠壓", roi:"+8.1%", desc:"震盪中跑出" },
      { type:"Pat_M", val:"A>B<C", roi:"+17.8%", desc:"客隊先降後升順利打出" },
      { type:"Pat_M", val:"缺失", roi:"+10.3%", desc:"無明顯軌跡常規打出" },
      { type:"Pat_M", val:"A<B<C", roi:"+10.3%", desc:"客隊持續升水爆冷" },
      { type:"Pat_M", val:"A<B>C", roi:"+9.8%", desc:"客隊震盪跑出" },
      { type:"Cross", val:"--++", roi:"+49.7%", desc:"超級印鈔機！主降客升，客隊強勢爆冷" },
      { type:"Cross", val:"-+++", roi:"+43.1%", desc:"黃金交叉！莊家極力掩護客隊" },
      { type:"Cross", val:"++--", roi:"+13.7%", desc:"客隊穩定降水，順利打出" },
      { type:"Cross", val:"----", roi:"+12.1%", desc:"雙向降水，客隊漁翁得利" },
      { type:"Cross", val:"++++", roi:"+10.7%", desc:"雙向升水阻盤，客隊勝出" },
      { type:"Fav", val:"Home", roi:"+16.6%", desc:"主隊強隊大熱必死，客隊倒打" },
      { type:"Fav", val:"Away", roi:"+10.2%", desc:"強勢客隊正路打出" },
    ],
    TRAPS: [
      { type:"Pat_M", val:"無序", roi:"-1.3%", desc:"客隊無序震盪" },
      { type:"Cross", val:"++-+", roi:"-6.3%", desc:"客隊震盪不明，強行買客易死" },
    ],
  },
};

/* ──────────────────────── Utilities ──────────────────────────── */

function injectScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `${url}?_=${Date.now()}`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Script injection failed"));
    document.head.appendChild(s);
  });
}

function calcImpliedProb(h: number, d: number, a: number) {
  if (h === 0 || d === 0 || a === 0) return { ph: 0, pd: 0, pa: 0, margin: 0 };
  const margin = 1 / h + 1 / d + 1 / a;
  return { ph: (1 / h) / margin, pd: (1 / d) / margin, pa: (1 / a) / margin, margin };
}

function isHot(league: string) {
  return HOT_LEAGUES.some((h) => league.includes(h));
}

/* ════════════════════════════════════════════════════════════════
   核心分析引擎：V13 概率模型 + EV 1.0 + 出手判定
   數據來源：window.game (script injection)
   ════════════════════════════════════════════════════════════════ */

function processQuant(matchId: string): AnalysisResult | null {
  /* ── 讀取全域變數 ── */
  const league = W.matchname_cn || W.matchname || "未知聯賽";
  const homeTeam = W.hometeam_cn || W.hometeam || "主隊";
  const awayTeam = W.guestteam_cn || W.guestteam || "客隊";
  const rawGame: string[] = W.game;
  if (!rawGame || !Array.isArray(rawGame)) return null;
  const rawTotal = rawGame.length; /* 診斷用：原始數據總筆數 */

  /* ── 1. 解析莊家數據 ──
   * nowscore.com 當前格式（| 分隔，每筆 = 初盤 + 終盤）：
   * [0]莊家ID | [1]時間戳 | [2]名稱 | [3-5]初H/D/A | [6-9]初概率/返還
   *         | [10-12]終H/D/A | [13-16]終概率/返還 | [17-19]? | [20]日期
   * 例: 281|153491386|Bet 365|2.1|3.5|3|...|2.35|3.5|2.63|...|2026,05-1,04
   */
  type OP = { h: number; d: number; a: number; ts: number };
  const bookies: Record<string, OP[]> = {};
  let latestTs = 0;

  /* 診斷計數器 + 莊家名稱映射 */
  let d_skip = 0, d_badOdds = 0, d_marginFail = 0;
  const bookieNames: Record<string, string> = {};

  for (const item of rawGame) {
    if (!item) continue;
    const itemStr = typeof item === "string" ? item : String(item);
    const p = itemStr.split("|");
    if (p.length < 13) { d_skip++; continue; }

    const bId = p[0];
    const bName = p[2] || "";
    bookieNames[bId] = bName;
    const oH = parseFloat(p[3]), oD = parseFloat(p[4]), oA = parseFloat(p[5]);
    const cH = parseFloat(p[10]), cD = parseFloat(p[11]), cA = parseFloat(p[12]);

    if ([oH, oD, oA, cH, cD, cA].some((v) => isNaN(v) || v <= 0)) { d_badOdds++; continue; }

    /* 解析日期 [20]: "2026,05-1,04" 或 "2026,05-1,04,1" */
    let ts = Date.now() / 1000;
    if (p[20]) {
      const dp = p[20].split(",");
      if (dp.length >= 3) {
        const yr = parseInt(dp[0]);
        const [mo, dy] = dp[1].split("-");
        const hr = parseInt(dp[2]);
        const parsed = new Date(yr, parseInt(mo) - 1, parseInt(dy), isNaN(hr) ? 0 : hr).getTime() / 1000;
        if (!isNaN(parsed)) ts = parsed;
      }
    }
    if (ts > latestTs) latestTs = ts;

    /* 構建 2 點歷史（初盤 → 終盤） */
    const oMargin = 1 / oH + 1 / oD + 1 / oA;
    if ((1 / oMargin) * 100 >= 88) {
      bookies[bId] = [
        { h: oH, d: oD, a: oA, ts: ts - 1 },
        { h: cH, d: cD, a: cA, ts },
      ];
    } else {
      d_marginFail++;
    }
  }

  const numB = Object.keys(bookies).length;

  if (numB === 0) {
    (W as any).__diag = { raw: rawTotal, skip: d_skip, badOdds: d_badOdds, marginFail: d_marginFail };
    return null;
  }

  /* ── 2. Pinnacle 領先指標（額外資訊）── */
  let pinnLead = 0;
  if (bookies[PINNACLE_ID]) {
    const pinn = bookies[PINNACLE_ID];
    const pDir = pinn[pinn.length - 1].h < pinn[0].h ? -1 : 1;
    let followers = 0;
    for (const bId in bookies) {
      const h = bookies[bId];
      const bDir = h[h.length - 1].h < h[0].h ? -1 : 1;
      if (bDir === pDir) followers++;
    }
    pinnLead = followers / numB;
  }

  /* ── 3. 宏觀市場統計 ── */
  const probShifts = { h: [] as number[], d: [] as number[], a: [] as number[] };
  const avgO = { h: 0, d: 0, a: 0 };
  const avgC = { h: 0, d: 0, a: 0 };

  for (const bId in bookies) {
    const hist = bookies[bId];
    const o = hist[0], c = hist[hist.length - 1];
    const oP = calcImpliedProb(o.h, o.d, o.a);
    const cP = calcImpliedProb(c.h, c.d, c.a);
    probShifts.h.push(cP.ph - oP.ph);
    probShifts.d.push(cP.pd - oP.pd);
    probShifts.a.push(cP.pa - oP.pa);
    avgO.h += o.h; avgO.d += o.d; avgO.a += o.a;
    avgC.h += c.h; avgC.d += c.d; avgC.a += c.a;
  }

  const avgSH = (probShifts.h.reduce((a, b) => a + b, 0) / numB) * 100;
  const avgSD = (probShifts.d.reduce((a, b) => a + b, 0) / numB) * 100;
  const avgSA = (probShifts.a.reduce((a, b) => a + b, 0) / numB) * 100;
  avgO.h /= numB; avgO.d /= numB; avgO.a /= numB;
  avgC.h /= numB; avgC.d /= numB; avgC.a /= numB;

  /* 鎖定最佳目標 */
  let targetKey: "h" | "d" | "a" = "h";
  let targetShift = avgSH;
  if (avgSD > targetShift) { targetKey = "d"; targetShift = avgSD; }
  if (avgSA > targetShift) { targetKey = "a"; targetShift = avgSA; }

  const tOpen = avgO[targetKey];
  const tClose = avgC[targetKey];
  const targetName = targetKey === "h" ? `主勝: ${homeTeam}` : targetKey === "a" ? `客勝: ${awayTeam}` : "和局 (Draw)";
  const mlColor = targetKey === "h" ? "text-yellow-400" : targetKey === "a" ? "text-cyan-400" : "text-slate-400";
  const macroTarget = targetKey === "h" ? "HOME" : targetKey === "a" ? "AWAY" : "DRAW";

  /* ── ML 對齊：Pinnacle 專屬通道 ──
   * ML 管線鎖定 Pinnacle 單一莊家，此處同步計算 Pinnacle shift
   * 用於對齊 ML_Training_Dataset 的 shift_h/d/a_pct 特徵 */
  let pinnShiftH = 0, pinnShiftD = 0, pinnShiftA = 0;
  let pinnFound = false;
  let pinnTarget = "";
  let pinnTargetShift = 0;

  /* 搜尋 Pinnacle（名稱模糊匹配） */
  for (const bId in bookies) {
    const name = (bookieNames[bId] || "").toLowerCase();
    if (name.includes("pinnacle") || name.includes("平博") || name.includes("pinny")) {
      const hist = bookies[bId];
      const o = hist[0], c = hist[1];
      const oP = calcImpliedProb(o.h, o.d, o.a);
      const cP = calcImpliedProb(c.h, c.d, c.a);
      pinnShiftH = (cP.ph - oP.ph) * 100;
      pinnShiftD = (cP.pd - oP.pd) * 100;
      pinnShiftA = (cP.pa - oP.pa) * 100;
      pinnFound = true;

      /* Pinnacle 的 macro_target */
      pinnTarget = "HOME";
      pinnTargetShift = pinnShiftH;
      if (pinnShiftD > pinnTargetShift) { pinnTarget = "DRAW"; pinnTargetShift = pinnShiftD; }
      if (pinnShiftA > pinnTargetShift) { pinnTarget = "AWAY"; pinnTargetShift = pinnShiftA; }
      break;
    }
  }

  /* ── 4. V13 四項連續評分 ── */

  /* [A] 概率偏移 40 分 — 3.5% 為極限重倉 */
  const scoreShift = Math.min(40, Math.max(0, (targetShift / 3.5) * 40));

  /* [B] 絕對共識 30 分 — >0.2% 的莊家比例，50%→0, 85%→30 */
  const tProbs = probShifts[targetKey];
  const consensusCount = tProbs.filter((p) => p > 0.002).length;
  const consensusRate = consensusCount / numB;
  const scoreConsensus = Math.min(30, Math.max(0, ((consensusRate - 0.5) / 0.35) * 30));

  /* [C] 偏移集中度 15 分 — 目標偏移相對於其他兩個方向的優勢
   * 2 點數據專用：衡量資金是否「單邊鎖定」目標 */
  const otherShifts = [avgSH, avgSD, avgSA].filter((_, i) => i !== ["h", "d", "a"].indexOf(targetKey));
  const otherAbsSum = Math.abs(otherShifts[0]) + Math.abs(otherShifts[1]);
  const dominanceRatio = targetShift / (otherAbsSum + 0.1);
  const scoreConcentration = Math.min(15, Math.max(0, ((dominanceRatio - 0.5) / 2.0) * 15));

  /* [D] 賠率壓縮度 15 分 — 目標賠率從初盤到終盤的壓縮幅度
   * 2 點數據專用：壓縮越大 = 莊家越防範該結果 */
  const oddsCompression = (tOpen - tClose) / tOpen;
  const scoreCompression = Math.min(15, Math.max(0, oddsCompression * 150));

  const totalScore = scoreShift + scoreConsensus + scoreConcentration + scoreCompression;

  /* ── 5. EV 1.0 期望值計算 ──
   * 修正 edge_multiplier：用概率偏移 × 評分信心度 做加成
   * 舊版 (score-50)/800 最大僅 4.4%，無法跨越莊家水錢 (5-8%)
   * 新版：edgeMult = 1 + (targetShift/100) × (totalScore/100)
   * 例: shift=10.5%, score=85 → 1 + 0.105×0.85 = 1.089 (8.9% boost) */
  const cMarginFinal = 1 / avgC.h + 1 / avgC.d + 1 / avgC.a;
  const impliedProb = (1 / tClose) / cMarginFinal;
  const edgeMult = 1 + (targetShift / 100) * (totalScore / 100);
  const ourProb = Math.min(0.95, impliedProb * edgeMult);
  const ev = ourProb * (tClose - 1) - (1 - ourProb);
  const evPct = ev * 100;

  /* Half-Kelly 注碼 */
  const bOdds = tClose - 1;
  const kelly = bOdds > 0 ? (bOdds * ourProb - (1 - ourProb)) / bOdds : 0;
  const stake = Math.max(0, (kelly / 2) * 100);

  /* ── 6. 出手判定 ── */
  let actionLabel: string;
  let actionClass: string;
  let actionBg: string;
  let isQualified = false;
  let isHardRec = false;

  if (totalScore >= 60 && ev > 0.005) {
    /* ✅ 符合出手範圍 */
    actionLabel = "✅ 出手！";
    actionClass = "text-emerald-400";
    actionBg = "bg-emerald-950/40 border-emerald-700/40";
    isQualified = true;
  } else if (ev > 0) {
    /* ⚠️ EV>0 但評分不足 → 不合格的硬推薦 */
    actionLabel = "⚠️ 不合格的硬推薦";
    actionClass = "text-amber-400";
    actionBg = "bg-amber-950/40 border-amber-700/40";
    isHardRec = true;
  } else if (totalScore >= 60) {
    /* ⏸️ 評分夠但 EV≤0 */
    actionLabel = "⏸️ 觀望（EV 不足）";
    actionClass = "text-sky-400";
    actionBg = "bg-sky-950/40 border-sky-700/40";
  } else {
    /* 🚫 無信號 */
    actionLabel = "🚫 放棄";
    actionClass = "text-red-400";
    actionBg = "bg-red-950/40 border-red-700/40";
  }

  /* ── 7. 級別 & 星星 ── */
  const stars = "★".repeat(Math.floor(totalScore / 20)) + "☆".repeat(5 - Math.floor(totalScore / 20));
  let level: string, levelClass: string, cardBorder: string;
  if (totalScore >= 75) {
    level = "S 級黃金標的"; levelClass = "text-emerald-400";
    cardBorder = "border-emerald-600/40 shadow-[0_0_12px_rgba(34,197,94,0.15)]";
  } else if (totalScore >= 60) {
    level = "A 級強勢資金"; levelClass = "text-cyan-400";
    cardBorder = "border-cyan-600/30 shadow-[0_0_8px_rgba(6,182,212,0.1)]";
  } else if (totalScore >= 45) {
    level = "B 級常規調盤"; levelClass = "text-amber-400";
    cardBorder = "border-amber-700/30";
  } else {
    level = "C 級雜訊/誘盤"; levelClass = "text-red-400";
    cardBorder = "border-slate-800 opacity-70";
  }

  const now = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  /* ── 8. 構建 HTML ── */
  let html = `
    <div class="mb-3 bg-slate-950/80 rounded-xl border ${cardBorder} overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/[0.04]">
        <div class="text-[13px] text-slate-200">⚽ <b>${league}</b> ｜ ${homeTeam} <span class="text-slate-600">vs</span> ${awayTeam}</div>
        <span class="text-[10px] text-slate-600 font-mono">${now} · ID:${matchId}</span>
      </div>

      <div class="p-3 space-y-3">
        <!-- V13 評分 -->
        <div class="text-[11px] leading-relaxed">
          <div class="font-bold text-slate-400 mb-1">📏 V13 量化評分</div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-300">
            <div> ├─ 概率偏移 (40): <b>${scoreShift.toFixed(1)}</b></div>
            <div> ├─ 絕對共識 (30): <b>${scoreConsensus.toFixed(1)}</b></div>
            <div> ├─ 偏移集中 (15): <b>${scoreConcentration.toFixed(1)}</b></div>
            <div> ├─ 賠率壓縮 (15): <b>${scoreCompression.toFixed(1)}</b></div>
          </div>
          <div class="mt-1 text-slate-200">
            └─ 綜合: <span class="text-amber-400">${stars}</span> <b>${totalScore.toFixed(1)}</b>/100 → <span class="${levelClass} font-bold">${level}</span>
          </div>
        </div>

        <!-- EV 1.0 -->
        <div class="text-[11px] leading-relaxed">
          <div class="font-bold text-slate-400 mb-1">💰 EV 1.0 期望值</div>
          <div class="text-slate-300">
            隱含 ${ (impliedProb * 100).toFixed(1) }% → 修正 ${ (ourProb * 100).toFixed(1) }% ｜
            EV: <b class="${evPct > 0 ? 'text-emerald-400' : 'text-red-400'}">${evPct > 0 ? '+' : ''}${evPct.toFixed(2)}%</b>
            ${pinnLead > 0 ? ` ｜ Pinnacle 領先: ${(pinnLead * 100).toFixed(0)}%` : ''}
          </div>
        </div>

        <!-- ML 特徵對齊 (Data Dictionary 映射) -->
        <div class="text-[11px] leading-relaxed">
          <div class="font-bold text-purple-400 mb-1">🤖 ML 特徵對齊 (V22 Macro Shift)</div>
          <div class="grid grid-cols-3 gap-1 text-center text-[10px] font-mono mb-1">
            <div class="rounded bg-slate-800/60 py-1">
              <div class="text-slate-500">shift_h_pct</div>
              <div class="${avgSH > 0 ? 'text-emerald-400' : 'text-red-400'} font-bold">${avgSH > 0 ? '+' : ''}${avgSH.toFixed(2)}</div>
            </div>
            <div class="rounded bg-slate-800/60 py-1">
              <div class="text-slate-500">shift_d_pct</div>
              <div class="${avgSD > 0 ? 'text-emerald-400' : 'text-red-400'} font-bold">${avgSD > 0 ? '+' : ''}${avgSD.toFixed(2)}</div>
            </div>
            <div class="rounded bg-slate-800/60 py-1">
              <div class="text-slate-500">shift_a_pct</div>
              <div class="${avgSA > 0 ? 'text-emerald-400' : 'text-red-400'} font-bold">${avgSA > 0 ? '+' : ''}${avgSA.toFixed(2)}</div>
            </div>
          </div>
          <div class="text-slate-300">
            macro_target: <b class="${mlColor}">${macroTarget}</b>
            ${pinnFound ? ` ｜ Pinnacle: <b class="text-purple-400">${pinnTarget}</b> (h:${pinnShiftH > 0 ? '+' : ''}${pinnShiftH.toFixed(2)} d:${pinnShiftD > 0 ? '+' : ''}${pinnShiftD.toFixed(2)} a:${pinnShiftA > 0 ? '+' : ''}${pinnShiftA.toFixed(2)})` : ' ｜ <span class="text-slate-600">Pinnacle 未在數據中</span>'}
          </div>
        </div>

        <!-- 出手判定 -->
        <div class="rounded-lg border ${actionBg} px-3 py-2">
          <div class="text-[11px] font-bold text-slate-400 mb-1">🎯 出手判定</div>
          <div class="text-base font-black ${actionClass}">${actionLabel}</div>
          ${isQualified || isHardRec ? `
            <div class="text-[11px] text-slate-400 mt-1">
              方向: <b class="${mlColor}">${targetName}</b> ｜
              初 ${tOpen.toFixed(2)} → 終 ${tClose.toFixed(2)} ｜
              注碼: <b class="text-cyan-400">${stake.toFixed(1)}%</b>
              ${isHardRec ? ' <span class="text-amber-500 font-bold">（評分不足，極小注）</span>' : ''}
            </div>
          ` : ''}
        </div>

        <!-- 數據標籤 + 自動帶入切片器 -->
        <div class="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-500">
          <span class="bg-slate-800/60 px-1.5 py-0.5 rounded">原始 ${rawTotal}</span>
          <span class="bg-slate-800/60 px-1.5 py-0.5 rounded">莊家 ${numB}</span>
          <span class="bg-slate-800/60 px-1.5 py-0.5 rounded">取樣 ${numB * 2}</span>
          <span class="bg-slate-800/60 px-1.5 py-0.5 rounded">共識 ${(consensusRate * 100).toFixed(0)}%</span>
          <span class="bg-slate-800/60 px-1.5 py-0.5 rounded">淨增 +${targetShift.toFixed(1)}%</span>
          <button onclick="window.dispatchEvent(new CustomEvent('autofill-slicer',{detail:{target:'${macroTarget}',matchId:'${matchId}'}}))" class="bg-purple-900/40 text-purple-400 border border-purple-700/40 px-2 py-0.5 rounded hover:bg-purple-800 hover:text-white transition cursor-pointer">🤖 帶入切片器</button>
        </div>
      </div>
    </div>`;

  return { score: totalScore, htmlOutput: html };
}

/* ═══════════════════════ REACT COMPONENT ═══════════════════════ */

export default function App() {
  /* ── State ── */
  const [rawMatches, setRawMatches] = useState<MatchInfo[]>([]);
  const [allLeagues, setAllLeagues] = useState<string[]>([]);
  const [selectedLeagues, setSelectedLeagues] = useState<Set<string>>(new Set());
  const [filteredMatches, setFilteredMatches] = useState<MatchInfo[]>([]);
  const [leagueGroups, setLeagueGroups] = useState<Record<string, MatchInfo[]>>({});
  const [step1Done, setStep1Done] = useState(false);

  const [lines, setLines] = useState<string[]>(BOOT_LINES);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [manualId, setManualId] = useState("");

  const [slicerOpen, setSlicerOpen] = useState(true);
  const [slTarget, setSlTarget] = useState("AWAY");
  const [slFav, setSlFav] = useState("Home");
  const [slCross, setSlCross] = useState("----");
  const [slPatL, setSlPatL] = useState("缺失");
  const [slPatM, setSlPatM] = useState("缺失");

  const consoleRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef(false);

  /* ── Console helpers (prepend = newest on top) ── */
  const print = useCallback((html: string) => setLines((p) => [html, ...p]), []);
  const clearConsole = useCallback(() => setLines([...BOOT_LINES]), []);

  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = 0;
  }, [lines]);

  /* ── 自動帶入切片器事件監聽 ── */
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.target) {
        setSlTarget(detail.target);
        print(`<span class="text-purple-400 text-xs">🤖 切片器已自動帶入: ${detail.target} (ID: ${detail.matchId || '?'})</span>`);
      }
    };
    window.addEventListener("autofill-slicer", handler);
    return () => window.removeEventListener("autofill-slicer", handler);
  }, [print]);

  /* ── League groups from filtered matches ── */
  const lgEntries = useMemo(() => Object.entries(leagueGroups), [leagueGroups]);

  /* ══════════════════ STEP 1: Fetch Leagues ══════════════════ */
  async function handleFetchLeagues() {
    setIsLoading(true);
    print('<span class="text-xs text-slate-500">[系統] DOM Script Injection 連線中...</span>');

    W.A = undefined;
    W.B = undefined;

    try {
      try {
        await injectScript("https://live.nowscore.com/data/bf.js");
      } catch {
        await injectScript("https://v.nowscore.com/data/bf.js");
      }
      if (!W.A) throw new Error("腳本已載入但無賽事資料");
    } catch (err: any) {
      print(`<span class="text-red-500 font-bold">[錯誤] ${err.message}</span>`);
      setIsLoading(false);
      return;
    }

    const matches: MatchInfo[] = [];
    const leagues = new Set<string>();

    W.A.forEach((val: any) => {
      if (!val) return;
      const p: any[] = Array.isArray(val) ? val : String(val).split(/[\^,]/);
      if (p.length < 10) return;

      const statusStr = `${p[12] || ""} ${p[13] || ""} ${p[14] || ""}`;
      if (statusStr.includes("-1") || statusStr.includes("4")) return;

      const mId = String(p[0]).trim();
      const bIdx = parseInt(p[1]);
      let tw = "未知聯賽";
      if (W.B && W.B[bIdx]) {
        const bVal = W.B[bIdx];
        const pB = Array.isArray(bVal) ? bVal : String(bVal).split(/[\^,]/);
        const ns = pB.filter((x: any) => typeof x === "string" && /[^\d.\-\s]/.test(x));
        tw = ns[1] || ns[0] || "未知聯賽";
      }

      const home = String(p[4] || p[5] || "").replace(/<[^>]+>/g, "").trim();
      const away = String(p[7] || p[8] || "").replace(/<[^>]+>/g, "").trim();
      const time = p.find((x: any) => typeof x === "string" && x.includes(":")) || "未知時間";

      if (home && away) {
        leagues.add(tw);
        matches.push({ id: mId, league: tw, home, away, time });
      }
    });

    setRawMatches(matches);
    const sorted = Array.from(leagues).sort();
    setAllLeagues(sorted);

    /* Auto-select hot leagues */
    const hotSet = new Set(sorted.filter((l) => isHot(l)));
    setSelectedLeagues(hotSet);
    setStep1Done(true);

    print(`<span class="text-emerald-400 font-bold">✅ 成功！${matches.length} 場有效賽事，${sorted.length} 個聯賽。已自動勾選 ${hotSet.size} 個熱門。</span>`);
    setIsLoading(false);
  }

  /* ══════════════════ STEP 2: Render Radar ══════════════════ */
  function handleRenderRadar() {
    if (selectedLeagues.size === 0) {
      alert("請至少勾選一個聯賽！");
      return;
    }
    const filtered = rawMatches.filter((m) => selectedLeagues.has(m.league));
    const groups: Record<string, MatchInfo[]> = {};
    filtered.forEach((m) => {
      if (!groups[m.league]) groups[m.league] = [];
      groups[m.league].push(m);
    });
    setFilteredMatches(filtered);
    setLeagueGroups(groups);
    print(`<span class="text-cyan-400 font-bold">📊 雷達已更新，共 ${filtered.length} 場待分析。</span>`);
  }

  /* ══════════════════ League checkbox helpers ══════════════════ */
  function toggleLeague(league: string, checked: boolean) {
    setSelectedLeagues((prev) => {
      const next = new Set(prev);
      if (checked) next.add(league); else next.delete(league);
      return next;
    });
  }

  function selectHot() {
    setSelectedLeagues(new Set(allLeagues.filter((l) => isHot(l))));
  }

  function selectAll() {
    setSelectedLeagues(new Set(allLeagues));
  }

  function selectNone() {
    setSelectedLeagues(new Set());
  }

  /* ══════════════════ Single Analysis ══════════════════ */
  async function handleAnalysis(matchId: string, silent: boolean): Promise<AnalysisResult | null> {
    if (!matchId || isNaN(Number(matchId))) {
      if (!silent) print('<span class="text-amber-400">[提示] ID 無效。</span>');
      return null;
    }
    if (!silent) {
      print(`<span class="text-cyan-400">[分析] 獲取 ${matchId} 賠率<span class="loading"></span></span>`);
    }

    W.game = undefined;
    W.hometeam_cn = undefined;
    W.guestteam_cn = undefined;
    W.matchname_cn = undefined;

    try {
      try {
        await injectScript(`https://1x2.nowscore.com/${matchId}.js`);
      } catch {
        try {
          await injectScript(`https://1x2d.nowscore.com/${matchId}.js`);
        } catch {
          throw new Error("腳本下載被擋");
        }
      }
      if (!W.game) throw new Error("無賠率數據");
    } catch (err: any) {
      if (!silent) print(`<span class="text-red-500 text-xs">[錯誤] ${matchId}: ${err.message}</span>`);
      return null;
    }

    const result = processQuant(matchId);
    if (!result) {
      if (!silent) {
        const diag = (W as any).__diag;
        if (diag) {
          print(`<span class="text-red-500 text-xs font-bold">[診斷] ${matchId} — 原始:${diag.raw} | 跳過:${diag.skip} | 賠率異常:${diag.badOdds} | 返還淘汰:${diag.marginFail}</span>`);
        } else {
          print(`<span class="text-red-500 text-xs">[警告] ${matchId} 數據異常。</span>`);
        }
      }
      return null;
    }
    if (!silent) print(result.htmlOutput);
    return result;
  }

  /* ══════════════════ League Scan ══════════════════ */
  async function handleLeagueScan(league: string) {
    if (scanRef.current) return;
    const list = leagueGroups[league];
    if (!list?.length) return;

    scanRef.current = true;
    setIsScanning(true);
    print(`<span class="text-amber-400 font-bold bg-amber-950/30 px-2 py-1 rounded">🚀 聯賽掃描: 【${league}】 ${list.length} 場</span>`);
    let found = 0;

    for (let i = 0; i < list.length; i++) {
      if (!scanRef.current) break;
      const match = list[i];
      setScanProgress({ current: i + 1, total: list.length, label: `${match.home} vs ${match.away}` });
      const r = await handleAnalysis(match.id, true);
      if (r) {
        found++;
        print(r.htmlOutput);
      }
      await new Promise((r) => setTimeout(r, 800));
    }

    scanRef.current = false;
    setIsScanning(false);
    setScanProgress(null);
    print(`<span class="text-cyan-400 font-bold">✅【${league}】掃描完成，解析 ${found} 場。</span>`);
  }

  /* ══════════════════ Slicer Logic ══════════════════ */
  const slicerResult = useMemo(() => {
    const rules = V17_RULES[slTarget];
    if (!rules) return null;

    const golden: typeof rules.GOLDEN = [];
    const traps: typeof rules.TRAPS = [];

    const check = (type: string, val: string) => {
      const g = rules.GOLDEN.find((r) => r.type === type && r.val === val);
      if (g) golden.push(g);
      const t = rules.TRAPS.find((r) => r.type === type && r.val === val);
      if (t) traps.push(t);
    };

    check("Fav", slFav);
    check("Pat_L", slPatL);
    check("Pat_M", slPatM);
    check("Cross", slCross);

    return { golden, traps };
  }, [slTarget, slFav, slCross, slPatL, slPatM]);

  /* ══════════════════ RENDER ══════════════════ */
  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-200">
      {/* BG */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(34,211,238,0.08),transparent)]" />
        <div className="absolute inset-0 bg-grid" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1800px] flex-col gap-3 p-2 xl:p-4 h-screen">
        {/* ═══ Header ═══ */}
        <header className="glass flex items-center justify-between rounded-2xl border border-white/[0.06] px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-base font-black text-cyan-400">◆</div>
            <div>
              <h1 className="text-sm font-bold text-white">Smart Money V29</h1>
              <p className="text-[10px] text-slate-500">V13 概率模型 + EV 1.0 + 出手判定</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {filteredMatches.length > 0 && (
              <span className="hidden md:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {filteredMatches.length} 場就緒
              </span>
            )}
            {isScanning && (
              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] text-amber-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                掃描中
              </span>
            )}
          </div>
        </header>

        {/* ═══ Main Grid ═══ */}
        <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-4">
          {/* ─── LEFT COL ─── */}
          <div className="flex flex-col gap-3 overflow-hidden lg:col-span-1">
            {/* Controls */}
            <div className="glass rounded-xl border border-white/[0.06] p-3 shrink-0">
              <div className="relative">
                <div className="absolute left-0 top-0 h-full w-[3px] rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]" />
                <div className="pl-3">
                  <div className="flex gap-2">
                    <input
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAnalysis(manualId, false)}
                      placeholder="輸入單場 ID (如 2789475)"
                      className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/30"
                    />
                    <button
                      onClick={() => handleAnalysis(manualId, false)}
                      className="rounded-lg bg-cyan-600 px-4 py-1.5 text-sm font-bold text-white shadow-[0_0_8px_rgba(6,182,212,0.3)] transition hover:bg-cyan-500"
                    >
                      狙擊
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 1 + League Filter */}
            <div className="glass rounded-xl border border-white/[0.06] p-3 shrink-0 flex flex-col">
              <button
                onClick={handleFetchLeagues}
                disabled={isLoading}
                className="w-full rounded-lg border border-indigo-500/25 bg-indigo-500/10 py-2 text-sm font-bold text-indigo-300 shadow-[0_0_10px_rgba(79,70,229,0.2)] transition hover:bg-indigo-500/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>連線中<span className="loading" /></span>
                ) : step1Done ? (
                  `✅ STEP 1: ${rawMatches.length} 場已載入`
                ) : (
                  "[STEP 1] 獲取今日聯賽"
                )}
              </button>

              {step1Done && (
                <div className="mt-3 flex flex-col">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-400">📋 篩選聯賽</span>
                    <div className="flex gap-1">
                      <button onClick={selectHot} className="rounded border border-amber-700/50 bg-amber-900/40 px-1.5 py-0.5 text-[10px] text-amber-500 hover:bg-amber-800 hover:text-white">🔥 熱門</button>
                      <button onClick={selectAll} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700 hover:text-white">全選</button>
                      <button onClick={selectNone} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700 hover:text-white">清空</button>
                    </div>
                  </div>
                  <div className="scroll-styled mb-3 grid max-h-28 grid-cols-3 gap-1.5 overflow-y-auto rounded border border-slate-800 bg-slate-950 p-1.5 text-[10px]">
                    {allLeagues.map((l) => (
                      <label key={l} className="flex items-center gap-1 cursor-pointer" title={l}>
                        <input
                          type="checkbox"
                          checked={selectedLeagues.has(l)}
                          onChange={(e) => toggleLeague(l, e.target.checked)}
                          className="h-3 w-3 rounded border-slate-700 bg-slate-900 text-cyan-500"
                        />
                        <span className={`truncate ${isHot(l) ? "font-bold text-amber-400" : "text-slate-500"}`}>{l}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={handleRenderRadar}
                    className="w-full rounded-lg border border-emerald-500/25 bg-emerald-500/10 py-2 text-sm font-bold text-emerald-400 transition hover:bg-emerald-500/20"
                  >
                    [STEP 2] 渲染選定聯賽雷達
                  </button>
                </div>
              )}
            </div>

            {/* Scan progress */}
            {scanProgress && (
              <div className="glass rounded-xl border border-amber-500/15 p-3 shrink-0">
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-amber-400">{scanProgress.current}/{scanProgress.total}</span>
                  <span className="truncate text-slate-500">{scanProgress.label}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500" style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }} />
                </div>
              </div>
            )}

            {/* Radar List */}
            <div className="glass flex-1 overflow-hidden rounded-xl border border-white/[0.06]">
              <div className="scroll-styled h-full overflow-y-auto p-2">
                {filteredMatches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-slate-600">
                    <svg className="mb-2 h-7 w-7 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79" />
                    </svg>
                    請先執行 STEP 1 + STEP 2
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* League scan buttons */}
                    <div className="flex flex-wrap gap-1 pb-2 border-b border-slate-800/50">
                      {lgEntries.map(([lg, list]) => (
                        <button
                          key={lg}
                          onClick={() => handleLeagueScan(lg)}
                          disabled={isScanning}
                          className={`rounded border px-2 py-1 text-[10px] font-bold transition ${
                            isHot(lg)
                              ? "border-amber-700/50 bg-amber-900/40 text-amber-500 hover:bg-amber-800"
                              : "border-slate-700 bg-slate-800 text-emerald-400 hover:bg-emerald-800"
                          } disabled:opacity-40`}
                        >
                          {lg} ({list.length})
                        </button>
                      ))}
                    </div>
                    {/* Match cards */}
                    {filteredMatches.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleAnalysis(m.id, false)}
                        className="match-row group w-full rounded-lg border border-slate-800 bg-transparent p-2 text-left transition-all"
                      >
                        <div className="mb-1 flex items-center justify-between text-[10px]">
                          <span className={`rounded px-1 font-bold ${isHot(m.league) ? "text-amber-400" : "text-cyan-400"}`}>{m.league}</span>
                          <span className="font-bold text-amber-500">🕒 {m.time}</span>
                          <span className="text-slate-500 hover:text-white">ID:{m.id}</span>
                        </div>
                        <div className="flex items-center text-[12px] font-bold">
                          <span className="flex-1 truncate text-right text-slate-200 group-hover:text-white">{m.home}</span>
                          <span className="mx-1.5 text-[10px] text-slate-600">VS</span>
                          <span className="flex-1 truncate text-left text-cyan-200 group-hover:text-white">{m.away}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── MIDDLE: Terminal ─── */}
          <div className={`glass flex flex-col overflow-hidden rounded-xl border border-white/[0.06] transition-all duration-500 ${slicerOpen ? "lg:col-span-2" : "lg:col-span-3"}`}>
            {/* Title bar */}
            <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </div>
                <span className="font-mono text-[10px] text-slate-600">smart-money ~ core_v29 · 最新置頂 ↓</span>
              </div>
              <button onClick={clearConsole} className="rounded border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-500 hover:bg-white/[0.06] hover:text-slate-300">
                清空
              </button>
            </div>

            {/* Console body */}
            <div ref={consoleRef} className="terminal-body scroll-styled flex-1 overflow-y-auto px-3 py-2 font-mono text-[12px] leading-relaxed">
              {lines.map((html, i) => (
                <div key={i} dangerouslySetInnerHTML={{ __html: html }} />
              ))}
              {lines.length <= BOOT_LINES.length && (
                <div className="mt-4 text-center text-[11px] font-bold tracking-widest text-slate-700 opacity-50">
                  === 系統已切換至 V29 終極純淨連線模式 ===
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT: Slicer ─── */}
          <div className={`glass flex flex-col overflow-hidden rounded-xl border border-white/[0.06] transition-all duration-500 ${slicerOpen ? "lg:col-span-1" : "lg:col-span-0 lg:w-12"}`}>
            {/* Slicer header */}
            <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-2 shrink-0">
              {slicerOpen ? (
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                  <span className="text-[12px] font-bold tracking-widest text-white">微觀特徵切片器</span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-600">切片器</span>
              )}
              <button
                onClick={() => setSlicerOpen(!slicerOpen)}
                className="rounded border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-400 hover:bg-white/[0.06] hover:text-white"
              >
                {slicerOpen ? "隱藏 ➔" : "➕"}
              </button>
            </div>

            {slicerOpen && (
              <div className="flex flex-col h-full overflow-hidden p-3">
                <div className="mb-3 rounded border border-slate-800 bg-slate-900 p-2 text-[10px] text-slate-400 shrink-0">
                  結合終端的 <span className="text-cyan-400">ML 目標</span>，手動校準莊家亞盤軌跡達成確認。
                </div>

                {/* Slicer inputs */}
                <div className="flex flex-col gap-2.5 shrink-0">
                  <div>
                    <label className="mb-0.5 block text-[10px] text-slate-500">1. ML 模型預測目標</label>
                    <select value={slTarget} onChange={(e) => setSlTarget(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm font-bold text-cyan-400 outline-none focus:border-cyan-500">
                      <option value="HOME">買主勝</option>
                      <option value="DRAW">買和局</option>
                      <option value="AWAY">買客勝</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] text-slate-500">2. 強隊情境</label>
                      <select value={slFav} onChange={(e) => setSlFav(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm font-bold text-purple-400 outline-none">
                        <option value="Home">主隊是強隊</option>
                        <option value="Away">客隊是強隊</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-slate-500">3. 雙向交叉矩陣</label>
                      <select value={slCross} onChange={(e) => setSlCross(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm font-bold text-white outline-none">
                        <option value="++++">++++</option>
                        <option value="----">----</option>
                        <option value="++--">++--</option>
                        <option value="--++">--++</option>
                        <option value="-+--">-+--</option>
                        <option value="-+++">-+++</option>
                        <option value="+---">+---</option>
                        <option value="++-+">++-+</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] text-slate-500">4. 主隊軌跡 (Pat_L)</label>
                      <select value={slPatL} onChange={(e) => setSlPatL(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm font-bold text-white outline-none">
                        <option value="順階梯">順階梯</option>
                        <option value="反階梯">反階梯</option>
                        <option value="凹陷誘盤">凹陷誘盤</option>
                        <option value="雙峰擠壓">雙峰擠壓</option>
                        <option value="缺失">缺失</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-slate-500">5. 客隊軌跡 (Pat_M)</label>
                      <select value={slPatM} onChange={(e) => setSlPatM(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm font-bold text-white outline-none">
                        <option value="A&lt;B&lt;C">{"A<B<C"}</option>
                        <option value="A&gt;B&gt;C">{"A>B>C"}</option>
                        <option value="A&gt;B&lt;C">{"A>B<C"}</option>
                        <option value="A&lt;B&gt;C">{"A<B>C"}</option>
                        <option value="缺失">缺失</option>
                        <option value="無序">無序</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Slicer result */}
                <div className="mt-3 flex-1 overflow-y-auto rounded border border-slate-800 bg-slate-950 p-3 scroll-styled">
                  {slicerResult && (slicerResult.golden.length > 0 || slicerResult.traps.length > 0) ? (
                    <div className="flex flex-col h-full">
                      {slicerResult.traps.length > 0 && (
                        <div className="mb-2 rounded border border-red-900/50 bg-red-950/40 p-2">
                          <div className="mb-1 text-[11px] font-bold text-red-400">❌ 觸發誘盤死穴</div>
                          {slicerResult.traps.map((t, i) => (
                            <div key={i} className="flex items-center justify-between border-t border-red-900/30 pt-1 text-[10px] mt-1 first:mt-0 first:border-0 first:pt-0">
                              <span className="text-slate-300">
                                <span className="mr-1 rounded bg-red-900/60 px-1">{t.val}</span>{t.desc}
                              </span>
                              <span className="font-mono font-bold text-red-400">{t.roi}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {slicerResult.golden.length > 0 && (
                        <div className="mb-2 rounded border border-emerald-900/50 bg-emerald-950/40 p-2">
                          <div className="mb-1 text-[11px] font-bold text-emerald-400">⭐ 觸發印鈔綠燈</div>
                          {slicerResult.golden.map((g, i) => (
                            <div key={i} className="flex items-center justify-between border-t border-emerald-900/30 pt-1 text-[10px] mt-1 first:mt-0 first:border-0 first:pt-0">
                              <span className="text-slate-300">
                                <span className="mr-1 rounded bg-emerald-900/60 px-1">{g.val}</span>{g.desc}
                              </span>
                              <span className="font-mono font-bold text-emerald-400">{g.roi}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action */}
                      <div className="mt-auto border-t border-slate-800 pt-3 text-center">
                        {slicerResult.traps.length > 0 ? (
                          <div className="text-xl font-black text-red-500">🚫 堅決放棄 (BLOCK)</div>
                        ) : slicerResult.golden.length >= 2 ? (
                          <div className="animate-pulse text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">🚀 雙重確認！滿倉出擊</div>
                        ) : slicerResult.golden.length === 1 ? (
                          <div className="text-xl font-black text-emerald-400">✅ 允許執行 (EXECUTE)</div>
                        ) : (
                          <div className="text-lg font-black text-slate-500">⏳ 觀望 (NO SIGNAL)</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-[11px] text-slate-500">
                      此組合在歷史回測中<br />無顯著偏差
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
