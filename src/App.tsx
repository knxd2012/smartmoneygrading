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
  '<span class="text-pink-400 font-bold">========================================</span>',
  '<span class="text-cyan-400 font-bold">  Smart Money V29 (Time-Series Edition) </span>',
  '<span class="text-slate-500"> 載入: V13 核心 + EV 1.0 + Point-in-Time 時序邏輯 </span>',
  '<span class="text-slate-500"> 狀態: 等待指令...</span>',
  '<span class="text-pink-400 font-bold">========================================</span>',
];

// --- V17 Slicer Rules ---
const V17_RULES: Record<string, { GOLDEN: { type: string; val: string; roi: string; desc: string }[]; TRAPS: { type: string; val: string; roi: string; desc: string }[] }> = {
  HOME: {
    GOLDEN: [
      { type:"Pat_L", val:"持續降賠", roi:"+13.0%", desc:"平穩下壓，資金認可" },
      { type:"Pat_L", val:"深V洗盤", roi:"+8.7%", desc:"早盤誘空，臨場暴力回升" },
      { type:"Pat_L", val:"階梯式降", roi:"+5.4%", desc:"多節點阻力突破" },
      { type:"Pat_M", val:"晚期加速", roi:"+8.7%", desc:"最後一小時資金湧入" },
      { type:"Pat_M", val:"A<B<C", roi:"+6.9%", desc:"連續三個時間切片支持" },
      { type:"Pat_M", val:"A>B<C", roi:"+6.0%", desc:"中期洗盤後表態" },
      { type:"Cross", val:"-+++", roi:"+21.1%", desc:"強烈反轉信號" },
      { type:"Cross", val:"+---", roi:"+18.0%", desc:"假象破裂" },
      { type:"Cross", val:"++-+", roi:"+12.7%", desc:"震盪上行" },
      { type:"Fav", val:"Away", roi:"+6.4%", desc:"冷門主勝狙擊" },
    ],
    TRAPS: [
      { type:"Pat_M", val:"A>B>C", roi:"-0.6%", desc:"持續走弱 (放棄)" },
      { type:"Cross", val:"-+--", roi:"-2.1%", desc:"假突破誘盤" },
      { type:"Cross", val:"++--", roi:"-4.9%", desc:"動能衰退" },
    ],
  },
  DRAW: {
    GOLDEN: [
      { type:"Pat_L", val:"持續降賠", roi:"+11.2%", desc:"莊家強力防範和局" },
      { type:"Pat_L", val:"倒V型", roi:"+6.7%", desc:"雙向誘盤後收斂" },
      { type:"Pat_M", val:"A>B<C", roi:"+10.8%", desc:"中期主客分歧最大" },
      { type:"Pat_M", val:"A>B>C", roi:"+7.9%", desc:"平局熱度持續降溫" },
      { type:"Cross", val:"----", roi:"+22.0%", desc:"極端防範" },
      { type:"Fav", val:"Home", roi:"+10.1%", desc:"強隊無力讓球" },
    ],
    TRAPS: [
      { type:"Pat_L", val:"深V洗盤", roi:"-11.8%", desc:"假和局誘盤" },
      { type:"Pat_M", val:"晚期加速", roi:"-11.8%", desc:"臨場和局熱度過高" },
      { type:"Cross", val:"++++", roi:"-17.1%", desc:"絕對誘盤" },
      { type:"Cross", val:"++--", roi:"-17.1%", desc:"半場動能消失" },
      { type:"Fav", val:"Away", roi:"-20.4%", desc:"客場強勢不放水" },
    ],
  },
  AWAY: {
    GOLDEN: [
      { type:"Pat_L", val:"倒V型", roi:"+16.6%", desc:"主隊誘盤失敗" },
      { type:"Pat_L", val:"深V洗盤", roi:"+16.5%", desc:"客勝強勢洗盤" },
      { type:"Pat_L", val:"階梯式降", roi:"+15.0%", desc:"聰明錢持續建倉" },
      { type:"Pat_L", val:"末期暴跳", roi:"+10.3%", desc:"首發名單引發錯價" },
      { type:"Pat_L", val:"持續降賠", roi:"+8.1%", desc:"平穩壓制" },
      { type:"Pat_M", val:"A>B<C", roi:"+17.8%", desc:"中期洗盤" },
      { type:"Pat_M", val:"晚期加速", roi:"+10.3%", desc:"臨場T-1h絕殺" },
      { type:"Pat_M", val:"A<B<C", roi:"+10.3%", desc:"連續三切片支持" },
      { type:"Pat_M", val:"A<B>C", roi:"+9.8%", desc:"中期假高潮" },
      { type:"Cross", val:"--++", roi:"+49.7%", desc:"極端神仙盤" },
      { type:"Cross", val:"-+++", roi:"+43.1%", desc:"反轉動能最強" },
      { type:"Cross", val:"++--", roi:"+13.7%", desc:"動能衰退仍具價值" },
      { type:"Cross", val:"----", roi:"+12.1%", desc:"全市場共識" },
      { type:"Cross", val:"++++", roi:"+10.7%", desc:"高賠冷門突襲" },
      { type:"Fav", val:"Home", roi:"+16.6%", desc:"頂級下盤提款機" },
      { type:"Fav", val:"Away", roi:"+10.2%", desc:"正路客勝" },
    ],
    TRAPS: [
      { type:"Pat_M", val:"早期死水", roi:"-1.3%", desc:"缺乏資金關注" },
      { type:"Cross", val:"++-+", roi:"-6.3%", desc:"動能雜亂" },
    ],
  },
};

// --- Utilities ---
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

// =====================================================================
// QUANTITATIVE PROCESSING (V13 + EV + TIME-SERIES LOGIC)
// =====================================================================
function processQuant(matchId: string, matchInfo?: MatchInfo): AnalysisResult | null {
  const league = matchInfo?.league || W.matchname_cn || W.matchname || "未知賽事";
  const homeTeam = matchInfo?.home || W.hometeam_cn || W.hometeam || "主隊";
  const awayTeam = matchInfo?.away || W.guestteam_cn || W.guestteam || "客隊";
  
  const rawGame: string[] = W.game;
  if (!rawGame || !Array.isArray(rawGame)) return null;
  const rawTotal = rawGame.length;

  // [NEW] Time-Series Extraction (T-Xh)
  let timeLabel = "未知時間";
  let isGoldenWindow = false;
  let isValueDestroyed = false;
  let diffHours = -1;

  if (matchInfo?.time) {
    const [mh, mm] = matchInfo.time.split(":").map(Number);
    if (!isNaN(mh) && !isNaN(mm)) {
      const now = new Date();
      const kDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), mh, mm, 0);
      // 如果開賽時間比現在早 4 小時以上，代表我們是在掃描「明天凌晨」的未開賽比賽
      if (kDate.getTime() < now.getTime() - 4 * 3600000) {
        kDate.setDate(kDate.getDate() + 1);
      }
      diffHours = (kDate.getTime() - now.getTime()) / 3600000;

      if (diffHours >= 0) {
        timeLabel = `T-${diffHours.toFixed(1)}h`;
        if (diffHours <= 3 && diffHours >= 1) isGoldenWindow = true; // 黃金視角 T-3h ~ T-1h
        if (diffHours < 0.5) isValueDestroyed = true; // < 30 mins 價值毀滅
      } else {
        timeLabel = `已開賽/結束`;
      }
    }
  }

  // 1. Parse Bookies
  type OP = { h: number; d: number; a: number; ts: number };
  const bookies: Record<string, OP[]> = {};
  let latestTs = 0;
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

  // 2. Pinnacle tracking
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

  // 3. Shift Calculation
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

  let targetKey: "h" | "d" | "a" = "h";
  let targetShift = avgSH;
  if (avgSD > targetShift) { targetKey = "d"; targetShift = avgSD; }
  if (avgSA > targetShift) { targetKey = "a"; targetShift = avgSA; }

  const tOpen = avgO[targetKey];
  const tClose = avgC[targetKey];
  const targetName = targetKey === "h" ? `主勝 : ${homeTeam}` : targetKey === "a" ? `客勝 : ${awayTeam}` : "和局 (Draw)";
  const mlColor = targetKey === "h" ? "text-yellow-400" : targetKey === "a" ? "text-cyan-400" : "text-slate-400";
  const macroTarget = targetKey === "h" ? "HOME" : targetKey === "a" ? "AWAY" : "DRAW";

  let pinnShiftH = 0, pinnShiftD = 0, pinnShiftA = 0;
  let pinnFound = false;
  let pinnTarget = "";
  
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
      pinnTarget = "HOME";
      let pinnTargetShift = pinnShiftH;
      if (pinnShiftD > pinnTargetShift) { pinnTarget = "DRAW"; pinnTargetShift = pinnShiftD; }
      if (pinnShiftA > pinnTargetShift) { pinnTarget = "AWAY"; pinnTargetShift = pinnShiftA; }
      break;
    }
  }

  // 4. V13 Scoring
  const scoreShift = Math.min(40, Math.max(0, (targetShift / 3.5) * 40));
  const tProbs = probShifts[targetKey];
  const consensusCount = tProbs.filter((p) => p > 0.002).length;
  const consensusRate = consensusCount / numB;
  const scoreConsensus = Math.min(30, Math.max(0, ((consensusRate - 0.5) / 0.35) * 30));
  const otherShifts = [avgSH, avgSD, avgSA].filter((_, i) => i !== ["h", "d", "a"].indexOf(targetKey));
  const otherAbsSum = Math.abs(otherShifts[0]) + Math.abs(otherShifts[1]);
  const dominanceRatio = targetShift / (otherAbsSum + 0.1);
  const scoreConcentration = Math.min(15, Math.max(0, ((dominanceRatio - 0.5) / 2.0) * 15));
  const oddsCompression = (tOpen - tClose) / tOpen;
  const scoreCompression = Math.min(15, Math.max(0, oddsCompression * 150));
  const totalScore = scoreShift + scoreConsensus + scoreConcentration + scoreCompression;

  // 5. EV 1.0
  const cMarginFinal = 1 / avgC.h + 1 / avgC.d + 1 / avgC.a;
  const impliedProb = (1 / tClose) / cMarginFinal;
  const edgeMult = 1 + (targetShift / 100) * (totalScore / 100);
  const ourProb = Math.min(0.95, impliedProb * edgeMult);
  const ev = ourProb * (tClose - 1) - (1 - ourProb);
  const evPct = ev * 100;

  const bOdds = tClose - 1;
  const kelly = bOdds > 0 ? (bOdds * ourProb - (1 - ourProb)) / bOdds : 0;
  const stake = Math.max(0, (kelly / 2) * 100);

  // [NEW] 6. Time-Series ML Action Strategy
  let tsActionLabel = "等待中 (Pass)";
  let tsActionClass = "text-slate-500 border-slate-800 bg-slate-900/50";
  let showStake = false;

  if (targetKey === "d") {
    // Rule 1: No-Draw Filter
    tsActionLabel = "⚠️ 模型封印: 放棄高雜訊和局 (Draw)";
    tsActionClass = "text-slate-500 border-slate-700/50 bg-slate-800/30";
  } else if (evPct > 3.0) {
    // Rule 2: > 3% Value Bet
    if (isGoldenWindow) {
      tsActionLabel = `🚀 黃金擊球區出擊: 鎖定 ${macroTarget} (+${evPct.toFixed(1)}%)`;
      tsActionClass = "text-emerald-400 border-emerald-500/50 bg-emerald-950/40 animate-pulse-glow";
      showStake = true;
    } else if (isValueDestroyed) {
      tsActionLabel = `⛔ 價值毀滅: 放棄 ${macroTarget} (臨場 Edge 已被買平)`;
      tsActionClass = "text-red-400 border-red-900/50 bg-red-950/40";
    } else if (diffHours > 3) {
      tsActionLabel = `⏳ 提早埋伏: ${macroTarget} 有潛力 (請等 T-3h 再來)`;
      tsActionClass = "text-blue-400 border-blue-900/50 bg-blue-950/40";
    } else {
      tsActionLabel = `⚡ 次級出手點: 鎖定 ${macroTarget} (+${evPct.toFixed(1)}%)`;
      tsActionClass = "text-amber-400 border-amber-500/50 bg-amber-950/40";
      showStake = true;
    }
  } else {
    // Under 3% edge
    tsActionLabel = `❌ 無套利空間 (Value < 3%)`;
  }

  // 7. Styling & HTML
  const stars = "★".repeat(Math.floor(totalScore / 20)) + "☆".repeat(5 - Math.floor(totalScore / 20));
  let level: string, levelClass: string, cardBorder: string;
  if (totalScore >= 75) {
    level = "S 級"; levelClass = "text-emerald-400";
    cardBorder = "border-emerald-600/40 shadow-[0_0_12px_rgba(34,197,94,0.15)]";
  } else if (totalScore >= 60) {
    level = "A 級"; levelClass = "text-cyan-400";
    cardBorder = "border-cyan-600/30 shadow-[0_0_8px_rgba(6,182,212,0.1)]";
  } else if (totalScore >= 45) {
    level = "B 級"; levelClass = "text-amber-400";
    cardBorder = "border-amber-700/30";
  } else {
    level = "C 級"; levelClass = "text-red-400";
    cardBorder = "border-slate-800 opacity-70";
  }

  const now = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  let html = `
    <div class="mb-3 bg-slate-950/80 rounded-xl border ${cardBorder} overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/[0.04]">
        <div class="text-[13px] text-slate-200">🚩 <b>${league}</b> | ${homeTeam} <span class="text-slate-600">vs</span> ${awayTeam}</div>
        <span class="text-[10px] text-slate-600 font-mono">${now} | ID:${matchId}</span>
      </div>
      <div class="p-3 space-y-3">
        <!-- V13 分析 -->
        <div class="text-[11px] leading-relaxed">
          <div class="font-bold text-slate-400 mb-1">🔍 V13 底層面板分數</div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-300">
            <div>賠率偏移 (40): <b>${scoreShift.toFixed(1)}</b></div>
            <div>莊家共識 (30): <b>${scoreConsensus.toFixed(1)}</b></div>
            <div>資金集中 (15): <b>${scoreConcentration.toFixed(1)}</b></div>
            <div>初盤壓縮 (15): <b>${scoreCompression.toFixed(1)}</b></div>
          </div>
          <div class="mt-1 text-slate-200">
            👉 總評: <span class="text-amber-400">${stars}</span> <b>${totalScore.toFixed(1)}</b>/100 | <span class="${levelClass} font-bold">${level}</span>
          </div>
        </div>

        <!-- ML Baseline (V22 Macro Shift) -->
        <div class="text-[11px] leading-relaxed">
          <div class="font-bold text-purple-400 mb-1">🧠 ML 基準特徵 (V22 Macro Shift)</div>
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
            ${pinnFound ? ` | Pinnacle: <b class="text-purple-400">${pinnTarget}</b> (h:${pinnShiftH > 0 ? '+' : ''}${pinnShiftH.toFixed(2)} d:${pinnShiftD > 0 ? '+' : ''}${pinnShiftD.toFixed(2)} a:${pinnShiftA > 0 ? '+' : ''}${pinnShiftA.toFixed(2)})` : ' | <span class="text-slate-600">Pinnacle 缺失</span>'}
          </div>
        </div>

        <!-- 🕒 時序策略 (Point-in-Time) [NEW] -->
        <div class="rounded-lg border ${tsActionClass} px-3 py-2 mt-2">
          <div class="flex justify-between items-center mb-1">
            <div class="text-[11px] font-bold text-slate-400">🕒 時序策略 (Point-in-Time)</div>
            <div class="text-[10px] font-bold px-1.5 py-0.5 rounded ${isGoldenWindow ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-slate-800 text-slate-400'}">${timeLabel}</div>
          </div>
          <div class="text-[14px] font-black">${tsActionLabel}</div>
          ${showStake ? `
            <div class="text-[11px] text-slate-300 mt-1.5 pt-1.5 border-t border-white/[0.05]">
               🎯 目標: <b class="${mlColor}">${targetName}</b>
               @ <b class="text-white">${tClose.toFixed(2)}</b>
               | 建議注碼: <b class="text-cyan-400">${stake.toFixed(1)}%</b>
            </div>
          ` : ''}
          ${(evPct <= 3.0 && targetKey !== "d") ? `
            <div class="text-[10px] opacity-60 mt-1 font-mono">
               *要求 >3% 邊際利潤 (目前 EV: ${evPct.toFixed(2)}%)
            </div>
          ` : ''}
        </div>

        <!-- 尾部狀態欄 -->
        <div class="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-500">
          <span class="bg-slate-800/60 px-1.5 py-0.5 rounded">原始:${rawTotal}</span>
          <span class="bg-slate-800/60 px-1.5 py-0.5 rounded">有效:${numB}</span>
          <span class="bg-slate-800/60 px-1.5 py-0.5 rounded">切片:${numB * 2}</span>
          <span class="bg-slate-800/60 px-1.5 py-0.5 rounded">共識:${(consensusRate * 100).toFixed(0)}%</span>
          <span class="bg-slate-800/60 px-1.5 py-0.5 rounded">極端值:+${targetShift.toFixed(1)}%</span>
          <button onclick="window.dispatchEvent(new CustomEvent('autofill-slicer',{detail:{target:'${macroTarget}',matchId:'${matchId}'}}))" class="bg-purple-900/40 text-purple-400 border border-purple-700/40 px-2 py-0.5 rounded hover:bg-purple-800 hover:text-white transition cursor-pointer">帶入切片刀</button>
        </div>
      </div>
    </div>`;

  return { score: totalScore, htmlOutput: html };
}

// =====================================================================
// REACT COMPONENT
// =====================================================================
export default function App() {
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
  const [slPatL, setSlPatL] = useState("持續降賠");
  const [slPatM, setSlPatM] = useState("A<B<C");

  const consoleRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef(false);

  // --- Console helpers ---
  const print = useCallback((html: string) => setLines((p) => [html, ...p]), []);
  const clearConsole = useCallback(() => setLines([...BOOT_LINES]), []);

  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = 0;
  }, [lines]);

  // --- Slicer Event ---
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.target) {
        setSlTarget(detail.target);
        print(`<span class="text-purple-400 text-xs">➡️ 已自動帶入: ${detail.target} (ID: ${detail.matchId || '?'})</span>`);
      }
    };
    window.addEventListener("autofill-slicer", handler);
    return () => window.removeEventListener("autofill-slicer", handler);
  }, [print]);

  const lgEntries = useMemo(() => Object.entries(leagueGroups), [leagueGroups]);

  // --- STEP 1: Fetch Leagues ---
  async function handleFetchLeagues() {
    setIsLoading(true);
    print('<span class="text-xs text-slate-500">[系統] DOM Script Injection 請求中...</span>');
    W.A = undefined;
    W.B = undefined;
    try {
      try {
        await injectScript("https://live.nowscore.com/data/bf.js");
      } catch {
        await injectScript("https://v.nowscore.com/data/bf.js");
      }
      if (!W.A) throw new Error("數據集 A 載入失敗");
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
      let tw = "未知";
      
      if (W.B && W.B[bIdx]) {
        const bVal = W.B[bIdx];
        const pB = Array.isArray(bVal) ? bVal : String(bVal).split(/[\^,]/);
        const ns = pB.filter((x: any) => typeof x === "string" && /[^\d.\-\s]/.test(x));
        tw = ns[1] || ns[0] || "未知";
      }

      const home = String(p[4] || p[5] || "").replace(/<[^>]+>/g, "").trim();
      const away = String(p[7] || p[8] || "").replace(/<[^>]+>/g, "").trim();
      const time = p.find((x: any) => typeof x === "string" && x.includes(":")) || "未知";

      if (home && away) {
        leagues.add(tw);
        matches.push({ id: mId, league: tw, home, away, time });
      }
    });

    setRawMatches(matches);
    const sorted = Array.from(leagues).sort();
    setAllLeagues(sorted);

    const hotSet = new Set(sorted.filter((l) => isHot(l)));
    setSelectedLeagues(hotSet);
    setStep1Done(true);
    print(`<span class="text-emerald-400 font-bold">✅ 成功讀取 ${matches.length} 場未開賽事，共 ${sorted.length} 個聯賽 (已預選 ${hotSet.size} 個熱門)</span>`);
    setIsLoading(false);
  }

  // --- STEP 2: Render Radar ---
  function handleRenderRadar() {
    if (selectedLeagues.size === 0) {
      alert("請至少選擇一個聯賽");
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
    print(`<span class="text-cyan-400 font-bold">📡 雷達鎖定 ${filtered.length} 場比賽，準備進行單點突破</span>`);
  }

  function toggleLeague(league: string, checked: boolean) {
    setSelectedLeagues((prev) => {
      const next = new Set(prev);
      if (checked) next.add(league); else next.delete(league);
      return next;
    });
  }

  function selectHot() { setSelectedLeagues(new Set(allLeagues.filter((l) => isHot(l)))); }
  function selectAll() { setSelectedLeagues(new Set(allLeagues)); }
  function selectNone() { setSelectedLeagues(new Set()); }

  // --- Single Analysis (Updated to pass MatchInfo) ---
  async function handleAnalysis(matchId: string, silent: boolean, matchInfo?: MatchInfo): Promise<AnalysisResult | null> {
    if (!matchId || isNaN(Number(matchId))) {
      if (!silent) print('<span class="text-amber-400">[警告] ID 格式錯誤</span>');
      return null;
    }
    if (!silent) {
      print(`<span class="text-cyan-400">[分析] 啟動引擎 ID: ${matchId} ... <span class="loading"></span></span>`);
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
          throw new Error("無法取得百家歐賠 JS");
        }
      }
      if (!W.game) throw new Error("無 game 陣列");
    } catch (err: any) {
      if (!silent) print(`<span class="text-red-500 text-xs">[失敗] ${matchId}: ${err.message}</span>`);
      return null;
    }

    const result = processQuant(matchId, matchInfo);

    if (!result) {
      if (!silent) {
        const diag = (W as any).__diag;
        if (diag) {
          print(`<span class="text-red-500 text-xs font-bold">[排除] ${matchId} 樣本數不足 (總:${diag.raw} | 殘缺:${diag.skip} | 壞值:${diag.badOdds} | 抽水過高:${diag.marginFail})</span>`);
        } else {
          print(`<span class="text-red-500 text-xs">[排除] ${matchId} 數據無法解析</span>`);
        }
      }
      return null;
    }

    if (!silent) print(result.htmlOutput);
    return result;
  }

  // --- League Scan ---
  async function handleLeagueScan(league: string) {
    if (scanRef.current) return;
    const list = leagueGroups[league];
    if (!list?.length) return;

    scanRef.current = true;
    setIsScanning(true);
    print(`<span class="text-amber-400 font-bold bg-amber-950/30 px-2 py-1 rounded">🚀 啟動 ${league} 批量掃描 (共 ${list.length} 場)</span>`);

    let found = 0;
    for (let i = 0; i < list.length; i++) {
      if (!scanRef.current) break;
      const match = list[i];
      setScanProgress({ current: i + 1, total: list.length, label: `${match.home} vs ${match.away}` });
      const r = await handleAnalysis(match.id, true, match);
      if (r) {
        found++;
        print(r.htmlOutput);
      }
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    scanRef.current = false;
    setIsScanning(false);
    setScanProgress(null);
    print(`<span class="text-cyan-400 font-bold">🏁 ${league} 掃描完畢，生成 ${found} 份報告</span>`);
  }

  // --- Slicer Logic ---
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

  // --- RENDER ---
  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-200">
      {/* BG */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(34,211,238,0.08),transparent)]" />
        <div className="absolute inset-0 bg-grid" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1800px] flex-col gap-3 p-2 xl:p-4 h-screen">
        {/* Header */}
        <header className="glass flex items-center justify-between rounded-2xl border border-white/[0.06] px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-base font-black text-cyan-400">⚡</div>
            <div>
              <h1 className="text-sm font-bold text-white">Smart Money V29</h1>
              <p className="text-[10px] text-slate-500">V13 核心 + EV 1.0 + Point-in-Time 時序邏輯</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {filteredMatches.length > 0 && (
              <span className="hidden md:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                監控中: {filteredMatches.length} 場
              </span>
            )}
            {isScanning && (
              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] text-amber-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                批量掃描中...
              </span>
            )}
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-4">
          
          {/* LEFT COL */}
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
                      onKeyDown={(e) => e.key === "Enter" && handleAnalysis(manualId, false, rawMatches.find(m => m.id === manualId))}
                      placeholder="手動輸入 ID (如 2789475)"
                      className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/30"
                    />
                    <button
                      onClick={() => handleAnalysis(manualId, false, rawMatches.find(m => m.id === manualId))}
                      className="rounded-lg bg-cyan-600 px-4 py-1.5 text-sm font-bold text-white shadow-[0_0_8px_rgba(6,182,212,0.3)] transition hover:bg-cyan-500"
                    >
                      強制介入
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
                  <span>加載中 <span className="loading" /></span>
                ) : step1Done ? (
                  `更新列表 (當前: ${rawMatches.length} 場)`
                ) : (
                  "[STEP 1] 抓取全網未開賽事"
                )}
              </button>

              {step1Done && (
                <div className="mt-3 flex flex-col">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-400">賽事過濾器</span>
                    <div className="flex gap-1">
                      <button onClick={selectHot} className="rounded border border-amber-700/50 bg-amber-900/40 px-1.5 py-0.5 text-[10px] text-amber-500 hover:bg-amber-800 hover:text-white">五大</button>
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
                    [STEP 2] 更新監控雷達
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
                        onClick={() => handleAnalysis(m.id, false, m)}
                        className="match-row group w-full rounded-lg border border-slate-800 bg-transparent p-2 text-left transition-all"
                      >
                        <div className="mb-1 flex items-center justify-between text-[10px]">
                          <span className={`rounded px-1 font-bold ${isHot(m.league) ? "text-amber-400" : "text-cyan-400"}`}>{m.league}</span>
                          <span className="font-bold text-amber-500">🕐 {m.time}</span>
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

          {/* MIDDLE: Terminal */}
          <div className={`glass flex flex-col overflow-hidden rounded-xl border border-white/[0.06] transition-all duration-500 ${slicerOpen ? "lg:col-span-2" : "lg:col-span-3"}`}>
            <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </div>
                <span className="font-mono text-[10px] text-slate-600">smart-money ~ core_v29 (Time-Series)</span>
              </div>
              <button onClick={clearConsole} className="rounded border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-500 hover:bg-white/[0.06] hover:text-slate-300">
                清空控制台
              </button>
            </div>
            
            <div ref={consoleRef} className="terminal-body scroll-styled flex-1 overflow-y-auto px-3 py-2 font-mono text-[12px] leading-relaxed">
              {lines.map((html, i) => (
                <div key={i} dangerouslySetInnerHTML={{ __html: html }} />
              ))}
              {lines.length <= BOOT_LINES.length && (
                <div className="mt-4 text-center text-[11px] font-bold tracking-widest text-slate-700 opacity-50">
                  === 等待接收 V29 訊號 ===
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Slicer */}
          <div className={`glass flex flex-col overflow-hidden rounded-xl border border-white/[0.06] transition-all duration-500 ${slicerOpen ? "lg:col-span-1" : "lg:col-span-0 lg:w-12"}`}>
            <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-2 shrink-0">
              {slicerOpen ? (
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                  <span className="text-[12px] font-bold tracking-widest text-white">切片手術刀</span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-600">展</span>
              )}
              <button
                onClick={() => setSlicerOpen(!slicerOpen)}
                className="rounded border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-400 hover:bg-white/[0.06] hover:text-white"
              >
                {slicerOpen ? "收起" : "開"}
              </button>
            </div>

            {slicerOpen && (
              <div className="flex flex-col h-full overflow-hidden p-3">
                <div className="mb-3 rounded border border-slate-800 bg-slate-900 p-2 text-[10px] text-slate-400 shrink-0">
                  💡 <span className="text-cyan-400">ML 時序切片</span>: 結合終端輸出的 Macro 特徵，手動判斷臨場動能。
                </div>

                {/* Slicer inputs */}
                <div className="flex flex-col gap-2.5 shrink-0">
                  <div>
                    <label className="mb-0.5 block text-[10px] text-slate-500">1. ML 預測目標</label>
                    <select value={slTarget} onChange={(e) => setSlTarget(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm font-bold text-cyan-400 outline-none focus:border-cyan-500">
                      <option value="HOME">HOME (主勝)</option>
                      <option value="DRAW">DRAW (和局)</option>
                      <option value="AWAY">AWAY (客勝)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] text-slate-500">2. 讓球方</label>
                      <select value={slFav} onChange={(e) => setSlFav(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm font-bold text-purple-400 outline-none">
                        <option value="Home">主讓 (Home)</option>
                        <option value="Away">客讓 (Away)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-slate-500">3. 宏觀交叉</label>
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
                      <label className="mb-0.5 block text-[10px] text-slate-500">4. 臨場型態 (Pat_L)</label>
                      <select value={slPatL} onChange={(e) => setSlPatL(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm font-bold text-white outline-none">
                        <option value="持續降賠">持續降賠</option>
                        <option value="深V洗盤">深V洗盤</option>
                        <option value="倒V型">倒V型</option>
                        <option value="階梯式降">階梯式降</option>
                        <option value="末期暴跳">末期暴跳</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-slate-500">5. 資金共識 (Pat_M)</label>
                      <select value={slPatM} onChange={(e) => setSlPatM(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm font-bold text-white outline-none">
                        <option value="A&lt;B&lt;C">{"A<B<C"}</option>
                        <option value="A&gt;B&gt;C">{"A>B>C"}</option>
                        <option value="A&gt;B&lt;C">{"A>B<C"}</option>
                        <option value="A&lt;B&gt;C">{"A<B>C"}</option>
                        <option value="晚期加速">晚期加速</option>
                        <option value="早期死水">早期死水</option>
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
                          <div className="mb-1 text-[11px] font-bold text-red-400">⚠️ 觸發陷阱特徵 (TRAPS)</div>
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
                          <div className="mb-1 text-[11px] font-bold text-emerald-400">💎 觸發黃金特徵 (GOLDEN)</div>
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

                      <div className="mt-auto border-t border-slate-800 pt-3 text-center">
                        {slicerResult.traps.length > 0 ? (
                          <div className="text-xl font-black text-red-500">🚫 堅決放棄 (BLOCK)</div>
                        ) : slicerResult.golden.length >= 2 ? (
                          <div className="animate-pulse text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">🔥 完美契合 (ALL-IN)</div>
                        ) : slicerResult.golden.length === 1 ? (
                          <div className="text-xl font-black text-emerald-400">✅ 條件吻合 (EXECUTE)</div>
                        ) : (
                          <div className="text-lg font-black text-slate-500">⚪ 無明顯特徵 (NO SIGNAL)</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-[11px] text-slate-500">
                      尚未觸發任何時序規則 <br /> 請調整上方參數
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
