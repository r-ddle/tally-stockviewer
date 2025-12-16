"use client";

import { useEffect, useState } from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => {
      const coarse =
        typeof window !== "undefined" &&
        window.matchMedia?.("(pointer: coarse)")?.matches;
      const narrow = typeof window !== "undefined" && window.innerWidth < 768;
      setIsMobile(Boolean(coarse || narrow));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return isMobile;
}

