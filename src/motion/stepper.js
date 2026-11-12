// Fila de etapas por marco: o scroll só diz qual etapa quer; a fila anda uma por vez até ela,
// com um tempo mínimo em cada. Rolando rápido nenhuma etapa é pulada nem pisca, e quem passa
// da seção deixa a fila terminar sozinha no estado final.
import { gsap } from './gsap-lite.js';

export function stepper({ apply, start = 0, min = 0.6 }) {
  let cur = start, target = start, busy = false;
  function run() {
    if (busy || cur === target) return;
    const dir = target > cur ? 1 : -1;
    const prev = cur;
    cur += dir;
    busy = true;
    apply(cur, prev, dir);
    gsap.delayedCall(min, () => { busy = false; run(); });
  }
  return {
    set(t) { target = t; run(); },
    get current() { return cur; },
    get target() { return target; },
  };
}
