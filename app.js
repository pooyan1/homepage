/* ================= P.BLACKCHAIN — استیکینگ داشبورد ================= */
/* دیتای قیمت‌ها به‌صورت اتوماتیک و رایگان از CoinGecko API گرفته می‌شود. */

"use strict";

/* ---------- لیست ارزهای استیکینگ (نماد کوین‌گکو + نرخ استیکینگ) ---------- */
const COINS = [
  { id: "bitcoin",           sym: "BTC",  fa: "بیت‌کوین",        staking: 2.30, type: "PoW"   },
  { id: "ethereum",          sym: "ETH",  fa: "اتریوم",          staking: 4.85, type: "PoS"   },
  { id: "solana",            sym: "SOL",  fa: "سولانا",          staking: 6.45, type: "PoS"   },
  { id: "sui",               sym: "SUI",  fa: "سویی",           staking: 4.10, type: "PoS"   },
  { id: "binancecoin",       sym: "BNB",  fa: "بایننس‌کوین",     staking: 5.00, type: "PoS"   },
  { id: "cardano",           sym: "ADA",  fa: "کاردانو",         staking: 7.50, type: "PoS"   },
  { id: "tron",              sym: "TRX",  fa: "ترون",            staking: 5.85, type: "PoS"   },
  { id: "polkadot",          sym: "DOT",  fa: "پولکادات",        staking: 11.0, type: "PoS"   },
  { id: "aptos",             sym: "APT",  fa: "آپتوس",           staking: 9.50, type: "PoS"   },
  { id: "dogecoin",          sym: "DOGE", fa: "دوج‌کوین",        staking: 5.20, type: "PoW"   },
  { id: "ripple",            sym: "XRP",  fa: "ریپل",            staking: 4.75, type: "RPC"   },
  { id: "litecoin",          sym: "LTC",  fa: "لایت‌کوین",       staking: 3.90, type: "PoW"   },
  { id: "tezos",             sym: "XTZ",  fa: "تزوس",            staking: 5.50, type: "PoS"   },
  { id: "near",              sym: "NEAR", fa: "نیر",             staking: 6.80, type: "PoS"   },
  { id: "avalanche-2",       sym: "AVAX", fa: "آوالانچ",         staking: 7.00, type: "PoS"   },
  { id: "fantom",            sym: "FTM",  fa: "فانتوم",          staking: 8.20, type: "PoS"   },
  { id: "axie-infinity",     sym: "AXS",  fa: "اکسی اینفینیتی",  staking: 5.90, type: "PoS"   },
  { id: "chiliz",            sym: "CHZ",  fa: "چیلیز",           staking: 6.10, type: "PoS"   },
  { id: "pancakeswap-token", sym: "CAKE", fa: "پنکیک‌سواپ",      staking: 7.20, type: "DeFi"  },
  { id: "polygon-ecosystem-token", sym: "POL", fa: "پالیگان (MATIC)", staking: 4.90, type: "PoS" },
  { id: "enjincoin",         sym: "ENJ",  fa: "انجین",           staking: 5.25, type: "PoS"   },
  { id: "algorand",          sym: "ALGO", fa: "الگوراند",        staking: 6.40, type: "PoS"   },
  { id: "the-graph",         sym: "GRT",  fa: "گراف",            staking: 6.00, type: "DeFi"  },
  { id: "iota",              sym: "IOTA", fa: "آیوتا",           staking: 5.10, type: "DAG"   },
  { id: "decentraland",      sym: "MANA", fa: "دیسنترالند",      staking: 5.75, type: "PoS"   },
  { id: "the-sandbox",       sym: "SAND", fa: "سندباکس",         staking: 6.20, type: "PoS"   },
];

const CG_API = "https://api.coingecko.com/api/v3/coins/markets";
const REFRESH_MS = 60 * 1000;          // بروزرسانی خودکار هر ۶۰ ثانیه
let lastData = null;
let sortKey = null, sortDir = 1;

/* ---------- ابزارها ---------- */
const $ = (s) => document.querySelector(s);

function fmtPrice(v) {
  if (v == null) return "—";
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 1)    return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}
function fmtBig(v) {
  if (v == null) return "—";
  if (v >= 1e12) return (v / 1e12).toFixed(2) + " T";
  if (v >= 1e9)  return (v / 1e9).toFixed(2) + " B";
  if (v >= 1e6)  return (v / 1e6).toFixed(2) + " M";
  return Math.round(v).toLocaleString("en-US");
}

/* ---------- دریافت دیتا از CoinGecko (رایگان، بدون کلید) ---------- */
async function fetchPrices(showSpinner = true) {
  const ids = COINS.map((c) => c.id).join(",");
  const url = `${CG_API}?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`;
  try {
    if (showSpinner) setSyncStatus("در حال دریافت…", "syncing");
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    lastData = data;
    renderTable(data);
    renderStats(data);
    fillSearch();
    setSyncStatus("آخرین بروزرسانی: " + new Date().toLocaleTimeString("fa-IR"), "ok");
  } catch (e) {
    console.warn("خطا در دریافت دیتا:", e);
    if (lastData) {
      setSyncStatus("خطا در بروزرسانی — نمایش داده‌های قبلی", "warn");
    } else {
      // fallback: حداقل قیمت‌های دستی نشان داده شود تا جدول خالی نماند
      renderFallback();
      setSyncStatus("اتصال برقرار نشد — نمایش داده آفلاین", "warn");
    }
  }
}

/* ---------- رندر جدول ---------- */
function coinIcon(cg) {
  return cg.image ? `<img class="coin-img" src="${cg.image}" alt="" loading="lazy"
            onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'coin-fallback',textContent:'₿'}))">`
        : `<span class="coin-fallback">●</span>`;
}

function buildRows(data) {
  const map = new Map(data.map((d) => [d.id, d]));
  let rows = COINS.map((c, i) => {
    const d = map.get(c.id) || {};
    return {
      ...c,
      rank: d.market_cap_rank ?? i + 1,
      price: d.current_price ?? null,
      chg: d.price_change_percentage_24h ?? null,
      mcap: d.market_cap ?? null,
      vol: d.total_volume ?? null,
      apy: c.staking,
      earnPerDay: d.current_price != null ? (d.current_price * c.staking) / 365 : null,
    };
  });

  if (sortKey) {
    rows.sort((a, b) => ((a[sortKey] ?? -Infinity) - (b[sortKey] ?? -Infinity)) * sortDir);
  }
  const q = ($("#search").value || "").trim().toLowerCase();
  if (q) rows = rows.filter((r) => r.sym.toLowerCase().includes(q) || r.fa.includes(q));

  return rows.map((r, i) => {
    const chgCls = r.chg == null ? "" : r.chg >= 0 ? "up" : "down";
    const chgTxt = r.chg == null ? "—" : (r.chg >= 0 ? "▲ +" : "▼ ") + r.chg.toFixed(2) + "%";
    const earn = r.earnPerDay == null ? "—" : "$" + r.earnPerDay.toFixed(r.earnPerDay < 0.01 ? 6 : 4);
    return `<tr style="--d:${i * 25}ms">
      <td class="num">${i + 1}</td>
      <td class="coin-cell">${coinIcon(map.get(r.id) || {})}
        <div><b>${r.fa}</b><span class="sym">${r.sym}</span></div></td>
      <td class="num">$${fmtPrice(r.price)}</td>
      <td class="num ${chgCls}">${chgTxt}</td>
      <td class="apy"><span class="apy-badge">${r.apy.toFixed(2)}٪</span></td>
      <td class="num dim">${fmtBig(r.mcap)}</td>
      <td class="num dim">${fmtBig(r.vol)}</td>
      <td class="num earn">${earn}</td>
      <td><button class="calc-btn" data-sym="${r.sym}" data-price="${r.price ?? 0}" data-apy="${r.apy}">محاسبه</button></td>
    </tr>`;
  }).join("");
}

function renderTable(data) {
  $("#tbody").innerHTML = buildRows(data);
}

function renderFallback() {
  // وقتی اینترنت/API نیست — با همان ساختار ولی قیمت تقریبی ثابت
  const fake = COINS.map((c, i) => ({
    id: c.id, image: "", market_cap_rank: i + 1,
    current_price: null, price_change_percentage_24h: null, market_cap: null, total_volume: null,
  }));
  renderTable(fake);
}

/* ---------- کارت‌های آماری بالای صفحه ---------- */
function renderStats(data) {
  const eth = data.find((d) => d.id === "ethereum");
  const sol = data.find((d) => d.id === "solana");
  const dot = data.find((d) => d.id === "polkadot");
  const best = COINS.reduce((a, b) => (a.staking > b.staking ? a : b));
  $("#stat-eth").textContent  = eth  ? "$" + fmtPrice(eth.current_price)  : "—";
  $("#stat-sol").textContent  = sol  ? "$" + fmtPrice(sol.current_price)  : "—";
  $("#stat-dot").textContent  = dot  ? "$" + fmtPrice(dot.current_price)  : "—";
  $("#stat-best").textContent = best.sym + " · " + best.staking.toFixed(1) + "٪";
}

/* ---------- جستجو و مرتب‌سازی ---------- */
function fillSearch() {
  const list = $("#suggest");
  list.innerHTML = COINS.map((c) => `<option value="${c.sym}">`).join("") +
                   COINS.map((c) => `<option value="${c.fa}">`).join("");
}
$("#search").addEventListener("input", () => { if (lastData) renderTable(lastData); });
document.querySelectorAll("th[data-sort]").forEach((th) => {
  th.addEventListener("click", () => {
    const k = th.dataset.sort;
    sortDir = sortKey === k ? -sortDir : 1;
    sortKey = k;
    if (lastData) renderTable(lastData);
  });
});

/* ---------- وضعیت سینک ---------- */
function setSyncStatus(text, cls) {
  const el = $("#sync-status");
  el.textContent = text;
  el.className = "sync " + cls;
}

/* ---------- ماشین‌حساب سود استیکینگ ---------- */
function openCalc(sym, price, apy) {
  $("#calc-title").textContent = `💰 سود استیکینگ ${sym}`;
  $("#calc-symbol").textContent = sym;
  $("#calc-price").value = price || "";
  $("#calc-amount").value = 1000;
  $("#calc-days").value = 365;
  $("#calc-modal").classList.add("open");
  calcNow();
}
function closeCalc() { $("#calc-modal").classList.remove("open"); }
$("#calc-close").addEventListener("click", closeCalc);
$("#calc-modal").addEventListener("click", (e) => { if (e.target.id === "calc-modal") closeCalc(); });
["calc-price", "calc-amount", "calc-days"].forEach((id) => $("#" + id).addEventListener("input", calcNow));

function calcNow() {
  const p = parseFloat($("#calc-price").value) || 0;
  const amt = parseFloat($("#calc-amount").value) || 0;
  const days = parseFloat($("#calc-days").value) || 0;
  const apy = parseFloat($("#calc-apy").value) || 0;
  const profit = amt * (apy / 100) * (days / 365);
  const units = p > 0 ? amt / p : 0;
  $("#calc-profit").textContent = "$" + profit.toLocaleString("en-US", { maximumFractionDigits: 2 });
  $("#calc-total").textContent  = "$" + (amt + profit).toLocaleString("en-US", { maximumFractionDigits: 2 });
  $("#calc-units").textContent  = units > 0 ? units.toLocaleString("en-US", { maximumFractionDigits: 6 }) + " واحد ارز" : "";
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".calc-btn");
  if (btn) openCalc(btn.dataset.sym, parseFloat(btn.dataset.price), parseFloat(btn.dataset.apy));
});

/* ---------- شمارنده معکوس بروزرسانی ---------- */
let nextRefresh = Date.now() + REFRESH_MS;
setInterval(() => {
  const left = Math.max(0, Math.ceil((nextRefresh - Date.now()) / 1000));
  $("#countdown").textContent = left + "s";
}, 1000);

/* ---------- شروع ---------- */
fetchPrices();
setInterval(() => { fetchPrices(false); nextRefresh = Date.now() + REFRESH_MS; }, REFRESH_MS);
