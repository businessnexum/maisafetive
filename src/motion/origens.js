// Origens: uma galeria espalhada, um bloco por lote (a galeria solta do landonorris, num verde de folha de café).
// Rolagem livre, sem pin: as fotos ficam soltas em volta do texto do lote, em tamanhos diferentes, cada uma com a
// legenda em cima, e andam em velocidades diferentes conforme a profundidade (parallax só de deslocamento, nunca de
// escala). O texto troca de lado a cada lote. Fotos abrem de baixo quando entram; o texto sobe por máscara, por marco.
import { gsap, ScrollTrigger } from './gsap-lite.js';
import { splitLines } from './split.js';
import { T_IN, T_OUT } from './ease.js';
import { LOTES } from '../data/lotes.js';

const fmt = (m) => `${m.toLocaleString('pt-BR')} m`;
// profundidade de cada posição: 1 anda com a página; acima de 1 está mais perto e anda mais; abaixo, mais longe
const DEPTH = [1, 0.78, 1.28, 1.16];

export function origens({ section, reduced, mobile }) {
  section.insertAdjacentHTML('beforeend', LOTES.map((l, i) => `
    <article class="lote${i % 2 ? ' lote--r' : ''}">
      <div class="lote__text">
        <p class="lote__label mask"><span>Lote ${l.n} — ${l.pais}</span></p>
        <h3 class="lote__farm serif">${l.fazenda.replace(' ', '<br />')}</h3>
        <p class="lote__spec mask"><span>${l.variedade} · ${l.processo.toLowerCase()} · ${fmt(l.altitude)}</span></p>
        <p class="lote__notes serif mask"><span>${l.notas}</span></p>
      </div>
      <div class="lote__field">${l.fotos.map((f, k) => `
        <figure class="ph ph--${'abcd'[k]}" data-depth="${DEPTH[k]}">
          <div class="ph__move">
            <figcaption class="mask"><span>${f.legenda}</span></figcaption>
            <div class="ph__frame"><img src="/img/origens/${f.src}.webp" alt="${f.alt}" loading="lazy" decoding="async" /></div>
          </div>
        </figure>`).join('')}
      </div>
    </article>`).join(''));

  if (reduced) return;
  // quanto a foto mais perto anda além da página, de quando o bloco entra até quando sai
  const K = () => innerHeight * (mobile ? 0.14 : 0.3);

  for (const lote of section.querySelectorAll('.lote')) {
    // parallax: o bloco inteiro é a referência, para a foto deslocada não mudar o próprio gatilho
    for (const ph of lote.querySelectorAll('.ph')) {
      const d = +ph.dataset.depth;
      gsap.fromTo(ph.firstElementChild, { y: () => (d - 1) * K() }, {
        y: () => -(d - 1) * K(), ease: 'none',
        scrollTrigger: { trigger: lote, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
      });
      // a foto abre de baixo e a legenda sobe quando ela chega
      const frame = ph.querySelector('.ph__frame'), cap = ph.querySelector('figcaption > span');
      const tl = gsap.timeline({ paused: true })
        .fromTo(frame, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'torraInOut' }, 0)
        .fromTo(cap, { yPercent: 120 }, { yPercent: 0, duration: T_IN, ease: 'torraOut' }, 0.2);
      // começa no primeiro pixel que entra: rolando rápido, a foto já chega aberta
      ScrollTrigger.create({ trigger: ph, start: 'top bottom', onEnter: () => tl.play(), onLeaveBack: () => tl.reverse() });
    }

    // texto do lote: rótulo, fazenda (por linha), variedade e notas sobem em sequência; ao voltar, saem rápido
    const t = lote.querySelector('.lote__text');
    const parts = [t.querySelector('.lote__label > span'), ...splitLines(t.querySelector('.lote__farm')),
      t.querySelector('.lote__spec > span'), t.querySelector('.lote__notes > span')];
    gsap.set(parts, { yPercent: 120 });
    ScrollTrigger.create({
      trigger: t, start: 'top 92%',
      onEnter: () => gsap.to(parts, { yPercent: 0, duration: T_IN, ease: 'torraOut', stagger: 0.07, overwrite: true }),
      onLeaveBack: () => gsap.to(parts, { yPercent: 120, duration: T_OUT, ease: 'torraIn', stagger: 0.02, overwrite: true }),
    });
  }
}
