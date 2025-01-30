'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

export default function MermaidClient({ chart }: { chart: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: "default"
    });

    if (ref.current) {
      mermaid.contentLoaded();
      setIsLoaded(true);
    };
  }, [chart]);

  return (
    <div
      ref={ref}
      className={`mermaid ${!isLoaded ? 'invisible h-0' : ''}`}
    >
      {chart}
    </div>
  );
};