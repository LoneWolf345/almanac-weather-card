/* Almanac Weather Card — an editorial, almanac-style weather panel for Home Assistant.
 * Sun and moon ride their real arc over a scenescape (desert or Appalachia) that
 * reacts to conditions in realtime; the scene darkens at night. 24-hour temp/precip
 * chart, conditions strip, week-ahead range bars.
 * https://github.com/LoneWolf345/almanac-weather-card
 */

const DAC_VERSION = "2026.8.6";

const INK = "#3a2d1f", CREAM = "#f6efdc", PAPER = "#f3e7d3", TAN = "#a3876a",
  BROWN = "#7a6248", TERRA = "#c65f38", AMBER = "#e8a03d", BLUE = "#5f7e94",
  DOT = "#cfb894", TRACK = "#e7d9bd", GRID = "#e0d0b4";

const COND_LABEL = {
  "clear-night": "Clear", sunny: "Sunny", partlycloudy: "Partly Cloudy", cloudy: "Cloudy",
  rainy: "Rain", pouring: "Pouring", lightning: "Lightning", "lightning-rainy": "Thunderstorms",
  snowy: "Snow", "snowy-rainy": "Wintry Mix", fog: "Fog", hail: "Hail",
  windy: "Windy", "windy-variant": "Windy", exceptional: "Severe",
};

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Ink-line glyphs, 22x22, stroke inherits */
const CLOUD = 'M6.5 14.5h9.5a3 3 0 0 0 .4-6 4.5 4.5 0 0 0-8.6-1.1 3.3 3.3 0 0 0-1.3 7.1Z';
const CLOUD_HI = 'M6.5 12h9.5a3 3 0 0 0 .4-6A4.5 4.5 0 0 0 7.8 4.9 3.3 3.3 0 0 0 6.5 12Z';
const SUN_G = '<circle cx="11" cy="11" r="4.2"/><path d="M11 2.5v2.2M11 17.3v2.2M2.5 11h2.2M17.3 11h2.2M5 5l1.5 1.5M15.5 15.5L17 17M17 5l-1.5 1.5M6.5 15.5L5 17"/>';
const WICONS = {
  sunny: SUN_G,
  "clear-night": '<path d="M13.5 3.2a7.2 7.2 0 1 0 5.3 12.6A8 8 0 0 1 13.5 3.2Z"/>',
  partlycloudy: '<circle cx="8" cy="8" r="3.2"/><path d="M8 2.2v1.6M2.2 8h1.6M3.9 3.9L5 5M13.8 8h-1.6"/><path d="M9.5 18.5h7a3 3 0 0 0 .4-6 4.5 4.5 0 0 0-8.6-1.1 3.3 3.3 0 0 0 1.2 7.1Z"/>',
  cloudy: `<path d="${CLOUD}"/>`,
  rainy: `<path d="${CLOUD_HI}"/><path d="M8 15v3M12 15v3M16 15v3"/>`,
  pouring: `<path d="${CLOUD_HI}"/><path d="M7 14.5v5M11 14.5v5M15 14.5v5"/>`,
  lightning: `<path d="${CLOUD_HI}"/><path d="M11.5 11 9.5 14.5h3l-2 3.5"/>`,
  "lightning-rainy": `<path d="${CLOUD_HI}"/><path d="M11 11 9 14.5h3l-2 3.5M15.5 14v3"/>`,
  snowy: `<path d="${CLOUD_HI}"/><path d="M8 15.5v.01M12 15v.01M16 15.5v.01M10 18.5v.01M14 18.5v.01" stroke-width="2.2"/>`,
  "snowy-rainy": `<path d="${CLOUD_HI}"/><path d="M8.5 15v3M15.5 15v3M12 15.5v.01M12 18.5v.01" stroke-width="2"/>`,
  fog: `<path d="${CLOUD_HI}"/><path d="M5 15.5h12M6.5 18.5h9"/>`,
  windy: '<path d="M3 8.5h9.5a2.6 2.6 0 1 0-2.6-2.6M3 13h13.5a2.6 2.6 0 1 1-2.6 2.6"/>',
  "windy-variant": '<path d="M3 8.5h9.5a2.6 2.6 0 1 0-2.6-2.6M3 13h13.5a2.6 2.6 0 1 1-2.6 2.6"/>',
  hail: `<path d="${CLOUD_HI}"/><path d="M8 16v.01M12 16.5v.01M16 16v.01" stroke-width="2.4"/>`,
  exceptional: '<path d="M11 3 20 19H2Z"/><path d="M11 9.5v4M11 16.2v.01" stroke-width="2"/>',
};
WICONS["windy-variant"] = WICONS.windy;
function wicon(cond, size, color) {
  const g = WICONS[cond] || WICONS.cloudy;
  return `<svg width="${size}" height="${size}" viewBox="0 0 22 22" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:block">${g}</svg>`;
}

/* ---- condition scene pieces (C2 sepia-outline clouds, Deck-2 cumulus field) ---- */
function cloudC2(x, y, s, main, edge, driftCls) {
  const R = (rx, ry, w, h, r) => `<rect x="${(rx * s).toFixed(1)}" y="${(ry * s).toFixed(1)}" width="${(w * s).toFixed(1)}" height="${(h * s).toFixed(1)}" rx="${(r * s).toFixed(1)}"/>`;
  const C = (cx, cy, r) => `<circle cx="${(cx * s).toFixed(1)}" cy="${(cy * s).toFixed(1)}" r="${(r * s).toFixed(1)}"/>`;
  return `<g transform="translate(${x},${y})"><g class="${driftCls}">
    <g fill="${edge}">${R(-44, -15, 88, 17, 8.5)}${C(-25, -16, 16)}${C(-2, -25, 21)}${C(21, -15, 16)}</g>
    <g fill="${main}">${R(-42, -13, 84, 15, 7.5)}${C(-25, -16, 14)}${C(-2, -25, 19)}${C(21, -15, 14)}</g>
  </g></g>`;
}
function cloudField(mU, eU, mL, eL) {
  return cloudC2(70, 34, 1.15, mU, eU, "dr1") + cloudC2(292, 28, 1.25, mU, eU, "dr2") + cloudC2(478, 38, 1.0, mU, eU, "dr3")
    + cloudC2(170, 74, 1.05, mL, eL, "dr2") + cloudC2(400, 80, 0.95, mL, eL, "dr1") + cloudC2(20, 84, 0.8, mL, eL, "dr3");
}
function rainLayer(heavy) {
  const L = [[40, 96], [88, 120], [136, 98], [184, 126], [232, 102], [280, 128], [328, 100], [376, 124], [424, 98], [472, 122], [64, 150], [160, 156], [256, 152], [352, 158], [448, 152], [112, 60], [208, 64], [304, 62], [400, 66], [496, 60]];
  const dx = heavy ? 6 : 4, len = heavy ? 18 : 16;
  const lines = L.map(([x, y]) => `<line x1="${x}" y1="${y}" x2="${x - dx}" y2="${y + len}"/>`).join("");
  return `<g clip-path="url(#daRainClip)"><g stroke="${BLUE}" stroke-width="${heavy ? 1.8 : 1.6}" stroke-linecap="round" opacity=".62" style="animation:da-rainfall ${heavy ? ".6s" : ".85s"} linear infinite">${lines}</g></g><clipPath id="daRainClip"><rect x="0" y="90" width="520" height="136"/></clipPath>`;
}
const BOLTS = `<path d="M150 84 L138 120 L152 118 L134 160 L162 116 L148 118 L162 84 Z" fill="#ffe9a8" style="animation:da-bolt1 7s linear infinite"/><path d="M382 88 L372 118 L384 116 L370 150 L392 114 L380 116 L392 88 Z" fill="#ffe9a8" style="animation:da-bolt2 7s linear infinite"/>`;
const DUST_LAYER = `<g stroke="#b3915d" stroke-width="2" stroke-linecap="round" fill="none">
<path d="M0 74 q 30 -8 60 0 t 60 0" opacity=".7" style="animation:da-gust 5s linear infinite"/>
<path d="M0 118 q 26 -7 52 0 t 52 0" opacity=".55" style="animation:da-gust 6.5s 1.2s linear infinite"/>
<path d="M0 46 q 22 -6 44 0 t 44 0" opacity=".45" style="animation:da-gust 4.2s 2s linear infinite"/>
<path d="M0 158 q 28 -7 56 0 t 56 0" opacity=".5" style="animation:da-gust 5.6s .6s linear infinite"/></g>
<g fill="#cfa96e"><g style="animation:da-puff 7s linear infinite"><ellipse cx="0" cy="96" rx="26" ry="8" opacity=".4"/></g>
<g style="animation:da-puff 9s 2.5s linear infinite"><ellipse cx="0" cy="140" rx="32" ry="9" opacity=".35"/></g>
<g style="animation:da-puff 6s 4s linear infinite"><ellipse cx="0" cy="60" rx="22" ry="7" opacity=".3"/></g></g>
<g style="animation:da-tumble 9s linear infinite"><g transform="translate(0,206)"><g style="animation:da-spin 1.6s linear infinite;transform-box:fill-box;transform-origin:center">
<circle r="9" fill="none" stroke="#8a6a3c" stroke-width="1.4"/><path d="M-6 -5 L6 5 M-6 5 L6 -5 M0 -9 L0 9 M-9 0 L9 0" stroke="#8a6a3c" stroke-width="1.1"/></g></g></g>`;
const HABOOB_LAYER = `<g style="animation:da-wallcreep 14s ease-in-out infinite">
<g style="animation:da-billow2 9s ease-in-out infinite;transform-box:fill-box;transform-origin:center"><path d="M300 226 L300 120 Q 316 70 356 76 Q 372 30 420 42 Q 470 18 520 40 L560 40 L560 226 Z" fill="#8f5c30"/></g>
<g style="animation:da-billow1 7s ease-in-out infinite;transform-box:fill-box;transform-origin:center" fill="#a76f3e"><ellipse cx="352" cy="120" rx="42" ry="52"/><ellipse cx="396" cy="86" rx="46" ry="48"/><ellipse cx="452" cy="62" rx="52" ry="46"/><ellipse cx="512" cy="50" rx="56" ry="48"/><ellipse cx="380" cy="176" rx="52" ry="56"/><ellipse cx="446" cy="150" rx="58" ry="62"/><ellipse cx="512" cy="130" rx="60" ry="66"/></g>
<g style="animation:da-billow2 6s .8s ease-in-out infinite;transform-box:fill-box;transform-origin:center" fill="#c08a4d"><ellipse cx="330" cy="196" rx="38" ry="34"/><ellipse cx="342" cy="146" rx="30" ry="28"/><ellipse cx="368" cy="110" rx="26" ry="24"/><ellipse cx="398" cy="70" rx="26" ry="22"/><ellipse cx="436" cy="44" rx="28" ry="20"/></g>
<g fill="#d3a566" opacity=".85"><ellipse cx="316" cy="220" rx="46" ry="14"/><ellipse cx="380" cy="222" rx="60" ry="16"/><ellipse cx="470" cy="220" rx="70" ry="18"/></g></g>
<g stroke="#c99e5f" stroke-width="2" stroke-linecap="round" opacity=".7">
<g style="animation:da-duststream 3.2s linear infinite"><path d="M470 100 h-36 M498 140 h-30 M480 180 h-40 M508 60 h-26"/></g>
<g style="animation:da-duststream 4.4s 1.1s linear infinite"><path d="M460 120 h-30 M492 160 h-34 M476 76 h-28"/></g></g>`;
const SAGUARO = (color) => `<g stroke="${color}" stroke-linecap="round" stroke-linejoin="round" fill="none">
<path d="M96 224 V 184" stroke-width="7.5"/><path d="M96 202 H 86 V 190" stroke-width="6"/><path d="M96 208 H 106 V 198" stroke-width="6"/>
<path d="M431 224 V 196" stroke-width="6"/><path d="M431 208 H 423 V 199" stroke-width="5"/></g>`;
const SPRUCES = (color) => `<g fill="${color}">
<g transform="translate(84,212)"><path d="M0 -30 L7 -16 L-7 -16 Z M0 -22 L9 -7 L-9 -7 Z M0 -13 L11 2 L-11 2 Z"/><rect x="-1.5" y="2" width="3" height="5"/></g>
<g transform="translate(108,216)"><path d="M0 -24 L6 -13 L-6 -13 Z M0 -17 L7.5 -5 L-7.5 -5 Z M0 -10 L9 2 L-9 2 Z"/><rect x="-1.2" y="2" width="2.4" height="4"/></g>
<g transform="translate(438,210)"><path d="M0 -32 L7.5 -17 L-7.5 -17 Z M0 -23 L9.5 -7 L-9.5 -7 Z M0 -13 L11.5 2 L-11.5 2 Z"/><rect x="-1.5" y="2" width="3" height="5"/></g>
<g transform="translate(414,215)"><path d="M0 -21 L5.5 -11 L-5.5 -11 Z M0 -15 L7 -4 L-7 -4 Z M0 -8 L8.5 2 L-8.5 2 Z"/><rect x="-1.2" y="2" width="2.4" height="4"/></g></g>`;
const SPRUCE_SNOW = `<g fill="#f6f1e3">
<g transform="translate(84,212)"><path d="M0 -30 L5 -20 L-5 -20 Z M0 -23 L6 -14 L-6 -14 Z"/></g>
<g transform="translate(438,210)"><path d="M0 -32 L5.5 -21 L-5.5 -21 Z M0 -24 L6.5 -15 L-6.5 -15 Z"/></g></g>`;
const SNOW_LAYER = `<g fill="#fdfaf1" style="animation:da-snowfall 3.2s linear infinite">
<circle cx="40" cy="70" r="2.2"/><circle cx="96" cy="110" r="1.8"/><circle cx="150" cy="66" r="2.4"/><circle cx="204" cy="122" r="1.8"/>
<circle cx="258" cy="80" r="2.2"/><circle cx="312" cy="128" r="1.9"/><circle cx="366" cy="72" r="2.4"/><circle cx="420" cy="116" r="1.8"/>
<circle cx="474" cy="84" r="2.2"/><circle cx="66" cy="160" r="1.9"/><circle cx="178" cy="168" r="2.2"/><circle cx="290" cy="172" r="1.8"/>
<circle cx="402" cy="164" r="2.3"/><circle cx="500" cy="156" r="1.8"/><circle cx="126" cy="44" r="1.8"/><circle cx="238" cy="50" r="2"/>
<circle cx="348" cy="42" r="1.8"/><circle cx="456" cy="52" r="2"/></g>`;

/* ---- scenescape packs: the landscape layer of the card ---- */
const APP_PAL = {
  summer: ["#c3cdb4", "#a0b296", "#788f72", "#51704e"],
  spring: ["#c9d2b8", "#a9bb9b", "#83987a", "#5c7a58"],
  autumn: ["#dcc394", "#cd9a5a", "#b06a3a", "#7e4527"],
  winter: ["#c2bda9", "#a29c86", "#7e7864", "#5c574a"],
};
function seasonOf(month) {
  return [11, 0, 1].includes(month) ? "winter" : month <= 4 ? "spring" : month <= 7 ? "summer" : "autumn";
}
const SCENES = {
  desert: {
    ridges: () => [
      { d: "M0 176 L70 138 L130 164 L210 126 L290 166 L370 136 L450 162 L520 140 L520 226 L0 226 Z", day: "#d9b98c", night: "#494060", cap: "#efe9da" },
      { d: "M0 194 L90 162 L170 186 L280 154 L390 188 L480 164 L520 178 L520 226 L0 226 Z", day: "#c69b66", night: "#3c3452", cap: "#ece5d3" },
      { d: "M0 210 L110 190 L240 208 L360 186 L470 206 L520 196 L520 226 L0 226 Z", day: "#a3764a", night: "#2f2944", cap: "#e8e0cc" },
    ],
    flora: SAGUARO, floraDay: "#6e5232", floraNight: "#231e36", floraSnow: "",
    dust: true, haboob: true, fog: "ground",
  },
  appalachia: {
    ridges: (pal) => [
      { d: "M0 152 Q 60 118 130 138 T 260 130 T 390 142 T 520 126 L 520 226 L 0 226 Z", day: pal[0], night: "#3f4b57", cap: "#efe9da" },
      { d: "M0 178 Q 80 146 170 164 T 340 156 T 520 166 L 520 226 L 0 226 Z", day: pal[1], night: "#353f4b", cap: "#ece5d3" },
      { d: "M0 198 Q 90 172 200 188 T 400 180 T 520 192 L 520 226 L 0 226 Z", day: pal[2], night: "#2b343f", cap: "#e8e0cc" },
      { d: "M0 214 Q 110 194 240 206 T 470 200 T 520 208 L 520 226 L 0 226 Z", day: pal[3], night: "#222a33", cap: "#ded5be" },
    ],
    flora: SPRUCES, floraDay: "#33492f", floraNight: "#1d2822", floraSnow: SPRUCE_SNOW,
    dust: false, haboob: false, fog: "valley",
  },
};
/* valley fog banks, indexed by the gap they sit in (after ridge i) */
const FOG_BANKS = [
  `<g style="animation:da-fog1 26s ease-in-out infinite"><ellipse cx="120" cy="158" rx="150" ry="16" fill="#f2ecda" opacity=".9"/><ellipse cx="360" cy="152" rx="180" ry="14" fill="#f2ecda" opacity=".85"/></g>`,
  `<g style="animation:da-fog2 32s ease-in-out infinite"><ellipse cx="90" cy="186" rx="170" ry="17" fill="#efe8d4" opacity=".92"/><ellipse cx="400" cy="180" rx="190" ry="15" fill="#efe8d4" opacity=".88"/></g>`,
  `<g style="animation:da-fog3 22s ease-in-out infinite"><ellipse cx="200" cy="206" rx="220" ry="16" fill="#ece4cf" opacity=".9"/><ellipse cx="470" cy="210" rx="140" ry="14" fill="#ece4cf" opacity=".85"/></g>`,
];
const GROUND_FOG = `<g style="animation:da-fog1 26s ease-in-out infinite"><ellipse cx="140" cy="200" rx="180" ry="15" fill="#efe8d4" opacity=".85"/></g>
<g style="animation:da-fog2 32s ease-in-out infinite"><ellipse cx="390" cy="210" rx="200" ry="16" fill="#ece4cf" opacity=".85"/></g>`;

/* point on the sky arc: M -35 265 Q 260 -75 545 265, t in [0,1] */
function arcPoint(t) {
  const u = 1 - t;
  return {
    x: u * u * -35 + 2 * u * t * 260 + t * t * 545,
    y: u * u * 265 + 2 * u * t * -75 + t * t * 265,
  };
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const DAY_MS = 86400000;

function fmtTime(d) {
  if (!d || isNaN(d)) return "—";
  let h = d.getHours() % 12; if (h === 0) h = 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function hourLabel(d) {
  let h = d.getHours() % 12; if (h === 0) h = 12;
  return `${h}${d.getHours() < 12 ? "A" : "P"}`;
}
function compass(b) {
  if (b == null || isNaN(b)) return "";
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(((b % 360) + 360) % 360 / 45) % 8];
}
function uvWord(u) {
  if (u == null) return "";
  return u < 3 ? "LOW" : u < 6 ? "MODERATE" : u < 8 ? "HIGH" : u < 11 ? "V. HIGH" : "EXTREME";
}
function heatWord(t, unit) {
  if (t == null) return "";
  const f = unit === "°C" ? t * 9 / 5 + 32 : t;
  if (f >= 108) return " & scorching";
  if (f >= 100) return " & blazing";
  if (f >= 92) return " & hot";
  if (f <= 20) return " & bitter";
  if (f <= 33) return " & freezing";
  return "";
}
const r0 = (v) => (v == null || isNaN(v) ? "—" : Math.round(v));

class AlmanacWeatherCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._daily = null;
    this._hourly = null;
    this._unsubs = [];
    this._pressHist = [];
    this._sig = "";
    this._animated = false;
  }

  static getStubConfig(hass) {
    const w = Object.keys(hass?.states || {}).find((e) => e.startsWith("weather."));
    return { entity: w || "weather.home" };
  }

  setConfig(config) {
    if (!config.entity) throw new Error("almanac-weather-card: `entity` (a weather entity) is required");
    this._config = {
      sun_entity: "sun.sun",
      title: "THE DAILY ALMANAC",
      alert_label: "RAIN WATCH",
      alert_threshold: 25,
      alerts_entity: "",
      scene: "desert",
      seasons: false,
      days: 7,
      ...config,
    };
    if (!SCENES[this._config.scene]) this._config.scene = "desert";
    this._sig = "";
    this._resub();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    if (!this._subbed) this._resub();
    const w = hass.states[this._config.entity];
    const s = hass.states[this._config.sun_entity];
    if (!w) { this._renderError(`Entity not found: ${this._config.entity}`); return; }
    const p = w.attributes.pressure;
    if (p != null) {
      const now = Date.now();
      this._pressHist.push([now, p]);
      this._pressHist = this._pressHist.filter(([t]) => now - t < 4 * 3600000);
    }
    const al = this._config.alerts_entity ? hass.states[this._config.alerts_entity] : null;
    const sig = JSON.stringify([w.state, w.attributes, s?.state, s?.attributes?.next_rising, al?.state, al?.attributes?.alerts, this._dailySig, this._hourlySig]);
    if (sig !== this._sig) {
      this._sig = sig;
      this._render();
    }
  }

  connectedCallback() {
    this._tick = setInterval(() => this._updateSky(), 60000);
    if (this._config && this._hass) this._resub();
  }
  disconnectedCallback() {
    clearInterval(this._tick);
    this._unsubAll();
  }
  _unsubAll() {
    this._unsubs.forEach((u) => { try { u.then ? u.then((f) => f()) : u(); } catch (e) {} });
    this._unsubs = [];
    this._subbed = false;
  }
  _resub() {
    if (!this._hass || !this._config || this._subbed) return;
    const conn = this._hass.connection;
    if (!conn) return;
    this._subbed = true;
    const ent = this._config.entity;
    const feat = this._hass.states[ent]?.attributes?.supported_features || 0;
    if (feat & 1) {
      this._unsubs.push(conn.subscribeMessage((m) => {
        this._daily = m.forecast; this._dailySig = m.forecast?.[0]?.datetime + "|" + m.forecast?.length + "|" + r0(m.forecast?.[0]?.temperature);
        this._sig = ""; if (this._hass) this.hass = this._hass;
      }, { type: "weather/subscribe_forecast", entity_id: ent, forecast_type: "daily" }));
    }
    if (feat & 2) {
      this._unsubs.push(conn.subscribeMessage((m) => {
        this._hourly = m.forecast; this._hourlySig = m.forecast?.[0]?.datetime + "|" + r0(m.forecast?.[0]?.temperature) + "|" + r0(m.forecast?.[0]?.precipitation_probability);
        this._sig = ""; if (this._hass) this.hass = this._hass;
      }, { type: "weather/subscribe_forecast", entity_id: ent, forecast_type: "hourly" }));
    }
  }

  /* ---- sun / moon / night state ---- */
  _skyState() {
    const s = this._hass?.states?.[this._config.sun_entity];
    const now = Date.now();
    const out = { sun: null, moon: null, elev: 90 };
    if (!s) return out;
    out.elev = s.attributes.elevation ?? (s.state === "above_horizon" ? 45 : -45);
    const nr = Date.parse(s.attributes.next_rising), ns = Date.parse(s.attributes.next_setting);
    if (s.state === "above_horizon") {
      const rise = nr - DAY_MS, set = ns;
      if (set > rise) out.sun = clamp01((now - rise) / (set - rise));
    } else {
      const set = ns - DAY_MS, rise = nr;
      if (rise > set) out.moon = clamp01((now - set) / (rise - set));
    }
    return out;
  }

  _updateSky() {
    const r = this.shadowRoot;
    if (!r || !this._hass) return;
    const sky = this._skyState();
    const sunG = r.getElementById("da-sun"), moonG = r.getElementById("da-moon");
    if (sunG) {
      if (sky.sun != null) { const p = arcPoint(sky.sun); sunG.setAttribute("transform", `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`); sunG.style.display = ""; }
      else sunG.style.display = "none";
    }
    if (moonG) {
      if (sky.moon != null) { const p = arcPoint(sky.moon); moonG.setAttribute("transform", `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`); moonG.style.display = ""; }
      else moonG.style.display = "none";
    }
    const e = sky.elev;
    const night = clamp01((4 - e) / 10);            // 0 at elev>=4, 1 at elev<=-6
    const wash = Math.max(0, 1 - Math.abs(e) / 8) * 0.24;
    const setO = (id, v) => { const el = r.getElementById(id); if (el) el.setAttribute("opacity", v); };
    setO("da-tint", (night * 0.42).toFixed(3));
    setO("da-nightmtn", night.toFixed(3));
    setO("da-stars", (night * 0.9).toFixed(3));
    setO("da-wash", wash.toFixed(3));
    const dark = e < 0 || this._condDark;
    ["da-temp", "da-cond"].forEach((id) => {
      const el = r.getElementById(id);
      if (el) { el.setAttribute("fill", dark ? CREAM : INK); el.setAttribute("stroke", dark ? "#1a1f33" : PAPER); }
    });
    const dateEl = r.getElementById("da-date");
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  }

  /* ---- NWS alerts (tier 2 advisory / tier 3 warning-EAS) ---- */
  _nws() {
    const out = { top: null, dustWarning: false, dustAdvisory: false };
    const ent = this._config.alerts_entity;
    if (!ent) return out;
    const s = this._hass?.states?.[ent];
    if (!s || !parseInt(s.state)) return out;
    let list = s.attributes.alerts || s.attributes.Alerts || [];
    if (!Array.isArray(list)) list = [];
    const norm = list.map((x) => ({
      event: String(x.event || x.Event || x.title || ""),
      severity: String(x.severity || x.Severity || "").toLowerCase(),
      ends: x.ends || x.Ends || x.expires || x.Expires || null,
    })).filter((x) => x.event);
    if (!norm.length && s.attributes.title) norm.push({ event: String(s.attributes.title).split(" - ")[0], severity: "", ends: null });
    if (!norm.length) return out;
    const rank = (x) => /warning/i.test(x.event) ? 3
      : /watch|advisory|statement/i.test(x.event) ? 2
      : ["extreme", "severe"].includes(x.severity) ? 3 : 2;
    norm.sort((a, b) => rank(b) - rank(a));
    const top = norm[0];
    out.dustWarning = norm.some((x) => /dust storm warning/i.test(x.event));
    out.dustAdvisory = norm.some((x) => /blowing dust|dust advisory/i.test(x.event));
    let when = "";
    if (top.ends) {
      const d = new Date(top.ends);
      if (!isNaN(d)) when = ` — UNTIL ${fmtTime(d)} ${d.getHours() >= 12 ? "PM" : "AM"}`;
    }
    out.top = { tier: rank(top), text: `${top.event.toUpperCase()}${when}`, dust: /dust/i.test(top.event) };
    return out;
  }

  /* ---- which scene layers does the current condition want ---- */
  _condLayers(w, nws) {
    const c = w.state, a = w.attributes;
    const pack = SCENES[this._config.scene];
    const out = { clouds: null, rain: 0, bolts: false, dust: false, haboob: false, snow: false, fog: false, wash: null, condDark: false };
    if (nws.dustWarning && pack.haboob) { out.haboob = true; out.wash = ["#c08a4d", 0.14]; return out; }
    switch (c) {
      case "partlycloudy": out.clouds = "few"; break;
      case "cloudy": out.clouds = "field"; out.wash = ["#9b8f7a", 0.12]; break;
      case "fog": out.fog = true; out.wash = ["#e9e0ca", 0.28]; break;
      case "rainy": out.clouds = "rainfield"; out.rain = 1; out.wash = ["#4a5468", 0.14]; break;
      case "snowy": out.clouds = "field"; out.snow = true; out.wash = ["#aab0b4", 0.12]; break;
      case "snowy-rainy": out.clouds = "field"; out.snow = true; out.rain = 1; out.wash = ["#aab0b4", 0.14]; break;
      case "pouring": out.clouds = "rainfield"; out.rain = 2; out.wash = ["#4a5468", 0.2]; break;
      case "lightning": out.clouds = "stormfield"; out.bolts = true; out.wash = ["#3c4356", 0.26]; out.condDark = true; break;
      case "lightning-rainy": case "hail": out.clouds = "stormfield"; out.rain = 2; out.bolts = true; out.wash = ["#3c4356", 0.26]; out.condDark = true; break;
    }
    const windy = c === "windy" || c === "windy-variant" || (a.wind_gust_speed ?? 0) >= 30;
    if (pack.dust) {
      if ((nws.dustAdvisory || windy) && !out.clouds && !out.rain && !out.fog && !out.snow) { out.dust = true; if (!out.wash) out.wash = ["#d9b475", 0.2]; }
      else if (windy && out.clouds === "few") out.dust = true;
    }
    return out;
  }

  /* ---- alert band ---- */
  _alert(w) {
    if (!this._hourly?.length) return null;
    const now = Date.now();
    const next24 = this._hourly.filter((h) => {
      const t = Date.parse(h.datetime);
      return t >= now - 3600000 && t <= now + 24 * 3600000;
    });
    if (!next24.length) return null;
    let max = null;
    for (const h of next24) {
      const p = h.precipitation_probability;
      if (p != null && (max == null || p > max.p)) max = { p, t: Date.parse(h.datetime) };
    }
    if (!max || max.p < this._config.alert_threshold) return null;
    const hr = new Date(max.t).getHours();
    const sameDay = new Date(max.t).getDate() === new Date().getDate();
    const when = !sameDay ? "OVERNIGHT" : hr < 12 ? "THIS MORNING" : hr < 17 ? "THIS AFTERNOON" : hr < 21 ? "THIS EVENING" : "TONIGHT";
    let extra = "";
    const punit = w.attributes.precipitation_unit || "in";
    const d1 = this._daily?.[1];
    if (d1?.precipitation >= (punit === "mm" ? 1 : 0.05)) {
      const day = new Date(Date.parse(d1.datetime)).toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
      extra = ` · ${d1.precipitation}${punit === "in" ? '"' : " " + punit} POSSIBLE ${day}`;
    }
    return `${esc(this._config.alert_label)} — ${Math.round(max.p)}% CHANCE ${when}${extra}`;
  }

  /* ---- 24h chart ---- */
  _chart(w) {
    if (!this._hourly?.length) return "";
    const now = Date.now();
    const hrs = this._hourly.filter((h) => Date.parse(h.datetime) >= now - 3600000).slice(0, 24);
    if (hrs.length < 6) return "";
    const temps = hrs.map((h) => h.temperature).filter((t) => t != null);
    const tMin = Math.floor((Math.min(...temps) - 3) / 5) * 5;
    const tMax = Math.ceil((Math.max(...temps) + 3) / 5) * 5;
    const X = (i) => 8 + (i / (hrs.length - 1)) * 438;
    const Y = (t) => 18 + (tMax - t) / (tMax - tMin) * 88;
    const pts = hrs.map((h, i) => [X(i), Y(h.temperature)]);
    let path = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      path += ` Q ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    path += ` L ${pts[pts.length - 1][0].toFixed(1)} ${pts[pts.length - 1][1].toFixed(1)}`;
    // precip bars, 3h buckets
    let bars = "", barMax = 0;
    for (let b = 0; b < 8; b++) {
      const seg = hrs.slice(b * 3, b * 3 + 3);
      if (!seg.length) continue;
      const p = Math.max(...seg.map((h) => h.precipitation_probability ?? 0));
      const hgt = Math.max(p > 0 ? 3 : 1.5, p / 100 * 38);
      const x = X(b * 3 + 1) - 6.5;
      bars += `<rect x="${x.toFixed(1)}" y="${(150 - hgt).toFixed(1)}" width="13" height="${hgt.toFixed(1)}" rx="2" class="bar" style="transform-origin:${(x + 6.5).toFixed(1)}px 150px;animation-delay:${(0.9 + b * 0.1).toFixed(2)}s"/>`;
      if (p > barMax) barMax = p;
    }
    // labels every 6h
    let hlabels = "";
    for (let i = 0; i < hrs.length; i += 6) {
      hlabels += `<text x="${(X(i) - 6).toFixed(1)}" y="176" font-size="9" fill="${TAN}">${hourLabel(new Date(Date.parse(hrs[i].datetime)))}</text>`;
    }
    // min point marker
    let minI = 0; hrs.forEach((h, i) => { if (h.temperature < hrs[minI].temperature) minI = i; });
    const mp = pts[minI];
    const minMark = minI > 2 ? `<circle cx="${mp[0].toFixed(1)}" cy="${mp[1].toFixed(1)}" r="3" fill="${TERRA}"/><text x="${(mp[0] + 8).toFixed(1)}" y="${(mp[1] - 5).toFixed(1)}" font-size="10" font-weight="700" fill="${TERRA}">${r0(hrs[minI].temperature)}° low</text>` : "";
    const gridT = (f) => Math.round(tMax - (tMax - tMin) * f);
    const punit = w.attributes.precipitation_unit === "mm" ? "PRECIP %" : "PRECIP %";
    return `
    <div class="pad">
      <div class="sect">THE NEXT 24 HOURS <span class="sectr">TEMP ${esc(w.attributes.temperature_unit || "°")} · <span style="color:${BLUE}">${punit}</span></span></div>
      <svg viewBox="0 0 452 180" class="chartsvg">
        <line x1="0" y1="18" x2="452" y2="18" stroke="${GRID}"/><line x1="0" y1="62" x2="452" y2="62" stroke="${GRID}"/><line x1="0" y1="106" x2="452" y2="106" stroke="${GRID}"/>
        <text x="0" y="14" font-size="9" fill="${TAN}">${gridT(0)}°</text><text x="0" y="58" font-size="9" fill="${TAN}">${gridT(0.5)}°</text><text x="0" y="102" font-size="9" fill="${TAN}">${gridT(1)}°</text>
        <g fill="${BLUE}">${bars}</g>
        <path d="${path}" fill="none" stroke="${TERRA}" stroke-width="2.5" stroke-linecap="round" class="curve"/>
        <circle cx="${pts[0][0]}" cy="${pts[0][1].toFixed(1)}" r="4" fill="${TERRA}"/>
        <text x="${(pts[0][0] + 8).toFixed(1)}" y="${Math.max(11, pts[0][1] - 6).toFixed(1)}" font-size="10" font-weight="700" fill="${TERRA}">${r0(hrs[0].temperature)}°</text>
        ${minMark}${hlabels}
      </svg>
    </div>`;
  }

  /* ---- conditions strip ---- */
  _strip(w, sunrise, sunset) {
    const a = w.attributes;
    const uv = this._daily?.[0]?.uv_index;
    let trend = "";
    if (this._pressHist.length > 1) {
      const d = this._pressHist[this._pressHist.length - 1][1] - this._pressHist[0][1];
      const thr = (a.pressure_unit === "hPa" || a.pressure_unit === "mbar") ? 0.7 : 0.02;
      trend = d > thr ? "↑" : d < -thr ? "↓" : "";
    }
    const cell = (v, l, warm) => `<div class="cell" data-ent="${esc(this._config.entity)}"><div class="cv"${warm ? ` style="color:${TERRA}"` : ""}>${v}</div><div class="cl">${l}</div></div>`;
    const wind = a.wind_speed != null ? `${compass(a.wind_bearing)} ${r0(a.wind_speed)}` : "—";
    const gust = a.wind_gust_speed != null ? ` · G ${r0(a.wind_gust_speed)}` : "";
    return `<div class="strip">
      ${cell(uv != null ? Number(uv).toFixed(1) : "—", `UV${uv != null ? " · " + uvWord(uv) : ""}`, uv >= 8)}
      ${cell(esc(wind), `WIND${esc(gust)}`)}
      ${cell(a.humidity != null ? r0(a.humidity) + "%" : "—", `HUM${a.dew_point != null ? " · DEW " + r0(a.dew_point) + "°" : ""}`)}
      ${cell(a.pressure != null ? a.pressure + trend : "—", "PRESSURE")}
      <div class="cell" data-ent="${esc(this._config.sun_entity)}"><div class="cv">${fmtTime(sunrise)} · ${fmtTime(sunset)}</div><div class="cl">SUNRISE · SET</div></div>
    </div>`;
  }

  /* ---- week ahead ---- */
  _week(w) {
    if (!this._daily?.length) return "";
    const days = this._daily.slice(0, this._config.days);
    const realLo = Math.min(...days.map((d) => d.templow ?? d.temperature));
    const realHi = Math.max(...days.map((d) => d.temperature));
    const lo = Math.floor(realLo / 5) * 5 - 5;
    const hi = Math.ceil(realHi / 5) * 5 + 5;
    const span = hi - lo;
    const nowT = w.attributes.temperature;
    let rows = "";
    days.forEach((d, i) => {
      const dl = d.templow ?? d.temperature, dh = d.temperature;
      const left = ((dl - lo) / span * 100).toFixed(1), width = (Math.max(2, dh - dl) / span * 100).toFixed(1);
      const day = i === 0 ? "TODAY" : new Date(Date.parse(d.datetime)).toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
      const pp = d.precipitation_probability;
      const hot = (w.attributes.temperature_unit === "°C" ? dh >= 40 : dh >= 104);
      const tick = (i === 0 && nowT != null && nowT > dl && nowT < dh + 3)
        ? `<div class="tick" style="left:${((Math.min(nowT, dh) - lo) / span * 100).toFixed(1)}%"></div>` : "";
      rows += `
        <div class="wday">${day}</div>
        <div class="wico">${wicon(d.condition, 20, INK)}</div>
        <div class="wpp">${pp != null && pp >= 5 ? Math.round(pp) + "%" : ""}</div>
        <div class="wlo">${r0(dl)}</div>
        <div class="wbar"><div class="wfill" style="left:${left}%;width:${width}%;background:linear-gradient(90deg,${AMBER},${hot ? TERRA : "#cc7040"});animation-delay:${(0.3 + i * 0.1).toFixed(1)}s"></div>${tick}</div>
        <div class="whi">${r0(dh)}</div>`;
    });
    return `<div class="pad week" data-ent="${esc(this._config.entity)}">
      <div class="sect">THE WEEK AHEAD <span class="sectr">${r0(realLo)}° ——— ${r0(realHi)}°</span></div>
      <div class="wgrid">${rows}</div>
    </div>`;
  }

  /* ---- scene ---- */
  _scene(w, sky, nws) {
    const a = w.attributes;
    const unit = a.temperature_unit || "°";
    const d0 = this._daily?.[0];
    const cl = this._condLayers(w, nws);
    this._condDark = cl.condDark;
    const condName = COND_LABEL[w.state] || w.state;
    const heat = heatWord(a.temperature, unit);
    let sub = `${condName}${heat}`.toUpperCase();
    if (cl.haboob) sub = `DUST STORM${a.visibility != null ? ` · VISIBILITY ${a.visibility < 1 ? "< 1" : r0(a.visibility)} ${a.visibility_unit || "MI"}` : ""}${a.wind_gust_speed != null ? ` · GUSTS ${r0(a.wind_gust_speed)}` : ""}`;
    else {
      if (d0) sub += ` · HIGH ${r0(d0.temperature)} · LOW ${r0(d0.templow)}`;
      if (cl.dust && a.wind_gust_speed != null) sub += ` · GUSTS ${r0(a.wind_gust_speed)}`;
      else if (a.apparent_temperature != null && Math.abs(a.apparent_temperature - a.temperature) >= 2) sub += ` · FEELS ${r0(a.apparent_temperature)}°`;
    }
    const sunP = sky.sun != null ? arcPoint(sky.sun) : null;
    const moonP = sky.moon != null ? arcPoint(sky.moon) : null;
    const e = sky.elev;
    const night = clamp01((4 - e) / 10);
    const wash = Math.max(0, 1 - Math.abs(e) / 8) * 0.24;
    const dark = e < 0 || cl.condDark;
    const tx = cl.haboob ? 200 : 260;
    const hideSun = cl.haboob || cl.fog || ["field", "rainfield", "stormfield"].includes(cl.clouds);
    let clouds = "";
    if (cl.clouds === "few") clouds = cloudC2(330, 84, 1, "#f8f1e0", "#8a6a3c", "dr1") + cloudC2(118, 56, 0.8, "#f8f1e0", "#8a6a3c", "dr2") + cloudC2(232, 112, 0.55, "#f8f1e0", "#8a6a3c", "dr3");
    else if (cl.clouds === "field") clouds = cl.snow ? cloudField("#cfc7b3", "#9b9280", "#c5bda9", "#8d8472") : cloudField("#e2d7bc", "#a08762", "#d3c5a3", "#8f7550");
    else if (cl.clouds === "rainfield") clouds = cloudField("#b7a88a", "#7d6845", "#a3946f", "#6d5a3a");
    else if (cl.clouds === "stormfield") clouds = cloudField("#9c8d72", "#5f5138", "#857659", "#514530");
    const glow = hideSun && sunP ? `<circle cx="${sunP.x.toFixed(1)}" cy="${Math.max(40, sunP.y).toFixed(1)}" r="26" fill="#e8c187" opacity=".45"/>` : "";
    /* landscape from the scene pack */
    const pack = SCENES[this._config.scene];
    const season = this._config.seasons ? seasonOf(new Date().getMonth()) : "summer";
    const ridges = pack.ridges(APP_PAL[season]);
    const fogMode = cl.fog ? pack.fog : null;
    let land = "";
    ridges.forEach((r, i) => {
      if (fogMode === "valley" && i > 0 && FOG_BANKS[i - 1]) land += FOG_BANKS[i - 1];
      if (cl.snow) land += `<path d="${r.d}" fill="${r.cap}"/><g transform="translate(0,7)"><path d="${r.d}" fill="${r.day}"/></g>`;
      else land += `<path d="${r.d}" fill="${r.day}"/>`;
    });
    land += pack.flora(pack.floraDay);
    if (cl.snow) land += pack.floraSnow;
    if (fogMode === "ground") land += GROUND_FOG;
    let nightLand = "";
    ridges.forEach((r) => { nightLand += `<path d="${r.d}" fill="${r.night}"/>`; });
    nightLand += pack.flora(pack.floraNight);
    return `
  <div class="scene" data-ent="${esc(this._config.entity)}">
    <svg viewBox="0 0 520 226" preserveAspectRatio="xMidYMax meet">
      <path d="M 10 205 Q 260 -55 510 205" fill="none" stroke="#cfa25f" stroke-width="1.5" stroke-dasharray="2 8" stroke-linecap="round" opacity=".55"/>
      <g id="da-sun" transform="translate(${sunP ? sunP.x.toFixed(1) : -100},${sunP ? sunP.y.toFixed(1) : 0})" style="${sunP && !hideSun ? "" : "display:none"}">
        <circle r="52" fill="none" stroke="${AMBER}" stroke-width="1.5" opacity="${cl.dust ? 0 : 0.4}"/>
        <circle r="38" fill="${AMBER}" opacity="${cl.dust ? 0.55 : 1}"/><circle r="30" fill="#f0b45c" opacity="${cl.dust ? 0.6 : 1}"/>
      </g>
      ${glow}
      <g id="da-moon" transform="translate(${moonP ? moonP.x.toFixed(1) : -100},${moonP ? moonP.y.toFixed(1) : 0})" style="${moonP ? "" : "display:none"}">
        <circle r="20" fill="#f6efd8"/>
        <circle cx="-7" cy="-4" r="4" fill="#ddd3b6" opacity=".7"/><circle cx="6" cy="6" r="3" fill="#ddd3b6" opacity=".6"/><circle cx="4" cy="-8" r="2.2" fill="#ddd3b6" opacity=".6"/>
      </g>
      ${clouds}
      ${cl.dust ? `<rect x="0" y="0" width="520" height="226" fill="#d9b475" opacity=".22"/>` : ""}
      ${cl.rain ? rainLayer(cl.rain === 2) : ""}
      ${cl.bolts ? BOLTS : ""}
      ${land}
      ${cl.snow ? SNOW_LAYER : ""}
      ${cl.dust ? DUST_LAYER : ""}
      ${cl.haboob ? HABOOB_LAYER : ""}
      <rect id="da-wash" x="0" y="0" width="520" height="226" fill="#e8763d" opacity="${wash.toFixed(3)}" class="fade"/>
      ${cl.wash ? `<rect x="0" y="0" width="520" height="226" fill="${cl.wash[0]}" opacity="${cl.wash[1]}"/>` : ""}
      <rect id="da-tint" x="0" y="0" width="520" height="226" fill="#28324e" opacity="${(night * 0.42).toFixed(3)}" class="fade"/>
      <g id="da-nightmtn" opacity="${night.toFixed(3)}" class="fade">
        ${nightLand}
      </g>
      <g id="da-stars" fill="#f3ecd8" opacity="${(night * 0.9).toFixed(3)}" class="fade">
        <circle cx="70" cy="38" r="1.6"/><circle cx="150" cy="70" r="1.2"/><circle cx="235" cy="30" r="1.4"/>
        <circle cx="330" cy="58" r="1.2"/><circle cx="415" cy="34" r="1.6"/><circle cx="470" cy="78" r="1.2"/>
        <circle cx="115" cy="102" r="1.1"/><circle cx="380" cy="98" r="1.1"/><circle cx="285" cy="86" r="1.2"/>
      </g>
      ${cl.bolts ? `<rect x="0" y="0" width="520" height="226" fill="#fff6d8" opacity="0" style="animation:da-skyflash 7s linear infinite"/>` : ""}
      <text id="da-temp" x="${tx}" y="188" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="900" font-size="84" paint-order="stroke" stroke="${dark ? "#1a1f33" : PAPER}" stroke-width="6" stroke-linejoin="round" stroke-opacity="0.55" fill="${dark ? CREAM : INK}" class="fadefill">${r0(a.temperature)}°</text>
      <text id="da-cond" x="${tx}" y="212" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="700" font-size="11.5" letter-spacing="2.5" paint-order="stroke" stroke="${dark ? "#1a1f33" : PAPER}" stroke-width="3.5" stroke-linejoin="round" stroke-opacity="0.55" fill="${dark ? CREAM : INK}" class="fadefill">${esc(sub)}</text>
    </svg>
  </div>`;
  }

  _renderError(msg) {
    this.shadowRoot.innerHTML = `<div style="padding:16px;background:${PAPER};color:${INK};border-radius:12px;font-family:sans-serif">${esc(msg)}</div>`;
  }

  _render() {
    const hass = this._hass, cfg = this._config;
    const w = hass.states[cfg.entity];
    if (!w) return;
    const s = hass.states[cfg.sun_entity];
    const sky = this._skyState();
    let sunrise = null, sunset = null;
    if (s) {
      const nr = Date.parse(s.attributes.next_rising), ns = Date.parse(s.attributes.next_setting);
      sunrise = new Date(s.state === "above_horizon" ? nr - DAY_MS : nr);
      sunset = new Date(s.state === "above_horizon" ? ns : ns - DAY_MS);
      if (s.state !== "above_horizon" && new Date().getHours() < 12) { sunrise = new Date(nr); sunset = new Date(ns); }
    }
    const location = (cfg.location || hass.config.location_name || "").toUpperCase();
    const nws = this._nws();
    let band = "";
    if (nws.top?.tier === 3) band = `<div class="band t3"><span>⚠️&nbsp; EAS · ${esc(nws.top.text)}</span></div>`;
    else if (nws.top) band = `<div class="band t2"><span>${nws.top.dust ? "🌪️" : "⚠️"}&nbsp; ${esc(nws.top.text)}</span></div>`;
    else {
      const alert = this._alert(w);
      if (alert) band = `<div class="band"><span>⛈️&nbsp; ${alert}</span></div>`;
    }
    const anim = this._animated ? "no-anim" : "";
    this._animated = true;

    this.shadowRoot.innerHTML = `
<style>
  :host { display: block; }
  * { box-sizing: border-box; }
  .wrap { container-type: inline-size; }
  .card {
    --px: max(0.5px, 0.1923cqw);
    background: ${PAPER}; color: ${INK};
    border-radius: var(--ha-card-border-radius, 14px);
    box-shadow: var(--ha-card-box-shadow, 0 4px 16px rgba(0,0,0,.18));
    overflow: hidden; font-family: Archivo, 'Segoe UI', sans-serif;
  }
  .serif { font-family: Fraunces, Georgia, serif; }
  .mast { text-align: center; padding: calc(22*var(--px)) calc(30*var(--px)) 0; }
  .kick { font-size: max(8px, calc(10.5*var(--px))); font-weight: 700; letter-spacing: calc(4*var(--px)); color: ${TAN}; }
  .date { font-family: Fraunces, Georgia, serif; font-size: calc(29*var(--px)); font-weight: 700; margin-top: calc(5*var(--px)); }
  .rule { width: calc(60*var(--px)); height: calc(3*var(--px)); background: ${TERRA}; margin: calc(10*var(--px)) auto 0; }
  .scene { position: relative; cursor: pointer; }
  .scene svg { display: block; width: 100%; margin-top: calc(4*var(--px)); }
  .fade { transition: opacity 2s ease; }
  .fadefill { transition: fill 2s ease, stroke 2s ease; }
  .band { background: ${INK}; color: ${PAPER}; display: flex; align-items: center; justify-content: center; gap: calc(10*var(--px)); padding: calc(9*var(--px)) calc(20*var(--px)); }
  .band span { font-size: max(8px, calc(11.5*var(--px))); font-weight: 700; letter-spacing: calc(2*var(--px)); text-align: center; }
  .band.t2 { background: #8a5a17; color: #f6ecd8; }
  .band.t3 { background: #7e1d10; color: #f6ecd8; border-top: 2px solid ${AMBER}; border-bottom: 2px solid ${AMBER}; animation: da-easpulse 2.2s ease-in-out infinite; }
  .dr1 { animation: da-dr1 26s ease-in-out infinite; }
  .dr2 { animation: da-dr2 32s ease-in-out infinite; }
  .dr3 { animation: da-dr3 22s ease-in-out infinite; }
  @keyframes da-dr1 { 0%,100% { transform: translateX(0); } 50% { transform: translateX(14px); } }
  @keyframes da-dr2 { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-16px); } }
  @keyframes da-dr3 { 0%,100% { transform: translateX(0); } 50% { transform: translateX(10px); } }
  @keyframes da-rainfall { from { transform: translateY(-36px); } to { transform: translateY(36px); } }
  @keyframes da-bolt1 { 0%,84%,88%,100% { opacity: 0; } 85%,87% { opacity: 1; } }
  @keyframes da-bolt2 { 0%,44%,48%,100% { opacity: 0; } 45%,47% { opacity: 1; } }
  @keyframes da-skyflash { 0%,44%,48%,84%,88%,100% { opacity: 0; } 45%,47% { opacity: .22; } 85%,87% { opacity: .3; } }
  @keyframes da-gust { from { transform: translateX(-90px); } to { transform: translateX(610px); } }
  @keyframes da-puff { from { transform: translateX(-120px); } to { transform: translateX(640px); } }
  @keyframes da-tumble { from { transform: translateX(-50px); } to { transform: translateX(580px); } }
  @keyframes da-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes da-wallcreep { 0%,100% { transform: translateX(26px); } 50% { transform: translateX(0); } }
  @keyframes da-billow1 { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-7px) scale(1.045); } }
  @keyframes da-billow2 { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(5px) scale(1.03); } }
  @keyframes da-duststream { from { transform: translateX(0); } to { transform: translateX(-190px); } }
  @keyframes da-snowfall { from { transform: translateY(-40px); } to { transform: translateY(40px); } }
  @keyframes da-fog1 { 0%,100% { transform: translateX(0); } 50% { transform: translateX(22px); } }
  @keyframes da-fog2 { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-26px); } }
  @keyframes da-fog3 { 0%,100% { transform: translateX(0); } 50% { transform: translateX(16px); } }
  @keyframes da-easpulse { 0%,100% { box-shadow: inset 0 0 0 0 rgba(255,205,150,0); } 50% { box-shadow: inset 0 0 0 2px rgba(255,205,150,.55); } }
  .pad { padding: calc(16*var(--px)) calc(34*var(--px)) 0; }
  .sect { font-size: max(8px, calc(10*var(--px))); font-weight: 700; letter-spacing: calc(3*var(--px)); color: ${TAN}; border-bottom: 1.5px solid ${INK}; padding-bottom: calc(5*var(--px)); }
  .sectr { float: right; letter-spacing: calc(1*var(--px)); }
  .chartsvg { display: block; width: 100%; margin-top: calc(10*var(--px)); }
  .chartsvg text { font-family: Archivo, sans-serif; }
  .curve { stroke-dasharray: 900 900; animation: da-draw 1.6s .2s cubic-bezier(.4,0,.2,1) both; }
  .bar { animation: da-grow .5s both; }
  .no-anim .curve, .no-anim .bar, .no-anim .wfill { animation: none; stroke-dasharray: none; }
  @keyframes da-draw { from { stroke-dashoffset: 900; } to { stroke-dashoffset: 0; } }
  @keyframes da-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  @keyframes da-range { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  .strip { margin: calc(16*var(--px)) calc(34*var(--px)) 0; border-top: 1.5px solid ${INK}; border-bottom: 1.5px solid ${INK}; display: grid; grid-template-columns: repeat(5, 1fr); text-align: center; padding: calc(10*var(--px)) 0; }
  .cell { cursor: pointer; }
  .cell + .cell { border-left: 1px dotted ${DOT}; }
  .cv { font-family: Fraunces, Georgia, serif; font-size: max(11px, calc(16*var(--px))); font-weight: 700; white-space: nowrap; }
  .cl { font-size: max(7px, calc(9*var(--px))); font-weight: 700; letter-spacing: calc(1.5*var(--px)); color: ${TAN}; margin-top: calc(2*var(--px)); white-space: nowrap; }
  .week { padding-bottom: calc(22*var(--px)); cursor: pointer; }
  .wgrid { display: grid; grid-template-columns: calc(46*var(--px)) calc(24*var(--px)) calc(40*var(--px)) calc(32*var(--px)) 1fr calc(32*var(--px)); align-items: center; row-gap: calc(11*var(--px)); column-gap: calc(8*var(--px)); margin-top: calc(10*var(--px)); }
  .wday { font-family: Fraunces, Georgia, serif; font-size: max(10px, calc(13*var(--px))); font-weight: 700; }
  .wico { display: flex; align-items: center; }
  .wico svg { width: max(14px, calc(20*var(--px))); height: max(14px, calc(20*var(--px))); }
  .wpp { font-size: max(8px, calc(10.5*var(--px))); color: ${BLUE}; font-weight: 700; }
  .wlo, .whi { font-size: max(9px, calc(12*var(--px))); font-weight: 600; color: ${BROWN}; text-align: right; }
  .whi { font-family: Fraunces, Georgia, serif; color: ${INK}; font-weight: 700; font-size: max(10px, calc(13*var(--px))); }
  .wbar { height: calc(7*var(--px)); border-radius: 999px; background: ${TRACK}; position: relative; }
  .wfill { position: absolute; top: 0; height: 100%; border-radius: 999px; transform-origin: left; animation: da-range .6s both; }
  .tick { position: absolute; top: calc(-2*var(--px)); width: 3px; height: calc(11*var(--px)); background: ${INK}; border-radius: 2px; }
  @container (max-width: 340px) { .wpp { display: none; } .wgrid { grid-template-columns: calc(46*var(--px)) calc(24*var(--px)) calc(32*var(--px)) 1fr calc(32*var(--px)); } }
</style>
<div class="wrap"><div class="card ${anim}">
  <div class="mast">
    <div class="kick">${esc(cfg.title)}${location ? " · " + esc(location) : ""}</div>
    <div class="date" id="da-date">${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
    <div class="rule"></div>
  </div>
  ${this._scene(w, sky, nws)}
  ${band}
  ${this._chart(w)}
  ${this._strip(w, sunrise, sunset)}
  ${this._week(w)}
</div></div>`;

    this.shadowRoot.querySelectorAll("[data-ent]").forEach((el) => {
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const cell = ev.target.closest("[data-ent]");
        this.dispatchEvent(new CustomEvent("hass-more-info", {
          detail: { entityId: cell.dataset.ent }, bubbles: true, composed: true,
        }));
      });
    });
  }

  getCardSize() { return 9; }
}

if (!document.getElementById("da-card-font")) {
  const l = document.createElement("link");
  l.id = "da-card-font"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,900&family=Archivo:wght@500;600;700&display=swap";
  document.head.appendChild(l);
}

customElements.define("almanac-weather-card", AlmanacWeatherCard);
console.info(`%c ALMANAC-WEATHER-CARD %c ${DAC_VERSION} `, "background:#3a2d1f;color:#f3e7d3;font-weight:700", "background:#c65f38;color:#fff;font-weight:700");
window.customCards = window.customCards || [];
window.customCards.push({
  type: "almanac-weather-card",
  name: "Almanac Weather Card",
  description: "Editorial almanac-style weather panel: realtime sun/moon arc over a desert or Appalachian scenescape that reacts to conditions, 24-hour chart, week-ahead outlook.",
  preview: true,
  documentationURL: "https://github.com/LoneWolf345/almanac-weather-card",
});
