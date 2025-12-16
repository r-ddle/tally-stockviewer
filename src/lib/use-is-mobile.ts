"use client";

import { useLayoutEffect, useState } from "react";

function computeIsMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(computeIsMobile);

  useLayoutEffect(() => {
    const update = () => {
      setIsMobile(computeIsMobile());
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return isMobile;
}
