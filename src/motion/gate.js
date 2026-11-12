// Trava de gesto num pin com etapas: dentro da seção, cada gesto anda uma etapa só e a página fica parada
// nela até a troca assentar. A inércia do trackpad (deltas caindo depois que o dedo sai) não conta; gesto
// novo é delta subindo de novo, uma pausa ou a direção trocando. Quem chega rolando de fora para na borda
// da seção em vez de atravessá-la. Na primeira etapa (subindo) e na última (descendo) o gesto passa e a
// página segue. Só roda e toque; links do menu, barra de rolagem e teclado andam livres.
export function gate(lenis, { zone, count, onStep, hold = 0.8 }) {
  const html = document.documentElement;
  const now = () => performance.now();
  let until = 0, moving = 0, near = 60, rest = 300, held = 0;

  // roda: gesto novo = média dos últimos 6 deltas ≥ média dos últimos 36 (subindo ou constante), somando 24 px
  let hist = [], last = 0, sign = 0, acc = 0;
  function fresh(dy, t) {
    const s = Math.sign(dy);
    if (t - last > 180 || s !== sign) { hist = []; acc = 0; }
    last = t; sign = s;
    hist.push(Math.abs(dy));
    if (hist.length > 36) hist.shift();
    const avg = (n) => { const h = hist.slice(-n); return h.reduce((a, b) => a + b, 0) / h.length; };
    acc = avg(6) >= avg(36) && avg(6) >= 3 ? acc + Math.abs(dy) : 0;
    return acc >= 24;
  }

  const anchor = (i, [S, E]) => S + ((E - S) * i) / (count - 1);
  const stepAt = (y, [S, E]) => Math.min(count - 1, Math.max(0, Math.round(((y - S) / (E - S)) * (count - 1))));
  const inside = (y, [S, E]) => y >= S - 1 && y <= E + 1;
  // a etapa seguinte espera o tempo mínimo e a página chegar; na entrada (a seção ainda subindo),
  // o primeiro grupo fica 0,6 s parado na tela depois de assentar
  function busy() {
    const t = now();
    if (Math.abs(lenis.animatedScroll - lenis.targetScroll) > near) moving = t;
    return t < until || t - moving < rest;
  }
  function go(i, z, edge = false) {
    acc = 0;
    held = i;
    until = now() + hold * 1000;
    [near, rest] = edge ? [12, 600] : [60, 300];
    lenis.scrollTo(anchor(i, z), { programmatic: false, lerp: 0.1 });
    onStep?.(i);
  }
  const swallow = (e) => { if (e.cancelable) e.preventDefault(); return false; };

  function wheel(dy, e) {
    const isFresh = fresh(dy, now());
    const z = zone(), y = lenis.targetScroll;
    if (!inside(y, z)) {
      // de fora para dentro: para na borda em vez de atravessar
      if (dy > 0 && y < z[0] && y + dy >= z[0]) { go(0, z, true); return swallow(e); }
      if (dy < 0 && y > z[1] && y + dy <= z[1]) { go(count - 1, z, true); return swallow(e); }
      return true;
    }
    if (busy() || !isFresh) return swallow(e);
    const i = stepAt(y, z) + Math.sign(dy);
    if (i < 0 || i >= count) return true;
    go(i, z);
    return swallow(e);
  }

  // toque: o primeiro movimento decide se o gesto é da seção (bloqueia a rolagem nativa) ou da página
  let finger = null, touching = false, entry = -1;
  function touch(dy, e) {
    if (e.type === 'touchstart') {
      const z = zone(), y = lenis.targetScroll;
      touching = true; finger = null;
      entry = inside(y, z) ? -1 : y < z[0] ? 0 : count - 1;
      return true;
    }
    if (e.type === 'touchend' || e.type === 'touchcancel') {
      touching = false;
      const mine = finger?.mine;
      finger = null;
      return !mine;
    }
    const z = zone(), y = lenis.targetScroll;
    if (!finger) {
      const i = stepAt(y, z) + Math.sign(dy);
      finger = { mine: inside(y, z) && (busy() || (i >= 0 && i < count)), acc: 0, done: false };
    }
    if (!finger.mine) return true;
    finger.acc += dy;
    if (!finger.done && Math.abs(finger.acc) > 36 && !busy()) {
      const i = stepAt(y, z) + Math.sign(finger.acc);
      if (i >= 0 && i < count) go(i, z);
      finger.done = true;
    }
    return swallow(e);
  }

  // rolagem nativa sem dedo na tela (inércia do toque, teclado): entrando de fora, para na borda; dedo que
  // começou fora e soltou dentro, volta para o grupo por onde entrou (a seção está presa: não se vê o salto);
  // teclado dentro da seção anda para o próximo grupo no sentido do movimento
  let prevY = lenis.scroll;
  lenis.on('scroll', () => {
    const y = lenis.scroll, from = prevY;
    prevY = y;
    if (touching || y === from || lenis.isStopped || lenis.isScrolling !== 'native') return;
    const z = zone();
    let stop = -1;
    if (from < z[0] && y > z[0]) stop = 0;
    else if (from > z[1] && y < z[1]) stop = count - 1;
    else if (inside(y, z) && now() < until) stop = held; // inércia que sobrou: volta para o grupo da vez
    else if (inside(y, z) && entry >= 0) stop = entry;
    else if (inside(y, z)) {
      const p = ((y - z[0]) / (z[1] - z[0])) * (count - 1);
      stop = y > from ? Math.ceil(p - 0.02) : Math.floor(p + 0.02);
    }
    if (stop < 0) return;
    entry = -1;
    // overflow hidden por 0,3 s mata a inércia (no iOS e no Chrome); depois, volta para o grupo se ela ainda andou
    const y0 = anchor(stop, z);
    html.style.overflow = 'hidden';
    lenis.scrollTo(y0, { immediate: true, force: true });
    setTimeout(() => {
      html.style.overflow = '';
      if (Math.abs(lenis.scroll - y0) > 1) lenis.scrollTo(y0, { immediate: true, force: true });
      prevY = lenis.scroll;
    }, 300);
    prevY = lenis.scroll;
    held = stop;
    until = now() + hold * 1000;
    [near, rest] = [12, 600];
    onStep?.(stop);
  });

  const prev = lenis.options.virtualScroll;
  lenis.options.virtualScroll = (data) => {
    if (prev?.(data) === false) return false;
    const { deltaY: dy, event: e } = data;
    if (lenis.isStopped || e.ctrlKey) return true;
    if (e.type.startsWith('touch')) return touch(dy, e);
    if (!dy) return true;
    return wheel(dy, e);
  };
}
