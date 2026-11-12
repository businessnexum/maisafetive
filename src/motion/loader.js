// Loader: o grão enche de baixo para cima e muda de cor (verde-cru → marrom) enquanto os quadros baixam;
// a temperatura sobe de 20 °C a 210 °C. Nunca anda mais rápido que 1,4 s, para a torra se ler.
import { gsap } from './gsap-lite.js';

const ROAST = ['#718044', '#c5d19b', '#c7a86a'];

export function loader({ reduced }) {
  const el = document.querySelector('.loader');
  const fill = el.querySelector('.loader__fill');
  const deg = el.querySelector('.loader__deg');
  const shown = { v: 0 };
  // Evita que o indicador pare visualmente em 0 enquanto o primeiro arquivo baixa.
  let want = 0.04;
  const color = gsap.utils.interpolate(ROAST);

  const draw = () => {
    const v = shown.v;
    fill.style.transform = `translateY(${(1 - v) * 100}%)`;
    fill.style.fill = color(v);
    deg.textContent = Math.round(v * 100);
  };
  // persegue o alvo a no máximo 0,75 por segundo
  const tick = () => {
    shown.v = Math.min(want, shown.v + (gsap.ticker.deltaRatio() / 60) * 0.75);
    draw();
  };
  gsap.ticker.add(tick);
  draw();

  return {
    set(v) { want = Math.max(want, Math.min(1, v)); },
    // termina a torra e sai; resolve quando o grão some
    async done() {
      want = 1;
      await new Promise((r) => { const f = () => (shown.v >= 0.999 ? r() : requestAnimationFrame(f)); f(); });
      gsap.ticker.remove(tick);
      const tl = gsap.timeline();
      if (reduced) tl.to(el, { autoAlpha: 0, duration: 0.3 });
      else tl.to(el.children, { y: -18, autoAlpha: 0, duration: 0.5, ease: 'torraIn', stagger: 0.05 })
        .to(el, { autoAlpha: 0, duration: 0.5, ease: 'torraOut' }, '-=0.15');
      await tl.then();
      el.remove();
    },
  };
}
