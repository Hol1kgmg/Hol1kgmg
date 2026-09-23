// name-logo.txt → terminal.svg（SMIL アニメーション、JS 不要で GitHub README に貼れる）
// 使い方: node scripts/gen-terminal-svg.mjs
import { readFileSync, writeFileSync } from "node:fs";

const PROMPT = "hol1kgmg@github ~ % ";
const CMD = "whoami";
const LOGO = readFileSync("name-logo.txt", "utf8").replace(/\n$/, "").split("\n");

// ── 見た目 ──
const FS = 12;            // font-size
const CW = FS * 0.6;      // 1文字幅 (等幅前提)
const LH = 16;            // 行高
const LOGO_CW = 6;        // ロゴの1文字幅（点字を詰める）
const LOGO_LH = 11;       // ロゴの行高
const PAD = 24;
const BAR = 32;
const FONT = "'JetBrains Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace";
const C = { bg: "#0f1117", bar: "#181b24", dim: "#555b70", prompt: "#4ec9b0", cmd: "#f8f8f2", log: "#b8bcc8" };

// ── タイムライン (秒) ──
const T_TYPE0 = 0.6;      // タイピング開始
const TYPE = 0.08;        // 1文字
const T_LOGO0 = T_TYPE0 + CMD.length * TYPE + 0.3;
const LINE = 0.04;        // ロゴ1行
const T_END = T_LOGO0 + LOGO.length * LINE + 0.1; // 最終プロンプト表示
const T_FALL = T_END + 3; // ロゴ落下開始
const FALL_STAGGER = 0.07; // 行ごとの落下開始ずれ
const FALL_DUR = 0.9;     // 1行が画面外へ落ちきる時間
const T_PILED = T_FALL + LOGO.length * FALL_STAGGER + FALL_DUR; // 積もり終わり
const T_RISE = T_PILED + 1; // 逆再生開始（最後に落ちた行から戻る）
const TOTAL = T_RISE + LOGO.length * FALL_STAGGER + FALL_DUR + 1; // 戻り後1秒で終了（ループなし）

const cols = Math.max(...LOGO.map((l) => [...l].length));
const W = PAD * 2 + Math.max(cols * LOGO_CW, 60 * CW);
const WIN_H = BAR + LH + PAD + LH + LOGO.length * LOGO_LH; // ターミナル窓の高さ: 上余白 / プロンプト / ロゴ / 下余白
const GROUND = WIN_H + 3 * LH;   // 地面 (窓の下端からテキスト3行分下)
const PILE_LH = 1.5;             // 積もった行の間隔 (小さいほど密に潰れる)
const H = GROUND + 6;            // ディセンダ分の余白

const k = (t) => (t / TOTAL).toFixed(4);
// 時刻 t 以降だけ表示（1回再生、最終状態で停止）
const show = (t) =>
  `<animate attributeName="opacity" values="0;1;1" keyTimes="0;${k(t)};1" calcMode="discrete" dur="${TOTAL}s" fill="freeze"/>`;

// baseline を上から順に積む
const text = (y, col, str, color, extra = "") =>
  `<text x="${PAD + col * CW}" y="${y}" fill="${color}" ${extra}>${str}</text>`;

let y = BAR + LH;
const out = [];

// プロンプト + タイピング
const promptY = y;
out.push(text(y, 0, PROMPT, C.prompt));
[...CMD].forEach((ch, i) =>
  out.push(`<g opacity="0">${show(T_TYPE0 + (i + 1) * TYPE)}${text(y, PROMPT.length + i, ch, C.cmd)}</g>`)
);
y += LH;

// 時刻 t から FALL_DUR かけて dy だけ落とし（加速）、時刻 tr から同じ時間で元の位置へ戻す（減速）
const fall = (t, tr, dy) =>
  `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 ${dy};0 ${dy};0 0;0 0" keyTimes="0;${k(t)};${k(t + FALL_DUR)};${k(tr)};${k(tr + FALL_DUR)};1" calcMode="spline" keySplines="0 0 1 1;0.5 0 1 1;0 0 1 1;0 0 0.5 1;0 0 1 1" dur="${TOTAL}s" fill="freeze"/>`;

// ロゴ 1行ずつ（文字幅・行高を詰める）。表示後 3 秒で上の行から落下し、
// 先に落ちた行ほど下になるよう地面に積もる
LOGO.forEach((l, i) => {
  const landY = GROUND - i * PILE_LH;
  out.push(
    `<g opacity="0">${show(T_LOGO0 + i * LINE)}${fall(T_FALL + i * FALL_STAGGER, T_RISE + (LOGO.length - 1 - i) * FALL_STAGGER, (landY - y).toFixed(1))}${text(y, 0, l, C.log, `textLength="${cols * LOGO_CW}" lengthAdjust="spacingAndGlyphs"`)}</g>`
  );
  y += LOGO_LH;
});

// カーソル: タイピング中は文字を追い、ロゴ出力開始で消える
const cx = (col) => (PAD + col * CW).toFixed(1);
// keyTimes は末尾 1 が必須なので最後の値を複製する
const anim = (attr, values, times, dur = TOTAL) =>
  `<animate attributeName="${attr}" values="${[...values, values.at(-1)].join(";")}" keyTimes="${[...times, 1].join(";")}" calcMode="discrete" dur="${dur}s" ${dur === TOTAL ? 'fill="freeze"' : 'repeatCount="indefinite"'}/>`;
const xs = [cx(PROMPT.length), ...[...CMD].map((_, i) => cx(PROMPT.length + i + 1))];
const xt = [0, ...[...CMD].map((_, i) => k(T_TYPE0 + (i + 1) * TYPE))];
out.push(`<rect width="${CW}" height="${FS + 2}" fill="${C.prompt}" y="${promptY - FS}">
  ${anim("x", xs, xt)}
  ${anim("opacity", [1, 0], [0, k(T_LOGO0)])}
  ${anim("fill-opacity", [1, 0], [0, 0.5], 1.1)}
</rect>`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}" font-size="${FS}" xml:space="preserve">
<rect width="${W}" height="${WIN_H}" rx="10" fill="${C.bg}"/>
<path d="M0 ${BAR}H${W}" stroke="#23262f"/>
<rect width="${W}" height="${BAR}" rx="10" fill="${C.bar}"/><rect y="${BAR - 10}" width="${W}" height="10" fill="${C.bar}"/>
<circle cx="18" cy="16" r="6" fill="#ff5f56"/><circle cx="37" cy="16" r="6" fill="#ffbd2e"/><circle cx="56" cy="16" r="6" fill="#27c93f"/>
<text x="${W / 2}" y="20" fill="#454a5a" font-size="11" text-anchor="middle" letter-spacing="1">github profile — ${cols}×${LOGO.length + 1}</text>
${out.join("\n")}
</svg>
`;
writeFileSync("terminal.svg", svg);
console.log(`terminal.svg: ${W}x${H} (window ${WIN_H}), total ${TOTAL.toFixed(2)}s`);
