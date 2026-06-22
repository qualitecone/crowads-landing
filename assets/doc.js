/* TOC active section scroll-spy + mobile drawer + smooth anchor scroll */
(function() {
  const tocLinks = document.querySelectorAll('.toc-list a[href^="#"]');
  if (!tocLinks.length) return;

  const sections = Array.from(tocLinks).map(a => {
    const id = a.getAttribute('href').slice(1);
    return { link: a, el: document.getElementById(id) };
  }).filter(s => s.el);

  const setActive = (activeEl) => {
    tocLinks.forEach(a => a.classList.toggle('active', a === activeEl));
  };

  const onScroll = () => {
    const offset = window.scrollY + 120;
    let current = sections[0];
    for (const s of sections) {
      if (s.el.offsetTop <= offset) current = s;
    }
    if (current) setActive(current.link);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile drawer */
  const trigger = document.querySelector('.toc-mobile-trigger');
  const drawer = document.querySelector('.toc-drawer');
  if (trigger && drawer) {
    trigger.addEventListener('click', () => drawer.classList.toggle('open'));
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer || e.target.tagName === 'A') drawer.classList.remove('open');
    });
  }
})();
