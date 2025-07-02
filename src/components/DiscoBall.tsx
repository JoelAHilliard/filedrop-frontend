import { useEffect, useState } from 'react';

interface DiscoBallProps {
  show: boolean;
  onComplete?: () => void;
}

export default function DiscoBall({ show, onComplete }: DiscoBallProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      // Auto-hide after 3 seconds
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
      {/* Backdrop with disco lights */}
      <div className="absolute inset-0 bg-black/20 animate-pulse" />
      
      {/* Disco ball container */}
      <div className="relative">
        {/* Main disco ball */}
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-gray-300 to-gray-600 shadow-2xl animate-spin">
          {/* Mirror tiles */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            {Array.from({ length: 64 }).map((_, i) => {
              const row = Math.floor(i / 8);
              const col = i % 8;
              const angle = (col / 8) * 360;
              const yPos = (row / 8) * 100;
              
              return (
                <div
                  key={i}
                  className="absolute w-3 h-3 bg-gradient-to-br from-white via-gray-200 to-gray-400 border border-gray-500 animate-pulse"
                  style={{
                    left: `${12.5 + col * 12.5}%`,
                    top: `${12.5 + row * 12.5}%`,
                    transform: `rotate(${angle}deg)`,
                    animationDelay: `${i * 0.05}s`,
                    boxShadow: '0 0 4px rgba(255,255,255,0.8)',
                  }}
                />
              );
            })}
          </div>
          
          {/* Highlight reflection */}
          <div className="absolute top-4 left-4 w-8 h-8 bg-white/80 rounded-full blur-sm animate-pulse" />
        </div>
        
        {/* Light beams */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s' }}>
          {Array.from({ length: 8 }).map((_, i) => (
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
        
        {/* Colorful light spots */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-6 h-6 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 400 - 200}px`,
              top: `${Math.random() * 400 - 200}px`,
              backgroundColor: [
                '#ff00ff', '#00ffff', '#ffff00', '#ff0080', 
                '#8000ff', '#00ff80', '#ff8000', '#0080ff'
              ][i % 8],
              opacity: 0.7,
              animationDelay: `${i * 0.2}s`,
              filter: 'blur(4px)',
            }}
          />
        ))}
      </div>
      
      {/* Success text */}
      <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 text-center">
        <div className="text-4xl font-bold text-white animate-bounce" style={{
          textShadow: '0 0 20px #ff00ff, 0 0 40px #00ffff',
          animation: 'bounce 1s infinite, colorCycle 2s infinite'
        }}>
          GROOVY!
        </div>
      </div>
      
    </div>
  );
}