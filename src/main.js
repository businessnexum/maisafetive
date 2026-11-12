import { gsap, ScrollTrigger } from './motion/gsap-lite.js';
import Lenis from './motion/lenis-lite.js';
import { film } from './motion/film.js';
import { loadFrames } from './motion/frames.js';
import { loader } from './motion/loader.js';
import { dome } from './motion/curtain.js';
import { cursor } from './motion/cursor.js';
import { scrollbar } from './motion/scrollbar.js';
import { AFETIVE_MENU } from './data/afetive-menu.js';
import { HOURS, ORDER, hoursToday } from './data/loja.js';

gsap.registerPlugin(ScrollTrigger);
history.scrollRestoration = 'manual';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 700px)').matches;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

function paintHours() {
  const now = new Date();
  const today = hoursToday(now);
  const publicSchedule = today.nextLabel.toLowerCase().startsWith('próximo');
  const statusText = today.open ? `Aberto até ${today.closeLabel}` : publicSchedule ? today.nextLabel : `Abre ${today.nextLabel}`;
  $('.nav__status span').textContent = statusText;
  const live = $('.loja__live');
  live.classList.toggle('is-closed', !today.open);
  live.querySelector('span').textContent = today.open ? `Aberto agora - fecha às ${today.closeLabel}` : publicSchedule ? today.nextLabel : `Fechado agora - abre ${today.nextLabel}`;
  $('.hours').innerHTML = ORDER.map((i) => `<li class="${i === today.day ? 'is-today' : ''}"><span>${HOURS[i].day}</span><span>${HOURS[i].open ? `${HOURS[i].open}h - ${HOURS[i].close}h` : 'Horário não informado'}</span></li>`).join('');
}
paintHours();

// Cardápio publicado no cartão digital da Afetivê: categorias, descrições e preços.
const menu = $('.cardapio');
const menuMarkup = AFETIVE_MENU.map((group, i) => `<details class="afetive-category" ${i === 0 ? 'open' : ''}><summary><span class="afetive-category__num">${String(i + 1).padStart(2, '0')}</span><span>${group.nome}</span><i></i></summary>${group.aviso ? `<p class="afetive-category__note">${group.aviso}</p>` : ''}<div class="afetive-items">${group.itens.map(([name, desc, price]) => `<article><div><b>${name}</b>${price ? `<strong>${price}</strong>` : ''}</div>${desc ? `<p>${desc}</p>` : ''}</article>`).join('')}</div></details>`).join('');
menu.querySelector('.cardapio__inner').innerHTML = `<header class="afetive-menu-head"><p class="eyebrow">(Cardápio)</p><h2 class="serif">Escolha seu próximo<br>momento Afetivê.</h2><p>Nosso cardápio</p></header><div class="afetive-categories">${menuMarkup}</div><p class="afetive-menu-foot">Valores conforme o cardápio digital. Sabores sujeitos à disponibilidade.</p>`;

const filmMotion = film({ section: $('.filme'), reduced, mobile });
// Cúpulas das seções seguintes acompanham as últimas telas dos pins.
for (const [el, r] of [[menu, mobile ? 18 : 30], [$('.origens'), mobile ? 18 : 30], [$('.torra'), mobile ? 18 : 30], [$('.loja'), mobile ? 18 : 30], [$('.comprar'), mobile ? 18 : 30], [$('.rodape'), mobile ? 18 : 30]]) dome(el, { reduced, r });

// Menu, barra e links continuam funcionando mesmo com o scroll suave.
const nav = $('.nav'), menuButton = $('.nav__toggle');
menuButton.addEventListener('click', () => { const on = nav.classList.toggle('is-open'); menuButton.setAttribute('aria-expanded', String(on)); menuButton.setAttribute('aria-label', on ? 'Fechar menu' : 'Abrir menu'); });
$$('.menu a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('is-open'); menuButton.setAttribute('aria-expanded', 'false'); }));
let lastY = 0;
addEventListener('scroll', () => { const y = scrollY; nav.classList.toggle('is-hidden', y > lastY && y > 150 && !nav.classList.contains('is-open')); nav.classList.toggle('is-high', y > innerHeight * 0.5); lastY = y; }, { passive: true });

const smooth = reduced ? null : new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: true, wheelMultiplier: 1 });
if (smooth) {
  smooth.stop();
  gsap.ticker.add((time) => smooth.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  ScrollTrigger.scrollerProxy(document.documentElement, { scrollTop(value) { if (arguments.length) smooth.scrollTo(value, { immediate: true }); return smooth.scroll; }, getBoundingClientRect: () => ({ top: 0, left: 0, width: innerWidth, height: innerHeight }), pinType: document.documentElement.style.transform ? 'transform' : 'fixed' });
  smooth.on('scroll', ScrollTrigger.update);
  ScrollTrigger.addEventListener('refresh', () => smooth.resize());
  scrollbar({ lenis: smooth });
} else scrollbar({ lenis: null });
cursor({ reduced });

const introLoader = loader({ reduced });
const base = '/frames/afetive-film';
introLoader.set(0.04);
const frameSetPromise = loadFrames({ base, concurrency: 6, onProgress: (done, count) => introLoader.set(done / count * (mobile ? 0.55 : 1)) })
  .catch((error) => { console.error('Não foi possível carregar os frames do filme:', error); return null; });
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const frameSet = await Promise.race([frameSetPromise, timeout(8000).then(() => null)]);
if (frameSet) filmMotion.setFrames(frameSet);
else {
  // Se a rede demorar, abre o site com uma imagem de apoio e aplica os frames assim que chegarem.
  $('.filme__canvas').style.background = "center / cover no-repeat url('/img/afetive-cafe.jpg')";
  frameSetPromise.then((lateFrames) => { if (lateFrames) filmMotion.setFrames(lateFrames); });
}
// O conjunto mobile segue em segundo plano; nenhum frame extra pode prender a abertura.
if (mobile) {
  let mobileStarted = false;
  const startMobileFrames = () => {
    if (mobileStarted) return;
    mobileStarted = true;
    loadFrames({ base: '/frames/afetive-mobile', concurrency: 6 })
      .then((mobileFrameSet) => filmMotion.setMobileFrames(mobileFrameSet))
      .catch((error) => console.error('Não foi possível carregar os frames mobile:', error));
  };
  if (frameSet) startMobileFrames();
  else { startMobileFrames(); frameSetPromise.then((lateFrames) => { if (lateFrames) startMobileFrames(); }); }
}
if (frameSet) await Promise.race([frameSet.coarse, timeout(mobile ? 4000 : 12000)]);
await introLoader.done();
filmMotion.intro();
if (smooth) smooth.start();
ScrollTrigger.refresh();
addEventListener('load', () => { smooth?.resize(); ScrollTrigger.refresh(); }, { once: true });
