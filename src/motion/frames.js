// Quadros do filme (WebP gerados por tools/frames.mjs) baixados em ordem grossa → fina.
// Adaptado de tools/frames-lab/frame-scroll.js: aqui o pin e o desenho ficam no filme (motion/film.js);
// este módulo só baixa e entrega o quadro carregado mais próximo do pedido.
//
//   const frames = await loadFrames({ base: '/frames/filme', onProgress });
//   frames.get(i)       // HTMLImageElement do quadro i ou do carregado mais perto
//   frames.coarse       // promessa: 1º, último e um a cada 8 (o bastante para o scrub não pular)
//   frames.all          // promessa: todos
export async function loadFrames({ base, concurrency = 6, onProgress }) {
  const manifest = await fetch(`${base}/manifest.json`).then((r) => r.json());
  const count = manifest.count;
  const images = new Array(count);
  let loaded = 0;
  const url = (i) => `${base}/${String(i + 1).padStart(4, '0')}.${manifest.ext}`;

  const load = (i) => new Promise((resolve) => {
    const img = new Image();
    img.src = url(i);
    img.decode().then(() => { images[i] = img; }, () => {}).finally(() => {
      loaded++;
      onProgress?.(loaded, count, coarseSet.size);
      resolve();
    });
  });

  // ordem: 1º, último, depois a cada 16, 8, 4, 2, 1
  const order = [];
  const seen = new Set([0]);
  if (count > 1) { order.push(count - 1); seen.add(count - 1); }
  const coarseSet = new Set([0, count - 1]);
  for (let step = 16; step >= 1; step /= 2)
    for (let i = 0; i < count; i += step) {
      if (step >= 8) coarseSet.add(i);
      if (!seen.has(i)) { seen.add(i); order.push(i); }
    }

  await load(0);

  let coarseLeft = coarseSet.size - 1;
  let coarseDone;
  const coarse = new Promise((r) => { coarseDone = r; });
  const all = Promise.all(Array.from({ length: concurrency }, async () => {
    for (let i; (i = order.shift()) !== undefined; ) {
      await load(i);
      if (coarseSet.has(i) && --coarseLeft <= 0) coarseDone();
    }
  })).then(() => coarseDone());

  function get(i) {
    i = Math.max(0, Math.min(count - 1, Math.round(i)));
    if (images[i]) return images[i];
    for (let d = 1; d < count; d++) {
      if (images[i - d]) return images[i - d];
      if (images[i + d]) return images[i + d];
    }
    return null;
  }

  return { manifest, count, get, coarse, all, coarseCount: coarseSet.size };
}
