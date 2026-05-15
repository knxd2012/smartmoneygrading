import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// 💡 從 31維雙向狙擊手模型中引入概率計算
import { getProbabilities as getProbabilitiesT1 } from "./v36_tier1_sniper.js"; 

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
<<<<<<< HEAD
  "英冠","英甲","西乙","德乙","法乙","英足總","英聯盃","國王盃", "俄盃", "巴聖女聯", 
  "荷甲","葡超","蘇超","俄超","比甲","挪超","瑞典超","芬超", "美冠聯", 
  "美職業","美職聯","巴西甲","阿甲","墨西超","智利甲","解放者杯","南美杯","自由盃", "沙地聯", "荷乙", 
  "日職聯","日職乙","日皇盃","韓K聯","韓職","澳超","澳洲甲","亞冠","亞洲盃","非洲盃","美洲盃",
  "世界盃","歐國聯", "澳威超", "澳維超", "澳女聯", "澳昆超", "韓K2聯"
=======
  "英冠","英甲","西乙","德乙","意乙","法乙","英足總","英聯盃","國王盃",
  "荷甲","葡超","蘇超","土超","俄超","比甲","瑞士超","奧甲","丹麥超","挪超","瑞典超","芬超","波蘭超",
  "美職業","美職聯","巴西甲","巴甲","阿甲","墨西超","哥倫甲","智利甲","解放者杯","南美杯","自由盃",
  "日職聯","日職乙","日皇盃","韓K聯","韓職","澳超","澳洲甲","中超","亞冠","亞洲盃","非洲盃","美洲盃",
  "世界盃","國際友誼","歐國聯",
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
];

const BOOT_LINES = [
  '<span class="text-pink-400 font-bold">========================================</span>',
<<<<<<< HEAD
  '<span class="text-cyan-400 font-bold">  Smart Money V36.1 (Pro Dynamic EV Edition) </span>',
  '<span class="text-slate-500"> 載入: 扁平化 HDA 矩陣 + 全切片動能追蹤 </span>',
  '<span class="text-slate-500"> 狀態: 動態 EV 計算與自適應分層 (Adaptive Tiering) 已啟動...</span>',
  '<span class="text-pink-400 font-bold">========================================</span>',
];

const SHARP_BOOKIES = ['pinnacle', 'sbobet', 'singbet'];
const EURO_BOOKIES = ['bet365', 'william hill', 'bwin'];
const ASIA_BOOKIES = ['macauslot', 'crown', 'hk jockey club'];

/* ──────────────────────── V36 Pro 聯賽白名單 ──────────────────────── */
const CORE_TIER1 = [
  '英超', '西甲', '德甲', '意甲', '法甲', 
  '欧冠', '欧霸', '世界杯', '欧洲杯', '美洲杯', 
  '歐冠', '世界盃', '歐洲盃', '歐霸'
];

const SUMMER_TIER1_5 = [
  '葡超', '荷甲', '德乙', '西乙', 
  '日职联', '日职乙', '韩K联', '澳洲甲', '澳超', 
  '日職聯', '日職乙', '韓K聯', '韓職', 
  '俄超', '芬超', '阿甲', '智利甲', '英甲'
];

export function isTier1League(leagueName: string): boolean {
  if (!leagueName) return false;
  const allValidLeagues = [...CORE_TIER1, ...SUMMER_TIER1_5];
  return allValidLeagues.some(l => leagueName.includes(l));
}

// 💡 移除靜態 ROI 文字，專注於動作建議，真實 EV 由 processQuant 實時計算
// 💡 根據 40K 全樣本 ML 回測優化後的動作建議引擎
export function getActionAdvice(features: number[], leagueName: string) {
  const isT1 = isTier1League(leagueName);

  let probs = [0.33, 0.33, 0.33];
  try { probs = getProbabilitiesT1(features); } catch(e) { console.warn("Model fetch err", e); }
  const p_h = probs[0], p_d = probs[1], p_a = probs[2];

  // 提取主/客勝賠率跌幅特徵
  const h_mkt_drop = features[2] || 0; 
  const a_mkt_drop = features[22] || 0; 

  if (isT1) {
    // === T1 核心聯賽 ===
    if (p_d >= 0.38) return { action: 'BET_DRAW', p_h, p_d, p_a, message: `💎 頂級平局 [信心: ${(p_d * 100).toFixed(1)}%]` };
    if (p_d >= 0.34) return { action: 'BET_DRAW', p_h, p_d, p_a, message: `🔥 價值平局 [信心: ${(p_d * 100).toFixed(1)}%]` };
    if (p_a >= 0.45 && p_a > p_h) return { action: 'BET_AWAY', p_h, p_d, p_a, message: `💎 頂級客勝 [信心: ${(p_a * 100).toFixed(1)}%]` };
    if (p_a >= 0.38 && p_a > p_h) return { action: 'BET_AWAY', p_h, p_d, p_a, message: `💡 價值客勝 [信心: ${(p_a * 100).toFixed(1)}%]` };
    if (p_h >= 0.55 && p_h > p_a) return { action: 'BET_HOME', p_h, p_d, p_a, message: `🛡️ 正路主勝 [信心: ${(p_h * 100).toFixed(1)}%]` };
  } else {
    // === T2 野雞聯賽 (40K 樣本優化版) ===
    
    // 1. 平局金礦 (OOS ROI: +7.7% | 高頻率)
    if (p_d >= 0.35) {
      return { action: 'BET_DRAW', p_h, p_d, p_a, message: `🔥 野雞平局金礦 [信心: ${(p_d * 100).toFixed(1)}% | 高 EV 區間]` };
    }
    
    // 2. 主隊防禦 (OOS ROI: +4.6% | 資金不可退潮)
    if (p_h >= 0.50 && h_mkt_drop <= 0.00) {
      return { action: 'BET_HOME', p_h, p_d, p_a, message: `🛡️ 野雞主勝防禦 [信心: ${(p_h * 100).toFixed(1)}% | 資金未退潮]` };
    }
    
    // 3. 殘酷客勝陷阱 (OOS ROI: +34.3% | 嚴格要求 -5% 以上重砸)
    if (p_a >= 0.36 && a_mkt_drop <= -0.05) {
      return { action: 'BET_AWAY', p_h, p_d, p_a, message: `🚨 野雞資金砸盤 [跌幅: ${(a_mkt_drop * 100).toFixed(1)}% | 信心: ${(p_a * 100).toFixed(1)}%]` };
    }
  }

  // 其餘情況堅決不碰 (避免 T2 的高頻率無效損耗)
  return { action: 'NO_BET', p_h, p_d, p_a, message: `🚫 觀望迴避 (信心不足或落入莊家陷阱)` };
}

=======
  '<span class="text-cyan-400 font-bold">  Smart Money V29 (Time-Series Edition) </span>',
  '<span class="text-slate-500"> 載入: V13 核心 + EV 1.0 + Point-in-Time 時序邏輯 </span>',
  '<span class="text-slate-500"> 狀態: 等待指令...</span>',
  '<span class="text-pink-400 font-bold">========================================</span>',
];

>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
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
<<<<<<< HEAD
      { type:"Pat_L", val:"階梯式降", roi:"+15.0%", desc:"聰明錢持續建仓" },
=======
      { type:"Pat_L", val:"階梯式降", roi:"+15.0%", desc:"聰明錢持續建倉" },
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
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

<<<<<<< HEAD
const ASIAN_DICT: Record<string, any> = {
  N1: {
    OPEN: { AWAY: { "受让平手/半球":{t:67,w:53.73,r:34.54},"受让一球":{t:29,w:79.31,r:27.73},"受让一球/球半":{t:19,w:78.95,r:7.17},"受让半球":{t:48,w:54.17,r:6.84},"受让半球/一球":{t:37,w:64.86,r:-9.18},"一球/球半":{t:16,w:18.75,r:-10.09},"平手/半球":{t:49,w:34.69,r:-20.48},"平手":{t:49,w:36.73,r:-54.09},"半球/一球":{t:15,w:33.33,r:-96.49},"半球":{t:31,w:19.35,r:-98.01} }, DRAW: { "平手/半球":{t:43,w:27.91,r:-2.91},"平手":{t:36,w:27.78,r:-16.95},"半球":{t:44,w:36.36,r:-44.42},"受让平手/半球":{t:24,w:20.83,r:-99.01} }, HOME: { "一球/球半":{t:76,w:75,r:7.72},"一球":{t:98,w:65.31,r:7.33},"球半/两球":{t:33,w:78.79,r:-0.24},"两球":{t:24,w:79.17,r:-4.46},"两球/两球半":{t:15,w:80,r:-6.75},"半球/一球":{t:90,w:54.44,r:-6.78},"球半":{t:52,w:67.31,r:-16.25},"半球":{t:71,w:50.7,r:-17.78},"受让平手/半球":{t:22,w:27.27,r:-24.1},"平手":{t:68,w:38.24,r:-26.37},"平手/半球":{t:59,w:49.15,r:-31.99} } },
    T1H: { AWAY: { "受让一球":{t:30,w:80,r:25.72},"平手":{t:52,w:40.38,r:11.86},"受让半球/一球":{t:72,w:62.5,r:11.59},"受让一球/球半":{t:28,w:75,r:2.59},"受让半球":{t:43,w:46.51,r:-14.76},"平手/半球":{t:44,w:29.55,r:-33.8},"受让平手/半球":{t:46,w:36.96,r:-39.51},"一球":{t:15,w:13.33,r:-50.99},"半球":{t:15,w:20,r:-99.09} }, DRAW: { "平手":{t:39,w:30.77,r:-16.75},"受让平手/半球":{t:27,w:14.81,r:-19.06},"平手/半球":{t:61,w:32.79,r:-37.65},"半球":{t:28,w:28.57,r:-52.04} }, HOME: { "受让平手/半球":{t:22,w:36.36,r:23.73},"半球/一球":{t:124,w:59.68,r:6.08},"一球":{t:83,w:62.65,r:0.32},"半球":{t:76,w:53.95,r:-2.75},"球半/两球":{t:33,w:75.76,r:-8.7},"球半":{t:52,w:75,r:-12.41},"两球":{t:29,w:75.86,r:-13.37},"一球/球半":{t:63,w:63.49,r:-15.32},"平手":{t:52,w:34.62,r:-15.57},"平手/半球":{t:61,w:49.18,r:-37.19} } }
  }
};

=======
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
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

function isHot(league: string) {
  if (HOT_LEAGUES.some((h) => league.includes(h))) return true;
  if (/(英|西|意|德|法|日|韓|澳|美|歐|世|智|非).*(盃|杯|足總|聯賽盃)/.test(league)) return true;
  return false;
}

<<<<<<< HEAD
const safeDiv = (n: number, d: number) => (d !== 0 && !isNaN(d) ? n / d : 0);

// =====================================================================
// V36 31-Dim 特徵提取引擎
// =====================================================================
function getHDAFlatFeatures(bookieStats: Record<string, any>, processedBookiesList: any[], leagueName: string) {
  const leagueLvl = isTier1League(leagueName) ? 1 : 2;
  const numB = processedBookiesList.length;
  
  const f = new Array(31).fill(0);
  f[0] = leagueLvl;
  if (numB === 0) return f;

  const sharpList = processedBookiesList.filter(b => SHARP_BOOKIES.some(s => b.name.replace(/\s/g, '').includes(s)));
  const pinData = processedBookiesList.find(b => b.name.replace(/\s/g, '').includes('pinnacle'));
  const b365Data = processedBookiesList.find(b => b.name.replace(/\s/g, '').includes('bet365'));
  const macauData = processedBookiesList.find(b => {
    const cleanName = b.name.replace(/\s/g, '');
    return cleanName.includes('macau') || cleanName.includes('澳门') || cleanName.includes('澳門');
  });

  const getBookieFeatures = (bData: any, side: 'h'|'d'|'a') => {
    if (!bData) return { drop: 0, surge: 0, zigzag: 0 };
    const drop = safeDiv(bData.t1[side] - bData.t3[side], bData.t3[side]);
    let surge = 0, zigzag = 0;
    const wTicks = [bData.t3, ...bData.win];
    if (wTicks.length > 1) {
      const diffs = [];
      for(let i=1; i<wTicks.length; i++) diffs.push(wTicks[i][side] - wTicks[i-1][side]);
      const meanDiff = diffs.reduce((sum, d) => sum + Math.abs(d), 0) / diffs.length;
      if (meanDiff > 0) surge = Math.max(...diffs.map(d => Math.abs(d))) / meanDiff;
      for(let i=1; i<diffs.length; i++) {
        if (diffs[i] * diffs[i-1] < 0) zigzag++;
      }
    }
    return { drop, surge, zigzag };
  };

  let featureIdx = 1;

  ['h', 'd', 'a'].forEach((side) => {
     const mkt_o = processedBookiesList.reduce((s, b) => s + b.o[side], 0) / numB;
     const mkt_t3 = processedBookiesList.reduce((s, b) => s + b.t3[side], 0) / numB;
     const mkt_t1 = processedBookiesList.reduce((s, b) => s + b.t1[side], 0) / numB;

     const mkt_drop = safeDiv(mkt_t1 - mkt_t3, mkt_t3);
     const mkt_early_drop = safeDiv(mkt_t3 - mkt_o, mkt_o);

     const sharp_t1 = sharpList.length > 0
        ? sharpList.reduce((s, b) => s + b.t1[side], 0) / sharpList.length
        : mkt_t1;
     const div_sharp = sharp_t1 - mkt_t1;

     let p_imp = 0;
     if (pinData) {
        const ph = pinData.t1.h, pd = pinData.t1.d, pa = pinData.t1.a;
        if (ph && pd && pa) {
           const margin = (1/ph + 1/pd + 1/pa);
           p_imp = (1 / pinData.t1[side]) / margin;
        }
     }
     const market_ev = p_imp > 0 ? (mkt_t1 * p_imp) - 1 : 0;

     const pinF = getBookieFeatures(pinData, side as 'h'|'d'|'a');
     const b365F = getBookieFeatures(b365Data, side as 'h'|'d'|'a');
     const macauF = getBookieFeatures(macauData, side as 'h'|'d'|'a');

     f[featureIdx++] = mkt_t1;
     f[featureIdx++] = mkt_drop;
     f[featureIdx++] = mkt_early_drop;
     f[featureIdx++] = pinF.drop;
     f[featureIdx++] = pinF.surge;
     f[featureIdx++] = pinF.zigzag;
     f[featureIdx++] = macauF.drop;
     f[featureIdx++] = b365F.drop;
     f[featureIdx++] = market_ev;
     f[featureIdx++] = div_sharp;
  });

  return f;
}

// =====================================================================
// QUANTITATIVE PROCESSING 
// =====================================================================
function processQuant(matchId: string, matchInfo?: MatchInfo): AnalysisResult | null {
  const league = matchInfo?.league || W.matchname_f || W.matchname || "未知賽事";
  const homeTeam = matchInfo?.home || W.hometeam_f || W.hometeam || "主隊";
  const awayTeam = matchInfo?.away || W.guestteam_f || W.guestteam || "客隊";
=======
// =====================================================================
// QUANTITATIVE PROCESSING (V13 + EV + TIME-SERIES LOGIC)
// =====================================================================
function processQuant(matchId: string, matchInfo?: MatchInfo): AnalysisResult | null {
  const league = matchInfo?.league || W.matchname_cn || W.matchname || "未知賽事";
  const homeTeam = matchInfo?.home || W.hometeam_cn || W.hometeam || "主隊";
  const awayTeam = matchInfo?.away || W.guestteam_cn || W.guestteam || "客隊";
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
  
  const rawGame: string[] = W.game;
  const rawDetail: string[] = W.gameDetail; 
  if (!rawGame || !Array.isArray(rawGame)) return null;
<<<<<<< HEAD

  // 1. 計算開賽時間
  let kickoffTs = 0;
  let kickoffYear = new Date().getFullYear();
  const exactTimeStr = W.matchtime || W.MatchTime; 
  if (exactTimeStr && typeof exactTimeStr === "string") {
    const parts = exactTimeStr.split(",");
    if (parts.length >= 5) {
      kickoffYear = parseInt(parts[0]);
      const mParts = parts[1].split("-");
      const m = parseInt(mParts[0]) - (mParts.length > 1 ? parseInt(mParts[1]) : 0);
      const d = parseInt(parts[2]), h = parseInt(parts[3]), min = parseInt(parts[4]);
      const s = parts[5] ? parseInt(parts[5]) : 0;
      kickoffTs = new Date(Date.UTC(kickoffYear, m, d, h, min, s)).getTime() / 1000;
    }
  }

  if (kickoffTs === 0 && matchInfo?.time) {
=======
  const rawTotal = rawGame.length;

  // [NEW] Time-Series Extraction (T-Xh)
  let timeLabel = "未知時間";
  let isGoldenWindow = false;
  let isValueDestroyed = false;
  let diffHours = -1;

  if (matchInfo?.time) {
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
    const [mh, mm] = matchInfo.time.split(":").map(Number);
    if (!isNaN(mh) && !isNaN(mm)) {
      const now = new Date();
      const kDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), mh, mm, 0);
<<<<<<< HEAD
      if (kDate.getTime() < now.getTime() - 12 * 3600000) kDate.setDate(kDate.getDate() + 1);
      kickoffTs = kDate.getTime() / 1000;
      kickoffYear = kDate.getFullYear();
    }
  }

  const T_MINUS_3H_TS = kickoffTs > 0 ? kickoffTs - (3 * 3600) : Date.now() / 1000;
  const T_MINUS_1H_TS = kickoffTs > 0 ? kickoffTs - (1 * 3600) : Date.now() / 1000;
  const nowTs = Date.now() / 1000;

  const detailMap = new Map<string, string>();
  if (Array.isArray(rawDetail)) {
      rawDetail.forEach(d => {
          const idx = d.indexOf('^');
          if(idx > -1) {
              detailMap.set(d.substring(0, idx), d.substring(idx + 1));
          }
      });
  }

  // 2. 莊家數據清洗與全歷史快照提取
  type OP = { h: number; d: number; a: number; ts: number };
  const bookieStats: Record<string, any> = {};
  const processedBookiesList: any[] = [];
  const avgT3 = { h: 0, d: 0, a: 0 };
=======
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
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0

  for (const item of rawGame) {
    if (!item) continue;
    const p = String(item).split("|");
    if (p.length < 13) continue;

<<<<<<< HEAD
    const oddsId = p[1]; 
    const bookieName = p[2] ? p[2].toLowerCase().trim() : "unknown"; 
    const oH = parseFloat(p[3]), oD = parseFloat(p[4]), oA = parseFloat(p[5]);
    const cH = parseFloat(p[10]), cD = parseFloat(p[11]), cA = parseFloat(p[12]);

    if ([oH, oD, oA, cH, cD, cA].some((v) => isNaN(v) || v <= 0)) continue;
=======
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

>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
    const oMargin = 1 / oH + 1 / oD + 1 / oA;
    if ((1 / oMargin) * 100 < 85) continue;

    const ticks: OP[] = [{ h: oH, d: oD, a: oA, ts: kickoffTs - (24 * 3600) }];

    if (detailMap.has(oddsId)) {
        const historyStr = detailMap.get(oddsId)!.split(';').filter(Boolean);
        for (const hStr of historyStr) {
            const dp = hStr.split('|');
            if (dp.length >= 4) {
                const th = parseFloat(dp[0]), td = parseFloat(dp[1]), ta = parseFloat(dp[2]);
                const [md, time] = dp[3].split(' ');
                if (md && time) {
                    const [mo, day] = md.split('-');
                    const [hh, mm] = time.split(':');
                    const yr = dp.length >= 8 ? parseInt(dp[7]) : kickoffYear;
                    const ts = new Date(yr, parseInt(mo)-1, parseInt(day), parseInt(hh), parseInt(mm), 0).getTime() / 1000;
                    if (!isNaN(ts) && !isNaN(th) && !isNaN(td) && !isNaN(ta) && ts <= T_MINUS_1H_TS && ts > 0) {
                        ticks.push({ h: th, d: td, a: ta, ts });
                    }
                }
            }
        }
    }

    ticks.sort((a,b) => a.ts - b.ts);
    if (ticks.length === 0) continue;

    const o = ticks[0];
    let t3 = ticks[0], t1 = ticks[ticks.length - 1];
    const winTicks: OP[] = [];
    
    ticks.forEach(t => {
      if (t.ts <= T_MINUS_3H_TS) t3 = t;
      else if (t.ts <= T_MINUS_1H_TS) winTicks.push(t);
    });

    const bData = { name: bookieName, o, t3, t1, win: winTicks, allTicks: ticks };
    bookieStats[bookieName] = bData;
    processedBookiesList.push(bData);
    
    avgT3.h += t3.h; avgT3.d += t3.d; avgT3.a += t3.a;
  }

<<<<<<< HEAD
  const numB = processedBookiesList.length;
  if (numB === 0) return null;

  avgT3.h /= numB; avgT3.d /= numB; avgT3.a /= numB;

  // 3. 提取 31 維特徵並執行 HDA 決策引擎
  const f31 = getHDAFlatFeatures(bookieStats, processedBookiesList, league);
  const advice = getActionAdvice(f31, league);

  const { action, p_h, p_d, p_a, message } = advice;

  let tsActionLabel = "等待中 (Pass)";
  let tsActionClass = "text-slate-500 border-slate-800 bg-slate-900/50";
  let showStake = false;
  let targetName = "";
  let targetOdds = 1.0;
  let ourProb = 0;

  if (action === 'BET_DRAW') {
    tsActionLabel = message;
    tsActionClass = "text-yellow-400 border-yellow-500/80 bg-yellow-950/50 animate-pulse-glow";
    showStake = true;
    targetName = "和局 (Draw)";
    targetOdds = avgT3.d;
    ourProb = p_d;
  } else if (action === 'BET_AWAY') {
    tsActionLabel = message;
    tsActionClass = "text-emerald-400 border-emerald-500/50 bg-emerald-950/40 animate-pulse-glow";
    showStake = true;
    targetName = `客勝 (${awayTeam})`;
    targetOdds = avgT3.a;
    ourProb = p_a;
  } else if (action === 'BET_HOME') {
    tsActionLabel = message;
    tsActionClass = "text-sky-400 border-sky-500/50 bg-sky-950/40 animate-pulse-glow";
    showStake = true;
    targetName = `主勝 (${homeTeam})`;
    targetOdds = avgT3.h;
    ourProb = p_h;
  } else {
    tsActionLabel = message;
    tsActionClass = "text-slate-500 border-slate-800 bg-slate-900/50";
  }

  // 💡 真實動態 EV 計算 (取代靜態文字)
  const realEvPct = ((ourProb * targetOdds) - 1) * 100;
  const bOdds = targetOdds - 1;
=======
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
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
  const kelly = bOdds > 0 ? (bOdds * ourProb - (1 - ourProb)) / bOdds : 0;
  const stake = Math.max(0, (kelly / 4) * 100); 

<<<<<<< HEAD
  const currentDiffHours = (kickoffTs - nowTs) / 3600;
  let timeStatusLabel = currentDiffHours > 3 ? `距離開賽 ${currentDiffHours.toFixed(1)}h` 
                      : currentDiffHours > 1 ? `等待 T-1H 驗證` 
                      : currentDiffHours > 0 ? `臨場 ${currentDiffHours.toFixed(1)}h` 
                      : `事後回測`;

  let lockNotice = "";
  if (currentDiffHours <= 1.0 && currentDiffHours > 0) {
    lockNotice = `<div class="text-[10px] text-purple-400 mt-2 flex items-center gap-1.5"><span class="animate-pulse">🔒</span> <b>訊號已於 T-1H 鎖定定案。</b></div>`;
  } else if (currentDiffHours > 1.0) {
    lockNotice = `<div class="text-[10px] text-slate-500 mt-2 flex items-center gap-1.5">⏳ <b>注意：</b>等待開賽前 1 小時定案。</div>`;
    if (showStake) {
       tsActionLabel = `🔭 提早埋伏: ${targetName} (等待 T-1H)`;
       tsActionClass = "text-blue-400 border-blue-900/50 bg-blue-950/40";
       showStake = false;
    }
=======
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
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
  }

  const isT1 = isTier1League(league);
  const now = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
<<<<<<< HEAD
=======

>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
  let html = `
    <div class="mb-3 bg-slate-950/80 rounded-xl border ${showStake ? (action === 'BET_HOME' ? 'border-sky-600/40 shadow-[0_0_12px_rgba(56,189,248,0.15)]' : 'border-emerald-600/40 shadow-[0_0_12px_rgba(34,197,94,0.15)]') : 'border-slate-800'} overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/[0.04]">
<<<<<<< HEAD
        <div class="text-[13px] text-slate-200">
          <span class="mr-1 ${isT1 ? 'text-amber-400' : 'text-slate-500'}">🚩</span> 
          <b>${league}</b> | ${homeTeam} <span class="text-slate-600">vs</span> ${awayTeam}
        </div>
        <span class="text-[10px] text-slate-600 font-mono">${now} | ID:${matchId}</span>
      </div>
      <div class="p-3 space-y-3">
        <div class="text-[11px]">
          <div class="font-bold mb-1 flex items-center justify-between text-purple-400">
             <span>🧠 Edge AI (V36 HDA Sniper ${isT1 ? '[T1 核心]' : '[T2 野雞]'})</span>
          </div>
          <div class="text-slate-300 flex justify-between bg-slate-900/50 px-2 py-1 rounded border border-slate-800/50">
            <span>主: <b class="${p_h > p_a && p_h > p_d ? 'text-sky-400' : 'text-white'}">${(p_h * 100).toFixed(1)}%</b></span>
            <span>平: <b class="${p_d >= 0.34 ? 'text-yellow-400' : 'text-white'}">${(p_d * 100).toFixed(1)}%</b></span>
            <span>客: <b class="${p_a > p_h && p_a > p_d ? 'text-emerald-400' : 'text-white'}">${(p_a * 100).toFixed(1)}%</b></span>
          </div>
        </div>
        <div class="rounded-lg border ${tsActionClass} px-3 py-2">
          <div class="flex justify-between items-center mb-1">
            <div class="text-[11px] font-bold text-slate-400">🕒 狀態</div>
            <div class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">${timeStatusLabel}</div>
          </div>
          <div class="text-[13px] font-black flex items-center gap-1">
            ${tsActionLabel} 
          </div>
          ${showStake ? `<div class="text-[11px] text-slate-300 mt-1.5 pt-1.5 border-t border-white/10">🎯 建議: <b class="${action === 'BET_HOME' ? 'text-sky-400' : 'text-emerald-400'}">${targetName}</b> @ <b class="text-white">${targetOdds.toFixed(2)}</b> | 動態 EV: <b class="${realEvPct > 0 ? 'text-emerald-400' : 'text-red-400'}">${realEvPct > 0 ? '+' : ''}${realEvPct.toFixed(2)}%</b> | 1/4 Kelly: <b class="text-cyan-400">${stake.toFixed(1)}%</b></div>` : ''}
          ${lockNotice}
=======
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
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
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
<<<<<<< HEAD

  const [leagueSearch, setLeagueSearch] = useState("");
=======
  
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
  const [step1Done, setStep1Done] = useState(false);
  const [lines, setLines] = useState<string[]>(BOOT_LINES);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [manualId, setManualId] = useState("");
  
<<<<<<< HEAD
  // UI 控制
  const [panelMode, setPanelMode] = useState<"CLOSED" | "SLICER" | "ASIAN">("CLOSED");
  
  // Slicer 狀態
=======
  const [slicerOpen, setSlicerOpen] = useState(true);
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
  const [slTarget, setSlTarget] = useState("AWAY");
  const [slFav, setSlFav] = useState("Home");
  const [slCross, setSlCross] = useState("----");
  const [slPatL, setSlPatL] = useState("持續降賠");
  const [slPatM, setSlPatM] = useState("A<B<C");
<<<<<<< HEAD

  // Asian X-Ray 狀態
  const [asTime, setAsTime] = useState("T1H");
  const [asLine, setAsLine] = useState("N1");
  const [asSide, setAsSide] = useState("HOME");
  const [asHandicap, setAsHandicap] = useState("");

  const asianHandicaps = useMemo(() => Object.keys(ASIAN_DICT[asLine]?.[asTime]?.[asSide] || {}), [asLine, asTime, asSide]);
  
  useEffect(() => {
    if (asianHandicaps.length > 0 && !asianHandicaps.includes(asHandicap)) setAsHandicap(asianHandicaps[0]);
    else if (asianHandicaps.length === 0) setAsHandicap('');
  }, [asianHandicaps, asHandicap]);

  const asianResult = ASIAN_DICT[asLine]?.[asTime]?.[asSide]?.[asHandicap];

  const slicerResult = useMemo(() => {
    const r = V17_RULES[slTarget];
    if (!r) return null;
    return { 
      golden: r.GOLDEN.filter((x: any) => x.val === slPatL || x.val === slCross), 
      traps: r.TRAPS.filter((x: any) => x.val === slPatL || x.val === slCross) 
    };
  }, [slTarget, slCross, slPatL]);
=======
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0

  const consoleRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef(false);

<<<<<<< HEAD
=======
  // --- Console helpers ---
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
  const print = useCallback((html: string) => setLines((p) => [html, ...p]), []);
  const clearConsole = useCallback(() => setLines([...BOOT_LINES]), []);

  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = 0;
  }, [lines]);

<<<<<<< HEAD
  const lgEntries = useMemo(() => Object.entries(leagueGroups), [leagueGroups]);

  async function handleFetchLeagues() {
    setIsLoading(true);
    print('<span class="text-xs text-slate-500">[系統] DOM Script Injection 請求中...</span>');
    W.A = undefined; W.B = undefined;
    try {
      try { await injectScript("https://live.nowscore.com/data/bf.js"); } 
      catch { await injectScript("https://v.nowscore.com/data/bf.js"); }
=======
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
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
      if (!W.A) throw new Error("數據集 A 載入失敗");
    } catch (err: any) {
      print(`<span class="text-red-500 font-bold">[錯誤] ${err.message}</span>`);
      setIsLoading(false); return;
    }

    const matches: MatchInfo[] = [];
    const leagues = new Set<string>();

    W.A.forEach((val: any) => {
      if (!val) return;
      const p: any[] = Array.isArray(val) ? val : String(val).split(/[\^,]/);
      if (p.length < 10) return;
      if (`${p[12]} ${p[13]} ${p[14]}`.includes("-1")) return;

<<<<<<< HEAD
      const tw = W.B?.[parseInt(p[1])] ? (Array.isArray(W.B[parseInt(p[1])]) ? W.B[parseInt(p[1])] : String(W.B[parseInt(p[1])]).split(/[\^,]/)).filter((x: any) => typeof x === "string" && /[^\d.\-\s]/.test(x))[1] || "未知" : "未知";
      const home = String(p[4] || p[5] || "").replace(/<[^>]+>/g, "").trim();
      const away = String(p[7] || p[8] || "").replace(/<[^>]+>/g, "").trim();
      
      if (home && away) { leagues.add(tw); matches.push({ id: String(p[0]).trim(), league: tw, home, away, time: p.find((x: any) => typeof x === "string" && x.includes(":")) || "未知" }); }
    });

    setRawMatches(matches); setAllLeagues(Array.from(leagues).sort());
    setSelectedLeagues(new Set(Array.from(leagues).filter(isHot)));
    setStep1Done(true); setIsLoading(false);
  }

  function handleRenderRadar() {
    const filtered = rawMatches.filter((m) => selectedLeagues.has(m.league));
    const groups: Record<string, MatchInfo[]> = {};
    filtered.forEach((m) => { if (!groups[m.league]) groups[m.league] = []; groups[m.league].push(m); });
    setFilteredMatches(filtered); setLeagueGroups(groups);
  }

  async function handleAnalysis(matchId: string, silent: boolean, matchInfo?: MatchInfo) {
    if (!matchId) return null;
=======
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

>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
    W.game = undefined;
    W.gameDetail = undefined;
    try {
<<<<<<< HEAD
      try { await injectScript(`https://1x2.nowscore.com/${matchId}.js`); } 
      catch { await injectScript(`https://1x2d.nowscore.com/${matchId}.js`); }
    } catch { return null; }

    const result = processQuant(matchId, matchInfo);
    if (!silent && result) print(result.htmlOutput);
    return result;
  }

=======
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
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
  async function handleLeagueScan(league: string) {
    if (scanRef.current) return;
    const list = leagueGroups[league];
    if (!list?.length) return;
<<<<<<< HEAD
    scanRef.current = true; setIsScanning(true);
    for (let i = 0; i < list.length; i++) {
      if (!scanRef.current) break;
      setScanProgress({ current: i + 1, total: list.length, label: `${list[i].home} vs ${list[i].away}` });
      const r = await handleAnalysis(list[i].id, true, list[i]);
      if (r) print(r.htmlOutput);
      await new Promise((r) => setTimeout(r, 800));
    }
    scanRef.current = false; setIsScanning(false); setScanProgress(null);
  }

  const selectHot = useCallback(() => setSelectedLeagues(new Set(allLeagues.filter(isHot))), [allLeagues]);
  const selectAll = useCallback(() => setSelectedLeagues(new Set(allLeagues)), [allLeagues]);
  const selectNone = useCallback(() => setSelectedLeagues(new Set()), []);
  const toggleLeague = useCallback((l: string, checked: boolean) => {
    setSelectedLeagues(prev => {
      const n = new Set(prev);
      checked ? n.add(l) : n.delete(l);
      return n;
    });
  }, []);

=======

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
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-200">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(34,211,238,0.08),transparent)]" />
        <div className="absolute inset-0 bg-grid" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1800px] flex-col gap-3 p-2 xl:p-4 h-screen">
<<<<<<< HEAD
=======
        {/* Header */}
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
        <header className="glass flex items-center justify-between rounded-2xl border border-white/[0.06] px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-base font-black text-cyan-400">⚡</div>
            <div>
<<<<<<< HEAD
              <h1 className="text-sm font-bold text-white">Smart Money V36.1 Pro</h1>
              <p className="text-[10px] text-slate-500">HDA 矩陣 + 動態 EV / 智能防護濾網</p>
=======
              <h1 className="text-sm font-bold text-white">Smart Money V29</h1>
              <p className="text-[10px] text-slate-500">V13 核心 + EV 1.0 + Point-in-Time 時序邏輯</p>
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
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

<<<<<<< HEAD
        <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-4">
=======
        {/* Main Grid */}
        <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-4">
          
          {/* LEFT COL */}
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
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
<<<<<<< HEAD
                      <button onClick={selectHot} className="rounded border border-amber-700/50 bg-amber-900/40 px-1.5 py-0.5 text-[10px] text-amber-500 hover:bg-amber-800 hover:text-white">主流+盃賽</button>
=======
                      <button onClick={selectHot} className="rounded border border-amber-700/50 bg-amber-900/40 px-1.5 py-0.5 text-[10px] text-amber-500 hover:bg-amber-800 hover:text-white">五大</button>
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
                      <button onClick={selectAll} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700 hover:text-white">全選</button>
                      <button onClick={selectNone} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700 hover:text-white">清空</button>
                    </div>
                  </div>
                  
<<<<<<< HEAD
                  <input
                    type="text"
                    placeholder="🔍 搜尋聯賽 (例如: 歐冠、日職)"
                    value={leagueSearch}
                    onChange={(e) => setLeagueSearch(e.target.value)}
                    className="mb-2 w-full rounded border border-white/[0.08] bg-slate-900 px-2 py-1 text-[11px] text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
                  />
                  
                  <div className="scroll-styled mb-3 grid max-h-32 grid-cols-3 gap-1.5 overflow-y-auto rounded border border-slate-800 bg-slate-950 p-1.5 text-[10px]">
                    {allLeagues.filter(l => l.toLowerCase().includes(leagueSearch.toLowerCase())).map((l) => (
=======
                  <div className="scroll-styled mb-3 grid max-h-28 grid-cols-3 gap-1.5 overflow-y-auto rounded border border-slate-800 bg-slate-950 p-1.5 text-[10px]">
                    {allLeagues.map((l) => (
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
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

<<<<<<< HEAD
=======
                    {/* Match cards */}
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
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

<<<<<<< HEAD
          <div className={`glass flex flex-col overflow-hidden rounded-xl border border-white/[0.06] transition-all duration-500 ${panelMode !== 'CLOSED' ? "lg:col-span-2" : "lg:col-span-3"}`}>
=======
          {/* MIDDLE: Terminal */}
          <div className={`glass flex flex-col overflow-hidden rounded-xl border border-white/[0.06] transition-all duration-500 ${slicerOpen ? "lg:col-span-2" : "lg:col-span-3"}`}>
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
            <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </div>
<<<<<<< HEAD
                <span className="font-mono text-[10px] text-slate-600">smart-money ~ core_v36 (Pro Dynamic EV Edition)</span>
=======
                <span className="font-mono text-[10px] text-slate-600">smart-money ~ core_v29 (Time-Series)</span>
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
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
<<<<<<< HEAD
                  === 等待接收 V36 訊號 ===
=======
                  === 等待接收 V29 訊號 ===
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
                </div>
              )}
            </div>
          </div>

<<<<<<< HEAD
          <div className={`glass flex flex-col overflow-hidden rounded-xl border border-white/[0.06] transition-all duration-500 ${panelMode !== 'CLOSED' ? "lg:col-span-1" : "lg:col-span-0 lg:w-12"}`}>
            <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-2 shrink-0">
              {panelMode !== 'CLOSED' ? (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPanelMode('SLICER')} className={`text-[11px] font-bold px-2 py-1 rounded transition-colors ${panelMode === 'SLICER' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-white'}`}>手術刀</button>
                  <button onClick={() => setPanelMode('ASIAN')} className={`text-[11px] font-bold px-2 py-1 rounded transition-colors ${panelMode === 'ASIAN' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-500 hover:text-white'}`}>亞盤透視</button>
                </div>
              ) : (
                <span className="text-[10px] text-slate-600 font-bold ml-1">展</span>
=======
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
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
              )}
              <button
                onClick={() => setPanelMode(panelMode !== 'CLOSED' ? 'CLOSED' : 'ASIAN')}
                className="rounded border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-400 hover:bg-white/[0.06] hover:text-white"
              >
<<<<<<< HEAD
                {panelMode !== 'CLOSED' ? "收起" : "開"}
=======
                {slicerOpen ? "收起" : "開"}
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
              </button>
            </div>

            {/* 面板 1: 原版切片手術刀 */}
            {panelMode === 'SLICER' && (
              <div className="flex flex-col h-full overflow-hidden p-3">
                <div className="mb-3 rounded border border-slate-800 bg-slate-900 p-2 text-[10px] text-slate-400 shrink-0">
                  💡 <span className="text-cyan-400">ML 時序切片</span>: 結合終端輸出的 Macro 特徵，手動判斷臨場動能。
                </div>

                <div className="flex flex-col gap-2.5 shrink-0">
                  <div>
<<<<<<< HEAD
                    <label className="mb-1 block text-[10px] text-slate-500">1. ML 預測目標</label>
                    <div className="flex gap-1">
                      <button onClick={() => setSlTarget('HOME')} className={`flex-1 rounded border px-2 py-1 text-[11px] font-bold transition-all ${slTarget === 'HOME' ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'}`}>HOME</button>
                      <button onClick={() => setSlTarget('DRAW')} className={`flex-1 rounded border px-2 py-1 text-[11px] font-bold transition-all ${slTarget === 'DRAW' ? 'border-purple-500 bg-purple-500/20 text-purple-400' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'}`}>DRAW</button>
                      <button onClick={() => setSlTarget('AWAY')} className={`flex-1 rounded border px-2 py-1 text-[11px] font-bold transition-all ${slTarget === 'AWAY' ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'}`}>AWAY</button>
                    </div>
=======
                    <label className="mb-0.5 block text-[10px] text-slate-500">1. ML 預測目標</label>
                    <select value={slTarget} onChange={(e) => setSlTarget(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm font-bold text-cyan-400 outline-none focus:border-cyan-500">
                      <option value="HOME">HOME (主勝)</option>
                      <option value="DRAW">DRAW (和局)</option>
                      <option value="AWAY">AWAY (客勝)</option>
                    </select>
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
<<<<<<< HEAD
                      <label className="mb-1 block text-[10px] text-slate-500">2. 讓球方</label>
                      <div className="flex gap-1">
                        <button onClick={() => setSlFav('Home')} className={`flex-1 rounded border px-2 py-1 text-[11px] font-bold transition-all ${slFav === 'Home' ? 'border-rose-500 bg-rose-500/20 text-rose-400' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'}`}>主讓</button>
                        <button onClick={() => setSlFav('Away')} className={`flex-1 rounded border px-2 py-1 text-[11px] font-bold transition-all ${slFav === 'Away' ? 'border-sky-500 bg-sky-500/20 text-sky-400' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'}`}>客讓</button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-slate-500">3. 宏觀交叉</label>
                      <select value={slCross} onChange={(e) => setSlCross(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-[5px] font-mono text-sm font-bold text-white outline-none">
                        <option value="++++">++++</option><option value="----">----</option><option value="++--">++--</option>
                        <option value="--++">--++</option><option value="-+--">-+--</option><option value="-+++">-+++</option>
                        <option value="+---">+---</option><option value="++-+">++-+</option>
=======
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
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] text-slate-500">4. 臨場型態 (Pat_L)</label>
<<<<<<< HEAD
                      <select value={slPatL} onChange={(e) => setSlPatL(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-[5px] text-[12px] font-bold text-white outline-none">
                        <option value="持續降賠">持續降賠</option><option value="深V洗盤">深V洗盤</option>
                        <option value="倒V型">倒V型</option><option value="階梯式降">階梯式降</option>
=======
                      <select value={slPatL} onChange={(e) => setSlPatL(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm font-bold text-white outline-none">
                        <option value="持續降賠">持續降賠</option>
                        <option value="深V洗盤">深V洗盤</option>
                        <option value="倒V型">倒V型</option>
                        <option value="階梯式降">階梯式降</option>
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
                        <option value="末期暴跳">末期暴跳</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-slate-500">5. 資金共識 (Pat_M)</label>
<<<<<<< HEAD
                      <select value={slPatM} onChange={(e) => setSlPatM(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-[5px] text-[12px] font-bold text-white outline-none">
                        <option value="A<B<C">A&lt;B&lt;C</option><option value="A>B>C">A&gt;B&gt;C</option>
                        <option value="A>B<C">A&gt;B&lt;C</option><option value="A<B>C">A&lt;B&gt;C</option>
                        <option value="晚期加速">晚期加速</option><option value="早期死水">早期死水</option>
=======
                      <select value={slPatM} onChange={(e) => setSlPatM(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm font-bold text-white outline-none">
                        <option value="A&lt;B&lt;C">{"A<B<C"}</option>
                        <option value="A&gt;B&gt;C">{"A>B>C"}</option>
                        <option value="A&gt;B&lt;C">{"A>B<C"}</option>
                        <option value="A&lt;B&gt;C">{"A<B>C"}</option>
                        <option value="晚期加速">晚期加速</option>
                        <option value="早期死水">早期死水</option>
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
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
<<<<<<< HEAD
                          {slicerResult.traps.map((t: any, i: number) => (
=======
                          {slicerResult.traps.map((t, i) => (
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
                            <div key={i} className="flex items-center justify-between border-t border-red-900/30 pt-1 text-[10px] mt-1 first:mt-0 first:border-0 first:pt-0">
                              <span className="text-slate-300"><span className="mr-1 rounded bg-red-900/60 px-1">{t.val}</span>{t.desc}</span>
                              <span className="font-mono font-bold text-red-400">{t.roi}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {slicerResult.golden.length > 0 && (
                        <div className="mb-2 rounded border border-emerald-900/50 bg-emerald-950/40 p-2">
                          <div className="mb-1 text-[11px] font-bold text-emerald-400">💎 觸發黃金特徵 (GOLDEN)</div>
<<<<<<< HEAD
                          {slicerResult.golden.map((g: any, i: number) => (
=======
                          {slicerResult.golden.map((g, i) => (
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
                            <div key={i} className="flex items-center justify-between border-t border-emerald-900/30 pt-1 text-[10px] mt-1 first:mt-0 first:border-0 first:pt-0">
                              <span className="text-slate-300"><span className="mr-1 rounded bg-emerald-900/60 px-1">{g.val}</span>{g.desc}</span>
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
<<<<<<< HEAD
                    <div className="py-8 text-center text-[11px] text-slate-500">尚未觸發任何時序規則 <br /> 請調整上方參數</div>
                  )}
                </div>
              </div>
            )}

            {/* 面板 2: 亞盤透視鏡 */}
            {panelMode === 'ASIAN' && (
              <div className="flex flex-col h-full p-3">
                <div className="mb-3 rounded border border-slate-800 bg-slate-900 p-2 text-[10px] text-slate-400 shrink-0">
                  💡 <span className="text-purple-400 font-bold">亞盤透視鏡</span>: 全樣本 N1-N4 OOS 矩陣查詢，直接對照莊家意圖。
                </div>

                <div className="mb-2.5 shrink-0">
                  <label className="mb-1 block text-[10px] text-slate-500">時間點</label>
                  <div className="flex gap-1.5">
                    <button onClick={() => setAsTime('OPEN')} className={`flex-1 rounded border px-2 py-1.5 text-[11px] font-bold transition-all ${asTime === 'OPEN' ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'}`}>初盤 (OPEN)</button>
                    <button onClick={() => setAsTime('T1H')} className={`flex-1 rounded border px-2 py-1.5 text-[11px] font-bold transition-all ${asTime === 'T1H' ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'}`}>臨場 (T1H)</button>
                  </div>
                </div>

                <div className="mb-2.5 shrink-0">
                  <label className="mb-1 block text-[10px] text-slate-500">盤口線</label>
                  <div className="flex gap-1.5">
                    {['N1', 'N2', 'N3', 'N4'].map(l => (
                      <button key={l} onClick={() => setAsLine(l)} className={`flex-1 rounded border px-2 py-1.5 text-[11px] font-bold transition-all ${asLine === l ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-2.5 shrink-0">
                  <label className="mb-1 block text-[10px] text-slate-500">預測方向 (ML)</label>
                  <div className="flex gap-1.5">
                    <button onClick={() => setAsSide('HOME')} className={`flex-1 rounded border px-2 py-1.5 text-[11px] font-bold transition-all ${asSide === 'HOME' ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'}`}>HOME</button>
                    <button onClick={() => setAsSide('DRAW')} className={`flex-1 rounded border px-2 py-1.5 text-[11px] font-bold transition-all ${asSide === 'DRAW' ? 'border-purple-500 bg-purple-500/20 text-purple-400' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'}`}>DRAW</button>
                    <button onClick={() => setAsSide('AWAY')} className={`flex-1 rounded border px-2 py-1.5 text-[11px] font-bold transition-all ${asSide === 'AWAY' ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'}`}>AWAY</button>
                  </div>
                </div>

                <div className="mb-2.5 shrink-0">
                  <label className="mb-1 block text-[10px] text-slate-500">實際讓球盤口</label>
                  <select value={asHandicap} onChange={(e) => setAsHandicap(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-[12px] font-bold text-white outline-none focus:border-purple-500">
                    {asianHandicaps.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>

                <div className="mt-2 flex-1 flex flex-col justify-center">
                  {asianResult ? (
                    <div className={`rounded-xl border border-t-4 p-4 text-center shadow-xl transition-all ${asianResult.r > 0 ? 'border-t-emerald-500 border-emerald-900/50 bg-emerald-950/20' : 'border-t-red-500 border-red-900/50 bg-red-950/20'}`}>
                      <div className="text-[11px] text-slate-400 mb-1">歷史投資回報率 (ROI)</div>
                      <div className={`text-4xl font-black mb-4 ${asianResult.r > 0 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'text-red-400'}`}>
                        {asianResult.r > 0 ? '+' : ''}{asianResult.r.toFixed(2)}%
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.05]">
                        <div className="bg-slate-900/50 rounded p-1.5">
                          <div className="text-[10px] text-slate-500">OOS 樣本數</div>
                          <div className="text-sm font-bold text-white">{asianResult.t} 場</div>
                        </div>
                        <div className="bg-slate-900/50 rounded p-1.5">
                          <div className="text-[10px] text-slate-500">歷史勝率</div>
                          <div className="text-sm font-bold text-white">{asianResult.w.toFixed(1)}%</div>
                        </div>
                      </div>

                      {asianResult.r > 20 && asianResult.t >= 15 && (
                        <div className="mt-3 text-[11px] text-amber-400 font-bold animate-pulse tracking-wide">🔥 發現極端雙重金礦特徵！</div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 rounded border border-slate-800 bg-slate-900/50">
                      <span className="text-[11px] text-slate-500">該條件下無足夠 OOS 樣本</span>
=======
                    <div className="py-8 text-center text-[11px] text-slate-500">
                      尚未觸發任何時序規則 <br /> 請調整上方參數
>>>>>>> 0117227aa2eb3c13469a78297098d52757397ce0
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