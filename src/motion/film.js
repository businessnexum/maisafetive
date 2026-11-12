// A peça: o hero e o filme são uma seção só, presa ao scroll.
// Um <canvas> do tamanho da tela, recortado por clip-path até o retângulo da miniatura do título.
// O progresso do pin leva o recorte até a tela cheia e escolhe o quadro; o quadro é sempre desenhado em "cover"
// do retângulo atual, então a miniatura e a tela cheia são o mesmo desenho, sem salto.
// As palavras andam presas às bordas do recorte. Textos dos capítulos entram por marco, nunca por scrub.
// Troca de capítulo sem depender do vídeo: cada capítulo é uma camada, e a seguinte sobe por cima da anterior como
// uma seção rolando (uma tela de scroll, uma tela de subida), com o topo em cúpula que se achata ao chegar; a de baixo
// fica parada e escurece. Os dois clipes seguem andando durante a subida. Sem clarão e sem zoom: o quadro é sempre
// o 16:9 inteiro em "cover", na escala natural, e cada clipe entra só até antes do estouro de luz do Wan.
// Na última tela do pin, o cardápio sobe por cima em cúpula (margem negativa + dome() em main.js), com o filme
// ainda andando embaixo: sem tela vazia entre os dois.
import { gsap, ScrollTrigger } from './gsap-lite.js';
import { splitLines } from './split.js';
import { T_IN, T_OUT } from './ease.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function film({ section, reduced, mobile }) {
  const $ = (s) => section.querySelector(s);
  const stage = $('.filme__stage');
  const canvas = $('.filme__canvas');
  const ctx = canvas.getContext('2d');
  const shade = $('.filme__shade');
  const heroLine = $('.hero__line');
  const thumb = $('.hero__thumb');
  const words = [...section.querySelectorAll('.hero__word')];
  const pause = $('.hero__pause');
  const foot = $('.hero__foot');
  const caps = [...section.querySelectorAll('.cap')];
  const hud = $('.filme__hud');
  const hudNum = hud.querySelector('b');
  const hudBar = hud.querySelector('.filme__bar i');

  // trechos do pin, em telas de rolagem: expansão, cap. 1, subida do 2, cap. 2, subida do 3, cap. 3, subida do cardápio.
  // As subidas têm uma tela cada: a camada anda junto com a rolagem, como uma seção de verdade.
  const PLAN = mobile ? [0.7, 0.9, 1, 0.8, 1, 1.1, 1] : [0.8, 1.1, 1, 1, 1, 1.3, 1];
  const B = PLAN.reduce((a, v) => (a.push(a[a.length - 1] + v), a), [0]);
  const EXP = B[1], RISE = [B[2], B[4]], OUT = B[6], TOTAL = B[7];
  // trecho de cada clipe: do começo da própria subida (o 1º, do começo do pin) até a camada seguinte cobrir tudo
  const SPAN = [[0, B[3]], [B[2], B[5]], [B[4], B[7]]];
  const DOME = mobile ? 18 : 30; // raio vertical da cúpula, em vh (o mesmo das cúpulas das seções)
  const DIM = 0.62; // quanto a camada de baixo escurece quando a seguinte cobre
  const SHADOW = mobile ? 24 : 48; // sombra da borda da camada que sobe, em px
  const FOCUS = [0.5, 0.66, 0.68]; // no recorte estreito (celular), o corte segue o assunto: xícara, grãos, coado
  const LOOP = 0.2; // telas em que o laço da miniatura parada passa a mão para o scroll

  let frames = null; // frames do desktop e da abertura
  let mobileFrames = null; // clipes verticais alternativos para as seções 2 e 3 no mobile
  let mobileChapters = null;
  let chapters = [0, 1, 2, 3]; // limites em quadros, do manifest
  let W = 0, H = 0, dpr = 1;
  let r0 = { x: 0, y: 0, w: 0, h: 0 }; // retângulo da miniatura (relativo ao palco)
  let s = 0; // progresso do pin em telas
  let introOpen = reduced ? 1 : 0; // abertura da fresta da miniatura (loader → hero)
  let wordIntro = reduced ? 0 : 1; // 1 = palavras escondidas atrás da miniatura
  let paused = false, loopT = 0, fps = 24; // laço da miniatura parada: o primeiro segundo do filme
  let drawnKey = '';
  // escreve estilo só quando muda (no celular lento, recalcular estilo a cada quadro custava metade do quadro)
  const styleCache = new Map();
  const put = (el, prop, v) => { let m = styleCache.get(el); if (!m) styleCache.set(el, (m = {})); if (m[prop] !== v) { m[prop] = v; el.style[prop] = v; } };

  // subida da camada i (1 ou 2) de 0 a 1; no modo reduzido, corte seco no meio
  const riseAt = (i) => { const k = clamp(s - RISE[i - 1]); return reduced ? (k >= 0.5 ? 1 : 0) : k; };
  // quadro (contínuo) do capítulo i
  const frameOf = (i, boundaries = chapters) => lerp(boundaries[i], boundaries[i + 1] - 1, clamp((s - SPAN[i][0]) / (SPAN[i][1] - SPAN[i][0])));

  function measure() {
    const dprNow = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
    W = stage.clientWidth; H = stage.clientHeight; dpr = dprNow;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    // a miniatura é medida sem os deslocamentos das palavras
    const st = stage.getBoundingClientRect();
    const t = thumb.getBoundingClientRect();
    r0 = { x: t.left - st.left, y: t.top - st.top, w: t.width, h: t.height };
    drawnKey = '';
  }

  function rectAt(t) {
    const e = easeInOut(t);
    return { x: lerp(r0.x, 0, e), y: lerp(r0.y, 0, e), w: lerp(r0.w, W, e), h: lerp(r0.h, H, e), e };
  }

  // camadas da vez: a de baixo (que escurece) e a que sobe; com a subida completa, só a de cima
  function layers(fi0) {
    const k2 = riseAt(2), k1 = riseAt(1);
    if (k2 >= 1) return [{ i: 2, rise: 1, dim: 0 }];
    if (k2 > 0) return [{ i: 1, rise: 1, dim: k2 }, { i: 2, rise: k2, dim: 0 }];
    if (k1 >= 1) return [{ i: 1, rise: 1, dim: 0 }];
    if (k1 > 0) return [{ i: 0, rise: 1, dim: k1, fi: fi0 }, { i: 1, rise: k1, dim: 0 }];
    return [{ i: 0, rise: 1, dim: 0, fi: fi0 }];
  }

  // desenha as camadas em "cover" do retângulo; a que sobe anda com o próprio topo (o quadro sobe junto, como o
  // conteúdo de uma seção) e é recortada pela cúpula, que se achata até virar reta quando chega
  function draw(rect, list) {
    if (!frames) return;
    const items = list.map((l) => {
      const source = mobile && l.i > 0 && mobileFrames ? mobileFrames : frames;
      const boundaries = source === mobileFrames && mobileChapters ? mobileChapters : chapters;
      return { ...l, img: source.get(Math.round(l.fi ?? frameOf(l.i, boundaries))) };
    });
    if (items.some((l) => !l.img)) return;
    const key = items.map((l) => `${l.img.src}|${l.rise.toFixed(4)}|${l.dim.toFixed(3)}`).join('/') +
      `|${rect.x.toFixed(1)}|${rect.y.toFixed(1)}|${rect.w.toFixed(1)}|${rect.h.toFixed(1)}|${W}`;
    if (key === drawnKey) return;
    drawnKey = key;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const l of items) {
      const iw = l.img.naturalWidth, ih = l.img.naturalHeight;
      // As seções 2 e 3 preenchem todo o palco; a seção 1 mantém seu desenho original.
      const imageRect = rect;
      const top = imageRect.y + imageRect.h * (1 - l.rise);
      // Preserve os vídeos verticais do briefing sem cortar o assunto: o quadro completo
      // fica à frente e uma versão ampliada e desfocada preenche a composição horizontal.
      const contain = l.i > 0 && ih > iw;
      const sc = contain ? Math.min(imageRect.w / iw, imageRect.h / ih) : Math.max(imageRect.w / iw, imageRect.h / ih);
      const w = iw * sc, h = ih * sc;
      const x = contain ? imageRect.x + (imageRect.w - w) / 2 : imageRect.x + (imageRect.w - w) * FOCUS[l.i];
      const y = top + (imageRect.h - h) / 2;
      if (contain && l.rise >= 1) {
        const bgScale = Math.max(imageRect.w / iw, imageRect.h / ih);
        const bgW = iw * bgScale, bgH = ih * bgScale;
        ctx.save();
        ctx.beginPath(); ctx.rect(imageRect.x, top, imageRect.w, imageRect.h); ctx.clip();
        ctx.filter = `blur(${Math.max(18, Math.min(42, rect.w * 0.025))}px)`;
        ctx.globalAlpha = 0.52;
        ctx.drawImage(l.img, imageRect.x + (imageRect.w - bgW) / 2, top + (imageRect.h - bgH) / 2, bgW, bgH);
        ctx.restore();
      }
      if (l.rise < 1) {
        const r = (DOME / 100) * H * (1 - l.rise);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageRect.x, imageRect.y + imageRect.h + 1);
        ctx.lineTo(imageRect.x, top + r);
        if (r > 0.5) ctx.ellipse(imageRect.x + imageRect.w / 2, top + r, imageRect.w / 2, r, 0, Math.PI, 2 * Math.PI);
        else ctx.lineTo(imageRect.x + imageRect.w, top);
        ctx.lineTo(imageRect.x + imageRect.w, imageRect.y + imageRect.h + 1);
        ctx.closePath();
        // sombra curta acima da borda: a camada que sobe fica por cima da outra, como uma folha
        ctx.shadowColor = 'rgba(9, 7, 6, 0.55)';
        ctx.shadowBlur = SHADOW;
        ctx.shadowOffsetY = -SHADOW / 3;
        ctx.fillStyle = '#0d0b0a';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.clip();
        ctx.drawImage(l.img, x, y, w, h);
        ctx.restore();
      } else ctx.drawImage(l.img, x, y, w, h);
      if (l.dim > 0) {
        ctx.fillStyle = `rgba(9, 7, 6, ${(DIM * l.dim).toFixed(3)})`;
          ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      }
    }
  }

  function render() {
    const t = reduced ? (s > 0.25 ? 1 : 0) : clamp(s / EXP);
    const full = rectAt(t);
    // a abertura (loader → hero) corta o recorte numa fresta vertical; o desenho não muda
    const cut = (full.w / 2) * (1 - introOpen);
    const radius = lerp(3, 0, full.e);
    put(canvas, 'clipPath', `inset(${full.y.toFixed(1)}px ${(W - full.x - full.w + cut).toFixed(1)}px ${(H - full.y - full.h).toFixed(1)}px ${(full.x + cut).toFixed(1)}px round ${radius.toFixed(1)}px)`);

    // No desktop, as palavras acompanham as bordas do recorte.
    if (!mobile) {
      for (const w of words) {
        const edge = w.dataset.edge;
        const intro = wordIntro * (edge === 'left' ? r0.w * 0.5 : edge === 'right' ? -r0.w * 0.5 : r0.h * 0.6);
        if (edge === 'left') put(w, 'transform', `translate3d(${(full.x - r0.x + intro).toFixed(1)}px,0,0)`);
        else if (edge === 'right') put(w, 'transform', `translate3d(${(full.x + full.w - (r0.x + r0.w) + intro).toFixed(1)}px,0,0)`);
        else put(w, 'transform', `translate3d(0,${(full.y - r0.y + intro).toFixed(1)}px,0)`);
      }
    } else {
      // O título fica centralizado na abertura e sai para cima ao terminar a expansão,
      // antes de os capítulos 2 e 3 ocuparem a tela.
      const leave = clamp((s / EXP - 0.65) / 0.25);
      put(heroLine, 'translate', `0 ${(-H * 1.1 * leave).toFixed(1)}px`);
      put(heroLine, 'opacity', (1 - leave).toFixed(3));
    }

    // cap. 1: laço curto com a miniatura parada; depois o scroll manda
    let fi0 = frameOf(0);
    if (!reduced && s < LOOP) {
      const k = Math.max(1, fps - 1);
      const loopIdx = k - Math.abs((loopT % (2 * k)) - k);
      fi0 = lerp(loopIdx, fi0, s / LOOP);
    }
    draw(full, layers(fi0));
    put(pause, 'transform', `translate3d(${(full.x + full.w - 36).toFixed(1)}px,${(full.y + full.h - 36).toFixed(1)}px,0)`);

    put(shade, 'opacity', full.e.toFixed(2));
    put(hudBar, 'transform', `scaleX(${clamp((s - EXP) / (OUT - EXP)).toFixed(3)})`);
    // o número é o do capítulo que ocupa a maior parte da tela
    const n = riseAt(2) >= 0.5 ? '03' : riseAt(1) >= 0.5 ? '02' : '01';
    if (hudNum.textContent !== n) hudNum.textContent = n;
  }

  // ---- marcos ----
  const capLines = caps.map((c) => ({
    label: splitLines(c.querySelector('.cap__label'))[0],
    lines: splitLines(c.querySelector('.cap__title')),
    text: c.querySelector('.cap__text'),
  }));
  gsap.set(caps, { autoAlpha: 0 });

  // uma timeline por capítulo: a troca mata a anterior antes de criar a nova (killTweensOf não pegava a entrada
  // com stagger, que seguia rodando depois da saída e trazia o texto de volta sobre o capítulo seguinte)
  function showCap(i, on, fast = false) {
    const c = caps[i], parts = capLines[i];
    parts.tl?.kill();
    const tl = (parts.tl = gsap.timeline({ defaults: { overwrite: 'auto' } }));
    if (on) {
      tl.set(c, { autoAlpha: 1 });
      if (reduced) { tl.fromTo([parts.label, ...parts.lines, parts.text], { autoAlpha: 0, yPercent: 0 }, { autoAlpha: 1, duration: 0.4 }); return; }
      tl.fromTo([parts.label, ...parts.lines], { yPercent: 120 }, { yPercent: 0, duration: T_IN, ease: 'torraOut', stagger: 0.07 }, 0)
        .fromTo(parts.text, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: T_IN, ease: 'torraOut' }, 0.18);
    } else {
      // sai por máscara (as linhas sobem e somem na borda de cima), mais rápido que entra;
      // rolando rápido a camada seguinte corre na frente, então a saída encurta
      const d = fast ? 0.18 : T_OUT;
      tl.to([parts.label, ...parts.lines], { yPercent: -120, duration: d, ease: fast ? 'torraOut' : 'torraIn', stagger: fast ? 0 : 0.03 }, 0)
        .to(parts.text, { autoAlpha: 0, y: -10, duration: d, ease: fast ? 'torraOut' : 'torraIn' }, 0)
        .set(c, { autoAlpha: 0 }, d + 0.1);
    }
  }
  // estados: 0 hero · 1 cap. 1 · 2 subida · 3 cap. 2 · 4 subida · 5 cap. 3 · 6 saída. Texto só nos ímpares: o do
  // capítulo sai um pouco antes de a camada seguinte começar a subir e o próximo entra quando ela chega ao topo.
  // Sem fila: o texto que não é o da tela sai na hora e o da tela entra 0,15 s depois se ainda for ele.
  const PRE = 0.12, LAND = 0.88; // em telas: saída antes da subida; entrada quando a subida chega a 88%
  let capState = 0, shownCap = -1, pending = null, lastS = 0, speed = 0;
  const capSteps = {
    set(next) {
      if (next === capState) return;
      capState = next;
      const want = next % 2 === 1 ? (next - 1) / 2 : -1;
      if (want === shownCap) return;
      if (shownCap >= 0) showCap(shownCap, false, speed > 3);
      shownCap = -1;
      pending?.kill();
      hud.classList.toggle('is-on', next > 0 && next < 6);
      if (want < 0) return;
      pending = gsap.delayedCall(reduced ? 0 : 0.15, () => {
        if (capState % 2 === 1 && (capState - 1) / 2 === want) { shownCap = want; showCap(want, true); }
      });
    },
  };
  const capFor = () => {
    if (s >= OUT - PRE) return 6;
    if (s < EXP * 0.92) return 0;
    let n = 1;
    for (const r of RISE) {
      if (s >= r - PRE) n++;
      if (s >= r + LAND) n++;
    }
    return n;
  };

  // hero (pé, pausa) sai no primeiro movimento
  let heroOut = false;
  function setHero(out) {
    if (out === heroOut) return;
    heroOut = out;
    gsap.to([foot, pause], { autoAlpha: out ? 0 : 1, y: out ? 12 : 0, duration: out ? T_OUT : 0.9, ease: out ? 'torraIn' : 'torraOut', overwrite: true });
  }

  // ---- pin ----
  // sem suavização própria: o Lenis já suaviza a rolagem, e a camada que sobe tem de andar junto com ela.
  // Desenha também na hora do scroll: o ticker do filme roda antes do Lenis e ficaria um quadro atrás do pin
  // (rolando rápido, a saída do pin ficava atrasada)
  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => `+=${innerHeight * TOTAL}`,
    pin: true,
    onUpdate: (self) => { s = self.progress * TOTAL; render(); },
    onRefresh: (self) => { s = self.progress * TOTAL; },
  });

  // ticker: anda o laço, mede a velocidade (telas por segundo), dispara os marcos e desenha
  let last = performance.now(), live = false;
  gsap.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (dt > 0) speed = lerp(speed, Math.abs(s - lastS) / dt, 0.3);
    lastS = s;
    if (!paused && !reduced) loopT += dt * fps;
    if (live) {
      setHero(s > 0.04);
      capSteps.set(capFor());
    }
    render();
  });

  pause.addEventListener('click', () => {
    paused = !paused;
    pause.classList.toggle('is-paused', paused);
    pause.setAttribute('aria-pressed', String(paused));
    pause.setAttribute('aria-label', paused ? 'Tocar vídeo' : 'Pausar vídeo');
  });

  // o hero já nasce no estado de antes da abertura: sem isso, quando o loader saía o título aparecia inteiro,
  // sumia e só então abria
  if (!reduced) {
    gsap.set([...words, pause], { autoAlpha: 0 });
    gsap.set(foot.children, { autoAlpha: 0, y: 16 });
  }

  measure();
  addEventListener('resize', () => { measure(); });

  return {
    st,
    setFrames(f) {
      frames = f;
      fps = f.manifest.fps || 24;
      const ch = f.manifest.chapters;
      chapters = ch && ch.length === 4 ? ch : [0, Math.round(f.count / 3), Math.round((2 * f.count) / 3), f.count];
      drawnKey = '';
    },
    setMobileFrames(f) {
      mobileFrames = f;
      const ch = f.manifest.chapters;
      mobileChapters = ch && ch.length === 4 ? ch : [0, 0, Math.round(f.count / 2), f.count];
      drawnKey = '';
    },
    // abertura: a fresta da miniatura abre e as palavras saem de trás dela
    intro() {
      const tl = gsap.timeline({ onComplete: () => { live = true; } });
      if (reduced) { live = true; return tl; }
      const o = { open: 0, words: 1 };
      tl.to(o, { open: 1, duration: 1.15, ease: 'torraInOut', onUpdate: () => { introOpen = o.open; } }, 0)
        .to(o, { words: 0, duration: 1.3, ease: 'torraOut', onUpdate: () => { wordIntro = o.words; } }, 0.5)
        .to(words, { autoAlpha: 1, duration: 0.5, ease: 'torraOut' }, 0.55)
        .to(foot.children, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'torraOut', stagger: 0.1 }, 1.0)
        .to(pause, { autoAlpha: 1, duration: 0.5 }, 1.2);
      return tl;
    },
    get progress() { return s / TOTAL; },
  };
}
