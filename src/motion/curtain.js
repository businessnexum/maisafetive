// Transições entre seções. Nunca um bloco de borda reta passando por cima do outro:
// dome(): a seção entra por cima da anterior com o topo em cúpula, que se achata ao chegar no topo. Depois de uma
// seção presa, a seguinte tem margem de −100lvh e sobe durante a última tela do pin (sem tela vazia da cor seguinte).
// Scrub (forma, não texto), suavizado pelo Lenis.
import { gsap, ScrollTrigger } from './gsap-lite.js';

const ease = (t) => gsap.parseEase('torraInOut')(Math.min(1, Math.max(0, t)));
export function dome(section, { reduced, r: R = 30 }) {
  if (reduced) return;
  const set = (t) => {
    const r = R * (1 - ease(t));
    section.style.clipPath = r < 0.05 ? 'none' : `inset(0% 0% 0% 0% round 50% 50% 0% 0% / ${r.toFixed(2)}vh ${r.toFixed(2)}vh 0vh 0vh)`;
  };
  set(0);
  ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'top top', onUpdate: (s) => set(s.progress), onRefresh: (s) => set(s.progress) });
}

// divide o progresso de um pin em conteúdo (0–1) e saída (0–1)
export const split = (progress, content, tail) => {
  const total = content + tail;
  return { c: Math.min(1, (progress * total) / content), t: Math.max(0, (progress * total - content) / tail) };
};
