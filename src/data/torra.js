// Uma torra de terça: temperatura do grão (sonda) por minuto e as quatro notas do mostrador.
// A sonda marca alto na carga (o tambor está quente), cai até o ponto de virada e sobe até 210 °C.
export const CURVA = [[0, 152], [0.8, 123], [1.7, 118], [3, 131], [4, 143], [6, 165], [8, 184], [9.5, 196], [11, 205], [12, 210]];
export const MIN_MAX = 12;
// cada nota aparece quando a agulha chega ao minuto `em`; a foto mostra o grão nesse ponto
export const FASES = [
  { n: '01', em: 0, nome: 'Secagem, até 4 min.', texto: 'O grão verde perde a água e amarela.', foto: 't-cru', alt: 'Grãos de café verdes, crus' },
  { n: '02', em: 4, nome: 'Maillard, até 9 min.', texto: 'Açúcar vira cor e cheiro de pão.', foto: 't-amarelo', alt: 'Grãos de café amarelados no fim da secagem' },
  { n: '03', em: 9.5, nome: 'Primeiro crack, 9:30.', texto: 'O grão estala e abre no meio.', foto: 't-crack', alt: 'Grãos de café cor de canela, abertos no primeiro crack, com película solta' },
  { n: '04', em: 12, nome: 'Fim, 12:00 a 210 °C.', texto: 'Cai na bandeja e esfria em quatro minutos.', foto: 't-fim', alt: 'Grãos de café marrons recém-torrados, com um fio de fumaça' },
];
