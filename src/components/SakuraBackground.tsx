import { useEffect, useRef } from 'react';

export default function SakuraBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create sakura petals
    const petalCount = 30;
    const petals: HTMLDivElement[] = [];

    for (let i = 0; i < petalCount; i++) {
      const petal = document.createElement('div');
      petal.className = 'sakura-petal';
      
      // Random positioning
      petal.style.left = `${Math.random() * 100}%`;
      petal.style.animationDuration = `${8 + Math.random() * 10}s`;
      petal.style.animationDelay = `${Math.random() * 5}s`;
      
      // Random sway animation duration
      const swayDuration = 2 + Math.random() * 3;
      petal.style.setProperty('animation', `sakura-fall ${8 + Math.random() * 10}s linear infinite, sakura-sway ${swayDuration}s ease-in-out infinite`);
      petal.style.animationDelay = `${Math.random() * 5}s`;
      
      containerRef.current.appendChild(petal);
      petals.push(petal);
    }

    return () => {
      petals.forEach(petal => petal.remove());
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--snow-blue)) 100%)'
      }}
    >
      {/* Winter forest silhouette at bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-64 opacity-10"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, hsl(var(--primary)) 100%)'
        }}
      />
    </div>
  );
}
