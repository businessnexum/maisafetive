// Cursor da Torra (só mouse): um ponto que segue o ponteiro com atraso e vira um anel com rótulo sobre o que é clicável.
import { gsap } from './gsap-lite.js';

export function cursor({ reduced }) {
  if (reduced || !matchMedia('(pointer: fine)').matches) return;
  const el = document.createElement('div');
  el.className = 'cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<i></i><span></span>';
  document.body.append(el);
  document.documentElement.classList.add('has-cursor');
  const label = el.querySelector('span');
  const x = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'torraOut' });
  const y = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'torraOut' });
  addEventListener('pointermove', (e) => { x(e.clientX); y(e.clientY); el.classList.add('is-on'); }, { passive: true });
  document.addEventListener('pointerleave', () => el.classList.remove('is-on'));
  addEventListener('pointerover', (e) => {
    const t = e.target.closest('a, button, label, input, [data-cursor]');
    el.classList.toggle('is-link', !!t);
    label.textContent = t?.dataset.cursor ?? '';
    el.classList.toggle('has-label', !!t?.dataset.cursor);
  });
  addEventListener('pointerdown', () => el.classList.add('is-down'));
  addEventListener('pointerup', () => el.classList.remove('is-down'));
}
