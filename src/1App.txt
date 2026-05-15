import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ──────────────────────────── Types ──────────────────────────── */
type MatchInfo = { id: string; league: string; home: string; away: string; time: string };
type ScanProgress = { current: number; total: number; label: string };
type AnalysisResult = { score: number; htmlOutput: string };

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = window as any;

/* ──────────────────────── Constants ──────────────────────────── */
const HOT_LEAGUES = [
  "英超","西甲","德甲","意甲","法甲","歐冠","歐霸","歐協聯","歐洲聯賽",
  "英冠","英甲","西乙","德乙","法乙","英足總","英聯盃","國王盃", "俄盃", "巴聖女聯", 
  "荷甲","葡超","蘇超","俄超","比甲","挪超","瑞典超","芬超", "美冠聯", 
  "美職業","美職聯","巴西甲","阿甲","墨西超","智利甲","解放者杯","南美杯","自由盃", "沙地聯", "荷乙", 
  "日職聯","日職乙","日皇盃","韓K聯","韓職","澳超","澳洲甲","亞冠","亞洲盃","非洲盃","美洲盃",
  "世界盃","歐國聯",
];

const BOOT_LINES = [
  '<span class="text-pink-400 font-bold">========================================</span>',
  '<span class="text-cyan-400 font-bold">  Smart Money V33 (Edge AI + Regime Filter) </span>',
  '<span class="text-slate-500"> 載入: V13 核心 + 100樹五維模型 + T-1H 定案 </span>',
  '<span class="text-slate-500"> 狀態: 系統全功能就緒...</span>',
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
  if (HOT_LEAGUES.some((h) => league.includes(h))) return true;
  if (/(英|西|意|德|法|日|韓|澳|美|歐|世|智|非).*(盃|杯|足總|聯賽盃)/.test(league)) return true;
  return false;
}

// =====================================================================
// QUANTITATIVE PROCESSING (V33: 核心植入)
// =====================================================================
function processQuant(matchId: string, matchInfo?: MatchInfo): AnalysisResult | null {
  const league = matchInfo?.league || W.matchname_f || W.matchname || "未知賽事";
  const homeTeam = matchInfo?.home || W.hometeam_f || W.hometeam || "主隊";
  const awayTeam = matchInfo?.away || W.guestteam_f || W.guestteam || "客隊";
  
  const rawGame: string[] = W.game;
  if (!rawGame || !Array.isArray(rawGame)) return null;

  // 1. 精準時間解析 (保持 V33 邏輯)
  let kickoffTs = 0;
  const exactTimeStr = W.matchtime || W.MatchTime; 
  if (exactTimeStr && typeof exactTimeStr === "string") {
    const parts = exactTimeStr.split(",");
    if (parts.length >= 5) {
      const y = parseInt(parts[0]);
      const mParts = parts[1].split("-");
      const m = parseInt(mParts[0]) - (mParts.length > 1 ? parseInt(mParts[1]) : 0);
      const d = parseInt(parts[2]);
      const h = parseInt(parts[3]);
      const min = parseInt(parts[4]);
      const s = parts[5] ? parseInt(parts[5]) : 0;
      kickoffTs = new Date(Date.UTC(y, m, d, h, min, s)).getTime() / 1000;
    }
  }

  if (kickoffTs === 0 && matchInfo?.time) {
    const [mh, mm] = matchInfo.time.split(":").map(Number);
    if (!isNaN(mh) && !isNaN(mm)) {
      const now = new Date();
      const kDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), mh, mm, 0);
      if (kDate.getTime() < now.getTime() - 12 * 3600000) kDate.setDate(kDate.getDate() + 1);
      kickoffTs = kDate.getTime() / 1000;
    }
  }

  const T_MINUS_3H_TS = kickoffTs > 0 ? kickoffTs - (3 * 3600) : Date.now() / 1000;
  const T_MINUS_1H_TS = kickoffTs > 0 ? kickoffTs - (1 * 3600) : Date.now() / 1000;

  // 2. 數據清洗
  type OP = { h: number; d: number; a: number; ts: number };
  const bookies: Record<string, OP[]> = {};

  for (const item of rawGame) {
    const p = String(item).split("|");
    if (p.length < 13) continue;
    const bId = p[0];
    const oH = parseFloat(p[3]), oD = parseFloat(p[4]), oA = parseFloat(p[5]);
    const cH = parseFloat(p[10]), cD = parseFloat(p[11]), cA = parseFloat(p[12]);
    if ([oH, oD, oA, cH, cD, cA].some((v) => isNaN(v) || v <= 0)) continue;

    let lastTs = Date.now() / 1000;
    if (p[20]) {
      const dp = p[20].split(",");
      if (dp.length >= 3) {
        const parsed = new Date(parseInt(dp[0]), parseInt(dp[1].split("-")[0]) - 1, parseInt(dp[1].split("-")[1] || "1"), parseInt(dp[2]) || 0).getTime() / 1000;
        if (!isNaN(parsed)) lastTs = parsed;
      }
    }
    const oMargin = 1 / oH + 1 / oD + 1 / oA;
    if ((1 / oMargin) * 100 < 88) continue;
    bookies[bId] = [{ h: oH, d: oD, a: oA, ts: kickoffTs - (24 * 3600) }, { h: cH, d: cD, a: cA, ts: lastTs }];
  }

  const numB = Object.keys(bookies).length;
  if (numB === 0) return null;

  // 3. 特徵提取 (五維)
  const probShifts = { h: [] as number[], d: [] as number[], a: [] as number[] };
  const stabilityShifts = { h: [] as number[], d: [] as number[], a: [] as number[] };
  const avgT3 = { h: 0, d: 0, a: 0 }; 

  for (const bId in bookies) {
    const hist = bookies[bId];
    const o = hist[0];
    let snapshotT3 = hist[0], snapshotT1 = hist[0];
    for (const tick of hist) {
      if (tick.ts <= T_MINUS_3H_TS) snapshotT3 = tick;
      if (tick.ts <= T_MINUS_1H_TS) snapshotT1 = tick;
    }
    const oP = calcImpliedProb(o.h, o.d, o.a);
    const t3P = calcImpliedProb(snapshotT3.h, snapshotT3.d, snapshotT3.a);
    const t1P = calcImpliedProb(snapshotT1.h, snapshotT1.d, snapshotT1.a);
    probShifts.h.push(t3P.ph - oP.ph); probShifts.d.push(t3P.pd - oP.pd); probShifts.a.push(t3P.pa - oP.pa);
    stabilityShifts.h.push(t1P.ph - t3P.ph); stabilityShifts.d.push(t1P.pd - t3P.pd); stabilityShifts.a.push(t1P.pa - t3P.pa);
    avgT3.h += snapshotT3.h; avgT3.d += snapshotT3.d; avgT3.a += snapshotT3.a;
  }

  const avgSH = (probShifts.h.reduce((a, b) => a + b, 0) / numB) * 100;
  const avgSD = (probShifts.d.reduce((a, b) => a + b, 0) / numB) * 100;
  const avgSA = (probShifts.a.reduce((a, b) => a + b, 0) / numB) * 100;
  avgT3.h /= numB; avgT3.d /= numB; avgT3.a /= numB;

  let targetKey: "h" | "d" | "a" = "h";
  let targetShift = avgSH;
  if (avgSD > targetShift) { targetKey = "d"; targetShift = avgSD; }
  if (avgSA > targetShift) { targetKey = "a"; targetShift = avgSA; }

  const targetName = targetKey === "h" ? `主勝 : ${homeTeam}` : targetKey === "a" ? `客勝 : ${awayTeam}` : "和局 (Draw)";
  const mlColor = targetKey === "h" ? "text-yellow-400" : targetKey === "a" ? "text-cyan-400" : "text-slate-400";
  const macroTarget = targetKey === "h" ? "HOME" : targetKey === "a" ? "AWAY" : "DRAW";
  const targetT3Odds = avgT3[targetKey];
  const targetStabilityShift = (stabilityShifts[targetKey].reduce((a, b) => a + b, 0) / numB) * 100;

  // 4. ML 校正 (安全載入模式)
  const consensusRate = probShifts[targetKey].filter((p) => p > 0.002).length / numB; 
  const marginT3 = 1 / avgT3.h + 1 / avgT3.d + 1 / avgT3.a;
  const marketMarginPct = (marginT3 - 1) * 100;
  const impliedProbT3 = (1 / targetT3Odds) / marginT3; 

  const features = [consensusRate, targetShift, marketMarginPct, targetT3Odds, targetStabilityShift];
  
  let rawMLProb = impliedProbT3; 
  let isMLActive = false;
  // 安全檢查 W.predictML (避免 import 錯誤)
  const predictFunc = W.predictML || (W.default && W.default.predictML);
  if (typeof predictFunc === "function") {
    rawMLProb = predictFunc(features);
    isMLActive = true;
  }

  let ourProb = impliedProbT3; 
  const uncalibratedEV = rawMLProb * targetT3Odds - 1; 
  let appliedEdge = 0;

  if (isMLActive && uncalibratedEV > 0 && targetT3Odds <= 15.0 && consensusRate >= 0.60) {
     if (uncalibratedEV > 0.10 && targetShift >= 2.0) appliedEdge = 0.06;
     else if (uncalibratedEV > 0.05 && targetShift >= 1.0) appliedEdge = 0.03;
     else appliedEdge = 0.01;
     ourProb = impliedProbT3 * (1 + marketMarginPct / 100) + appliedEdge; 
  } else if (!isMLActive) {
     if (consensusRate >= 0.90 && targetShift >= 4.0) ourProb = impliedProbT3 * (1 + marketMarginPct / 100) + 0.05;
  }

  ourProb = Math.max(0.01, Math.min(0.95, ourProb));
  const evPct = (ourProb * targetT3Odds - 1) * 100;
  const bOdds = targetT3Odds - 1;
  const kelly = bOdds > 0 ? (bOdds * ourProb - (1 - ourProb)) / bOdds : 0;
  const stake = Math.max(0, (kelly / 4) * 100); 

  // 5. OOS 政體過濾 (您的 UI 習慣)
  const currentDiffHours = (kickoffTs - (Date.now()/1000)) / 3600;
  const favSide = avgT3.h < avgT3.a ? "h" : "a";
  const isFav = (targetKey === favSide);
  let timeStatusLabel = currentDiffHours > 3 ? `距離開賽 ${currentDiffHours.toFixed(1)}h` 
                      : currentDiffHours > 1 ? `等待 T-1H 平穩度驗證` 
                      : currentDiffHours > 0 ? `臨場 ${currentDiffHours.toFixed(1)}h (鎖定定案)` 
                      : `事後回測`;

  let tsActionLabel = "等待中 (Pass)";
  let tsActionClass = "text-slate-500 border-slate-800 bg-slate-900/50";
  let showStake = false;

  if (targetKey === "d") {
    tsActionLabel = "⚠️ 模型封印: 放棄和局"; tsActionClass = "text-slate-500 border-slate-700/50 bg-slate-800/30";
  } else if (!isFav && targetT3Odds >= 3.0) {
    tsActionLabel = `⛔ 放棄: 弱勢高賠陷阱 (${targetT3Odds.toFixed(2)})`; tsActionClass = "text-red-400 border-red-900/50 bg-red-950/40";
  } else if (targetT3Odds > 15.0) {
    tsActionLabel = `⛔ 放棄: 極端長波雜訊`; tsActionClass = "text-red-400 border-red-900/50 bg-red-950/40";
  } else if (evPct > 3.0) {
    const isS = (targetKey === 'a' && favSide === 'a' && targetT3Odds >= 2.0 && targetT3Odds <= 3.0) || 
                (targetKey === 'h' && favSide === 'h' && targetT3Odds >= 1.5 && targetT3Odds <= 3.0);
    tsActionLabel = isS ? `💎 S級金礦狙擊: ${macroTarget} (+${evPct.toFixed(1)}%)` : `🎯 A級狙擊確認: ${macroTarget} (+${evPct.toFixed(1)}%)`;
    tsActionClass = isS ? "text-yellow-400 border-yellow-500/80 bg-yellow-950/50 animate-pulse-glow" : "text-emerald-400 border-emerald-500/50 bg-emerald-950/40";
    showStake = true;
    if (currentDiffHours > 1.0) {
      tsActionLabel = `🔭 提早埋伏: ${macroTarget} (等待 T-1H)`;
      tsActionClass = "text-blue-400 border-blue-900/50 bg-blue-950/40";
      showStake = false;
    }
  } else if (evPct > 0) {
    tsActionLabel = `⚡ ML 觀察中: ${macroTarget} (+${evPct.toFixed(1)}%)`; tsActionClass = "text-amber-400 border-amber-900/50 bg-amber-950/40";
  } else {
    tsActionLabel = `❌ 莊家優勢: 無套利空間 (EV: ${evPct.toFixed(2)}%)`;
  }

  // Tooltip
  let tooltipHTML = "";
  if (evPct > 3.0 && targetKey !== "d" && targetT3Odds <= 15.0) {
    const isS = tsActionLabel.includes("S級");
    tooltipHTML = `
      <div class="absolute bottom-full left-0 mb-2 w-56 p-2.5 bg-slate-900 border ${isS ? 'border-yellow-600' : 'border-emerald-600'} rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50">
        <div class="text-[11px] font-bold ${isS ? 'text-yellow-400' : 'text-emerald-400'} mb-1 border-b border-white/10 pb-1">📊 OOS 盲測預期值 (${isS ? 'S級' : 'A級'})</div>
        <div class="text-[10px] text-slate-300 space-y-1">
          <div class="flex justify-between"><span>歷史勝率:</span> <b>${isS ? '58.7%' : '54.1%'}</b></div>
          <div class="flex justify-between"><span>預期 ROI:</span> <b>${isS ? '+18.1%' : '+5.6%'}</b></div>
          <div class="text-[8px] text-slate-500 mt-1">* 數據基於 3438 場 OOS 盲測</div>
        </div>
      </div>`;
  }

  const now = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  let html = `
    <div class="mb-3 bg-slate-950/80 rounded-xl border ${evPct > 3.0 && currentDiffHours <= 1.0 ? 'border-emerald-600/40 shadow-[0_0_12px_rgba(34,197,94,0.15)]' : 'border-slate-800'} overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/[0.04]">
        <div class="text-[13px] text-slate-200">🚩 <b>${league}</b> | ${homeTeam} <span class="text-slate-600">vs</span> ${awayTeam}</div>
        <span class="text-[10px] text-slate-600 font-mono">${now} | ID:${matchId}</span>
      </div>
      <div class="p-3 space-y-3">
        <div class="text-[11px]">
          <div class="font-bold flex justify-between items-center mb-1">
             <span class="${isMLActive ? 'text-purple-400' : 'text-slate-500'}">${isMLActive ? '🧠 Edge AI (V33 啟動)' : '⚠️ ML 模型未載入'}</span>
             <span class="text-slate-500 font-normal">抽水: ${marketMarginPct.toFixed(1)}%</span>
          </div>
          <div class="grid grid-cols-3 gap-1 text-center text-[10px] font-mono mb-1">
            <div class="rounded bg-slate-800/60 py-1">
              <div class="text-slate-500">t3_shift_h</div>
              <div class="${avgSH > 0 ? 'text-emerald-400' : 'text-red-400'} font-bold">${avgSH > 0 ? '+' : ''}${avgSH.toFixed(2)}%</div>
            </div>
            <div class="rounded bg-slate-800/60 py-1">
              <div class="text-slate-500">t3_shift_d</div>
              <div class="${avgSD > 0 ? 'text-emerald-400' : 'text-red-400'} font-bold">${avgSD > 0 ? '+' : ''}${avgSD.toFixed(2)}%</div>
            </div>
            <div class="rounded bg-slate-800/60 py-1">
              <div class="text-slate-500">t3_shift_a</div>
              <div class="${avgSA > 0 ? 'text-emerald-400' : 'text-red-400'} font-bold">${avgSA > 0 ? '+' : ''}${avgSA.toFixed(2)}%</div>
            </div>
          </div>
          <div class="text-slate-300 flex justify-between bg-slate-900/50 px-2 py-1 rounded border border-slate-800/50">
            <span>鎖定: <b class="${mlColor}">${macroTarget}</b></span>
            <span>共識: <b class="${consensusRate >= 0.75 ? 'text-emerald-400' : 'text-slate-300'}">${(consensusRate * 100).toFixed(0)}%</b></span>
            <span>勝率: <b class="${evPct > 0 ? 'text-emerald-400' : 'text-slate-400'}">${(ourProb * 100).toFixed(1)}%</b></span>
          </div>
        </div>
        <div class="rounded-lg border ${tsActionClass} px-3 py-2 mt-2 relative group">
          <div class="flex justify-between items-center mb-1 text-[11px]">
            <span class="text-slate-400 font-bold">🕒 狀態</span>
            <span class="bg-slate-800 px-1.5 rounded">${timeStatusLabel}</span>
          </div>
          <div class="text-[14px] font-black flex items-center gap-1">
            ${tsActionLabel} ${tooltipHTML ? '<span class="text-slate-500 text-[10px]">ⓘ</span>' : ''}
          </div>
          ${tooltipHTML}
          ${showStake ? `<div class="mt-2 pt-2 border-t border-white/5 text-[11px] text-slate-300">🎯 建議: <b>${targetName}</b> @ ${targetT3Odds.toFixed(2)} | Kelly: <b class="text-cyan-400">${stake.toFixed(1)}%</b></div>` : ''}
          <div class="mt-2 text-[9px] text-slate-500 italic">${currentDiffHours <= 1.0 ? '🔒 已過 T-1H 錨點，訊號鎖定定案' : '⏳ 等待開賽前 1 小時收集平穩度'}</div>
        </div>
      </div>
    </div>`;

  return { score: 100, htmlOutput: html };
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

  const [leagueSearch, setLeagueSearch] = useState("");
  const [step1Done, setStep1Done] = useState(false);
  const [lines, setLines] = useState<string[]>(BOOT_LINES);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [manualId, setManualId] = useState("");
  
  const [slicerOpen, setSlicerOpen] = useState(false);
  const [slTarget, setSlTarget] = useState("AWAY");
  const [slFav, setSlFav] = useState("Home");
  const [slCross, setSlCross] = useState("----");
  const [slPatL, setSlPatL] = useState("持續降賠");
  const [slPatM, setSlPatM] = useState("A<B<C");

  const consoleRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef(false);

  const print = useCallback((html: string) => setLines((p) => [html, ...p]), []);
  const clearConsole = useCallback(() => setLines([...BOOT_LINES]), []);

  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = 0;
  }, [lines]);

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

  async function handleAnalysis(matchId: string, silent: boolean, matchInfo?: MatchInfo): Promise<AnalysisResult | null> {
    if (!matchId || isNaN(Number(matchId))) {
      if (!silent) print('<span class="text-amber-400">[警告] ID 格式錯誤</span>');
      return null;
    }
    if (!silent) {
      print(`<span class="text-cyan-400">[分析] 啟動引擎 ID: ${matchId} ... <span class="loading"></span></span>`);
    }

    W.game = undefined;
    W.hometeam_f = undefined;
    W.guestteam_f = undefined;
    W.matchname_f = undefined;

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
        print(`<span class="text-red-500 text-xs">[排除] ${matchId} 數據無法解析或抽水過高</span>`);
      }
      return null;
    }

    if (!silent) print(result.htmlOutput);
    return result;
  }

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

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-200">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(34,211,238,0.08),transparent)]" />
        <div className="absolute inset-0 bg-grid" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1800px] flex-col gap-3 p-2 xl:p-4 h-screen">
        <header className="glass flex items-center justify-between rounded-2xl border border-white/[0.06] px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-base font-black text-cyan-400">⚡</div>
            <div>
              <h1 className="text-sm font-bold text-white">Smart Money V33</h1>
              <p className="text-[10px] text-slate-500">100樹五維模型 + OOS Regime Filter</p>
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

        <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-4">
          <div className="flex flex-col gap-3 overflow-hidden lg:col-span-1">
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
                      <button onClick={selectHot} className="rounded border border-amber-700/50 bg-amber-900/40 px-1.5 py-0.5 text-[10px] text-amber-500 hover:bg-amber-800 hover:text-white">主流+盃賽</button>
                      <button onClick={selectAll} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700 hover:text-white">全選</button>
                      <button onClick={selectNone} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700 hover:text-white">清空</button>
                    </div>
                  </div>
                  
                  <input
                    type="text"
                    placeholder="🔍 搜尋聯賽 (例如: 歐冠、日職、女足)"
                    value={leagueSearch}
                    onChange={(e) => setLeagueSearch(e.target.value)}
                    className="mb-2 w-full rounded border border-white/[0.08] bg-slate-900 px-2 py-1 text-[11px] text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
                  />
                  
                  <div className="scroll-styled mb-3 grid max-h-32 grid-cols-3 gap-1.5 overflow-y-auto rounded border border-slate-800 bg-slate-950 p-1.5 text-[10px]">
                    {allLeagues.filter(l => l.toLowerCase().includes(leagueSearch.toLowerCase())).map((l) => (
                      <label key={l} className="flex items-center gap-1 cursor-pointer" title={l}>
                        <input
                          type="checkbox"
                          checked={selectedLeagues.has(l)}
                          onChange={(e) => toggleLeague(l, e.target.checked)}
                          className="h-3 w-3 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 focus:ring-offset-0"
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

          <div className={`glass flex flex-col overflow-hidden rounded-xl border border-white/[0.06] transition-all duration-500 ${slicerOpen ? "lg:col-span-2" : "lg:col-span-3"}`}>
            <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </div>
                <span className="font-mono text-[10px] text-slate-600">smart-money ~ core_v33 (Edge AI)</span>
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
                  === 等待接收 V33 訊號 ===
                </div>
              )}
            </div>
          </div>

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