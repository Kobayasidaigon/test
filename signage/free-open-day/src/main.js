/*
 * 無料開放デー サイネージ動画 (横向き 1920×1080・30fps・26.5 秒・ループ)
 *
 * 画面はすべて「時刻 t (秒) → 見た目」の関数で決まる。window.seek(t) を呼ぶと
 * その時刻の 1 コマになるので、render.mjs が 1 コマずつ撮って動画にする。
 * ブラウザでそのまま開くと、実時間でループ再生する (確認用)。
 *
 * 文言・日付を変えるときは、下の TEXT だけを書き換える。
 */
(function () {
  "use strict";

  // ───────────────────────── 文言 ─────────────────────────
  const TEXT = {
    store: "フィットイージー笠寺店",
    date: "12/5",
    dow: "(土)",
    time: "10:00〜21:00",
    title: "無料開放デー",
    sub: "ジムを無料で体験できます！",
    invite1: "お友達・ご家族を誘って",
    invite2: "体験しに来てください！",
    ref: {
      ribbon: "紹介キャンペーン実施中！",
      lead: "お友達のご入会で、おふたりにプレゼント！",
      a: { label: "ご入会の方", amount: "1,000", unit: "円分" },
      b: { label: "ご紹介者様", amount: "2,000", unit: "円分" },
    },
    sw: {
      ribbon: "のりかえキャンペーン実施中！",
      lead: "他のジムからのりかえでご入会の方に",
      amount: "2,000", unit: "円分", gift: "プレゼント！",
    },
    closing: "ぜひお待ちしています！",
  };

  // ───────────────────────── 基本 ─────────────────────────
  const W = 1920, H = 1080, T = 26.5, FPS = 30;
  const TAU = Math.PI * 2;
  const NS = "http://www.w3.org/2000/svg";
  const stage = document.getElementById("stage");

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const prog = (t, t0, d) => clamp((t - t0) / d);
  const outCubic = (p) => 1 - Math.pow(1 - p, 3);
  const inCubic = (p) => p * p * p;
  const inOutSine = (p) => 0.5 - 0.5 * Math.cos(Math.PI * p);
  const outBack = (p, s = 1.70158) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);
  const outBounce = (p) => {
    const n = 7.5625, d = 2.75;
    if (p < 1 / d) return n * p * p;
    if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
    if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
    return n * (p -= 2.625 / d) * p + 0.984375;
  };
  // 決まった種から同じ乱数列を出す (撮るたびに同じ絵になるように)
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      let x = Math.imul(s ^ (s >>> 15), 1 | s);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function el(tag, style, parent) {
    const e = document.createElement(tag);
    if (style) Object.assign(e.style, style);
    if (parent) parent.appendChild(e);
    return e;
  }
  function sv(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function layer(name) {
    const d = el("div", null, stage);
    d.className = "layer"; d.dataset.name = name;
    return d;
  }

  // ───────────────────────── 動く部品の登録 ─────────────────────────
  // anim(t) は {x, y, s, sx, sy, r, o} を返す。null なら非表示。
  // 位置 (x, y) は部品の「基準点」が来る場所。基準点は ax, ay (既定は中心)。
  const nodes = [];
  function add(parent, e, anim, opt = {}) {
    e.classList.add("n");
    parent.appendChild(e);
    const n = { e, anim, ax: opt.ax ?? "50%", ay: opt.ay ?? "50%" };
    nodes.push(n);
    return n;
  }
  function applyNode(n, t) {
    const s = n.anim(t);
    if (!s || (s.o ?? 1) <= 0.002) { if (n.vis !== false) { n.e.style.display = "none"; n.vis = false; } return; }
    if (n.vis !== true) { n.e.style.display = ""; n.vis = true; }
    const sx = (s.sx ?? 1) * (s.s ?? 1), sy = (s.sy ?? 1) * (s.s ?? 1);
    const ax = typeof n.ax === "number" ? n.ax + "px" : n.ax;
    const ay = typeof n.ay === "number" ? n.ay + "px" : n.ay;
    n.e.style.opacity = s.o ?? 1;
    n.e.style.transform =
      `translate(${s.x.toFixed(2)}px,${s.y.toFixed(2)}px) rotate(${(s.r ?? 0).toFixed(3)}deg) ` +
      `scale(${sx.toFixed(4)},${sy.toFixed(4)}) translate(-${ax},-${ay})`;
  }

  // 入場 → その場でゆっくり動く → 退場、をまとめた動き
  function A(o) {
    const { x, y, t0, t1, kind = "pop", dur = 0.45, outDur = 0.34, idle, rot = 0 } = o;
    return (t) => {
      if (t < t0 || t > t1 + outDur) return null;
      let s = 1, sx = 1, op = 1, dx = 0, dy = 0, r = rot;
      const p = prog(t, t0, dur);
      if (kind === "pop") { s = Math.max(0.001, outBack(p, 2.1)); op = clamp(p * 5); }
      else if (kind === "fadeUp") { const e = outCubic(p); op = e; dy = (1 - e) * 34; }
      else if (kind === "fadeDown") { const e = outCubic(p); op = e; dy = -(1 - e) * 34; }
      else if (kind === "drop") { dy = -(1 - outBounce(p)) * 460; op = clamp(p * 8); }
      else if (kind === "wipe") { sx = Math.max(0.001, outBack(p, 1.4)); op = clamp(p * 6); }
      if (idle) {
        const i = idle(Math.max(0, t - t0 - dur), t);
        s *= i.s ?? 1; dx += i.x ?? 0; dy += i.y ?? 0; r += i.r ?? 0;
      }
      if (t > t1) { const q = inCubic(prog(t, t1, outDur)); op *= 1 - q; s *= 1 - 0.1 * q; dy -= 22 * q; }
      return { x: x + dx, y: y + dy, s, sx, r, o: op };
    };
  }
  const pulse = (amp, period, ph = 0) => (lt) => ({ s: 1 + amp * Math.sin((TAU * lt) / period + ph) * clamp(lt / 0.5) });
  const float = (ay, ar, period, ph = 0) => (lt) => ({
    y: ay * Math.sin((TAU * lt) / period + ph) * clamp(lt / 0.6),
    r: ar * Math.sin((TAU * lt) / (period * 1.25) + ph + 1) * clamp(lt / 0.6),
  });

  // ───────────────────────── 文字 (ふち付き) ─────────────────────────
  // segs: [[文字, サイズ, 上下ずらし], ...]。塗り → 濃いふち → 白いふち の 3 枚重ね。
  let uid = 0;
  const measureSvg = sv("svg", { width: 10, height: 10, style: "position:absolute;left:-9999px;top:0;visibility:hidden" }, document.body);
  function text(segs, o) {
    if (typeof segs === "string") segs = [[segs, o.size]];
    const id = "g" + ++uid;
    const sw = o.stroke ? o.strokeW ?? 6 : 0;        // 濃いふちの太さ
    const ow = o.outerW ?? 8;                         // 白いふちの太さ
    const mk = (attrs) => {
      const t = sv("text", Object.assign({ x: 0, y: 0, "font-family": "NSJP", "font-weight": 900,
        "stroke-linejoin": "round", "stroke-linecap": "round", "paint-order": "stroke" }, attrs));
      if (o.ls) t.setAttribute("letter-spacing", o.ls);
      let cur = 0;
      for (const [str, size, dy = 0] of segs) {
        const ts = sv("tspan", { "font-size": size }, t);
        if (dy - cur !== 0) ts.setAttribute("dy", dy - cur);
        cur = dy; ts.textContent = str;
      }
      return t;
    };
    const probe = mk({}); measureSvg.appendChild(probe);
    const bb = probe.getBBox(); probe.remove();
    const pad = sw + ow + 24;
    const w = bb.width + pad * 2, h = bb.height + pad * 2;
    const svg = sv("svg", { width: w, height: h, viewBox: `${bb.x - pad} ${bb.y - pad} ${w} ${h}` });
    if (o.shadow !== false) svg.style.filter = `drop-shadow(0 ${o.shadowY ?? 7}px ${o.shadowB ?? 7}px ${o.shadowC ?? "rgba(110,60,15,.30)"})`;
    let fill = o.fill;
    if (Array.isArray(o.fill)) {
      const defs = sv("defs", null, svg);
      const lg = sv("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      // 文字の上下いっぱいではなく、実際に字がある範囲で色が変わるように少し内側に寄せる
      const a = o.gradFrom ?? 0.22, b = o.gradTo ?? 0.88;
      o.fill.forEach((c, i) => sv("stop", { offset: a + ((b - a) * i) / (o.fill.length - 1), "stop-color": c }, lg));
      fill = `url(#${id})`;
    }
    if (ow > 0) svg.appendChild(mk({ fill: "#fff", stroke: "#fff", "stroke-width": 2 * (sw + ow) }));
    if (sw > 0) svg.appendChild(mk({ fill: o.stroke, stroke: o.stroke, "stroke-width": 2 * sw }));
    svg.appendChild(mk({ fill }));
    svg.dataset.w = bb.width; svg.dataset.h = bb.height;
    return svg;
  }
  const ORANGE = { fill: ["#FFC12B", "#F9951F", "#F0641A"], stroke: "#5B2A0B" };
  const BLUE = { fill: ["#63BDFF", "#2F86E8", "#1B58C9"], stroke: "#1A2C66" };
  const RED = { fill: ["#FF7A3A", "#EE3A2C", "#D31F2A"], stroke: "#5A1810" };
  const BROWN = { fill: "#4B2A14" };

  // ───────────────────────── 丸い札・リボン・きらめき ─────────────────────────
  function pill(parts, o) {
    const d = el("div", {
      background: o.bg, color: o.color, border: `${o.bw ?? 6}px solid ${o.border}`,
      padding: `${o.py ?? 14}px ${o.px ?? 44}px`, fontSize: o.size + "px",
      boxShadow: `0 ${o.sh ?? 8}px ${(o.sh ?? 8) * 1.5}px rgba(110,60,15,.22)`,
      letterSpacing: o.ls ?? "0.02em",
    });
    d.className = "pill";
    for (const p of typeof parts === "string" ? [[parts, o.size]] : parts) {
      const s = el("span", { fontSize: p[1] + "px" }, d);
      if (p[2]) s.style.marginLeft = p[2] + "px";
      s.textContent = p[0];
    }
    return d;
  }
  function ribbon(str, c, size = 56) {
    const tw = str.length * size * 1.02, padX = 74, h = Math.round(size * 1.62);
    const bw = tw + padX * 2, tail = 78, drop = 16, tot = bw + tail * 2 - 44;
    const svg = sv("svg", { width: tot, height: h + drop + 10, viewBox: `0 0 ${tot} ${h + drop + 10}` });
    svg.style.filter = "drop-shadow(0 8px 9px rgba(110,60,15,.28))";
    const id = "g" + ++uid, defs = sv("defs", null, svg);
    const lg = sv("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    sv("stop", { offset: 0, "stop-color": c.top }, lg); sv("stop", { offset: 1, "stop-color": c.bot }, lg);
    const x0 = tail - 22, x1 = x0 + bw;
    // うしろに回り込む両端
    sv("path", { d: `M0 ${drop} H${x0 + 30} V${h + drop} H0 L${26} ${drop + h / 2} Z`, fill: c.tail }, svg);
    sv("path", { d: `M${tot} ${drop} H${x1 - 30} V${h + drop} H${tot} L${tot - 26} ${drop + h / 2} Z`, fill: c.tail }, svg);
    // 折り返しの影
    sv("path", { d: `M${x0} ${h} L${x0 + 30} ${h + drop} V${h} Z`, fill: c.fold }, svg);
    sv("path", { d: `M${x1} ${h} L${x1 - 30} ${h + drop} V${h} Z`, fill: c.fold }, svg);
    sv("rect", { x: x0, y: 0, width: bw, height: h, rx: 5, fill: `url(#${id})` }, svg);
    sv("rect", { x: x0 + 14, y: h - 13, width: bw - 28, height: 3, rx: 1.5, fill: "rgba(255,255,255,.55)" }, svg);
    sv("rect", { x: x0 + 14, y: 9, width: bw - 28, height: 3, rx: 1.5, fill: "rgba(255,255,255,.28)" }, svg);
    const t = sv("text", { x: x0 + bw / 2, y: h / 2 + size * 0.355, "text-anchor": "middle", "font-family": "NSJP",
      "font-weight": 900, "font-size": size, fill: "#fff", "letter-spacing": "0.02em" }, svg);
    t.textContent = str;
    return svg;
  }
  const RIB_RED = { top: "#F2554A", bot: "#D82C2A", tail: "#BE2623", fold: "#84161A" };
  const RIB_BLUE = { top: "#3F92EC", bot: "#1F66CF", tail: "#1A55B0", fold: "#10397E" };

  function star(size, color) {
    const svg = sv("svg", { width: size, height: size, viewBox: "-50 -50 100 100" });
    sv("path", { d: "M0 -50 C4 -14 14 -4 50 0 C14 4 4 14 0 50 C-4 14 -14 4 -50 0 C-14 -4 -4 -14 0 -50 Z", fill: color }, svg);
    if (color !== "#fff") sv("circle", { r: 8, fill: "#fff" }, svg);
    else svg.style.filter = "drop-shadow(0 0 5px rgba(255,200,120,.9))";
    return svg;
  }
  function sparkles(parent, list, t0, t1) {
    list.forEach(([x, y, size, white, ph], i) => {
      add(parent, star(size, white ? "#fff" : "#FFC531"), (t) => {
        if (t < t0 || t > t1 + 0.3) return null;
        const lt = t - t0, a = clamp(lt / 0.3) * (1 - prog(t, t1, 0.3));
        const tw = 0.5 + 0.5 * Math.sin((TAU * lt) / 1.3 + ph);
        return { x, y, s: 0.45 + 0.6 * tw, r: 14 * Math.sin((TAU * lt) / 2.6 + ph), o: a * (0.35 + 0.65 * tw) };
      });
    });
  }
  // 金額が出る瞬間の放射線
  function burst(parent, x, y, rx, ry, t0, n = 16) {
    for (let i = 0; i < n; i++) {
      const ang = (TAU * i) / n + 0.2, len = i % 2 ? 44 : 62;
      const d = el("div", { width: "11px", height: len + "px", borderRadius: "6px", background: i % 2 ? "#FFD24A" : "#FFB52E" });
      add(parent, d, (t) => {
        const p = prog(t, t0, 0.62);
        if (p <= 0 || p >= 1) return null;
        const e = outCubic(p), k = 0.78 + 0.5 * e;
        return { x: x + Math.sin(ang) * rx * k, y: y - Math.cos(ang) * ry * k, r: (ang * 180) / Math.PI,
          sy: 1 - 0.55 * p, o: p < 0.15 ? p / 0.15 : 1 - inCubic((p - 0.15) / 0.85) };
      });
    }
  }

  // ───────────────────────── 人物 ─────────────────────────
  // 切り抜き画像と「足もとの中心」の位置 (px)。足もとを軸に左右へゆれる。
  const CHARS = [
    { src: "man1.png", w: 254, h: 551, feetX: 129.6, bottom: 544 },
    { src: "woman1.png", w: 213, h: 500, feetX: 100.3, bottom: 493 },
    { src: "man2.png", w: 223, h: 531, feetX: 109.9, bottom: 524 },
    { src: "woman2.png", w: 223, h: 505, feetX: 88.7, bottom: 497 },
  ];
  function people(parent, shadowParent, xs, floorY, scale, t0, t1) {
    CHARS.forEach((c, i) => {
      const tin = t0 + i * 0.12, tout = t1 + i * 0.07, ph = i * 1.7;
      const yOff = (t) => {
        let y = 0;
        const p = prog(t, tin, 0.62);
        if (p < 1) y = (1 - outBack(p, 1.5)) * 700;
        if (t > tout) y += inCubic(prog(t, tout, 0.45)) * 760;
        return y;
      };
      const sh = el("div", { width: "230px", height: "34px", borderRadius: "50%",
        background: "radial-gradient(closest-side, rgba(120,70,20,.30), rgba(120,70,20,0))" });
      add(shadowParent, sh, (t) => {
        if (t < tin || t > tout + 0.45) return null;
        const k = 1 - clamp(Math.abs(yOff(t)) / 260);
        return { x: xs[i], y: floorY + 2, s: scale * (0.7 + 0.3 * k), o: k };
      });
      const img = el("img"); img.src = "assets/" + c.src; img.width = c.w; img.height = c.h;
      add(parent, img, (t) => {
        if (t < tin || t > tout + 0.45) return null;
        const lt = t - tin, on = clamp((lt - 0.55) / 0.6);
        const sway = 1.5 * Math.sin((TAU * lt) / 2.0 + ph) * on;
        const bob = -7 * Math.abs(Math.sin((Math.PI * lt) / 1.0 + ph)) * on;
        return { x: xs[i], y: floorY + yOff(t) + bob, r: sway, s: scale };
      }, { ax: c.feetX, ay: c.bottom });
    });
  }

  // ───────────────────────── 背景 (部屋・旗・紙吹雪) ─────────────────────────
  const L = {
    room: layer("room"), bunting: layer("bunting"), confetti: layer("confetti"),
    shadow: layer("shadow"), fx: layer("fx"), content: layer("content"),
  };

  // 部屋はゆっくり 5% 寄って戻る (最初と最後で同じ絵になるのでループがつながる)
  const room = el("img", { position: "absolute", left: 0, top: 0, width: W + "px", height: H + "px", transformOrigin: "50% 50%" }, L.room);
  room.src = "assets/room.png";

  // 三角旗
  const flags = [];
  (function buildBunting() {
    const svg = sv("svg", { width: W, height: 150, viewBox: `0 0 ${W} 150` }, L.bunting);
    svg.style.position = "absolute";
    svg.style.filter = "drop-shadow(0 3px 3px rgba(120,70,20,.16))";
    const spans = 4, sw = W / spans, topY = -12, sag = 44, fw = 50, fh = 60;
    const ropeY = (x) => { const u = (x % sw) / sw; return topY + sag * 4 * u * (1 - u); };
    const slope = (x) => { const u = (x % sw) / sw; return (sag * 4 * (1 - 2 * u)) / sw; };
    let d = "";
    for (let x = 0; x <= W; x += 8) d += (x ? "L" : "M") + x + " " + ropeY(Math.min(x, W - 0.01)).toFixed(1);
    const perSpan = 7;
    for (let s = 0; s < spans; s++) for (let k = 0; k < perSpan; k++) {
      const x = s * sw + ((k + 0.5) / perSpan) * sw, y = ropeY(x), ang = (Math.atan(slope(x)) * 180) / Math.PI;
      const yel = (s * perSpan + k) % 2 === 0;
      const g = sv("g", null, svg);
      sv("path", { d: `M${-fw / 2} 0 L0 0 L0 ${fh} Z`, fill: yel ? "#FDC32F" : "#F8941F" }, g);
      sv("path", { d: `M0 0 L${fw / 2} 0 L0 ${fh} Z`, fill: yel ? "#F3A720" : "#EE6A1B" }, g);
      flags.push({ g, x, y, ang, ph: s * 2.1 + k * 0.9 });
    }
    sv("path", { d, fill: "none", stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round" }, svg);
  })();

  // 紙吹雪 (26.5 秒でちょうど元の位置に戻る速さだけを使う)
  const confetti = [];
  (function buildConfetti() {
    const r = rng(20261205);
    const colors = ["#F0483E", "#2F86E8", "#55B95C", "#F7A6C6", "#F8941F", "#FDC32F", "#6FC3E8", "#B58BE6"];
    const span = H + 120;
    for (let i = 0; i < 84; i++) {
      const size = 9 + r() * 13, shape = Math.floor(r() * 3), color = colors[Math.floor(r() * colors.length)];
      let e;
      if (shape === 2) {
        e = sv("svg", { width: size * 1.5, height: size * 1.5, viewBox: "0 0 10 10" });
        sv("path", { d: "M5 0.6 L9.6 9 L0.4 9 Z", fill: color }, e);
      } else {
        e = el("div", { width: (shape ? size : size * 0.62) + "px", height: size + "px",
          borderRadius: shape ? "50%" : "2px", background: color });
      }
      e.classList.add("n"); L.confetti.appendChild(e);
      confetti.push({ e, x: r() * W, y0: r() * span, laps: 2 + Math.floor(r() * 4), swA: 14 + r() * 36,
        swN: 3 + Math.floor(r() * 9), swP: r() * TAU, rotN: (2 + Math.floor(r() * 9)) * (r() < 0.5 ? -1 : 1),
        flipN: 4 + Math.floor(r() * 14), ph: r() * TAU, op: 0.72 + r() * 0.28 });
    }
    confetti.span = span;
  })();

  // ───────────────────────── 場面 1: 無料開放デー (0.0 – 4.9) ─────────────────────────
  const C = L.content, CX = W / 2;
  const badge = (size) => pill(TEXT.store, { bg: "#2A2F35", color: "#fff", border: "#8FCB3E", bw: Math.max(4, Math.round(size / 9)),
    size, px: Math.round(size * 1.15), py: Math.round(size * 0.36), ls: "0.04em" });
  {
    const t1 = 4.5;
    add(C, badge(42), A({ x: CX, y: 152, t0: 0.0, t1, kind: "fadeDown", dur: 0.4 }));
    const dp = pill([[TEXT.date, 100], [TEXT.dow, 60, 6]], { bg: "#E8423A", color: "#fff", border: "#fff", bw: 7, size: 100, px: 52, py: 12, ls: "0" });
    const tp = pill(TEXT.time, { bg: "#fff", color: "#C92F2B", border: "#E0403A", bw: 6, size: 70, px: 46, py: 16, ls: "0.01em" });
    stage.appendChild(dp); stage.appendChild(tp);
    const dw = dp.offsetWidth, tw = tp.offsetWidth, gap = 30, x0 = CX - (dw + gap + tw) / 2;
    add(C, dp, A({ x: x0 + dw / 2, y: 272, t0: 0.25, t1: t1 + 0.05, idle: pulse(0.012, 1.8) }));
    add(C, tp, A({ x: x0 + dw + gap + tw / 2, y: 272, t0: 0.45, t1: t1 + 0.05, idle: pulse(0.012, 1.8, 1) }));
    // 題字は 1 文字ずつ落ちてくる
    const size = 252, chars = [...TEXT.title], step = size * 0.985;
    chars.forEach((ch, i) => {
      const x = CX + (i - (chars.length - 1) / 2) * step;
      add(C, text(ch, { size, ...ORANGE, strokeW: 9, outerW: 11, shadowY: 12, shadowB: 10 }),
        A({ x, y: 487, t0: 0.62 + i * 0.075, t1: t1 + 0.1, kind: "drop", dur: 0.62,
          idle: (lt) => ({ y: -5 * Math.sin((TAU * lt) / 1.7 - i * 0.55) * clamp(lt / 0.6) }) }));
    });
    add(C, pill(TEXT.sub, { bg: "#fff", color: "#E7651A", border: "#F28C28", bw: 6, size: 54, px: 50, py: 18 }),
      A({ x: CX, y: 694, t0: 1.45, t1: t1 + 0.15, idle: pulse(0.014, 1.6) }));
    sparkles(C, [[345, 250, 60, 0, 0], [1590, 215, 46, 0, 2], [215, 520, 40, 1, 1], [1730, 500, 54, 1, 3.3],
      [1500, 690, 40, 0, 4], [420, 665, 34, 1, 5]], 1.2, t1);
  }

  // ───────────────────────── 場面 2: お誘い (5.0 – 10.45) ─────────────────────────
  {
    const t0 = 5.0, t1 = 10.05;
    add(C, text(TEXT.invite1, { size: 84, ...BROWN, outerW: 10, ls: "0.03em" }), A({ x: CX, y: 188, t0, t1: t1 + 0.1, kind: "fadeUp", dur: 0.4 }));
    add(C, text(TEXT.invite2, { size: 152, ...ORANGE, strokeW: 7, outerW: 10, shadowY: 10 }),
      A({ x: CX, y: 345, t0: t0 + 0.25, t1: t1 + 0.15, idle: pulse(0.012, 1.7) }));
    people(C, L.shadow, [510, 815, 1115, 1410], 1018, 0.97, t0 + 0.45, t1 - 0.05);
    sparkles(C, [[150, 300, 48, 0, 0], [1775, 330, 54, 0, 2.4], [330, 470, 36, 1, 1], [1640, 520, 40, 1, 3.5]], t0 + 0.8, t1);
  }

  // ───────────────────────── 場面 3: 紹介キャンペーン (10.55 – 16.85) ─────────────────────────
  function amount(num, unit, size, col) {
    return text([[num, size], [unit, Math.round(size * 0.56)]], { size, ...col, strokeW: Math.round(size / 22), outerW: Math.round(size / 15), shadowY: 9 });
  }
  function card(src, w, h, scale) {
    const i = el("img", { filter: "drop-shadow(0 12px 12px rgba(110,60,15,.28))" });
    i.src = "assets/" + src; i.width = Math.round(w * scale); i.height = Math.round(h * scale);
    return i;
  }
  {
    const t0 = 10.55, t1 = 16.45, R = TEXT.ref;
    add(C, ribbon(R.ribbon, RIB_RED), A({ x: CX, y: 184, t0, t1, kind: "wipe", dur: 0.42 }));
    add(C, text(R.lead, { size: 62, ...BROWN, outerW: 9, ls: "0.02em" }), A({ x: CX, y: 292, t0: t0 + 0.3, t1: t1 + 0.04, kind: "fadeUp", dur: 0.38 }));
    // カード 2 枚を先に置く (金額の文字がカードの上に重なるように)
    add(C, card("card_blue.png", 398, 279, 1.08), A({ x: 505, y: 484, t0: t0 + 0.7, t1: t1 + 0.08, idle: float(6, 1.4, 2.3) }));
    add(C, card("card_gold.png", 596, 387, 0.76), A({ x: 1510, y: 716, t0: t0 + 1.4, t1: t1 + 0.16, idle: float(6, 1.4, 2.5, 2) }));
    // 上の段: ご入会の方
    burst(L.fx, 1040, 478, 320, 150, t0 + 1.25);
    add(C, pill(R.a.label, { bg: "#2F86E8", color: "#fff", border: "#fff", bw: 6, size: 46, px: 40, py: 13 }),
      A({ x: 1040, y: 394, t0: t0 + 1.2, t1: t1 + 0.1 }));
    add(C, amount(R.a.amount, R.a.unit, 142, BLUE), A({ x: 1040, y: 506, t0: t0 + 1.25, t1: t1 + 0.1, dur: 0.5, idle: pulse(0.02, 1.5) }));
    // 下の段: ご紹介者様
    burst(L.fx, 860, 714, 320, 150, t0 + 1.85);
    add(C, pill(R.b.label, { bg: "#F07A1E", color: "#fff", border: "#fff", bw: 6, size: 46, px: 40, py: 13 }),
      A({ x: 860, y: 630, t0: t0 + 1.8, t1: t1 + 0.18 }));
    add(C, amount(R.b.amount, R.b.unit, 142, RED), A({ x: 860, y: 742, t0: t0 + 1.85, t1: t1 + 0.18, dur: 0.5, idle: pulse(0.02, 1.5, 1.5) }));
    sparkles(C, [[250, 350, 50, 0, 0], [1520, 400, 44, 1, 2], [1760, 560, 40, 0, 3.1], [380, 680, 42, 1, 1.2], [1180, 640, 30, 1, 4.4]], t0 + 0.9, t1);
  }

  // ───────────────────────── 場面 4: のりかえキャンペーン (16.95 – 21.9) ─────────────────────────
  {
    const t0 = 16.95, t1 = 21.5, S = TEXT.sw;
    add(C, ribbon(S.ribbon, RIB_BLUE), A({ x: CX, y: 184, t0, t1, kind: "wipe", dur: 0.42 }));
    add(C, text(S.lead, { size: 64, ...BROWN, outerW: 9, ls: "0.02em" }), A({ x: CX, y: 302, t0: t0 + 0.3, t1: t1 + 0.04, kind: "fadeUp", dur: 0.38 }));
    add(C, card("card_gold.png", 596, 387, 0.94), A({ x: 580, y: 560, t0: t0 + 0.75, t1: t1 + 0.1, idle: float(8, 1.6, 2.4) }));
    burst(L.fx, 1290, 520, 450, 190, t0 + 1.35, 20);
    add(C, amount(S.amount, S.unit, 206, RED), A({ x: 1290, y: 498, t0: t0 + 1.35, t1: t1 + 0.14, dur: 0.5, idle: pulse(0.02, 1.5) }));
    add(C, text(S.gift, { size: 112, ...ORANGE, strokeW: 6, outerW: 9 }), A({ x: 1290, y: 678, t0: t0 + 1.6, t1: t1 + 0.2, idle: pulse(0.014, 1.5, 1) }));
    sparkles(C, [[250, 360, 54, 0, 0], [1700, 330, 46, 1, 2], [900, 420, 34, 1, 1], [1760, 640, 50, 0, 3.4], [300, 700, 36, 1, 4.6]], t0 + 0.9, t1);
  }

  // ───────────────────────── 場面 5: しめ (22.0 – 26.5) ─────────────────────────
  {
    const t0 = 22.0, t1 = 25.98;
    const b = badge(38);
    const dp = pill([[TEXT.date, 66], [TEXT.dow, 42, 4], [TEXT.time, 56, 26]], { bg: "#E8423A", color: "#fff", border: "#fff", bw: 6, size: 66, px: 44, py: 12, ls: "0.01em" });
    stage.appendChild(b); stage.appendChild(dp);
    const bw = b.offsetWidth, dw = dp.offsetWidth, gap = 28, x0 = CX - (bw + gap + dw) / 2;
    add(C, b, A({ x: x0 + bw / 2, y: 160, t0, t1, kind: "fadeDown", dur: 0.36 }));
    add(C, dp, A({ x: x0 + bw + gap + dw / 2, y: 160, t0: t0 + 0.12, t1: t1 + 0.03 }));
    add(C, text(TEXT.title, { size: 104, ...ORANGE, strokeW: 6, outerW: 9 }), A({ x: CX, y: 278, t0: t0 + 0.28, t1: t1 + 0.07, idle: pulse(0.012, 1.8) }));
    add(C, text(TEXT.closing, { size: 136, ...ORANGE, strokeW: 7, outerW: 10, shadowY: 10 }),
      A({ x: CX, y: 410, t0: t0 + 0.5, t1: t1 + 0.12, dur: 0.5, idle: pulse(0.016, 1.6, 1) }));
    people(C, L.shadow, [510, 815, 1115, 1410], 1022, 0.95, t0 + 0.7, t1 - 0.2);
    sparkles(C, [[170, 330, 50, 0, 0], [1760, 300, 52, 0, 2.4], [300, 520, 36, 1, 1], [1650, 540, 40, 1, 3.5]], t0 + 0.8, t1);
  }

  // ───────────────────────── 1 コマを描く ─────────────────────────
  function seek(t) {
    t = ((t % T) + T) % T;
    const z = 1 + 0.05 * Math.pow(Math.sin((Math.PI * t) / T), 2);
    room.style.transform = `scale(${z.toFixed(5)})`;
    for (const f of flags) {
      const a = f.ang + 2.2 * Math.sin((TAU * 8 * t) / T + f.ph);
      f.g.setAttribute("transform", `translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) rotate(${a.toFixed(2)})`);
    }
    const span = confetti.span, u = t / T;
    for (const c of confetti) {
      const y = ((c.y0 + c.laps * span * u) % span) - 60;
      const x = c.x + c.swA * Math.sin(TAU * c.swN * u + c.swP);
      const flip = Math.cos(TAU * c.flipN * u + c.ph);
      c.e.style.opacity = c.op;
      c.e.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${(360 * c.rotN * u).toFixed(1)}deg) scaleY(${(0.25 + 0.75 * Math.abs(flip)).toFixed(3)})`;
    }
    for (const n of nodes) applyNode(n, t);
  }

  window.DURATION = T; window.FPS = FPS; window.seek = seek;
  window.ready = Promise.all([
    document.fonts.ready,
    ...[...document.images].map((i) => (i.decode ? i.decode().catch(() => {}) : Promise.resolve())),
  ]);

  // 確認用: ふつうに開いたときは実時間でループ再生し、画面に合わせて縮める
  if (!/[?&]capture/.test(location.search)) {
    const fit = () => { stage.style.transform = `scale(${Math.min(innerWidth / W, innerHeight / H)})`; };
    addEventListener("resize", fit); fit();
    const start = performance.now();
    const m = location.search.match(/[?&]t=([\d.]+)/);
    const loop = (now) => { seek(m ? +m[1] : (now - start) / 1000); if (!m) requestAnimationFrame(loop); };
    window.ready.then(() => requestAnimationFrame(loop));
  }
})();
