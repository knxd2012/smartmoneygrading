import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { predictML } from "./rf_model.js"; // 加入這行！

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

// --- 終極亞盤資料庫 (OOS 大樣本) ---
const ASIAN_DICT: Record<string, any> = {
  N1: {
    OPEN: {
      AWAY: { "受让平手/半球":{t:67,w:53.73,r:34.54},"受让一球":{t:29,w:79.31,r:27.73},"受让一球/球半":{t:19,w:78.95,r:7.17},"受让半球":{t:48,w:54.17,r:6.84},"受让半球/一球":{t:37,w:64.86,r:-9.18},"一球/球半":{t:16,w:18.75,r:-10.09},"平手/半球":{t:49,w:34.69,r:-20.48},"平手":{t:49,w:36.73,r:-54.09},"半球/一球":{t:15,w:33.33,r:-96.49},"半球":{t:31,w:19.35,r:-98.01} },
      DRAW: { "平手/半球":{t:43,w:27.91,r:-2.91},"平手":{t:36,w:27.78,r:-16.95},"半球":{t:44,w:36.36,r:-44.42},"受让平手/半球":{t:24,w:20.83,r:-99.01} },
      HOME: { "一球/球半":{t:76,w:75,r:7.72},"一球":{t:98,w:65.31,r:7.33},"球半/两球":{t:33,w:78.79,r:-0.24},"两球":{t:24,w:79.17,r:-4.46},"两球/两球半":{t:15,w:80,r:-6.75},"半球/一球":{t:90,w:54.44,r:-6.78},"球半":{t:52,w:67.31,r:-16.25},"半球":{t:71,w:50.7,r:-17.78},"受让平手/半球":{t:22,w:27.27,r:-24.1},"平手":{t:68,w:38.24,r:-26.37},"平手/半球":{t:59,w:49.15,r:-31.99} }
    },
    T1H: {
      AWAY: { "受让一球":{t:30,w:80,r:25.72},"平手":{t:52,w:40.38,r:11.86},"受让半球/一球":{t:72,w:62.5,r:11.59},"受让一球/球半":{t:28,w:75,r:2.59},"受让半球":{t:43,w:46.51,r:-14.76},"平手/半球":{t:44,w:29.55,r:-33.8},"受让平手/半球":{t:46,w:36.96,r:-39.51},"一球":{t:15,w:13.33,r:-50.99},"半球":{t:15,w:20,r:-99.09} },
      DRAW: { "平手":{t:39,w:30.77,r:-16.75},"受让平手/半球":{t:27,w:14.81,r:-19.06},"平手/半球":{t:61,w:32.79,r:-37.65},"半球":{t:28,w:28.57,r:-52.04} },
      HOME: { "受让平手/半球":{t:22,w:36.36,r:23.73},"半球/一球":{t:124,w:59.68,r:6.08},"一球":{t:83,w:62.65,r:0.32},"半球":{t:76,w:53.95,r:-2.75},"球半/两球":{t:33,w:75.76,r:-8.7},"球半":{t:52,w:75,r:-12.41},"两球":{t:29,w:75.86,r:-13.37},"一球/球半":{t:63,w:63.49,r:-15.32},"平手":{t:52,w:34.62,r:-15.57},"平手/半球":{t:61,w:49.18,r:-37.19} }
    }
  },
  N2: {
    OPEN: {
      AWAY: { "受让一球":{t:23,w:78.26,r:16.02},"受让一球/球半":{t:22,w:77.27,r:12.86},"受让半球":{t:63,w:60.32,r:12.66},"受让半球/一球":{t:42,w:57.14,r:8.13},"受让平手/半球":{t:49,w:46.94,r:3.97},"半球/一球":{t:24,w:29.17,r:-1.73},"受让球半":{t:16,w:75,r:-6.38},"半球":{t:41,w:31.71,r:-13.37},"平手":{t:45,w:35.56,r:-52.39},"平手/半球":{t:34,w:26.47,r:-97.18} },
      DRAW: { "半球/一球":{t:19,w:47.37,r:97.27},"平手":{t:27,w:29.63,r:-2.77},"平手/半球":{t:44,w:34.09,r:-17.37},"半球":{t:34,w:26.47,r:-28.16},"受让平手/半球":{t:21,w:19.05,r:-98.43},"受让半球":{t:15,w:13.33,r:-99.23} },
      HOME: { "一球":{t:74,w:67.57,r:7.26},"球半/两球":{t:39,w:84.62,r:5.94},"半球/一球":{t:94,w:58.51,r:1.32},"一球/球半":{t:73,w:65.75,r:-2.42},"受让平手/半球":{t:39,w:43.59,r:-4.8},"球半":{t:55,w:72.73,r:-6.24},"半球":{t:88,w:48.86,r:-11.46},"两球":{t:17,w:70.59,r:-16.56},"平手":{t:39,w:48.72,r:-28.25},"平手/半球":{t:66,w:39.39,r:-37.81} }
    },
    T1H: {
      AWAY: { "受让一球/球半":{t:21,w:85.71,r:30.87},"受让半球/一球":{t:44,w:61.36,r:18.16},"一球":{t:15,w:20,r:6.16},"平手/半球":{t:32,w:34.38,r:1.29},"受让一球":{t:44,w:61.36,r:-1.53},"受让平手/半球":{t:51,w:49.02,r:-1.65},"受让半球":{t:61,w:49.18,r:-8.64},"平手":{t:35,w:37.14,r:-27.17},"半球/一球":{t:16,w:18.75,r:-41.24},"半球":{t:33,w:21.21,r:-98.44} },
      DRAW: { "半球/一球":{t:17,w:41.18,r:23.26},"平手/半球":{t:33,w:39.39,r:-20.24},"平手":{t:45,w:28.89,r:-24.09},"半球":{t:40,w:22.5,r:-28.81},"受让平手/半球":{t:23,w:17.39,r:-49.28} },
      HOME: { "两球/两球半":{t:15,w:93.33,r:7.18},"半球/一球":{t:111,w:57.66,r:4.18},"半球":{t:110,w:53.64,r:0.76},"一球/球半":{t:60,w:68.33,r:-4.32},"两球":{t:17,w:82.35,r:-6.94},"球半":{t:53,w:73.58,r:-9.57},"一球":{t:79,w:60.76,r:-9.71},"平手":{t:36,w:47.22,r:-9.76},"受让半球":{t:16,w:18.75,r:-14.24},"平手/半球":{t:51,w:41.18,r:-18.93},"球半/两球":{t:43,w:69.77,r:-20.68},"受让平手/半球":{t:29,w:34.48,r:-23.01} }
    }
  },
  N3: {
    OPEN: {
      AWAY: { "平手":{t:52,w:61.54,r:73.5},"球半":{t:16,w:12.5,r:57.3},"受让半球/一球":{t:43,w:65.12,r:45.35},"受让一球/球半":{t:17,w:76.47,r:19.22},"受让半球":{t:44,w:54.55,r:10.29},"半球":{t:30,w:43.33,r:-24.84},"一球":{t:17,w:29.41,r:-26.53},"受让平手/半球":{t:46,w:41.3,r:-29},"受让一球":{t:33,w:57.58,r:-31.56},"平手/半球":{t:44,w:31.82,r:-51.77},"半球/一球":{t:26,w:15.38,r:-98.87} },
      DRAW: { "受让平手/半球":{t:18,w:38.89,r:64.06},"半球":{t:25,w:24,r:35.1},"平手/半球":{t:38,w:34.21,r:-23.33},"半球/一球":{t:33,w:33.33,r:-54.42},"平手":{t:32,w:12.5,r:-99.52} },
      HOME: { "受让半球":{t:17,w:29.41,r:13.48},"一球/球半":{t:69,w:73.91,r:12.22},"球半":{t:71,w:74.65,r:6.61},"两球":{t:25,w:76,r:-3.76},"一球":{t:82,w:59.76,r:-6.51},"平手":{t:28,w:50,r:-11.35},"半球/一球":{t:77,w:54.55,r:-11.45},"半球":{t:69,w:50.72,r:-14.88},"平手/半球":{t:78,w:48.72,r:-18.74},"球半/两球":{t:43,w:65.12,r:-18.96},"受让平手/半球":{t:37,w:24.32,r:-50.7} }
    },
    T1H: {
      AWAY: { "受让半球/一球":{t:35,w:65.71,r:23.69},"半球":{t:22,w:36.36,r:23.13},"受让平手/半球":{t:51,w:41.18,r:20.91},"受让一球/球半":{t:20,w:80,r:18.17},"受让一球":{t:45,w:66.67,r:10.53},"受让半球":{t:60,w:53.33,r:1.92},"受让球半":{t:19,w:78.95,r:1.42},"平手/半球":{t:31,w:38.71,r:-33.78},"一球/球半":{t:16,w:12.5,r:-51},"平手":{t:37,w:18.92,r:-77.97},"半球/一球":{t:28,w:25,r:-97.13} },
      DRAW: { "半球":{t:27,w:37.04,r:27.72},"受让平手/半球":{t:23,w:34.78,r:5.46},"平手/半球":{t:31,w:25.81,r:-40.5},"半球/一球":{t:30,w:33.33,r:-45},"受让半球":{t:20,w:15,r:-45.61},"平手":{t:30,w:23.33,r:-98.35} },
      HOME: { "一球":{t:87,w:62.07,r:6.76},"平手":{t:36,w:41.67,r:5.7},"两球":{t:24,w:83.33,r:2.55},"一球/球半":{t:67,w:65.67,r:-1.76},"平手/半球":{t:82,w:51.22,r:-1.85},"半球":{t:85,w:58.82,r:-2.54},"球半/两球":{t:39,w:79.49,r:-6.54},"半球/一球":{t:53,w:60.38,r:-8.18},"两球/两球半":{t:24,w:70.83,r:-16.94},"球半":{t:56,w:62.5,r:-18.16},"受让半球/一球":{t:20,w:20,r:-47.42},"受让平手/半球":{t:39,w:28.21,r:-51.1} }
    }
  },
  N4: {
    OPEN: {
      AWAY: { "半球/一球":{t:30,w:33.33,r:75.7},"受让半球/一球":{t:40,w:67.5,r:23.18},"受让半球":{t:37,w:54.05,r:14.23},"受让一球/球半":{t:27,w:62.96,r:-6.09},"受让一球":{t:35,w:51.43,r:-6.9},"平手":{t:38,w:42.11,r:-8},"一球":{t:24,w:25,r:-11.11},"受让平手/半球":{t:41,w:46.34,r:-47.2},"平手/半球":{t:32,w:31.25,r:-50.19} },
      DRAW: { "一球":{t:25,w:40,r:18.24},"受让平手/半球":{t:22,w:27.27,r:13.1},"半球/一球":{t:21,w:23.81,r:-20.08},"平手/半球":{t:19,w:31.58,r:-27.59},"平手":{t:22,w:27.27,r:-40.13},"受让半球":{t:15,w:13.33,r:-97.7} },
      HOME: { "半球/一球":{t:75,w:68,r:18.13},"球半":{t:41,w:78.05,r:12.08},"平手/半球":{t:54,w:48.15,r:1.98},"两球/两球半":{t:24,w:83.33,r:0.53},"两球":{t:37,w:81.08,r:-2.11},"球半/两球":{t:28,w:71.43,r:-6.83},"半球":{t:63,w:50.79,r:-7.42},"一球/球半":{t:68,w:55.88,r:-8.33},"受让半球":{t:29,w:48.28,r:-11.17},"一球":{t:74,w:54.05,r:-19.55},"平手":{t:27,w:48.15,r:-26.12},"受让平手/半球":{t:33,w:48.48,r:-31.54} }
    },
    T1H: {
      AWAY: { "受让平手/半球":{t:35,w:51.43,r:36.64},"半球":{t:25,w:32,r:23.99},"受让半球":{t:35,w:57.14,r:6.72},"受让一球/球半":{t:57,w:61.4,r:4.82},"受让一球":{t:31,w:48.39,r:0.37},"平手/半球":{t:26,w:42.31,r:-12.48},"半球/一球":{t:24,w:20.83,r:-27.15},"受让半球/一球":{t:35,w:51.43,r:-33.67},"平手":{t:34,w:38.24,r:-96.73} },
      DRAW: { "受让半球":{t:15,w:26.67,r:124.92},"平手/半球":{t:27,w:18.52,r:-40.7},"一球":{t:18,w:22.22,r:-45.75},"受让平手/半球":{t:29,w:34.48,r:-48.66},"半球/一球":{t:19,w:26.32,r:-98.5},"平手":{t:24,w:20.83,r:-98.81} },
      HOME: { "受让半球":{t:19,w:52.63,r:57.71},"一球":{t:90,w:66.67,r:13.07},"一球/球半":{t:84,w:66.67,r:3.45},"平手/半球":{t:50,w:48,r:0.56},"球半/两球":{t:26,w:76.92,r:-1.18},"半球":{t:66,w:50,r:-3.83},"球半":{t:39,w:66.67,r:-8.55},"平手":{t:34,w:50,r:-9.51},"两球/两球半":{t:22,w:77.27,r:-10.77},"两球":{t:33,w:69.7,r:-20.31},"半球/一球":{t:61,w:52.46,r:-21.85},"受让平手/半球":{t:33,w:42.42,r:-40.36} }
    }
  }
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
// QUANTITATIVE PROCESSING (V33: 5D平穩度大腦 + 修正載入邏輯)
// =====================================================================
function processQuant(matchId: string, matchInfo?: MatchInfo): AnalysisResult | null {
  const league = matchInfo?.league || W.matchname_f || W.matchname || "未知賽事";
  const homeTeam = matchInfo?.home || W.hometeam_f || W.hometeam || "主隊";
  const awayTeam = matchInfo?.away || W.guestteam_f || W.guestteam || "客隊";
  
  const rawGame: string[] = W.game;
  if (!rawGame || !Array.isArray(rawGame)) return null;

  // 1. 計算開賽時間 (Kickoff Time) - UTC+0 解析
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
      if (kDate.getTime() < now.getTime() - 12 * 3600000) {
        kDate.setDate(kDate.getDate() + 1);
      }
      kickoffTs = kDate.getTime() / 1000;
    }
  }

  const T_MINUS_3H_TS = kickoffTs > 0 ? kickoffTs - (3 * 3600) : Date.now() / 1000;
  const T_MINUS_1H_TS = kickoffTs > 0 ? kickoffTs - (1 * 3600) : Date.now() / 1000;

  // 2. 莊家數據清洗
  type OP = { h: number; d: number; a: number; ts: number };
  const bookies: Record<string, OP[]> = {};

  for (const item of rawGame) {
    if (!item) continue;
    const p = (typeof item === "string" ? item : String(item)).split("|");
    if (p.length < 13) continue;

    const bId = p[0];
    const oH = parseFloat(p[3]), oD = parseFloat(p[4]), oA = parseFloat(p[5]);
    const cH = parseFloat(p[10]), cD = parseFloat(p[11]), cA = parseFloat(p[12]);

    if ([oH, oD, oA, cH, cD, cA].some((v) => isNaN(v) || v <= 0)) continue;

    let lastTs = Date.now() / 1000;
    if (p[20]) {
      const dp = p[20].split(",");
      if (dp.length >= 3) {
        const yr = parseInt(dp[0]);
        const [mo, dy] = dp[1].split("-");
        const hr = parseInt(dp[2]);
        const parsed = new Date(yr, parseInt(mo) - 1, parseInt(dy), isNaN(hr) ? 0 : hr).getTime() / 1000;
        if (!isNaN(parsed)) lastTs = parsed;
      }
    }

    const oMargin = 1 / oH + 1 / oD + 1 / oA;
    if ((1 / oMargin) * 100 < 88) continue;

    bookies[bId] = [
      { h: oH, d: oD, a: oA, ts: kickoffTs - (24 * 3600) }, 
      { h: cH, d: cD, a: cA, ts: lastTs }, 
    ];
  }

  const numB = Object.keys(bookies).length;
  if (numB === 0) return null;

  // 3. T-3H 與 T-1H 歷史快照提取 (V33 平穩度邏輯)
  const probShifts = { h: [] as number[], d: [] as number[], a: [] as number[] };
  const stabilityShifts = { h: [] as number[], d: [] as number[], a: [] as number[] };
  const avgO = { h: 0, d: 0, a: 0 };
  const avgT3 = { h: 0, d: 0, a: 0 }; 

  for (const bId in bookies) {
    const hist = bookies[bId];
    const o = hist[0];
    
    let snapshotT3 = hist[0]; 
    let snapshotT1 = hist[0];

    for (const tick of hist) {
      if (tick.ts <= T_MINUS_3H_TS) snapshotT3 = tick;
      if (tick.ts <= T_MINUS_1H_TS) snapshotT1 = tick;
    }
    
    if (Date.now() / 1000 < T_MINUS_3H_TS) snapshotT3 = hist[hist.length - 1]; 
    if (Date.now() / 1000 < T_MINUS_1H_TS) snapshotT1 = hist[hist.length - 1]; 

    const oP = calcImpliedProb(o.h, o.d, o.a);
    const t3P = calcImpliedProb(snapshotT3.h, snapshotT3.d, snapshotT3.a);
    const t1P = calcImpliedProb(snapshotT1.h, snapshotT1.d, snapshotT1.a);
    
    probShifts.h.push(t3P.ph - oP.ph);
    probShifts.d.push(t3P.pd - oP.pd);
    probShifts.a.push(t3P.pa - oP.pa);
    
    stabilityShifts.h.push(t1P.ph - t3P.ph);
    stabilityShifts.d.push(t1P.pd - t3P.pd);
    stabilityShifts.a.push(t1P.pa - t3P.pa);
    
    avgO.h += o.h; avgO.d += o.d; avgO.a += o.a;
    avgT3.h += snapshotT3.h; avgT3.d += snapshotT3.d; avgT3.a += snapshotT3.a;
  }

  const avgSH = (probShifts.h.reduce((a, b) => a + b, 0) / numB) * 100;
  const avgSD = (probShifts.d.reduce((a, b) => a + b, 0) / numB) * 100;
  const avgSA = (probShifts.a.reduce((a, b) => a + b, 0) / numB) * 100;

  avgO.h /= numB; avgO.d /= numB; avgO.a /= numB;
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

// =====================================================================
  // 4. ML 預測與機率校正 (V33: 真實 5 維度對齊)
  // =====================================================================
  const consensusCount = probShifts[targetKey].filter((p) => p > 0.002).length;
  const consensusRate = consensusCount / numB; 
  
  const marginT3 = 1 / avgT3.h + 1 / avgT3.d + 1 / avgT3.a;
  const marketMarginPct = (marginT3 - 1) * 100;
  const impliedProbT3 = (1 / targetT3Odds) / marginT3; 

  // 正確的 5D 特徵陣列，傳遞給 ML 模型
  const features = [consensusRate, targetShift, marketMarginPct, targetT3Odds, targetStabilityShift];
  
  let rawMLProb = impliedProbT3; 
  let isMLActive = false;

  // 直接使用從 rf_model.js import 進來的 predictML
  try {
    if (typeof predictML === "function") {
      rawMLProb = predictML(features); // 傳入 5 維特徵
      isMLActive = true;
    }
  } catch (e) {
    console.warn("ML Model 執行失敗，回退至基礎統計", e);
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
     if (consensusRate >= 0.90 && targetShift >= 4.0 && targetStabilityShift > -1.0) {
         ourProb = impliedProbT3 * (1 + marketMarginPct / 100) + 0.04;
     }
  }

  ourProb = Math.max(0.01, Math.min(0.95, ourProb));
  
  const ev = ourProb * (targetT3Odds - 1) - (1 - ourProb);
  const evPct = ev * 100;

  const bOdds = targetT3Odds - 1;
  const kelly = bOdds > 0 ? (bOdds * ourProb - (1 - ourProb)) / bOdds : 0;
  const stake = Math.max(0, (kelly / 4) * 100); 

  // =====================================================================
  // 5. OOS 政體過濾與狀態判定
  // =====================================================================
  let tsActionLabel = "等待中 (Pass)";
  let tsActionClass = "text-slate-500 border-slate-800 bg-slate-900/50";
  let showStake = false;

  const currentDiffHours = (kickoffTs - (Date.now()/1000)) / 3600;
  let timeStatusLabel = currentDiffHours > 3 ? `距離開賽 ${currentDiffHours.toFixed(1)}h` 
                      : currentDiffHours > 1 ? `等待臨場平穩度 (T-1H) 驗證` 
                      : currentDiffHours > 0 ? `臨場 ${currentDiffHours.toFixed(1)}h (已過 T-1H)` 
                      : `事後回測`;

  const favSide = avgT3.h < avgT3.a ? "h" : "a";
  const isFav = (targetKey === favSide);

  if (targetKey === "d") {
    tsActionLabel = "⚠️ 模型封印: 放棄和局 (歷史回測低效區)";
    tsActionClass = "text-slate-500 border-slate-700/50 bg-slate-800/30";
  } 
  else if (!isFav && targetT3Odds >= 3.0) {
    tsActionLabel = `⛔ 放棄: 弱勢高賠陷阱 (${targetT3Odds.toFixed(2)}) 歷史深度虧損`;
    tsActionClass = "text-red-400 border-red-900/50 bg-red-950/40";
  } 
  else if (targetT3Odds > 15.0) {
    tsActionLabel = `⛔ 放棄: 極端長波雜訊`;
    tsActionClass = "text-red-400 border-red-900/50 bg-red-950/40";
  } 
  else if (evPct > 3.0) {
    const isGoldMine = (targetKey === 'a' && favSide === 'a' && targetT3Odds >= 2.0 && targetT3Odds <= 3.0) || 
                       (targetKey === 'h' && favSide === 'h' && targetT3Odds >= 1.5 && targetT3Odds <= 3.0);
    
    if (isGoldMine) {
        tsActionLabel = `💎 S級金礦狙擊: 鎖定 ${macroTarget} (+${evPct.toFixed(1)}%)`;
        tsActionClass = "text-yellow-400 border-yellow-500/80 bg-yellow-950/50 animate-pulse-glow";
    } else {
        tsActionLabel = `🎯 A級狙擊確認: 鎖定 ${macroTarget} (+${evPct.toFixed(1)}%)`;
        tsActionClass = "text-emerald-400 border-emerald-500/50 bg-emerald-950/40";
    }

    showStake = true;
    
    if (currentDiffHours > 1.0) {
      tsActionLabel = `🔭 提早埋伏: ${macroTarget} (等待 T-1H 平穩度)`;
      tsActionClass = "text-blue-400 border-blue-900/50 bg-blue-950/40";
      showStake = false;
    }
  } 
  else if (evPct > 0) {
    tsActionLabel = `⚡ ML 觀察中: ${macroTarget} (+${evPct.toFixed(1)}%)`;
    tsActionClass = "text-amber-400 border-amber-900/50 bg-amber-950/40";
  } 
  else {
    tsActionLabel = `❌ 莊家優勢: 無套利空間 (EV: ${evPct.toFixed(2)}%)`;
  }

// =====================================================================
  // 6. UI 附加元素：預期值 Tooltip 與 T-1H 定案提示 (融合亞盤避雷針)
  // =====================================================================
  let tooltipHTML = "";
  if (evPct > 3.0 && !(!isFav && targetT3Odds >= 3.0) && targetT3Odds <= 15.0 && targetKey !== "d") {
    const isGoldMine = (targetKey === 'a' && favSide === 'a' && targetT3Odds >= 2.0 && targetT3Odds <= 3.0) || 
                       (targetKey === 'h' && favSide === 'h' && targetT3Odds >= 1.5 && targetT3Odds <= 3.0);
    
    // 動態生成對應方向的亞盤避雷指南
    let asianFilterHTML = "";
    if (macroTarget === "AWAY") {
      asianFilterHTML = `
        <div class="mt-2 pt-2 border-t border-slate-700/50">
          <div class="text-[10px] font-bold text-cyan-400 mb-1">⚡ 亞盤 T1H 二次過濾指南</div>
          <div class="space-y-1 text-[9px] leading-tight">
            <div><span class="text-emerald-400 font-bold">💎 必買:</span> 客隊 <b class="text-white">受让一球(或以上)</b> (ROI+25%)</div>
            <div><span class="text-red-400 font-bold">🚫 誘盤:</span> 客隊 <b class="text-white">受让平/半</b> 或更淺 (ROI-39%)</div>
          </div>
        </div>`;
    } else if (macroTarget === "HOME") {
      asianFilterHTML = `
        <div class="mt-2 pt-2 border-t border-slate-700/50">
          <div class="text-[10px] font-bold text-yellow-400 mb-1">⚡ 亞盤 T1H 二次過濾指南</div>
          <div class="space-y-1 text-[9px] leading-tight">
            <div><span class="text-emerald-400 font-bold">💎 必買:</span> 主場深讓 <b class="text-white">半/一</b> 或 <b class="text-white">一球</b> (穩膽)</div>
            <div><span class="text-red-400 font-bold">🚫 殺豬:</span> 主場淺讓 <b class="text-white">平/半</b> (贏半輸全, ROI-37%)</div>
          </div>
        </div>`;
    }

    const grade = isGoldMine ? "S級" : "A級";
    const acc = isGoldMine ? "58.7%" : "54.1%";
    const roiStr = isGoldMine ? "+18.1%" : "+5.6%";
    const desc = isGoldMine ? "📌 強勢方動能穩定，莊家補償不足。" : "📌 特徵對齊完畢，已過濾高方差雜訊。";
    const borderColor = isGoldMine ? "border-yellow-600/60" : "border-emerald-600/60";
    const titleColor = isGoldMine ? "text-yellow-400 border-yellow-900/50" : "text-emerald-400 border-emerald-900/50";

    tooltipHTML = `
      <div class="absolute bottom-full left-0 mb-2 w-64 p-2.5 bg-slate-900 border ${borderColor} rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        <div class="text-[11px] font-bold ${titleColor} mb-1 pb-1">📊 OOS 盲測預期值 (${grade})</div>
        <div class="text-[10px] text-slate-300 space-y-1">
          <div class="flex justify-between"><span>歷史勝率 (ACC):</span> <span class="text-white font-bold">${acc}</span></div>
          <div class="flex justify-between"><span>預期投資報酬:</span> <span class="text-emerald-400 font-bold">${roiStr}</span></div>
          <div class="text-slate-400 mt-1">${desc}</div>
          <div class="text-[8px] text-slate-500 mt-1.5">* 數據基於 3438 場樣本外盲測</div>
        </div>
        ${asianFilterHTML}
      </div>
    `;
  }
  let lockNotice = "";
  if (currentDiffHours <= 1.0 && currentDiffHours > 0) {
    lockNotice = `<div class="text-[10px] text-purple-400 mt-2 flex items-center gap-1.5"><span class="animate-pulse">🔒</span> <b>訊號已於 T-1H 鎖定定案，可執行交易。</b></div>`;
  } else if (currentDiffHours > 1.0) {
    lockNotice = `<div class="text-[10px] text-slate-500 mt-2 flex items-center gap-1.5">⏳ <b>注意：</b>將於開賽前 1 小時 (T-1H) 收集平穩度後定案。</div>`;
  }

  // =====================================================================
  // 7. 最終 HTML 生成
  // =====================================================================
  const now = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  
  let html = `
    <div class="mb-3 bg-slate-950/80 rounded-xl border ${evPct > 3.0 && targetKey !== "d" && targetT3Odds <= 15 && currentDiffHours <= 1.0 ? 'border-emerald-600/40 shadow-[0_0_12px_rgba(34,197,94,0.15)]' : 'border-slate-800'} overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/[0.04]">
        <div class="text-[13px] text-slate-200">🚩 <b>${league}</b> | ${homeTeam} <span class="text-slate-600">vs</span> ${awayTeam}</div>
        <span class="text-[10px] text-slate-600 font-mono">${now} | ID:${matchId}</span>
      </div>
      
      <div class="p-3 space-y-3">
        <div class="text-[11px] leading-relaxed">
          <div class="font-bold mb-1 flex items-center justify-between ${isMLActive ? 'text-purple-400' : 'text-slate-400'}">
             <span>${isMLActive ? '🧠 Edge AI (V33 100樹 + 平穩度)' : '⚠️ ML 模型未載入 (使用基礎統計)'}</span>
             <span class="text-slate-500 font-normal">抽水: ${(marketMarginPct).toFixed(1)}%</span>
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

        <div class="rounded-lg border ${tsActionClass} px-3 py-2 mt-2">
          <div class="flex justify-between items-center mb-1">
            <div class="text-[11px] font-bold text-slate-400">🕒 狀態</div>
            <div class="text-[10px] font-bold px-1.5 py-0.5 rounded ${currentDiffHours <= 3 && currentDiffHours > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}">${timeStatusLabel}</div>
          </div>
          
          <div class="relative inline-block group cursor-help">
            <div class="text-[14px] font-black flex items-center gap-1">
              ${tsActionLabel} 
              ${tooltipHTML !== "" ? `<span class="text-slate-500 text-[11px] font-normal hover:text-white transition-colors border border-slate-600 rounded-full w-4 h-4 flex items-center justify-center bg-slate-800/50">ⓘ</span>` : ''}
            </div>
            ${tooltipHTML}
          </div>

          ${showStake ? `
            <div class="text-[11px] text-slate-300 mt-1.5 pt-1.5 border-t border-white/[0.05]">
               🎯 建議: <b class="${mlColor}">${targetName}</b> @ <b class="text-white">${targetT3Odds.toFixed(2)}</b>
               | 1/4 Kelly: <b class="text-cyan-400">${stake.toFixed(1)}%</b>
            </div>
          ` : ''}
          
          ${lockNotice}
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
  
  // UI 控制
  const [panelMode, setPanelMode] = useState<"CLOSED" | "SLICER" | "ASIAN">("CLOSED");
  
  // Slicer 狀態 (切片手術刀)
  const [slTarget, setSlTarget] = useState("AWAY");
  const [slFav, setSlFav] = useState("Home");
  const [slCross, setSlCross] = useState("----");
  const [slPatL, setSlPatL] = useState("持續降賠");
  const [slPatM, setSlPatM] = useState("A<B<C");

  // Asian X-Ray 狀態 (亞盤透視鏡)
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

  const consoleRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef(false);

  const print = useCallback((html: string) => setLines((p) => [html, ...p]), []);
  const clearConsole = useCallback(() => setLines([...BOOT_LINES]), []);

  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = 0;
  }, [lines]);

  const lgEntries = useMemo(() => Object.entries(leagueGroups), [leagueGroups]);

  async function handleFetchLeagues() {
    setIsLoading(true);
    print('<span class="text-xs text-slate-500">[系統] DOM Script Injection 請求中...</span>');
    W.A = undefined; W.B = undefined;
    try {
      try { await injectScript("https://live.nowscore.com/data/bf.js"); } 
      catch { await injectScript("https://v.nowscore.com/data/bf.js"); }
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
    W.game = undefined;
    try {
      try { await injectScript(`https://1x2.nowscore.com/${matchId}.js`); } 
      catch { await injectScript(`https://1x2d.nowscore.com/${matchId}.js`); }
    } catch { return null; }

    const result = processQuant(matchId, matchInfo);
    if (!silent && result) print(result.htmlOutput);
    return result;
  }

  async function handleLeagueScan(league: string) {
    if (scanRef.current) return;
    const list = leagueGroups[league];
    if (!list?.length) return;
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
              <p className="text-[10px] text-slate-500">100樹五維模型 + 亞盤 1D 透視鏡 (PINNACLE_ID: {PINNACLE_ID})</p>
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

          <div className={`glass flex flex-col overflow-hidden rounded-xl border border-white/[0.06] transition-all duration-500 ${panelMode !== 'CLOSED' ? "lg:col-span-2" : "lg:col-span-3"}`}>
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

          <div className={`glass flex flex-col overflow-hidden rounded-xl border border-white/[0.06] transition-all duration-500 ${panelMode !== 'CLOSED' ? "lg:col-span-1" : "lg:col-span-0 lg:w-12"}`}>
            <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-2 shrink-0">
              {panelMode !== 'CLOSED' ? (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPanelMode('SLICER')} className={`text-[11px] font-bold px-2 py-1 rounded transition-colors ${panelMode === 'SLICER' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-white'}`}>手術刀</button>
                  <button onClick={() => setPanelMode('ASIAN')} className={`text-[11px] font-bold px-2 py-1 rounded transition-colors ${panelMode === 'ASIAN' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-500 hover:text-white'}`}>亞盤透視</button>
                </div>
              ) : (
                <span className="text-[10px] text-slate-600 font-bold ml-1">展</span>
              )}
              <button
                onClick={() => setPanelMode(panelMode !== 'CLOSED' ? 'CLOSED' : 'ASIAN')}
                className="rounded border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-400 hover:bg-white/[0.06] hover:text-white"
              >
                {panelMode !== 'CLOSED' ? "收起" : "開"}
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
                    <label className="mb-1 block text-[10px] text-slate-500">1. ML 預測目標</label>
                    <div className="flex gap-1">
                      <button onClick={() => setSlTarget('HOME')} className={`flex-1 rounded border px-2 py-1 text-[11px] font-bold transition-all ${slTarget === 'HOME' ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'}`}>HOME</button>
                      <button onClick={() => setSlTarget('DRAW')} className={`flex-1 rounded border px-2 py-1 text-[11px] font-bold transition-all ${slTarget === 'DRAW' ? 'border-purple-500 bg-purple-500/20 text-purple-400' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'}`}>DRAW</button>
                      <button onClick={() => setSlTarget('AWAY')} className={`flex-1 rounded border px-2 py-1 text-[11px] font-bold transition-all ${slTarget === 'AWAY' ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'}`}>AWAY</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
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
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] text-slate-500">4. 臨場型態 (Pat_L)</label>
                      <select value={slPatL} onChange={(e) => setSlPatL(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-[5px] text-[12px] font-bold text-white outline-none">
                        <option value="持續降賠">持續降賠</option><option value="深V洗盤">深V洗盤</option>
                        <option value="倒V型">倒V型</option><option value="階梯式降">階梯式降</option>
                        <option value="末期暴跳">末期暴跳</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-slate-500">5. 資金共識 (Pat_M)</label>
                      <select value={slPatM} onChange={(e) => setSlPatM(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-[5px] text-[12px] font-bold text-white outline-none">
                        <option value="A<B<C">A&lt;B&lt;C</option><option value="A>B>C">A&gt;B&gt;C</option>
                        <option value="A>B<C">A&gt;B&lt;C</option><option value="A<B>C">A&lt;B&gt;C</option>
                        <option value="晚期加速">晚期加速</option><option value="早期死水">早期死水</option>
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
                          {slicerResult.traps.map((t: any, i: number) => (
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
                          {slicerResult.golden.map((g: any, i: number) => (
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
                    <div className="py-8 text-center text-[11px] text-slate-500">尚未觸發任何時序規則 <br /> 請調整上方參數</div>
                  )}
                </div>
              </div>
            )}

            {/* 面板 2: 亞盤透視鏡 (UI 已優化為按鈕版) */}
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