// Makes the stack bubbles draggable within their bucket. A toy: nothing is scored.
export function initStack(root, { reducedMotion }) {
  if (reducedMotion) return;
  root.classList.add('is-playground');

  for (const bubble of root.querySelectorAll('.bubble')) {
    let x = 0, y = 0, startX = 0, startY = 0, bounds = null;

    bubble.addEventListener('pointerdown', (e) => {
      const box = bubble.closest('.bucket-box').getBoundingClientRect();
      const b = bubble.getBoundingClientRect();
      // how far the bubble may travel from its resting place and stay inside the bucket
      bounds = {
        minX: box.left - (b.left - x), maxX: box.right - (b.right - x),
        minY: box.top - (b.top - y), maxY: box.bottom - (b.bottom - y),
      };
      startX = e.clientX - x;
      startY = e.clientY - y;
      bubble.setPointerCapture(e.pointerId);
      bubble.classList.add('is-dragging');
    });
    bubble.addEventListener('pointermove', (e) => {
      if (!bounds) return;
      x = Math.max(bounds.minX, Math.min(bounds.maxX, e.clientX - startX));
      y = Math.max(bounds.minY, Math.min(bounds.maxY, e.clientY - startY));
      bubble.style.transform = `translate(${x}px, ${y}px)`;
    });
    const end = () => { bounds = null; bubble.classList.remove('is-dragging'); };
    bubble.addEventListener('pointerup', end);
    bubble.addEventListener('pointercancel', end);
  }

  const shake = root.querySelector('.shake-btn');
  if (shake) {
    shake.hidden = false;
    shake.addEventListener('click', () => {
      root.classList.remove('is-shaking');
      void root.offsetWidth; // restart the animation
      root.classList.add('is-shaking');
    });
  }
}
