import { useEffect, useState, useMemo } from 'react';

interface DiscoBallProps {
  show: boolean;
  onComplete?: () => void;
}

const DISCO_COLORS = ['#ff00ff', '#00ffff', '#ffff00', '#ff0080', '#8000ff', '#00ff80', '#ff8000', '#0080ff'];

export default function DiscoBall({ show, onComplete }: DiscoBallProps) {
  const [visible, setVisible] = useState(false);

  const lightSpots = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 400 - 200,
      top: Math.random() * 400 - 200,
      color: DISCO_COLORS[i % DISCO_COLORS.length],
      delay: i * 0.2,
    })), []
  );

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 animate-pulse" />
      
      <div className="relative">
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-gray-300 to-gray-600 shadow-2xl animate-spin">
          <div className="absolute inset-0 rounded-full overflow-hidden">
            {Array.from({ length: 64 }, (_, i) => {
              const row = Math.floor(i / 8);
              const col = i % 8;
              return (
                <div
                  key={i}
                  className="absolute w-3 h-3 bg-gradient-to-br from-white via-gray-200 to-gray-400 border border-gray-500 animate-pulse"
                  style={{
                    left: `${12.5 + col * 12.5}%`,
                    top: `${12.5 + row * 12.5}%`,
                    transform: `rotate(${(col / 8) * 360}deg)`,
                    animationDelay: `${i * 0.05}s`,
                    boxShadow: '0 0 4px rgba(255,255,255,0.8)',
                  }}
                />
              );
            })}
          </div>
          
          <div className="absolute top-4 left-4 w-8 h-8 bg-white/80 rounded-full blur-sm animate-pulse" />
        </div>
        
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s' }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-40 bg-gradient-to-b from-transparent via-purple-400 to-transparent opacity-60"
              style={{
                left: '50%',
                top: '50%',
                transformOrigin: '0 0',
                transform: `rotate(${i * 45}deg) translateY(-20px)`,
              }}
            />
          ))}
        </div>
        
        {lightSpots.map(spot => (
          <div
            key={spot.id}
            className="absolute w-6 h-6 rounded-full animate-pulse"
            style={{
              left: `${spot.left}px`,
              top: `${spot.top}px`,
              backgroundColor: spot.color,
              opacity: 0.7,
              animationDelay: `${spot.delay}s`,
              filter: 'blur(4px)',
            }}
          />
        ))}
      </div>
      
      <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 text-center">
        <div 
          className="text-4xl font-bold text-white animate-bounce" 
          style={{
            textShadow: '0 0 20px #ff00ff, 0 0 40px #00ffff',
            animation: 'bounce 1s infinite, colorCycle 2s infinite'
          }}
        >
          GROOVY!
        </div>
      </div>
    </div>
  );
}