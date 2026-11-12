// Cardápio: três grupos, cinco itens cada. A foto é vista de cima e entra no círculo.
export const GRUPOS = [
  {
    nome: 'Espresso',
    foto: '/img/cardapio-espresso.webp',
    alt: 'Cappuccino visto de cima, com um coração no leite',
    itens: [
      ['Espresso', 'Dose dupla, 18 g', 7],
      ['Cortado', 'Espresso e um dedo de leite vaporizado', 9],
      ['Cappuccino', 'Leite integral ou de aveia', 13],
      ['Latte', 'Copo de 300 ml', 14],
      ['Mocha', 'Com chocolate 70%', 16],
    ],
  },
  {
    nome: 'Coados',
    foto: '/img/cardapio-coado.webp',
    alt: 'Coado no filtro de vidro visto de cima',
    itens: [
      ['V60', 'Grão da semana, 300 ml', 14],
      ['Prensa francesa', 'Para dois, 500 ml', 22],
      ['Aeropress', 'Mais encorpado, 250 ml', 14],
      ['Cold brew', 'Extraído por 18 horas', 15],
      ['Degustação', 'Os três lotes lado a lado', 28],
    ],
  },
  {
    nome: 'Forno',
    foto: '/img/cardapio-forno.webp',
    alt: 'Torrada de pão de fermentação natural e croissant numa tábua',
    itens: [
      ['Pão na chapa', 'Fermentação natural e manteiga', 12],
      ['Torrada com ricota', 'Mel e raspas de limão', 18],
      ['Croissant', 'Manteiga, assado de manhã', 14],
      ['Pão de queijo', 'Porção com quatro', 10],
      ['Bolo do dia', 'Fatia; pergunte no balcão', 11],
    ],
  },
];
