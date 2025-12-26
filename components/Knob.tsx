import React, { useState, useRef, useEffect } from 'react';

interface KnobProps {
  label: string;
  value: number; // 0 to 100
  min: number;
  max: number;
  onChange: (val: number) => void;
  type?: 'eq' | 'gain' | 'filter';
  size?: 'sm' | 'md' | 'lg';
  centerColor?: string;
}

export const Knob: React.FC<KnobProps> = ({ 
  label, 
  value, 
  min, 
  max, 
  onChange, 
  type = 'eq',
  size = 'md',
  centerColor
}) => {
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number>(0);
  const startVal = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    startY.current = e.clientY;
    startVal.current = value;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const deltaY = startY.current - e.clientY;
      const range = max - min;
      const deltaVal = (deltaY / 150) * range; 
      let newVal = startVal.current + deltaVal;
      newVal = Math.max(min, Math.min(max, newVal));
      onChange(newVal);
    };

    const handleMouseUp = () => {
      setDragging(false);
    };

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.cursor = 'default';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [dragging, max, min, onChange, value]);

  // Visual calculation
  const percentage = (value - min) / (max - min);
  const rotation = -135 + (percentage * 270);
  
  // Size classes
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const currentSize = sizeClasses[size];

  // Styles based on type
  const isFilter = type === 'filter';
  const capGradient = isFilter 
    ? 'bg-[radial-gradient(circle_at_30%_30%,_#888,_#555)]' // Lighter silver for filter
    : 'bg-[radial-gradient(circle_at_30%_30%,_#333,_#111)]'; // Dark for EQ

  return (
    <div className="flex flex-col items-center gap-1 group select-none">
      <div 
        className={`relative ${currentSize} rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.6)] cursor-ns-resize`}
        onMouseDown={handleMouseDown}
      >
        {/* Knob Base / Shadow */}
        <div className="absolute inset-0 rounded-full bg-black shadow-inner"></div>
        
        {/* Rotating Cap */}
        <div 
          className={`absolute inset-[10%] rounded-full ${capGradient} border border-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]`}
          style={{ transform: `rotate(${rotation}deg)` }}
        >
           {/* Side Texture */}
           <div className="absolute inset-0 rounded-full border-[2px] border-dashed border-neutral-900/40 opacity-60"></div>
           
           {/* Top Plate */}
           <div className={`absolute inset-[10%] rounded-full bg-[#1a1a1a] flex items-center justify-center shadow-inner`}>
              {/* Indicator Line */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-[2px] h-[30%] bg-white shadow-[0_0_2px_white]" />
              
              {/* Center Color (for filter mainly) */}
              {centerColor && (
                  <div className={`w-1/2 h-1/2 rounded-full opacity-80 shadow-[0_0_5px_currentColor] ${centerColor}`}></div>
              )}
           </div>
        </div>
      </div>
      {label && (
        <span className="text-[9px] font-bold text-neutral-400 bg-black/40 px-1 rounded border border-neutral-800/50 uppercase tracking-widest shadow-sm">
            {label}
        </span>
      )}
    </div>
  );
};