// A fake Power BI "Refresh failed" dialog that turns into a joke. Only opens on demand.
export function mountCrash(button, { reducedMotion }) {
  const overlay = document.querySelector('#crash-overlay');
  if (!overlay) return;
  const failed = overlay.querySelector('.crash-failed');
  const joke = overlay.querySelector('.crash-joke');
  const close = overlay.querySelector('.crash-close');
  button.closest('.crash-row').hidden = false;
  let timer;

  const hide = () => {
    clearTimeout(timer);
    overlay.hidden = true;
    button.focus();
  };

  button.addEventListener('click', () => {
    failed.hidden = false;
    joke.hidden = true;
    overlay.hidden = false;
    close.focus();
    timer = setTimeout(() => {
      failed.hidden = true;
      joke.hidden = false;
      close.focus();
    }, reducedMotion ? 0 : 1200);
  });

  close.addEventListener('click', hide);
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
    if (e.key === 'Tab') { e.preventDefault(); close.focus(); } // the close button is the only control
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });
}
