// Small runtime-compatible motion layer for offline preview of the supplied vanilla modules.
const easing = { torraOut: 'cubic-bezier(.12,.75,.22,1)', torraIn: 'cubic-bezier(.6,0,.86,.3)', torraInOut: 'cubic-bezier(.72,0,.14,1)', none: 'linear' };
const quickPositions = new WeakMap();
const list = (v) => v == null ? [] : Array.isArray(v) ? v.flatMap(list) : typeof v === 'string' ? [...document.querySelectorAll(v)] : [v];
function apply(el, vars) {
  if (!el?.style) return;
  const transforms = [];
  for (const [k, v] of Object.entries(vars)) {
    if (['duration','delay','ease','stagger','overwrite','onComplete','onUpdate','scrollTrigger','immediateRender'].includes(k)) continue;
    if (k === 'autoAlpha') { el.style.opacity = v; el.style.visibility = +v ? 'visible' : 'hidden'; }
    else if (k === 'x') transforms.push(`translateX(${typeof v === 'number' ? `${v}px` : v})`);
    else if (k === 'y') transforms.push(`translateY(${typeof v === 'number' ? `${v}px` : v})`);
    else if (k === 'yPercent') transforms.push(`translateY(${v}%)`);
    else if (k === 'xPercent') transforms.push(`translateX(${v}%)`);
    else if (k === 'rotate') transforms.push(`rotate(${typeof v === 'number' ? `${v}deg` : v})`);
    else if (k === 'clipPath' || k === 'clip-path') el.style.clipPath = v;
    else if (k in el.style) el.style[k] = typeof v === 'number' && !['opacity','zIndex','fontWeight','scale'].includes(k) ? `${v}px` : v;
  }
  if (transforms.length) el.style.transform = transforms.join(' ');
}
function fromTo(target, from, to, opts = {}) {
  const els = list(target), duration = Math.max(0, (to.duration ?? opts.duration ?? 0.5) * 1000), delay = Math.max(0, (to.delay ?? opts.delay ?? 0) * 1000), stagger = (to.stagger ?? opts.stagger ?? 0) * 1000;
  els.forEach((el, i) => {
    if (!el?.style) {
      const props = Object.keys(to).filter((k) => !['duration','delay','ease','stagger','overwrite','onComplete','onUpdate','scrollTrigger','immediateRender'].includes(k));
      Object.assign(el, Object.fromEntries(Object.entries(from).filter(([k]) => props.includes(k))));
      const begin = performance.now() + delay + i * stagger;
      const animate = (now) => {
        if (now < begin) { requestAnimationFrame(animate); return; }
        const p = duration ? Math.min(1, (now - begin) / duration) : 1;
        for (const k of props) { const a = Number(from[k] ?? el[k] ?? 0), b = Number(to[k]); el[k] = Number.isFinite(a) && Number.isFinite(b) ? a + (b - a) * p : p >= 1 ? to[k] : el[k]; }
        to.onUpdate?.();
        if (p < 1) requestAnimationFrame(animate); else { Object.assign(el, Object.fromEntries(props.map((k) => [k, to[k]]))); to.onUpdate?.(); to.onComplete?.(); }
      };
      requestAnimationFrame(animate);
      return;
    }
    apply(el, from); el.style.transition = `all ${duration / 1000}s ${easing[to.ease || opts.ease] || to.ease || easing.torraOut}`;
    requestAnimationFrame(() => setTimeout(() => { apply(el, to); if (i === els.length - 1) to.onComplete?.(); }, delay + i * stagger));
  });
  return { kill() {}, then: (resolve) => new Promise((r) => setTimeout(r, delay + duration + Math.max(0, els.length - 1) * stagger)).then(resolve) };
}
function to(target, vars) { return fromTo(target, {}, vars); }
function set(target, vars) { list(target).forEach((el) => apply(el, vars)); }
const tickerHandlers = new Set(); let tickerStarted = false, tickAt = performance.now();
function tickLoop(now) { const dt = now - tickAt; tickAt = now; for (const fn of tickerHandlers) fn(now / 1000, dt / 1000, dt / 16.667); if (tickerHandlers.size) requestAnimationFrame(tickLoop); else tickerStarted = false; }
export const gsap = {
  registerPlugin() {}, defaults() {}, set, to, fromTo,
  delayedCall(seconds, fn) { const id = setTimeout(fn, seconds * 1000); return { kill: () => clearTimeout(id) }; },
  quickTo(el, prop, opts = {}) { return (v) => { el.style.transition = `transform ${opts.duration || .3}s ${easing[opts.ease] || 'ease'}`; if (prop === 'x' || prop === 'y') { const p = quickPositions.get(el) || { x: 0, y: 0 }; p[prop] = v; quickPositions.set(el, p); el.style.transform = `translate3d(${p.x}px,${p.y}px,0)`; } else el.style[prop] = `${v}px`; }; },
  parseEase(name) { return (v) => v; }, utils: { interpolate(colors) { return (t) => colors[Math.min(colors.length - 1, Math.round(t * (colors.length - 1)))]; } },
  ticker: { add(fn) { tickerHandlers.add(fn); if (!tickerStarted) { tickerStarted = true; tickAt = performance.now(); requestAnimationFrame(tickLoop); } }, remove(fn) { tickerHandlers.delete(fn); }, deltaRatio() { return 1; }, lagSmoothing() {} },
  timeline(opts = {}) { let cursor = 0, end = 0, killed = false, started = false; const jobs = []; const position = (p) => typeof p === 'number' ? p : typeof p === 'string' && p.startsWith('-=') ? Math.max(0, cursor - parseFloat(p.slice(2))) : typeof p === 'string' && p.startsWith('+=') ? cursor + parseFloat(p.slice(2)) : cursor; const start = () => { if (started) return; started = true; jobs.forEach((j) => setTimeout(() => { if (!killed) fromTo(j.target, j.from, j.to); }, Math.max(0, j.at) * 1000)); setTimeout(() => { if (!killed) opts.onComplete?.(); }, end * 1000); }; const tl = {
    set(target, vars, pos = cursor) { const at = position(pos); jobs.push({ target, from: {}, to: vars, at }); cursor = Math.max(cursor, at); end = Math.max(end, cursor); return tl; },
    fromTo(target, from, toVars, pos = cursor) { const at = position(pos); jobs.push({ target, from, to: toVars, at }); cursor = Math.max(cursor, at + (toVars.duration || 0)); end = Math.max(end, cursor); return tl; },
    to(target, vars, pos = cursor) { const at = position(pos); jobs.push({ target, from: {}, to: vars, at }); cursor = Math.max(cursor, at + (vars.duration || 0)); end = Math.max(end, cursor); return tl; },
    then(resolve) { start(); return new Promise((r) => setTimeout(r, end * 1000)).then(resolve); },
    kill() { killed = true; },
  }; queueMicrotask(start); return tl; },
};

let triggerList = [];
function parseStart(trigger, start) {
  const rect = trigger.getBoundingClientRect(), top = rect.top + scrollY;
  const m = String(start || 'top top').match(/(top|center|bottom)\s+(top|center|bottom|\d+%)(?:\s*([+-]=)\s*(\d+))?/);
  if (!m) return top;
  const a = m[1] === 'bottom' ? rect.height : m[1] === 'center' ? rect.height / 2 : 0;
  const b = m[2] === 'bottom' ? innerHeight : m[2] === 'center' ? innerHeight / 2 : m[2].endsWith('%') ? innerHeight * parseFloat(m[2]) / 100 : 0;
  return top + a - b + (m[3] === '+=' ? 1 : m[3] === '-=' ? -1 : 0) * +(m[4] || 0);
}
function create(config) {
  const trigger = typeof config.trigger === 'string' ? document.querySelector(config.trigger) : config.trigger;
  if (!trigger) return { start: 0, end: 0, progress: 0 };
  const st = { trigger, config, start: 0, end: 0, progress: 0, refresh() { updateST(st, true); }, kill() { triggerList = triggerList.filter((x) => x !== st); } };
  if (config.pin) {
    const distance = () => { const e = typeof config.end === 'function' ? config.end() : config.end || `+=${innerHeight}`; const n = String(e).match(/\+=([\d.]+)/); return n ? +n[1] : innerHeight; };
    const parent = document.createElement('div'); parent.className = 'pin-spacer'; parent.style.position = 'relative'; parent.style.height = `${trigger.getBoundingClientRect().height + distance()}px`; parent.style.marginTop = getComputedStyle(trigger).marginTop; parent.style.marginBottom = getComputedStyle(trigger).marginBottom; parent.style.zIndex = getComputedStyle(trigger).zIndex;
    trigger.parentNode.insertBefore(parent, trigger); parent.appendChild(trigger); trigger.style.position = 'sticky'; trigger.style.top = '0px'; trigger.style.marginTop = '0'; trigger.style.marginBottom = '0'; trigger.style.height = '100lvh';
    st._spacer = parent; st._distance = distance;
  }
  triggerList.push(st); updateST(st, true); return st;
}
function updateST(st, refresh = false) {
  const c = st.config;
  if (st._spacer) { st.start = st._spacer.getBoundingClientRect().top + scrollY; st.end = st.start + st._distance(); }
  else { st.start = parseStart(st.trigger, c.start); const end = typeof c.end === 'function' ? c.end() : c.end || 'bottom top'; const n = String(end).match(/\+=([\d.]+)/); const rect = st.trigger.getBoundingClientRect(); st.end = n ? st.start + +n[1] : st.start + st.trigger.offsetHeight; if (!n && String(end).includes('top top')) st.end = rect.top + scrollY; else if (!n && String(end).includes('bottom top')) st.end = rect.bottom + scrollY - innerHeight; }
  const p = Math.min(1, Math.max(0, (scrollY - st.start) / Math.max(1, st.end - st.start)));
  const old = st.progress;
  st.progress = p;
  if (old !== undefined && !refresh) { if (old === 0 && p > 0) c.onEnter?.(st); if (old === 1 && p < 1) c.onEnterBack?.(st); if (old > 0 && p === 0) c.onLeaveBack?.(st); if (old < 1 && p === 1) c.onLeave?.(st); }
  if (refresh) c.onRefresh?.(st);
  c.onUpdate?.(st);
}
function updateAll(refresh = false) { triggerList.forEach((st) => updateST(st, refresh)); }
addEventListener('scroll', () => updateAll(), { passive: true }); addEventListener('resize', () => updateAll(true), { passive: true });
export const ScrollTrigger = { create, update: updateAll, refresh: () => updateAll(true), addEventListener() {}, scrollerProxy() {} };
export const CustomEase = { create() {} };
