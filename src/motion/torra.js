// A torra presa ao scroll: o mostrador de doze minutos (o velocímetro do undr-drift virado relógio de torra).
// Um arco fino de 0:00 a 12:00 e uma agulha cobre que anda com o scroll; embaixo, a temperatura do grão naquele
// minuto (curva em data/torra.js) e o minuto. As quatro notas, cada uma com a foto do grão naquele ponto, entram por
// marco quando a agulha chega nelas, numa fila (nenhuma é pulada) e ficam: no fim, as quatro em volta do arco.
// No celular, uma nota por vez acima do mostrador. Só a agulha e os números seguem o scroll; texto e foto, por tempo.
import { gsap, ScrollTrigger } from './gsap-lite.js';
import { stepper } from './stepper.js';
import { split } from './curtain.js';
import { splitLines } from './split.js';
import { T_IN, T_OUT } from './ease.js';
import { CURVA, FASES, MIN_MAX } from '../data/torra.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
// temperatura no minuto m: Catmull-Rom pelos pontos da curva
function tempAt(m) {
  const P = CURVA;
  let i = P.findIndex((p, k) => k < P.length - 1 && m >= p[0] && m <= P[k + 1][0]);
  if (i < 0) i = m <= 0 ? 0 : P.length - 2;
  const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
  const u = clamp((m - p1[0]) / (p2[0] - p1[0])), u2 = u * u, u3 = u2 * u;
  return 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3);
}
const clock = (m) => { const s = Math.round(m * 60); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export function torra({ section, reduced, mobile }) {
  const $ = (s) => section.querySelector(s);
  const inner = $('.torra__inner');
  const svg = $('.dial__svg');
  const arc = $('.dial__arc'), marks = $('.dial__marks'), needle = $('.dial__needle'), tip = $('.dial__tip'), pivot = $('.dial__pivot');
  const ends = [$('.dial__end--a'), $('.dial__end--b')];
  const list = $('.notes');
  const read = $('.torra__read'), readT = read.querySelector('b'), readM = read.querySelector('span');
  const head = $('.torra__head'), title = $('.torra__title'), lede = $('.torra__lede');

  list.innerHTML = FASES.map((f) => `<li class="note">
      <p class="note__n mask tnum"><span>${f.n}</span></p>
      <p class="note__t mask"><span><b>${f.nome}</b> ${f.texto}</span></p>
      <figure class="note__ph"><img src="/img/torra/${f.foto}.webp" alt="${f.alt}" loading="lazy" decoding="async" /></figure>
    </li>`).join('');
  const notes = [...list.children].map((el) => ({
    el, ph: el.querySelector('.note__ph'), parts: [...el.querySelectorAll('.mask > span')], tl: null,
  }));

  // ---- geometria: pivô no pé, arco que não encosta no título; notas presas a pontos do arco ----
  let W = 0, H = 0, cx = 0, cy = 0, R = 0, m = 0;
  const at = (min, r = R) => { const a = Math.PI * (1 - min / MIN_MAX); return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
  function measure() {
    W = inner.clientWidth; H = inner.clientHeight;
    const top = (el) => el.offsetTop + el.offsetHeight;
    const gut = parseFloat(getComputedStyle(inner).paddingLeft);
    if (mobile) {
      cx = W / 2; cy = H - Math.max(150, H * 0.18); R = Math.min(W / 2 - 28, cy - top(head) - 210);
    } else {
      // o arco passa por baixo do canto de baixo à direita do título (com folga de 30 px)
      cx = W / 2; cy = H * 0.82;
      R = Math.min(W * 0.33, Math.hypot(cx - (head.offsetLeft + head.offsetWidth), cy - top(head) - 30));
    }
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    arc.setAttribute('d', `M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy}`);
    marks.innerHTML = FASES.map((f) => { const [x1, y1] = at(f.em), [x2, y2] = at(f.em, R - 12); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`; }).join('');
    pivot.setAttribute('cx', cx); pivot.setAttribute('cy', cy);
    ends.forEach((el, i) => { el.style.left = `${cx + (i ? R : -R)}px`; el.style.top = `${cy + 14}px`; });
    read.style.top = `${cy + (mobile ? 22 : 18)}px`;

    if (mobile) {
      for (const n of notes) Object.assign(n.el.style, { left: `${gut}px`, top: `${top(head) + 28}px`, width: `${W - 2 * gut}px` });
    } else {
      const w = R * 0.5;
      for (const n of notes) n.el.style.width = `${w}px`;
      const h = notes.map((n) => n.el.offsetHeight);
      const [a2x, a2y] = at(FASES[1].em), [a3x, a3y] = at(FASES[2].em);
      const pos = [
        [cx - 1.06 * R - w, cy - h[0]], // 01: fora do arco, à esquerda da ponta
        [a2x + 0.05 * R, a2y + 0.07 * R], // 02: dentro, pendurada no ponto dos 4 min
        [a3x + 0.04 * R, a3y - 0.07 * R - h[2]], // 03: fora, em cima do ponto dos 9:30
        [cx + 1.06 * R, cy - h[3]], // 04: fora do arco, à direita da ponta
      ];
      notes.forEach((n, i) => Object.assign(n.el.style, { left: `${clamp(pos[i][0], gut, W - gut - w)}px`, top: `${pos[i][1]}px` }));
    }
    draw();
  }

  function draw() {
    const [x, y] = at(m, R - 3);
    needle.setAttribute('x1', cx); needle.setAttribute('y1', cy);
    needle.setAttribute('x2', x.toFixed(1)); needle.setAttribute('y2', y.toFixed(1));
    tip.setAttribute('cx', x.toFixed(1)); tip.setAttribute('cy', y.toFixed(1));
    readT.textContent = `${Math.round(tempAt(m))} °C`;
    readM.textContent = clock(m);
  }

  // ---- notas por marco ----
  gsap.set(notes.map((n) => n.el), { autoAlpha: 0 });
  function reveal(i) {
    const n = notes[i];
    n.tl?.kill();
    n.tl = gsap.timeline().set(n.el, { autoAlpha: 1 });
    if (reduced) return;
    n.tl.fromTo(n.ph, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'torraInOut' }, 0)
      .fromTo(n.parts, { yPercent: 120 }, { yPercent: 0, duration: T_IN, ease: 'torraOut', stagger: 0.08 }, 0.15);
  }
  function hide(i) {
    const n = notes[i];
    n.tl?.kill();
    n.tl = gsap.timeline();
    if (!reduced) n.tl.to(n.ph, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.45, ease: 'torraIn' }, 0)
      .to(n.parts, { yPercent: -120, duration: T_OUT, ease: 'torraIn' }, 0);
    n.tl.set(n.el, { autoAlpha: 0 });
  }
  // desktop: as notas se acumulam (ao voltar, a última sai); celular: uma por vez no mesmo lugar
  const steps = stepper({
    start: -1, min: reduced ? 0.15 : 0.4,
    apply: (i, prev, dir) => {
      if (mobile) { if (prev >= 0) hide(prev); if (i >= 0) gsap.delayedCall(reduced || prev < 0 ? 0 : 0.4, () => steps.current === i && reveal(i)); }
      else if (dir > 0) reveal(i);
      else hide(prev);
    },
  });
  let entered = false;
  const want = () => (entered ? FASES.filter((f) => m >= f.em - 0.05).length - 1 : -1);

  // a primeira nota (e a leitura) aparece quando a seção chega; as outras, pela agulha
  ScrollTrigger.create({
    trigger: section, start: 'top 45%',
    onEnter: () => { entered = true; steps.set(want()); },
    onLeaveBack: () => { entered = false; steps.set(want()); },
  });
  // pin: a agulha anda de 0:00 a 12:00 nos primeiros 86% e segura no fim; na última tela a loja sobe por cima em cúpula
  const CONTENT = mobile ? 2.4 : 2.8, TAIL = 1;
  ScrollTrigger.create({
    trigger: section, start: 'top top', end: () => `+=${innerHeight * (CONTENT + TAIL)}`, pin: true,
    onUpdate: (s) => {
      const { c } = split(s.progress, CONTENT, TAIL);
      m = clamp(c / 0.86) * MIN_MAX;
      draw();
      steps.set(want());
    },
  });

  measure();
  addEventListener('resize', measure);

  if (!reduced) {
    const st = { trigger: section, start: 'top 70%', toggleActions: 'play none none reverse' };
    gsap.fromTo(splitLines(title), { yPercent: 120 }, { yPercent: 0, duration: T_IN, ease: 'torraOut', stagger: 0.07, scrollTrigger: st });
    gsap.fromTo([lede, read], { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: T_IN, ease: 'torraOut', stagger: 0.1, delay: 0.2, scrollTrigger: st });
    gsap.fromTo(arc, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'torraOut', scrollTrigger: st });
  }
  return { get minute() { return m; } };
}
