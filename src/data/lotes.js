// Os três lotes da casa: origens (seção 4) e café em grão (seção 7). Fazendas fictícias.
// fotos: em /img/origens/<src>.webp; a primeira é a grande do bloco, a legenda vai em cima de cada uma (sem cidade nem estado).
export const LOTES = [
  {
    n: '01', pais: 'Brasil', fazenda: 'Sítio Pedra Alta', altitude: 1150,
    variedade: 'Catuaí Amarelo', processo: 'Natural', torra: 'Média',
    notas: 'Chocolate ao leite, castanha, caramelo.', preco: 52,
    fotos: [
      { src: 'b-catuai', legenda: 'Catuaí Amarelo no pé — 1.150 m', alt: 'Cerejas amarelas de Catuaí maduras no galho, com os morros de café atrás' },
      { src: 'b-morros', legenda: 'Os talhões do sítio, na curva de nível', alt: 'Morros com fileiras curvas de café e terra vermelha entre elas' },
      { src: 'origem-brasil', legenda: 'Natural: a cereja seca inteira', alt: 'Cerejas de café secando ao sol num terreiro suspenso' },
      { src: 'b-rodo', legenda: 'Terreiro, revirado de hora em hora', alt: 'Rodo de madeira espalhando cerejas no terreiro ao sol' },
    ],
  },
  {
    n: '02', pais: 'Colômbia', fazenda: 'Finca Los Naranjos', altitude: 1700,
    variedade: 'Castillo', processo: 'Lavado', torra: 'Média',
    notas: 'Laranja, rapadura, cacau.', preco: 64,
    fotos: [
      { src: 'origem-colombia', legenda: 'Castillo maduro — 1.700 m', alt: 'Cerejas de café maduras no galho, com a serra na neblina atrás' },
      { src: 'c-encosta', legenda: 'A encosta, colhida à mão', alt: 'Encosta íngreme coberta de café e bananeiras, com nuvens no vale' },
      { src: 'c-canasto', legenda: 'Só a cereja vermelha vai para o cesto', alt: 'Cesto amarrado na cintura cheio de cerejas vermelhas recém-colhidas' },
      { src: 'c-lavagem', legenda: 'Lavado: o canal tira a mucilagem', alt: 'Café em pergaminho correndo no canal de lavagem com água limpa' },
    ],
  },
  {
    n: '03', pais: 'Etiópia', fazenda: 'Cooperativa Abebe', altitude: 2000,
    variedade: 'Heirloom', processo: 'Lavado', torra: 'Clara',
    notas: 'Jasmim, limão-siciliano, chá preto.', preco: 72,
    fotos: [
      { src: 'origem-etiopia', legenda: 'Pergaminho na tela — 2.000 m', alt: 'Café lavado em pergaminho secando numa tela suspensa, no alto da serra' },
      { src: 'e-camas', legenda: 'As camas suspensas da cooperativa', alt: 'Fileiras de camas suspensas com café em pergaminho no alto de uma serra' },
      { src: 'e-flor', legenda: 'A florada que dá o jasmim', alt: 'Flores brancas de café num galho, de manhã' },
      { src: 'e-maos', legenda: 'Catação, grão a grão', alt: 'Mãos separando grãos defeituosos do café em pergaminho na tela' },
    ],
  },
];
export const MOAGEM = ['Em grão', 'Coado', 'Espresso'];
export const PESOS = [['250 g', 1], ['500 g', 1.9], ['1 kg', 3.6]];
export const brl = (v) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
