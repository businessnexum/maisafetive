// A família de curvas da Torra: tudo no site usa estas três (e o CSS, as mesmas em cubic-bezier, ver tokens.css).
//   torraOut   entrada longa e macia, como o espresso assentando na xícara
//   torraIn    saída firme, que acelera e some (texto saindo, cortina subindo)
//   torraInOut trocas e recortes: arranca devagar, corre no meio, pousa macio
import { gsap, CustomEase } from './gsap-lite.js';

gsap.registerPlugin(CustomEase);
CustomEase.create('torraOut', 'M0,0 C0.12,0.75 0.22,1 1,1');
CustomEase.create('torraIn', 'M0,0 C0.6,0 0.86,0.3 1,1');
CustomEase.create('torraInOut', 'M0,0 C0.72,0 0.14,1 1,1');
gsap.defaults({ ease: 'torraOut' });

// tempos da régua: texto entra em 1 s, sai em 0,4 s
export const T_IN = 1;
export const T_OUT = 0.4;
