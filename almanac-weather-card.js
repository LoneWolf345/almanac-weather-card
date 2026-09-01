/* Almanac Weather Card — an editorial, almanac-style weather panel for Home Assistant.
 * Sun and moon ride their real arc over a scenescape (desert or Appalachia) that
 * reacts to conditions in realtime; the scene darkens at night. 24-hour temp/precip
 * chart, conditions strip, week-ahead range bars.
 * https://github.com/LoneWolf345/almanac-weather-card
 */

const DAC_VERSION = "2026.8.15";

/* Optional local-station observation overrides: config key -> weather attribute.
 * When set, the entity's value replaces the forecast provider's current reading
 * everywhere it appears (masthead, strip, windpump, scene logic). */
const OBS_MAP = [
  ["obs_temp_entity", "temperature"],
  ["obs_humidity_entity", "humidity"],
  ["obs_dew_entity", "dew_point"],
  ["obs_wind_entity", "wind_speed"],
  ["obs_gust_entity", "wind_gust_speed"],
  ["obs_bearing_entity", "wind_bearing"],
  ["obs_pressure_entity", "pressure"],
];
const OBS_KEYS = OBS_MAP.map(([k]) => k).concat(["obs_uv_entity"]);

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
/* Great Plains: wheat flats, grain elevator, windpump with a live-wind rotor */
const PLAINS_PAL = {
  summer: ["#ddd0ac", "#d3be86", "#c9a95c"],
  spring: ["#d6d2ac", "#bcc48c", "#9db56a"],
  autumn: ["#d8cba8", "#c4ad7c", "#a98e58"],
  winter: ["#ddd8c8", "#d0cab8", "#c2bca8"],
};
const PLAINS_FLORA = (color, spinDur, ghost) => `<g${ghost ? ' opacity=".5"' : ""}>
<g stroke="#7a6b45" stroke-width="1.4" stroke-linecap="round" opacity=".5"><path d="M24 209 v-6 M30 210 v-7 M36 209 v-5 M158 207 v-6 M164 208 v-7 M170 207 v-5 M262 208 v-6 M268 209 v-7 M274 208 v-5 M356 207 v-6 M362 208 v-7 M498 206 v-6 M504 207 v-7"/></g>
<g fill="${color}" transform="translate(92,222)"><rect x="-9" y="-46" width="18" height="46"/><rect x="-21" y="-30" width="11" height="30"/><rect x="9" y="-24" width="9" height="24"/><path d="M-9 -46 L0 -55 L9 -46 Z"/><rect x="2" y="-53" width="4" height="8"/></g>
<g transform="translate(432,222)">
<g stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"><path d="M-8 0 L0 -36 M8 0 L0 -36 M-5 -13 L5 -13 M-2.7 -25 L2.7 -25"/></g>
<g transform="translate(0,-38)"><line x1="1" y1="0" x2="11" y2="3" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
<g style="animation:da-spin ${spinDur || 8}s linear infinite;transform-box:fill-box;transform-origin:center"><circle r="10.5" fill="none" stroke="${color}" stroke-width="1.3"/><path d="M0 -10.5 L0 10.5 M-10.5 0 L10.5 0 M-7.4 -7.4 L7.4 7.4 M-7.4 7.4 L7.4 -7.4" stroke="${color}" stroke-width="1.3"/></g>
<circle r="1.8" fill="${color}"/></g></g></g>`;
const SCENES = {
  desert: {
    ridges: () => [
      { d: "M0 176 L70 138 L130 164 L210 126 L290 166 L370 136 L450 162 L520 140 L520 226 L0 226 Z", day: "#d9b98c", night: "#494060", cap: "#efe9da" },
      { d: "M0 194 L90 162 L170 186 L280 154 L390 188 L480 164 L520 178 L520 226 L0 226 Z", day: "#c69b66", night: "#3c3452", cap: "#ece5d3" },
      { d: "M0 210 L110 190 L240 208 L360 186 L470 206 L520 196 L520 226 L0 226 Z", day: "#a3764a", night: "#2f2944", cap: "#e8e0cc" },
    ],
    flora: SAGUARO, floraDay: "#6e5232", floraNight: "#231e36", floraSnow: "",
    dust: true, haboob: true, fog: "ground", flood: false, shelf: false, ice: false, bendable: false,
  },
  appalachia: {
    ridges: (pal) => [
      { d: "M0 152 Q 60 118 130 138 T 260 130 T 390 142 T 520 126 L 520 226 L 0 226 Z", day: pal[0], night: "#3f4b57", cap: "#efe9da" },
      { d: "M0 178 Q 80 146 170 164 T 340 156 T 520 166 L 520 226 L 0 226 Z", day: pal[1], night: "#353f4b", cap: "#ece5d3" },
      { d: "M0 198 Q 90 172 200 188 T 400 180 T 520 192 L 520 226 L 0 226 Z", day: pal[2], night: "#2b343f", cap: "#e8e0cc" },
      { d: "M0 214 Q 110 194 240 206 T 470 200 T 520 208 L 520 226 L 0 226 Z", day: pal[3], night: "#222a33", cap: "#ded5be" },
    ],
    flora: SPRUCES, floraDay: "#33492f", floraNight: "#1d2822", floraSnow: SPRUCE_SNOW,
    dust: false, haboob: false, fog: "valley", flood: true, shelf: true, ice: true, bendable: true,
  },
  plains: {
    ridges: (pal) => [
      { d: "M0 172 L200 168 L380 172 L520 169 L520 226 L0 226 Z", day: pal[0], night: "#41465a", cap: "#efe9da" },
      { d: "M0 190 Q 130 182 260 188 T 520 186 L 520 226 L 0 226 Z", day: pal[1], night: "#363b4d", cap: "#ece5d3" },
      { d: "M0 210 Q 130 202 260 207 T 520 205 L 520 226 L 0 226 Z", day: pal[2], night: "#2b2f40", cap: "#e8e0cc" },
    ],
    pal: PLAINS_PAL,
    flora: PLAINS_FLORA, floraDay: "#7a5f42", floraNight: "#232838", floraSnow: "",
    dust: false, haboob: false, fog: "ground", flood: false, shelf: false, ice: false, bendable: false,
    tornado: true, hail: true, blizzard: true, sundogs: true,
  },
};
/* windy Appalachia: outflow gusts + spruces bending at the trunk */
const APP_GUSTS = `<g stroke="#8a9382" stroke-width="2" stroke-linecap="round" fill="none">
<path d="M0 96 q 30 -8 60 0 t 60 0" opacity=".7" style="animation:da-gust 3.4s linear infinite"/>
<path d="M0 130 q 26 -7 52 0 t 52 0" opacity=".55" style="animation:da-gust 4.4s 1s linear infinite"/>
<path d="M0 160 q 28 -7 56 0 t 56 0" opacity=".5" style="animation:da-gust 3.8s .5s linear infinite"/></g>`;
const BENT_SPRUCES = (color) => `
<g transform="translate(84,214)"><g style="animation:da-treebend 2.8s ease-in-out infinite;transform-box:fill-box;transform-origin:bottom center"><g fill="${color}" transform="translate(0,-2)"><path d="M0 -30 L7 -16 L-7 -16 Z M0 -22 L9 -7 L-9 -7 Z M0 -13 L11 2 L-11 2 Z"/><rect x="-1.5" y="2" width="3" height="5"/></g></g></g>
<g transform="translate(438,212)"><g style="animation:da-treebend 2.2s .6s ease-in-out infinite;transform-box:fill-box;transform-origin:bottom center"><g fill="${color}" transform="translate(0,-2)"><path d="M0 -32 L7.5 -17 L-7.5 -17 Z M0 -23 L9.5 -7 L-9.5 -7 Z M0 -13 L11.5 2 L-11.5 2 Z"/><rect x="-1.5" y="2" width="3" height="5"/></g></g></g>`;
/* ice storm: sleet needles, glazed flora, glints; icy ridge-rim fills by layer */
const ICE_RIMS = ["#e4ecef", "#dee7ea", "#d8e2e6", "#d2dce0"];
const SLEET_LAYER = `<g stroke="#9fb3c0" stroke-width="1.5" stroke-linecap="round" opacity=".7" style="animation:da-sleet .5s linear infinite">
<line x1="42" y1="70" x2="40" y2="82"/><line x1="94" y1="104" x2="92" y2="116"/><line x1="146" y1="66" x2="144" y2="78"/>
<line x1="198" y1="112" x2="196" y2="124"/><line x1="250" y1="74" x2="248" y2="86"/><line x1="302" y1="118" x2="300" y2="130"/>
<line x1="354" y1="70" x2="352" y2="82"/><line x1="406" y1="108" x2="404" y2="120"/><line x1="458" y1="76" x2="456" y2="88"/>
<line x1="68" y1="148" x2="66" y2="160"/><line x1="172" y1="154" x2="170" y2="166"/><line x1="276" y1="150" x2="274" y2="162"/>
<line x1="380" y1="156" x2="378" y2="168"/><line x1="484" y1="148" x2="482" y2="160"/><line x1="120" y1="46" x2="118" y2="58"/>
<line x1="224" y1="50" x2="222" y2="62"/><line x1="328" y1="44" x2="326" y2="56"/><line x1="432" y1="50" x2="430" y2="62"/></g>`;
const ICE_GLAZE = `<g stroke="#dfeaee" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".9">
<g transform="translate(84,212)"><path d="M-7 -16 L7 -16 M-9 -7 L9 -7 M-11 2 L11 2"/></g>
<g transform="translate(438,210)"><path d="M-7.5 -17 L7.5 -17 M-9.5 -7 L9.5 -7 M-11.5 2 L11.5 2"/></g></g>
<g fill="#ffffff"><circle cx="130" cy="139" r="1.8" style="animation:da-glint 5s 1s linear infinite"/>
<circle cx="340" cy="157" r="1.8" style="animation:da-glint 6s 2.8s linear infinite"/>
<circle cx="438" cy="196" r="1.6" style="animation:da-glint 4.5s .4s linear infinite"/></g>`;
/* flash flood: deep muddy water, treetops, foam, currents, drifting debris incl. vehicles */
const FLOOD_LAYER = `<g fill="#33492f">
<g transform="translate(84,212)"><path d="M0 -34 L7 -19 L-7 -19 Z M0 -25 L9 -9 L-9 -9 Z M0 -15 L11 1 L-11 1 Z"/></g>
<g transform="translate(300,216)"><path d="M0 -30 L6.5 -16 L-6.5 -16 Z M0 -21 L8 -6 L-8 -6 Z M0 -12 L10 2 L-10 2 Z"/></g>
<g transform="translate(438,210)"><path d="M0 -36 L7.5 -20 L-7.5 -20 Z M0 -26 L9.5 -9 L-9.5 -9 Z M0 -15 L11.5 2 L-11.5 2 Z"/></g></g>
<g style="animation:da-waterrise 8s ease-in-out infinite">
<rect x="0" y="188" width="520" height="42" fill="#7a5c38"/>
<rect x="0" y="188" width="520" height="10" fill="#8f6f45"/>
<g stroke="#d8c9a8" stroke-width="2.2" stroke-linecap="round" opacity=".65"><path d="M6 189 h14 M34 189 h8 M66 189 h16 M108 189 h9 M150 189 h15 M198 189 h8 M244 189 h14 M296 189 h9 M340 189 h16 M392 189 h8 M436 189 h14 M486 189 h10"/></g>
<g stroke="#b5915c" stroke-width="2" stroke-linecap="round" opacity=".75" fill="none">
<g style="animation:da-current 5s linear infinite"><path d="M-60 199 q 14 -4 28 0 t 28 0 M-14 210 q 12 -3 24 0 t 24 0"/></g>
<g style="animation:da-current 6.8s 1.8s linear infinite"><path d="M-70 204 q 15 -4 30 0 t 30 0 M-24 218 q 11 -3 22 0 t 22 0"/></g>
<g style="animation:da-current 4.2s 3s linear infinite"><path d="M-50 214 q 13 -4 26 0 t 26 0"/></g></g>
<g stroke="#5f4526" stroke-width="1.8" stroke-linecap="round" opacity=".55" fill="none">
<g style="animation:da-current 5.9s .9s linear infinite"><path d="M-40 207 q 14 -3 28 0 t 28 0"/></g>
<g style="animation:da-current 7.6s 3.8s linear infinite"><path d="M-56 221 q 15 -3 30 0 t 30 0"/></g></g>
<g style="animation:da-logdrift 11s linear infinite"><g transform="translate(0,196)"><g style="animation:da-bob 2.6s ease-in-out infinite">
<rect x="-16" y="-3" width="34" height="6" rx="3" fill="#54401f"/><circle cx="18" cy="0" r="3" fill="#463516"/><path d="M-16 -1 h30" stroke="#6b532a" stroke-width="1"/></g></g></g>
<g style="animation:da-logdrift 15s 6s linear infinite"><g transform="translate(0,212)"><g style="animation:da-bob 3.1s ease-in-out infinite">
<path d="M-8 0 l14 -3 M-2 -2 l6 4" stroke="#54401f" stroke-width="2.4" stroke-linecap="round"/></g></g></g>
<g style="animation:da-vehdrift 21s 4s linear infinite"><g transform="translate(0,198)"><g style="animation:da-bob 2.9s ease-in-out infinite">
<g transform="rotate(-5)"><path d="M-21 0 L-17 -3 L-13 -11 Q-12 -13 -9 -13 L7 -13 Q10 -13 12 -10 L15 -3 L19 0 Z" fill="#9c5a4b"/>
<path d="M-11 -4 L-9 -11 L-2 -11 L-2 -4 Z M1 -4 L1 -11 L6 -11 L9 -4 Z" fill="#d6dbd2" opacity=".9"/></g>
<path d="M-30 1 h7 M23 1 h8" stroke="#d8c9a8" stroke-width="2" stroke-linecap="round" opacity=".7"/></g></g></g>
<g style="animation:da-vehdrift 34s 16s linear infinite"><g transform="translate(0,208)"><g style="animation:da-bob 3.4s ease-in-out infinite">
<g transform="rotate(5)"><path d="M-25 0 L-25 -6 L-9 -6 L-9 -8 L-6 -8 L-3 -15 Q-2 -17 1 -17 L9 -17 Q12 -17 13 -14 L15 -8 L21 -8 L21 0 Z" fill="#5b6b74"/>
<path d="M-2 -9 L0 -14 L8 -14 L10 -9 Z" fill="#d6dbd2" opacity=".9"/></g>
<path d="M-33 1 h6 M25 1 h7" stroke="#d8c9a8" stroke-width="2" stroke-linecap="round" opacity=".7"/></g></g></g>
<g style="animation:da-vehdrift 13s 9s linear infinite"><g transform="translate(0,215)"><g style="animation:da-bob 2.2s ease-in-out infinite">
<rect x="-6" y="-5" width="12" height="8" rx="3" fill="#7a4527"/><path d="M-3 -5 v8 M3 -5 v8" stroke="#5a3018" stroke-width="1.2"/></g></g></g>
</g>`;
/* derecho: charcoal shelf-cloud wall from the west, triple lightning, forked double-strobe strike */
const DERECHO_WALL = `<g style="animation:da-creepL 12s ease-in-out infinite">
<g style="animation:da-billow2 8s ease-in-out infinite;transform-box:fill-box;transform-origin:center">
<path d="M220 0 L220 30 Q 200 64 156 62 Q 140 104 92 96 Q 40 122 -40 100 L-40 0 Z" fill="#4b4e58"/><rect x="-40" y="-2" width="260" height="34" fill="#4b4e58"/></g>
<g style="animation:da-billow1 6.5s ease-in-out infinite;transform-box:fill-box;transform-origin:center" fill="#5a5e6a">
<ellipse cx="176" cy="34" rx="52" ry="40"/><ellipse cx="128" cy="62" rx="48" ry="38"/><ellipse cx="72" cy="82" rx="52" ry="40"/>
<ellipse cx="10" cy="94" rx="56" ry="42"/><ellipse cx="150" cy="8" rx="60" ry="36"/><ellipse cx="60" cy="26" rx="64" ry="42"/><ellipse cx="-10" cy="44" rx="60" ry="46"/></g>
<g style="animation:da-billow2 5.5s .7s ease-in-out infinite;transform-box:fill-box;transform-origin:center" fill="#6d7268">
<ellipse cx="196" cy="52" rx="30" ry="24"/><ellipse cx="152" cy="80" rx="28" ry="22"/><ellipse cx="100" cy="98" rx="30" ry="22"/><ellipse cx="36" cy="110" rx="34" ry="24"/></g></g>
<path d="M210 62 L198 98 L212 96 L194 138 L222 94 L208 96 L222 62 Z" fill="#ffe9a8" style="animation:da-bolt1 6s linear infinite"/>
<path d="M164 88 L155 114 L166 112 L152 144 L174 110 L163 112 L174 88 Z" fill="#ffe9a8" style="animation:da-bolt2 6s linear infinite"/>
<g style="animation:da-bolt3 6s linear infinite">
<path d="M318 46 L304 88 L320 85 L296 140 L308 138 L290 176 L326 122 L310 125 L336 78 L322 81 L336 46 Z" fill="#fff3c4"/>
<path d="M305 112 L282 128 L296 127 L278 144" stroke="#ffe9a8" stroke-width="2.5" stroke-linecap="round" fill="none"/>
<circle cx="292" cy="174" r="14" fill="#fff3c4" opacity=".5"/></g>`;

/* tornado: green light, supercell deck, rotating wall cloud (pre-ridge) + swaying funnel (post-ridge) */
const TORNADO_SKY = `<rect x="0" y="0" width="520" height="226" fill="#6f7f5e" opacity=".26"/>
<g fill="#43454e" style="animation:da-deckdrift 22s ease-in-out infinite"><rect x="-20" y="0" width="560" height="40"/>
<circle cx="8" cy="40" r="20"/><circle cx="66" cy="40" r="15"/><circle cx="118" cy="40" r="21"/><circle cx="176" cy="40" r="15"/>
<circle cx="228" cy="40" r="22"/><circle cx="286" cy="40" r="15"/><circle cx="338" cy="40" r="21"/><circle cx="396" cy="40" r="15"/>
<circle cx="448" cy="40" r="22"/><circle cx="506" cy="40" r="16"/></g>
<g fill="#565863" style="animation:da-wallrotate 9s ease-in-out infinite"><ellipse cx="356" cy="58" rx="96" ry="26"/><ellipse cx="300" cy="52" rx="52" ry="20"/><ellipse cx="412" cy="52" rx="48" ry="18"/></g>`;
const TORNADO_FUNNEL = `<g style="animation:da-funnelsway 7s ease-in-out infinite;transform-box:fill-box;transform-origin:top center">
<path d="M300 66 C 330 70 384 70 410 66 C 398 96 380 108 372 128 C 366 144 362 158 360 172 L 354 190 C 348 190 346 176 348 160 C 350 142 344 122 334 104 C 326 90 308 76 300 66 Z" fill="#55565e" opacity=".95"/>
<path d="M366 120 C 372 126 374 134 371 142 M356 150 C 362 156 362 166 359 174" stroke="#6d6e78" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>
<g transform="translate(354,192)"><ellipse rx="34" ry="9" fill="#8a7a5e" opacity=".85"/><ellipse cx="-8" cy="-4" rx="20" ry="6" fill="#9c8c6c" opacity=".7"/>
<g style="animation:da-spin 1.8s linear infinite;transform-box:fill-box;transform-origin:center"><path d="M-14 -8 l5 2 M10 -10 l-4 3 M2 -14 l3 3 M-6 -12 l4 -2" stroke="#5f5340" stroke-width="2" stroke-linecap="round"/></g></g></g>
<path d="M120 52 L108 88 L122 86 L104 128 L132 84 L118 86 L132 52 Z" fill="#ffe9a8" style="animation:da-bolt1 5s linear infinite"/>`;
/* hail: translucent shafts + falling stones (pre-ridge), bouncing stones (post-ridge) */
const HAIL_SHAFTS = `<path d="M120 52 L96 226 L188 226 L196 52 Z" fill="#eef2ee" opacity=".18"/>
<path d="M300 52 L282 226 L368 226 L380 52 Z" fill="#eef2ee" opacity=".22"/>
<g fill="#f4f6f0" style="animation:da-hailfall .55s linear infinite">
<circle cx="118" cy="80" r="2.6"/><circle cx="146" cy="120" r="2.2"/><circle cx="170" cy="76" r="2.8"/><circle cx="132" cy="160" r="2.4"/>
<circle cx="158" cy="190" r="2.6"/><circle cx="308" cy="86" r="2.8"/><circle cx="334" cy="128" r="2.4"/><circle cx="356" cy="82" r="3"/>
<circle cx="322" cy="168" r="2.6"/><circle cx="346" cy="196" r="2.8"/><circle cx="106" cy="130" r="2.2"/><circle cx="368" cy="140" r="2.2"/></g>`;
const HAIL_BOUNCE = `<g fill="#f4f6f0">
<g style="animation:da-bounce1 1.1s linear infinite"><circle cx="140" cy="206" r="2.6"/></g>
<g style="animation:da-bounce1 1.3s .3s linear infinite"><circle cx="170" cy="209" r="2.3"/></g>
<g style="animation:da-bounce1 1s .6s linear infinite"><circle cx="318" cy="207" r="2.7"/></g>
<g style="animation:da-bounce1 1.2s .15s linear infinite"><circle cx="350" cy="210" r="2.4"/></g>
<g style="animation:da-bounce1 1.4s .5s linear infinite"><circle cx="112" cy="210" r="2.2"/></g></g>`;
/* blizzard: horizontal wind-driven snow + ground drift over a whiteout */
const BLIZZARD_LAYER = `<g stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".85">
<g style="animation:da-snowblow 1.6s linear infinite"><path d="M-120 44 h56 M-60 78 h40 M-100 112 h50 M-40 146 h34 M-90 180 h44"/></g>
<g style="animation:da-snowblow 2.1s .5s linear infinite"><path d="M-130 60 h48 M-70 96 h36 M-110 128 h52 M-50 164 h30 M-95 200 h42"/></g>
<g style="animation:da-snowblow 1.3s .9s linear infinite"><path d="M-115 36 h38 M-65 88 h28 M-105 120 h40 M-45 154 h26 M-85 192 h36"/></g></g>
<g fill="#f6f2e6">
<g style="animation:da-driftwisp 4.5s linear infinite"><ellipse cx="0" cy="214" rx="42" ry="6" opacity=".8"/></g>
<g style="animation:da-driftwisp 6s 2s linear infinite"><ellipse cx="0" cy="220" rx="52" ry="7" opacity=".7"/></g>
<g style="animation:da-driftwisp 3.6s 1s linear infinite"><ellipse cx="0" cy="208" rx="34" ry="5" opacity=".6"/></g></g>`;
/* sun dogs: halo, pillar, mock suns, tangent arc, diamond dust — anchored to the live sun */
const SUNDOG_LAYER = (x, y) => `<circle cx="${x}" cy="${y}" r="48" fill="none" stroke="#ffffff" stroke-width="2.5" opacity=".38"/>
<rect x="${(x - 5).toFixed(1)}" y="${(y - 48).toFixed(1)}" width="10" height="96" rx="5" fill="#f0d9a2" opacity=".35"/>
<g transform="translate(${(x - 48).toFixed(1)},${y.toFixed(1)})" style="animation:da-dogshimmer 4s ease-in-out infinite"><ellipse rx="9" ry="13" fill="#fff3d0"/><path d="M3 -12 Q -2 0 3 12" stroke="#d98a5f" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/><path d="M-6 -6 Q -14 0 -6 6" stroke="#fff8e4" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/></g>
<g transform="translate(${(x + 48).toFixed(1)},${y.toFixed(1)})" style="animation:da-dogshimmer 4s .7s ease-in-out infinite"><ellipse rx="9" ry="13" fill="#fff3d0"/><path d="M-3 -12 Q 2 0 -3 12" stroke="#d98a5f" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/><path d="M6 -6 Q 14 0 6 6" stroke="#fff8e4" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/></g>
<path d="M${(x - 24).toFixed(1)} ${(y - 46).toFixed(1)} Q ${x.toFixed(1)} ${(y - 56).toFixed(1)} ${(x + 24).toFixed(1)} ${(y - 46).toFixed(1)}" stroke="#fff3d0" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".5"/>
<g fill="#ffffff"><circle cx="120" cy="70" r="1.4" style="animation:da-glint 5s 1s linear infinite"/><circle cx="396" cy="58" r="1.5" style="animation:da-glint 6s 2.2s linear infinite"/><circle cx="176" cy="120" r="1.2" style="animation:da-glint 4.5s .4s linear infinite"/><circle cx="352" cy="128" r="1.3" style="animation:da-glint 5.5s 1.6s linear infinite"/><circle cx="88" cy="140" r="1.2" style="animation:da-glint 4.8s 2.6s linear infinite"/><circle cx="452" cy="104" r="1.4" style="animation:da-glint 5.2s .8s linear infinite"/></g>`;

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
      obs_temp_entity: "",
      obs_humidity_entity: "",
      obs_dew_entity: "",
      obs_wind_entity: "",
      obs_gust_entity: "",
      obs_bearing_entity: "",
      obs_pressure_entity: "",
      obs_uv_entity: "",
      column_rule: false,
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
    const p = this._effWeather(w).attributes.pressure;
    if (p != null) {
      const now = Date.now();
      this._pressHist.push([now, p]);
      this._pressHist = this._pressHist.filter(([t]) => now - t < 4 * 3600000);
    }
    const al = this._config.alerts_entity ? hass.states[this._config.alerts_entity] : null;
    const obsSig = OBS_KEYS.map((k) => { const e = this._config[k]; return e ? hass.states[e]?.state : ""; }).join("|");
    const sig = JSON.stringify([w.state, w.attributes, obsSig, s?.state, s?.attributes?.next_rising, al?.state, al?.attributes?.alerts, this._dailySig, this._hourlySig]);
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

  /* ---- local-station observation overrides ---- */
  _effWeather(w) {
    const c = this._config, h = this._hass;
    let a = null;
    for (const [key, attr] of OBS_MAP) {
      const ent = c[key];
      if (!ent) continue;
      const s = h?.states?.[ent];
      if (!s || s.state === "unknown" || s.state === "unavailable") continue;
      const v = Number(s.state);
      if (!isFinite(v)) continue;
      if (!a) a = { ...w.attributes };
      a[attr] = v;
      if (key === "obs_pressure_entity" && s.attributes.unit_of_measurement) a.pressure_unit = s.attributes.unit_of_measurement;
    }
    return a ? { state: w.state, attributes: a, entity_id: w.entity_id } : w;
  }
  _obsUv() {
    const ent = this._config.obs_uv_entity;
    if (!ent) return null;
    const s = this._hass?.states?.[ent];
    if (!s || s.state === "unknown" || s.state === "unavailable") return null;
    const v = Number(s.state);
    return isFinite(v) ? v : null;
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
    out.floodWarning = norm.some((x) => /flash flood warning|flood warning/i.test(x.event));
    out.severeThunder = norm.some((x) => /severe thunderstorm warning/i.test(x.event));
    out.tornadoWarning = norm.some((x) => /tornado warning/i.test(x.event));
    out.iceWarning = norm.some((x) => /ice storm warning/i.test(x.event));
    out.blizzardWarning = norm.some((x) => /blizzard warning/i.test(x.event));
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
    const out = { clouds: null, rain: 0, bolts: false, dust: false, haboob: false, snow: false, fog: false, flood: false, derecho: false, ice: false, bend: false, tornado: false, hailstorm: false, blizzard: false, sundogs: false, wash: null, condDark: false };
    if (nws.dustWarning && pack.haboob) { out.haboob = true; out.wash = ["#c08a4d", 0.14]; return out; }
    if (nws.tornadoWarning && pack.tornado) { out.tornado = true; out.wash = ["#3c4356", 0.22]; out.condDark = true; return out; }
    if (nws.floodWarning && pack.flood) { out.flood = true; out.clouds = "rainfield"; out.rain = 2; out.wash = ["#4a5468", 0.2]; return out; }
    if ((nws.severeThunder || nws.tornadoWarning) && pack.shelf) { out.derecho = true; out.bend = true; out.wash = ["#3c4356", 0.24]; out.condDark = true; return out; }
    if (nws.severeThunder && pack.hail) { out.hailstorm = true; out.clouds = "stormfield"; out.bolts = true; out.wash = ["#3c4356", 0.2]; out.condDark = true; return out; }
    if (nws.blizzardWarning && pack.blizzard) { out.blizzard = true; out.wash = ["#f0ece0", 0.38]; return out; }
    if (nws.iceWarning && pack.ice) { out.ice = true; out.clouds = "icefield"; out.wash = ["#9aa6ac", 0.15]; return out; }
    /* severe thunderstorm fallback: packs without a dedicated scene still go full storm on the warning */
    if (nws.severeThunder || nws.tornadoWarning) { out.clouds = "stormfield"; out.rain = 2; out.bolts = true; out.wash = ["#3c4356", 0.26]; out.condDark = true; return out; }
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
    if (pack.bendable && windy) out.bend = true;
    if (pack.sundogs && c === "sunny" && a.temperature != null) {
      const tF = a.temperature_unit === "°C" ? a.temperature * 9 / 5 + 32 : a.temperature;
      if (tF <= 10) out.sundogs = true;
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
    const minMark = minI > 2 ? `<circle cx="${mp[0].toFixed(1)}" cy="${mp[1].toFixed(1)}" r="3" fill="${TERRA}"/><text x="${(mp[0] + 8).toFixed(1)}" y="${(mp[1] + 14).toFixed(1)}" font-size="10" font-weight="700" fill="${TERRA}">${r0(hrs[minI].temperature)}° low</text>` : "";
    const gridT = (f) => Math.round(tMax - (tMax - tMin) * f);
    const punit = w.attributes.precipitation_unit === "mm" ? "PRECIP %" : "PRECIP %";
    return `
    <div class="pad">
      <div class="sect">THE NEXT 24 HOURS <span class="sectr">TEMP ${esc(w.attributes.temperature_unit || "°")} · <span style="color:${BLUE}">${punit}</span></span></div>
      <svg viewBox="0 0 452 180" class="chartsvg">
        <line x1="0" y1="18" x2="452" y2="18" stroke="${GRID}"/><line x1="0" y1="62" x2="452" y2="62" stroke="${GRID}"/><line x1="0" y1="106" x2="452" y2="106" stroke="${GRID}"/>
        <text x="0" y="14" font-size="9" fill="${TAN}">${gridT(0)}°</text><text x="0" y="58" font-size="9" fill="${TAN}">${gridT(0.5)}°</text><text x="0" y="102" font-size="9" fill="${TAN}">${gridT(1)}°</text>
        <text x="452" y="115" text-anchor="end" font-size="9" fill="${BLUE}">100%</text><text x="452" y="134" text-anchor="end" font-size="9" fill="${BLUE}">50</text><text x="452" y="152" text-anchor="end" font-size="9" fill="${BLUE}">0</text>
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
    const uv = this._obsUv() ?? this._daily?.[0]?.uv_index;
    let trend = "";
    if (this._pressHist.length > 1) {
      const d = this._pressHist[this._pressHist.length - 1][1] - this._pressHist[0][1];
      const thr = (a.pressure_unit === "hPa" || a.pressure_unit === "mbar") ? 0.7 : 0.02;
      trend = d > thr ? "↑" : d < -thr ? "↓" : "";
    }
    const c = this._config;
    const cell = (v, l, warm, ent) => `<div class="cell" data-ent="${esc(ent || c.entity)}"><div class="cv"${warm ? ` style="color:${TERRA}"` : ""}>${v}</div><div class="cl">${l}</div></div>`;
    const wind = a.wind_speed != null ? `${compass(a.wind_bearing)} ${r0(a.wind_speed)}` : "—";
    const gust = a.wind_gust_speed != null ? ` · G ${r0(a.wind_gust_speed)}` : "";
    return `<div class="strip">
      ${cell(uv != null ? Number(uv).toFixed(1) : "—", `UV${uv != null ? " · " + uvWord(uv) : ""}`, uv >= 8, c.obs_uv_entity)}
      ${cell(esc(wind), `WIND${esc(gust)}`, false, c.obs_wind_entity)}
      ${cell(a.humidity != null ? r0(a.humidity) + "%" : "—", `HUM${a.dew_point != null ? " · DEW " + r0(a.dew_point) + "°" : ""}`, false, c.obs_humidity_entity)}
      ${cell(a.pressure != null ? a.pressure + trend : "—", "PRESSURE", false, c.obs_pressure_entity)}
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
    const tx = cl.haboob ? 200 : cl.derecho ? 330 : cl.tornado ? 160 : 260;
    const ty1 = cl.flood ? 150 : 188, ty2 = cl.flood ? 174 : 212, tfs = cl.flood ? 74 : 84;
    const hideSun = cl.haboob || cl.fog || ["field", "rainfield", "stormfield"].includes(cl.clouds);
    let clouds = "";
    if (cl.clouds === "few") clouds = cloudC2(330, 84, 1, "#f8f1e0", "#8a6a3c", "dr1") + cloudC2(118, 56, 0.8, "#f8f1e0", "#8a6a3c", "dr2") + cloudC2(232, 112, 0.55, "#f8f1e0", "#8a6a3c", "dr3");
    else if (cl.clouds === "field") clouds = cl.snow ? cloudField("#cfc7b3", "#9b9280", "#c5bda9", "#8d8472") : cloudField("#e2d7bc", "#a08762", "#d3c5a3", "#8f7550");
    else if (cl.clouds === "rainfield") clouds = cloudField("#b7a88a", "#7d6845", "#a3946f", "#6d5a3a");
    else if (cl.clouds === "stormfield") clouds = cloudField("#9c8d72", "#5f5138", "#857659", "#514530");
    else if (cl.clouds === "icefield") clouds = cloudField("#c6beab", "#948c7a", "#b9b1a0", "#878071");
    const glow = hideSun && sunP ? `<circle cx="${sunP.x.toFixed(1)}" cy="${Math.max(40, sunP.y).toFixed(1)}" r="26" fill="#e8c187" opacity=".45"/>` : "";
    /* landscape from the scene pack */
    const pack = SCENES[this._config.scene];
    const season = cl.blizzard ? "winter" : this._config.seasons ? seasonOf(new Date().getMonth()) : "summer";
    const ridges = pack.ridges((pack.pal || APP_PAL)[season]);
    const fogMode = cl.fog ? pack.fog : null;
    const spinDur = Math.max(0.7, 9 - (a.wind_speed ?? 0) * 0.28).toFixed(1);
    let land = "";
    if (cl.derecho) land += `<rect x="0" y="0" width="520" height="226" fill="#8c9179" opacity=".22"/>`;
    if (cl.tornado) land += TORNADO_SKY;
    if (cl.hailstorm) land += HAIL_SHAFTS;
    const drawRidges = cl.flood ? ridges.slice(0, 3) : ridges;
    drawRidges.forEach((r, i) => {
      if (fogMode === "valley" && i > 0 && FOG_BANKS[i - 1]) land += FOG_BANKS[i - 1];
      if (cl.snow) land += `<path d="${r.d}" fill="${r.cap}"/><g transform="translate(0,7)"><path d="${r.d}" fill="${r.day}"/></g>`;
      else if (cl.ice) land += `<path d="${r.d}" fill="${ICE_RIMS[i] || ICE_RIMS[3]}"/><g transform="translate(0,3)"><path d="${r.d}" fill="${r.day}"/></g>`;
      else land += `<path d="${r.d}" fill="${r.day}"/>`;
    });
    if (cl.flood) land += FLOOD_LAYER;
    else if (cl.bend && pack.bendable) land += BENT_SPRUCES(pack.floraDay);
    else land += pack.flora(pack.floraDay, spinDur, cl.blizzard);
    if (cl.snow && !cl.flood) land += pack.floraSnow;
    if (cl.ice) land += ICE_GLAZE;
    if (cl.tornado) land += TORNADO_FUNNEL;
    if (cl.hailstorm) land += HAIL_BOUNCE;
    if (cl.blizzard) land += BLIZZARD_LAYER;
    if (cl.derecho) land += DERECHO_WALL + APP_GUSTS;
    else if (cl.bend && pack.bendable) land += APP_GUSTS;
    if (fogMode === "ground") land += GROUND_FOG;
    let nightLand = "";
    ridges.forEach((r) => { nightLand += `<path d="${r.d}" fill="${r.night}"/>`; });
    nightLand += pack.flora(pack.floraNight);
    return `
  <div class="scene" data-ent="${esc(this._config.entity)}">
    <svg viewBox="0 0 520 226" preserveAspectRatio="xMidYMax meet">
      <path d="M -35 265 Q 260 -75 545 265" fill="none" stroke="#cfa25f" stroke-width="1.5" stroke-dasharray="2 8" stroke-linecap="round" opacity=".55"/>
      <g id="da-sun" transform="translate(${sunP ? sunP.x.toFixed(1) : -100},${sunP ? sunP.y.toFixed(1) : 0})" style="${sunP && !hideSun ? "" : "display:none"}">
        <circle r="52" fill="none" stroke="${AMBER}" stroke-width="1.5" opacity="${cl.dust ? 0 : 0.4}"/>
        <circle r="38" fill="${AMBER}" opacity="${cl.dust ? 0.55 : 1}"/><circle r="30" fill="#f0b45c" opacity="${cl.dust ? 0.6 : 1}"/>
      </g>
      ${glow}
      ${cl.sundogs && sunP && !hideSun ? SUNDOG_LAYER(sunP.x, sunP.y) : ""}
      <g id="da-moon" transform="translate(${moonP ? moonP.x.toFixed(1) : -100},${moonP ? moonP.y.toFixed(1) : 0})" style="${moonP ? "" : "display:none"}">
        <circle r="20" fill="#f6efd8"/>
        <circle cx="-7" cy="-4" r="4" fill="#ddd3b6" opacity=".7"/><circle cx="6" cy="6" r="3" fill="#ddd3b6" opacity=".6"/><circle cx="4" cy="-8" r="2.2" fill="#ddd3b6" opacity=".6"/>
      </g>
      ${clouds}
      ${cl.dust ? `<rect x="0" y="0" width="520" height="226" fill="#d9b475" opacity=".22"/>` : ""}
      ${cl.rain ? rainLayer(cl.rain === 2) : ""}
      ${cl.ice ? SLEET_LAYER : ""}
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
      <text id="da-temp" x="${tx}" y="${ty1}" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="900" font-size="${tfs}" paint-order="stroke" stroke="${dark ? "#1a1f33" : PAPER}" stroke-width="6" stroke-linejoin="round" stroke-opacity="0.55" fill="${dark ? CREAM : INK}" class="fadefill">${r0(a.temperature)}°</text>
      <text id="da-cond" x="${tx}" y="${ty2}" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="700" font-size="11.5" letter-spacing="2.5" paint-order="stroke" stroke="${dark ? "#1a1f33" : PAPER}" stroke-width="3.5" stroke-linejoin="round" stroke-opacity="0.55" fill="${dark ? CREAM : INK}" class="fadefill">${esc(sub)}</text>
    </svg>
  </div>`;
  }

  _renderError(msg) {
    this.shadowRoot.innerHTML = `<div style="padding:16px;background:${PAPER};color:${INK};border-radius:12px;font-family:sans-serif">${esc(msg)}</div>`;
  }

  _render() {
    const hass = this._hass, cfg = this._config;
    const w0 = hass.states[cfg.entity];
    if (!w0) return;
    const w = this._effWeather(w0);
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
    // Until both forecasts have arrived the card is the short version; hold the last
    // full height so a page scrolled during load doesn't jump when the chart/week fill in.
    const loaded = !!(this._daily && this._hourly);
    const reserve = loaded ? 0 : this._reserve();
    this.style.minHeight = reserve ? reserve + "px" : "";

    this.shadowRoot.innerHTML = `
<style>
  :host { display: block; }
  * { box-sizing: border-box; }
  .wrap { container-type: inline-size; position: relative; }
  /* newspaper mode: a theme can draw a column rule in the gutter to the left (--almanac-column-rule) */
  .wrap::before { content: ""; position: absolute; top: 0; bottom: 0; left: calc(-1 * var(--almanac-gutter, 16px)); width: 1px; background: ${cfg.column_rule ? "var(--almanac-column-rule, #2b2118)" : "transparent"}; }
  .card {
    --px: max(0.5px, 0.1923cqw);
    background: var(--almanac-paper, ${PAPER}); color: ${INK};
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
  @keyframes da-sleet { from { transform: translateY(-30px); } to { transform: translateY(30px); } }
  @keyframes da-glint { 0%,88%,100% { opacity: 0; } 92%,94% { opacity: .9; } }
  @keyframes da-treebend { 0%,100% { transform: skewX(-4deg); } 50% { transform: skewX(-10deg); } }
  @keyframes da-creepL { 0%,100% { transform: translateX(-26px); } 50% { transform: translateX(0); } }
  @keyframes da-bolt3 { 0%,62%,68%,100% { opacity: 0; } 63%,64.5% { opacity: 1; } 65%,65.8% { opacity: .25; } 66%,67% { opacity: 1; } }
  @keyframes da-waterrise { 0%,100% { transform: translateY(4px); } 50% { transform: translateY(-3px); } }
  @keyframes da-current { from { transform: translateX(-80px); } to { transform: translateX(600px); } }
  @keyframes da-logdrift { 0% { transform: translateX(-70px) rotate(-2deg); } 50% { transform: translateX(260px) rotate(3deg); } 100% { transform: translateX(600px) rotate(-2deg); } }
  @keyframes da-vehdrift { from { transform: translateX(-90px); } to { transform: translateX(620px); } }
  @keyframes da-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
  @keyframes da-deckdrift { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-16px); } }
  @keyframes da-funnelsway { 0%,100% { transform: translateX(0) rotate(0deg); } 30% { transform: translateX(-7px) rotate(-1.2deg); } 65% { transform: translateX(6px) rotate(1deg); } }
  @keyframes da-wallrotate { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-10px); } }
  @keyframes da-hailfall { from { transform: translateY(-44px); } to { transform: translateY(44px); } }
  @keyframes da-bounce1 { 0%,100% { transform: translateY(0); } 18% { transform: translateY(-11px); } 36% { transform: translateY(0); } 50% { transform: translateY(-5px); } 62% { transform: translateY(0); } }
  @keyframes da-snowblow { from { transform: translateX(-140px); } to { transform: translateX(660px); } }
  @keyframes da-driftwisp { from { transform: translateX(-120px); } to { transform: translateX(640px); } }
  @keyframes da-dogshimmer { 0%,100% { opacity: .55; } 50% { opacity: .95; } }
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
    if (loaded) requestAnimationFrame(() => this._remember());
  }

  // Height memory: WebKit has no scroll anchoring and Chrome's is defeated by innerHTML
  // re-renders, so late-arriving content above the viewport shifts the page. Remember the
  // rendered height per device and reserve it on the next load until the data is back.
  _hkey() { return "awc-h:" + (this._config.entity || ""); }
  _reserve() { try { const v = parseInt(localStorage.getItem(this._hkey()), 10); return v > 40 ? v : 0; } catch (e) { return 0; } }
  _remember() { try { const h = Math.round(this.getBoundingClientRect().height); if (h > 40) localStorage.setItem(this._hkey(), String(h)); } catch (e) { /* storage unavailable */ } }

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
  description: "Editorial almanac-style weather panel: realtime sun/moon arc over a desert, Appalachian, or Great Plains scenescape that reacts to conditions, 24-hour chart, week-ahead outlook.",
  preview: true,
  documentationURL: "https://github.com/LoneWolf345/almanac-weather-card",
});
