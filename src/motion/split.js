// Divide um título em linhas pelo <br> (os títulos têm no máximo duas) e embrulha cada uma numa máscara.
export function splitLines(el) {
  if (el.dataset.split) return [...el.querySelectorAll('.line > span')];
  const parts = el.innerHTML.split(/<br\s*\/?>/i);
  el.innerHTML = parts.map((p) => `<span class="line"><span>${p.trim()}</span></span>`).join('');
  el.dataset.split = '1';
  return [...el.querySelectorAll('.line > span')];
}
