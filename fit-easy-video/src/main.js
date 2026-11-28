/* FIT-EASY 法人契約 — モーショングラフィックス
 * window.__seek(t) で t 秒目の 1 フレームを決定的に描画する（書き出し用）。
 * ?play を付けて開くとブラウザ上でリアルタイム再生（プレビュー用）。
 */
(async function () {
  'use strict';
  gsap.registerPlugin(DrawSVGPlugin);
  // 書き出しを決定的にするため 3D 変換（GPU レイヤー化）を使わない
  gsap.config({ force3D: false });

  const DUR = 40;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const E = (n) => gsap.parseEase(n);
  const prog = (t, t0, t1, e) => { const p = clamp((t - t0) / (t1 - t0)); return e ? e(p) : p; };
  const show = (el, on) => { el.style.visibility = on ? 'visible' : 'hidden'; };

  // 1 文字ずつ span に分割（em / b などの装飾要素は残す）
  function split(el) {
    const out = [];
    const walk = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const ch of child.textContent) {
            if (ch === '\n') continue;
            const s = document.createElement('span');
            s.className = 'c';
            s.textContent = ch;
            frag.appendChild(s);
            out.push(s);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'svg') {
          walk(child);
        }
      }
    };
    walk(el);
    return out;
  }

  // ---------- QR ----------
  $('#D-qr').innerHTML = window.QR_SVG;

  // ---------- フォント読み込み（使う文字のサブセットをすべて先読み） ----------
  const allText = $('#stage').textContent.replace(/\s+/g, '');
  await Promise.all([
    document.fonts.load('900 100px "Noto Sans JP Variable"', allText),
    document.fonts.load('500 100px "Noto Sans JP Variable"', allText),
    document.fonts.load('italic 800 100px "Barlow Condensed"', 'STEP 0123456789'),
  ]);
  await document.fonts.ready;

  // ---------- タイムライン ----------
  const tl = gsap.timeline({ paused: true, defaults: { immediateRender: false, lazy: false } });
  const IN = (tg, from, to, at) => { gsap.set(tg, from); tl.fromTo(tg, from, to, at); };
  const OUT = (tg, from, to, at) => tl.fromTo(tg, from, to, at);
  const RISE_FROM = { yPercent: 112, rotation: 9 };
  const RISE_TO = { yPercent: 0, rotation: 0, ease: 'expo.out' };
  const riseIn = (chars, at, stagger = 0.045, duration = 0.8) => {
    gsap.set(chars, { transformOrigin: '0% 100%' });
    IN(chars, RISE_FROM, { ...RISE_TO, duration, stagger }, at);
  };
  const riseOut = (chars, at, stagger = 0.012) =>
    OUT(chars, { yPercent: 0, rotation: 0 }, { yPercent: -115, rotation: -6, duration: 0.45, ease: 'power3.in', stagger }, at);
  const fadeUpIn = (chars, at, stagger = 0.017) =>
    IN(chars, { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger }, at);

  // =====================================================================
  // A：会社員のみなさまへ（0 – 9.4s）
  // =====================================================================
  const A = {
    tag: split($('#A-tag')),
    l1: split($('#A-l1')), l2: split($('#A-l2')), l3: split($('#A-l3')),
    sub: split($('#A-sub')),
  };
  const ring = { x: 960, y: 545, s: 1.48, rot: -160, arc: 0 };
  const fill = { r: 0 };
  const bclip = { r: 0 };

  // リングが描かれながら回り込む
  IN(ring, { arc: 0, rot: -120 }, { arc: 0.74, rot: 0, duration: 1.4, ease: 'power3.out' }, 0.05);
  // タグ
  IN('#A-tag', { clipPath: 'inset(0% 100% 0% 0% round 999px)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px)', duration: 0.6, ease: 'power3.inOut' }, 0.2);
  IN(A.tag, { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out', stagger: 0.03 }, 0.35);

  // 1 行目は画面中央に大きく → 左上へリフレーム
  const l1 = $('#A-l1');
  const s1 = 1.32;
  const dx = 960 - (140 + (s1 * l1.offsetWidth) / 2);
  const dy = 548 - (236 + (s1 * l1.offsetHeight) / 2);
  gsap.set(l1, { transformOrigin: '0 0' });
  IN(l1, { x: dx, y: dy, scale: s1 }, { x: 0, y: 0, scale: 1, duration: 0.95, ease: 'expo.inOut' }, 2.35);
  riseIn(A.l1, 0.4, 0.06, 0.85);
  tl.fromTo(ring, { x: 960, y: 545, s: 1.48 }, { x: 1560, y: 480, s: 0.97, duration: 0.95, ease: 'expo.inOut' }, 2.35);

  riseIn(A.l2, 2.95, 0.045);
  riseIn(A.l3, 3.5, 0.05);
  // 「福利厚生」をぽんと弾ませる
  const fukuri = $('#A-l2 em');
  gsap.set(fukuri, { transformOrigin: '50% 60%' });
  tl.fromTo(fukuri, { scale: 1 }, { scale: 1.09, duration: 0.16, ease: 'power2.out', yoyo: true, repeat: 1 }, 3.72);

  fadeUpIn(A.sub, 4.45, 0.016);
  IN('#A-uline', { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power3.inOut' }, 5.2);
  // ゆっくりカメラが寄る
  gsap.set('#A-cam', { transformOrigin: '760px 540px' });
  IN('#A-cam', { scale: 1 }, { scale: 1.035, duration: 5.0, ease: 'sine.inOut' }, 3.3);

  // A → B：文字が抜け、リングが閉じて塗りつぶし → 円形に次の画面が開く
  riseOut([...A.l1, ...A.l2, ...A.l3], 8.12, 0.011);
  OUT(A.sub, { opacity: 1, yPercent: 0 }, { opacity: 0, yPercent: -60, duration: 0.3, ease: 'power2.in', stagger: 0.005 }, 8.2);
  OUT(['#A-tag', '#A-uline'], { opacity: 1 }, { opacity: 0, duration: 0.25 }, 8.25);
  tl.fromTo(ring, { arc: 0.74 }, { arc: 1, duration: 0.38, ease: 'power2.in' }, 8.25);
  tl.fromTo(fill, { r: 0 }, { r: 291, duration: 0.26, ease: 'power2.out' }, 8.5);
  tl.fromTo(fill, { r: 291 }, { r: 1850, duration: 0.42, ease: 'power3.in' }, 8.76);
  tl.fromTo(bclip, { r: 0 }, { r: 2000, duration: 0.56, ease: 'power3.inOut' }, 8.86);

  // =====================================================================
  // B：しくみは、かんたん3ステップ（8.9 – 20.05s）
  // =====================================================================
  const B = { label: split($('#B-label')), t1: split($('#B-t1')), t2: split($('#B-t2')) };
  const camB = { fx: 960, fy: 540, s: 1 };

  fadeUpIn(B.label, 9.0, 0.03);
  riseIn(B.t1, 9.15, 0.04, 0.75);
  IN('#B-badge', { scale: 0, rotation: -160 }, { scale: 1, rotation: 0, duration: 0.85, ease: 'back.out(1.7)' }, 9.62);
  IN('#B-3', { scale: 2.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: 'expo.out' }, 9.78);
  riseIn(B.t2, 9.9, 0.045, 0.75);

  function cardIn(sel, t) {
    const card = $(sel);
    IN(card, { y: 90, scale: 0.8, rotation: -4, opacity: 0 }, { y: 0, scale: 1, rotation: 0, opacity: 1, duration: 0.75, ease: 'back.out(1.4)' }, t);
    IN($('.step', card), { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, t + 0.18);
    const title = split($('.ctitle', card));
    gsap.set(title, { transformOrigin: '0% 100%' });
    IN(title, { yPercent: 112, rotation: 8 }, { yPercent: 0, rotation: 0, duration: 0.65, ease: 'expo.out', stagger: 0.045 }, t + 0.28);
    IN($$('.cdesc span', card), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.12 }, t + 0.5);
  }
  const T1 = 10.75, T2 = 12.3, T3 = 13.85;

  // カメラ：カードを 1 枚ずつ追いかけ、最後に引いて全体を見せる
  tl.fromTo(camB, { fx: 960, fy: 540, s: 1 }, { fx: 600, fy: 560, s: 1.18, duration: 0.8, ease: 'power3.inOut' }, 10.45);
  tl.fromTo(camB, { fx: 600 }, { fx: 960, duration: 0.7, ease: 'power3.inOut' }, 12.05);
  tl.fromTo(camB, { fx: 960 }, { fx: 1320, duration: 0.7, ease: 'power3.inOut' }, 13.6);
  tl.fromTo(camB, { fx: 1320, fy: 560, s: 1.18 }, { fx: 960, fy: 540, s: 1, duration: 0.9, ease: 'power3.inOut' }, 15.2);
  // 全体を見せている間もわずかに寄り続ける
  tl.fromTo(camB, { s: 1 }, { s: 1.025, duration: 3.05, ease: 'sine.inOut' }, 16.1);

  // STEP 1：契約書にサイン → 判子
  cardIn('#card1', T1);
  IN('#card1 .doc', { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, ease: 'power2.inOut' }, T1 + 0.3);
  IN('#card1 .fold', { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.25, ease: 'power2.out' }, T1 + 0.72);
  IN($$('#card1 .tline'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.3, ease: 'power2.out', stagger: 0.1 }, T1 + 0.75);
  IN('#card1 .sig', { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.7, ease: 'power1.inOut' }, T1 + 0.95);
  gsap.set('#card1 .seal', { transformOrigin: '50% 50%' });
  IN('#card1 .seal', { scale: 0, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(3)' }, T1 + 1.55);
  IN('#card1 .sealck', { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.3, ease: 'power2.out' }, T1 + 1.75);

  // STEP 2：スマホにパスワード入力 → チェック
  IN('#chev1', { scale: 0, x: -30, opacity: 0 }, { scale: 1, x: 0, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, 12.15);
  cardIn('#card2', T2);
  IN('#card2 .ph', { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, ease: 'power2.inOut' }, T2 + 0.3);
  IN('#card2 .spk', { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.25 }, T2 + 0.75);
  const dots = $$('#card2 .pd');
  gsap.set(dots, { transformOrigin: '50% 50%' });
  IN(dots, { scale: 0 }, { scale: 1, duration: 0.25, ease: 'back.out(3)', stagger: 0.14 }, T2 + 0.85);
  OUT(dots, { scale: 1 }, { scale: 0, duration: 0.18, ease: 'power2.in', stagger: 0.04 }, T2 + 1.55);
  gsap.set('#card2 .phck', { transformOrigin: '50% 50%' });
  IN('#card2 .phck', { scale: 0 }, { scale: 1, duration: 0.5, ease: 'back.out(2.6)' }, T2 + 1.7);
  IN('#card2 .phckp', { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.3, ease: 'power2.out' }, T2 + 1.85);

  // STEP 3：時計がぐるぐる回る（針は update() で制御）
  IN('#chev2', { scale: 0, x: -30, opacity: 0 }, { scale: 1, x: 0, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, 13.7);
  cardIn('#card3', T3);
  IN('#card3 .clk', { drawSVG: '0%', rotation: -90, transformOrigin: '50% 50%' }, { drawSVG: '100%', rotation: -90, duration: 0.7, ease: 'power2.inOut' }, T3 + 0.3);
  IN('#card3 .ticks', { opacity: 0 }, { opacity: 1, duration: 0.3 }, T3 + 0.65);
  IN($$('#card3 .hh, #card3 .mh'), { opacity: 0 }, { opacity: 1, duration: 0.2 }, T3 + 0.45);
  gsap.set('#card3 .hub', { transformOrigin: '50% 50%' });
  IN('#card3 .hub', { scale: 0 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' }, T3 + 0.45);

  IN('#B-foot', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, 15.75);

  // B → C：黒い STEP 3 カードへ突っ込んで、そのまま次の画面の背景になる
  OUT('#card3 .cin', { opacity: 1 }, { opacity: 0, duration: 0.25, ease: 'power1.in' }, 19.15);
  tl.fromTo(camB, { fx: 960, fy: 540 }, { fx: 1540, fy: 630, duration: 0.75, ease: 'power3.inOut' }, 19.15);
  tl.fromTo(camB, { s: 1.025 }, { s: 6.5, duration: 0.9, ease: 'power4.in' }, 19.15);

  // =====================================================================
  // C：社長・総務の方へ（20.05 – 28.3s）
  // =====================================================================
  const C = { label: split($('#C-label')), l1: split($('#C-l1')), l2: split($('#C-l2')), sub: split($('#C-sub')) };
  const flood = { lvl: 1160 };
  IN('#C-grid', { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power1.out' }, 20.05);
  fadeUpIn(C.label, 20.15, 0.03);
  riseIn(C.l1, 20.35, 0.05);
  riseIn(C.l2, 21.0, 0.05);
  fadeUpIn(C.sub, 21.8, 0.018);
  gsap.set('#C-cam', { transformOrigin: '960px 540px' });
  IN('#C-cam', { scale: 1 }, { scale: 1.03, duration: 7.2, ease: 'sine.inOut' }, 20.05);

  // C → D：文字が抜け、ライムの波が下から満ちる
  riseOut([...C.l1, ...C.l2], 27.1, 0.012);
  OUT([...C.label, ...C.sub], { opacity: 1 }, { opacity: 0, duration: 0.3, stagger: 0.004 }, 27.15);
  tl.fromTo(flood, { lvl: 1160 }, { lvl: -200, duration: 0.88, ease: 'power2.in' }, 27.45);

  // =====================================================================
  // D：社長や総務の方に、このQRを見せてください。（28.3 – 40s）
  // =====================================================================
  const D = { bt: split($('#D-bt')), l1: split($('#D-l1')), l2: split($('#D-l2')) };
  const br = { s: 1.3, o: 0 };
  const iris = { r: 0 };

  IN('#D-bubble', { scale: 0, rotation: -8 }, { scale: 1, rotation: 0, duration: 0.9, ease: 'elastic.out(1, 0.6)' }, 28.35);
  IN(D.bt, { opacity: 0 }, { opacity: 1, duration: 0.01, stagger: 0.04 }, 28.55);
  riseIn(D.l1, 29.15, 0.045);
  riseIn(D.l2, 29.55, 0.04);
  IN('#D-card', { rotationY: -88, x: 220, opacity: 0, transformPerspective: 2200 },
    { rotationY: 0, x: 0, opacity: 1, duration: 1.0, ease: 'back.out(1.25)' }, 29.85);
  IN(br, { s: 1.3, o: 0 }, { s: 1, o: 1, duration: 0.55, ease: 'expo.out' }, 30.7);
  IN('#D-scan', { opacity: 0 }, { opacity: 1, duration: 0.12 }, 30.9);
  IN('#D-scan', { y: 0 }, { y: 392, duration: 0.8, ease: 'power1.inOut' }, 30.9);
  OUT('#D-scan', { opacity: 1 }, { opacity: 0, duration: 0.2 }, 31.6);
  IN('#D-c1', { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }, 30.95);
  IN('#D-c1 .ck', { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.35, ease: 'power2.out' }, 31.15);
  IN('#D-c2', { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }, 31.25);
  IN('#D-c2 .ck', { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.35, ease: 'power2.out' }, 31.45);

  // 終わり：QR の位置から暗転 → 冒頭の黒につながる（ループ再生でも継ぎ目なし）
  tl.fromTo(iris, { r: 0 }, { r: 1900, duration: 0.65, ease: 'power3.in' }, 39.15);

  // =====================================================================
  // 手続き的なアニメーション（毎フレーム t から直接計算）
  // =====================================================================
  const el = {
    A: $('#A'), Afill: $('#A-fill'), fillC: $('#A-fillC'), B: $('#B'), C: $('#C'), flood: $('#C-flood'), D: $('#D'), iris: $('#iris'),
    ringG: $('#A-ringG'), arc: $('#A-arc'), track: $('#A-arcTrack'), dot: $('#A-dot'), glow: $('#A-glow'),
    bcam: $('#B-cam'), grid: $('#B-grid'),
    mh: $('#card3 .mh'), hh: $('#card3 .hh'), chev1: $('#chev1 path'), chev2: $('#chev2 path'),
    ecgCur: $('#ecg-cur'), ecgPrev: $('#ecg-prev'), ecgCurG: $('#ecg-curG'), ecgPrevG: $('#ecg-prevG'),
    head: $('#ecg-head'), halo: $('#ecg-halo'), em: $('#C-em'), flash: $('#C-flash'),
    floodBack: $('#flood-back'), floodMain: $('#flood-main'),
    rips: $$('#D-rip .rip'), brG: $('#D-brG'), irisC: $('#irisC'),
  };
  gsap.set(el.em, { transformOrigin: '50% 55%' });

  const expoOut = E('expo.out'), p2out = E('power2.out'), sineIO = E('sine.inOut');

  // 心電図
  const ECG = { t0: 20.25, v: 640, P: 0.857, base: 760, W: 1920, gap: 70 };
  function ecgAmp(tau) {
    if (tau < 0) return 0;
    const ph = (tau % ECG.P) / ECG.P;
    const g = (c, w, a) => a * Math.exp(-0.5 * ((ph - c) / w) ** 2);
    return g(0.16, 0.03, 12) + g(0.295, 0.008, -15) + g(0.322, 0.0095, 160) + g(0.352, 0.0095, -44) + g(0.57, 0.05, 26);
  }
  function beatEnvelope(e) {
    // 最後の R 波からの経過時間で、拍動の強さ（0..1）を返す
    const tr = 0.322 * ECG.P;
    if (e < tr) return 0;
    const d = (e - tr) % ECG.P;
    if (d < 0.06) return Math.sin((d / 0.06) * Math.PI / 2);
    return 0.5 + 0.5 * Math.cos(Math.PI * Math.min(1, (d - 0.06) / 0.32));
  }

  function drawRing(t) {
    const breathe = 0.035 * Math.sin((t - 1.3) * 1.5) * prog(t, 1.3, 2.2) * (1 - prog(t, 7.9, 8.3));
    const arc = clamp(ring.arc + breathe);
    const r = 300 * ring.s;
    const C = 2 * Math.PI * r;
    el.arc.setAttribute('r', r.toFixed(2));
    el.track.setAttribute('r', r.toFixed(2));
    el.arc.setAttribute('stroke-dasharray', `${(arc * C).toFixed(2)} ${(C + 2).toFixed(2)}`);
    el.arc.style.opacity = arc > 0.004 ? 1 : 0;
    el.track.style.opacity = clamp(ring.arc / 0.3);
    const rot = ring.rot + 18 * t - 90;
    el.ringG.setAttribute('transform', `translate(${ring.x.toFixed(2)} ${ring.y.toFixed(2)}) rotate(${rot.toFixed(3)})`);
    const a = arc * Math.PI * 2;
    el.dot.setAttribute('cx', (r * Math.cos(a)).toFixed(2));
    el.dot.setAttribute('cy', (r * Math.sin(a)).toFixed(2));
    el.dot.setAttribute('r', (12 * Math.sqrt(ring.s)).toFixed(2));
    el.dot.style.opacity = clamp((arc - 0.02) / 0.05) * (1 - prog(t, 8.3, 8.5));
    el.glow.style.transform = `translate(${(ring.x - 700).toFixed(1)}px, ${(ring.y - 700).toFixed(1)}px) scale(${(0.6 + 0.4 * ring.s).toFixed(3)})`;
    el.fillC.setAttribute('cx', ring.x.toFixed(2));
    el.fillC.setAttribute('cy', ring.y.toFixed(2));
    el.fillC.setAttribute('r', fill.r.toFixed(2));
  }

  function drawB(t) {
    el.B.style.clipPath = bclip.r < 1999 ? `circle(${bclip.r.toFixed(1)}px at 1560px 480px)` : 'none';
    const { fx, fy, s } = camB;
    el.bcam.style.transform = `translate(${(960 - fx * s).toFixed(2)}px, ${(540 - fy * s).toFixed(2)}px) scale(${s.toFixed(4)})`;
    const k = 0.55, gs = 1 + (s - 1) * k;
    const gfx = 960 + (fx - 960) * k, gfy = 540 + (fy - 540) * k;
    const drift = -16 * (t - 8.8);
    el.grid.style.transform = `translate(${(960 - gfx * gs + drift).toFixed(2)}px, ${(540 - gfy * gs).toFixed(2)}px) scale(${gs.toFixed(4)})`;
    // 時計の針
    const ts = T3 + 0.45, u = Math.max(0, t - ts);
    const spin = 1440 * expoOut(clamp(u / 1.7)) + 22 * u;
    el.mh.setAttribute('transform', `rotate(${spin.toFixed(2)} 56 56)`);
    el.hh.setAttribute('transform', `rotate(${(60 + spin / 12).toFixed(2)} 56 56)`);
    // シェブロンが「次へ」と小さく押し出す
    const nudge = (t0) => (t < t0 ? 0 : 7 * Math.max(0, Math.sin(((t - t0) / 0.95) * Math.PI * 2)) ** 2);
    el.chev1.setAttribute('transform', `translate(${nudge(12.75).toFixed(2)} 0)`);
    el.chev2.setAttribute('transform', `translate(${nudge(14.3).toFixed(2)} 0)`);
  }

  function pathFrom(x0, x1, fn) {
    let d = '';
    for (let x = x0; x <= x1; x += 2) d += (d ? 'L' : 'M') + x + ' ' + fn(x).toFixed(1);
    if (x1 > x0) d += 'L' + x1.toFixed(1) + ' ' + fn(x1).toFixed(1);
    return d;
  }

  function drawC(t) {
    const e = t - ECG.t0;
    if (e <= 0) {
      for (const p of [el.ecgCur, el.ecgPrev, el.ecgCurG, el.ecgPrevG]) p.setAttribute('d', '');
      el.head.style.opacity = el.halo.style.opacity = el.flash.style.opacity = 0;
    } else {
      const dist = e * ECG.v;
      const sweep = Math.floor(dist / ECG.W);
      const xh = dist - sweep * ECG.W;
      const tS = (sweep * ECG.W) / ECG.v;
      const yAt = (tau) => ECG.base - ecgAmp(tau);
      const cur = pathFrom(0, xh, (x) => yAt(tS + x / ECG.v));
      const x2 = Math.ceil((xh + ECG.gap) / 2) * 2;
      const prev = sweep > 0 && x2 < ECG.W ? pathFrom(x2, ECG.W, (x) => yAt(tS - ECG.W / ECG.v + x / ECG.v)) : '';
      el.ecgCur.setAttribute('d', cur); el.ecgCurG.setAttribute('d', cur);
      el.ecgPrev.setAttribute('d', prev); el.ecgPrevG.setAttribute('d', prev);
      const hy = yAt(e);
      const amp = beatEnvelope(e);
      el.head.setAttribute('cx', xh.toFixed(1)); el.head.setAttribute('cy', hy.toFixed(1));
      el.halo.setAttribute('cx', xh.toFixed(1)); el.halo.setAttribute('cy', hy.toFixed(1));
      el.halo.setAttribute('r', (60 + 40 * amp).toFixed(1));
      el.head.style.opacity = 1;
      el.halo.style.opacity = 0.55 + 0.45 * amp;
      el.flash.style.transform = `translate(${(xh - 550).toFixed(1)}px, ${(ECG.base - 550).toFixed(1)}px)`;
      el.flash.style.opacity = (0.25 + 0.75 * amp).toFixed(3);
    }
    // 「健康寿命」が鼓動に合わせて脈打つ
    const on = prog(t, 21.5, 22.0) * (1 - prog(t, 26.95, 27.1));
    const pulse = e > 0 ? beatEnvelope(e) * on : 0;
    el.em.style.transform = `scale(${(1 + 0.075 * pulse).toFixed(4)})`;
    // 下から満ちる波
    const L = flood.lvl;
    const back = (x) => L - 56 + 26 * Math.sin((x / 760) * 2 * Math.PI + t * 7 + 1.3) + 12 * Math.sin((x / 430) * 2 * Math.PI - t * 5);
    const main = (x) => L + 30 * Math.sin((x / 760) * 2 * Math.PI + t * 8.5) + 14 * Math.sin((x / 430) * 2 * Math.PI - t * 6);
    const wavePath = (fn) => { let d = 'M0 1300'; for (let x = 0; x <= 1920; x += 16) d += `L${x} ${fn(x).toFixed(1)}`; return d + 'L1920 1300Z'; };
    el.floodBack.setAttribute('d', wavePath(back));
    el.floodMain.setAttribute('d', wavePath(main));
  }

  function drawD(t) {
    // QR カードから広がる波紋
    const RS = 31.0, RINT = 0.85, LIFE = 3.6;
    const fade = 1 - prog(t, 38.9, 39.3);
    el.rips.forEach((c, i) => {
      const k = Math.floor((t - RS) / RINT) - i;
      const te = RS + k * RINT, age = t - te;
      if (t < RS || k < 0 || age > LIFE) { c.style.opacity = 0; return; }
      const p = age / LIFE;
      c.setAttribute('cx', 1560); c.setAttribute('cy', 540);
      c.setAttribute('r', (250 + 1000 * p2out(p)).toFixed(1));
      c.style.opacity = (0.34 * (1 - p) * fade).toFixed(3);
    });
    // スキャン枠（カードの外側）
    const breathe = 1 + 0.013 * Math.sin(((t - 31.3) / 1.7) * Math.PI * 2) * prog(t, 31.3, 31.8);
    const sc = br.s * breathe, cx = 1560, cy = 540, hw = 266 * sc, hh = 328 * sc, L = 74;
    const x0 = cx - hw, x1 = cx + hw, y0 = cy - hh, y1 = cy + hh;
    el.brG.innerHTML =
      `<path d="M${x0} ${y0 + L}V${y0}H${x0 + L}"/><path d="M${x1 - L} ${y0}H${x1}V${y0 + L}"/>` +
      `<path d="M${x1} ${y1 - L}V${y1}H${x1 - L}"/><path d="M${x0 + L} ${y1}H${x0}V${y1 - L}"/>`;
    el.brG.style.opacity = br.o;
    el.irisC.setAttribute('r', iris.r.toFixed(1));
  }

  function update(t) {
    show(el.A, t < 9.42);
    show(el.Afill, t >= 8.45 && t < 9.42);
    show(el.B, t >= 8.85 && t < 20.06);
    show(el.C, t >= 20.05 && t < 28.34);
    show(el.flood, t >= 27.4 && t < 28.34);
    show(el.D, t >= 28.32);
    show(el.iris, t >= 39.1);
    // 非表示のシーンも毎回描く（どの時刻から書き出しても同じ状態になるように）
    drawRing(t);
    drawB(t);
    drawC(t);
    drawD(t);
  }

  window.__duration = DUR;
  // 動きが特に速い区間（書き出し時にモーションブラーのサンプル数を増やす）
  window.__fastRanges = [[0, 0.7], [8.1, 9.5], [19.1, 20.15], [27.1, 28.45], [29.8, 30.5], [39.1, 39.85]];
  window.__seek = (t) => { tl.seek(t, true); update(t); };
  window.__seek(0);
  window.__ready = true;

  // リアルタイムプレビュー（?play / ?play=秒 で開始位置指定）
  const q = new URLSearchParams(location.search);
  if (q.has('play')) {
    const start = parseFloat(q.get('play')) || 0;
    const t0 = performance.now();
    const loop = () => { window.__seek((start + (performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
})();
