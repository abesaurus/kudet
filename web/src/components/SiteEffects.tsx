'use client';

import { useEffect } from 'react';

// Small vanilla-ish effects ported from the original single-file landing:
// mobile menu, nav scroll state, FAQ accordion, reveal-on-scroll.
export default function SiteEffects() {
  useEffect(() => {
    // ===== Mobile menu =====
    const menuBtn = document.getElementById('menuBtn');
    const navLinks = document.getElementById('navLinks');
    if (menuBtn && navLinks) {
      const toggle = () => navLinks.classList.toggle('open');
      menuBtn.addEventListener('click', toggle);
      navLinks.querySelectorAll('a').forEach((a) =>
        a.addEventListener('click', () => navLinks.classList.remove('open'))
      );
    }

    // ===== Nav scroll state =====
    const topnav = document.getElementById('topnav');
    const onScroll = () => {
      if (topnav) topnav.classList.toggle('scrolled', window.scrollY > 24);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ===== FAQ accordion =====
    document.querySelectorAll('.faq-item').forEach((item) => {
      const btn = item.querySelector('.faq-q button');
      if (!btn) return;
      const onClick = () => {
        const isOpen = item.classList.contains('is-open');
        document.querySelectorAll('.faq-item.is-open').forEach((other) => {
          if (other !== item) {
            other.classList.remove('is-open');
            const ob = other.querySelector('.faq-q button');
            if (ob) ob.setAttribute('aria-expanded', 'false');
          }
        });
        item.classList.toggle('is-open', !isOpen);
        btn.setAttribute('aria-expanded', String(!isOpen));
      };
      btn.addEventListener('click', onClick);
    });

    // ===== Entrance motion (IntersectionObserver) =====
    document.documentElement.classList.add('motion-ready');
    const revealEls = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in');
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
      );
      revealEls.forEach((el) => io.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add('in'));
    }

    return () => {
      if (menuBtn) menuBtn.removeEventListener('click', () => {});
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return null;
}
