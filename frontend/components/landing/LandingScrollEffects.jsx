"use client";

import { useEffect } from "react";

export default function LandingScrollEffects() {
  useEffect(() => {
    const root = document.querySelector(".landing-page");
    if (!root) return undefined;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      root.querySelectorAll(".scroll-reveal").forEach((el) => el.classList.add("visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    const observeAll = () => {
      root.querySelectorAll(".scroll-reveal:not(.visible)").forEach((el) => {
        const rect = el.getBoundingClientRect();
        const inView = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;

        if (inView) {
          el.classList.add("visible");
          return;
        }

        observer.observe(el);
      });
    };

    observeAll();
    const raf = requestAnimationFrame(observeAll);
    const timeout = window.setTimeout(observeAll, 200);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  return null;
}
