
import React from 'react';
import { EQState } from '../types';
import { Knob } from './Knob';
import { Mic, Zap, Radio } from 'lucide-react';

interface MixerProps {
  eqA: EQState;
  eqB: EQState;
  setEqA: React.Dispatch<React.SetStateAction<EQState>>;
  setEqB: React.Dispatch<React.SetStateAction<EQState>>;
  faderA: number;
  faderB: number;
  setFaderA: (v: number) => void;
  setFaderB: (v: number) => void;
  crossfader: number;
  setCrossfader: (v: number) => void;
}

const LEDMeter: React.FC<{ level: number, type?: 'channel' | 'master' }> = ({ level, type = 'channel' }) => {
    const segments = 15;
    return (
        <div className={`flex flex-col gap-[1px] bg-black p-[2px] rounded-sm border border-neutral-800/50 ${type === 'master' ? 'w-3' : 'w-2'}`}>
             {[...Array(segments)].map((_, i) => {
                 const index = segments - 1 - i; 
                 const threshold = (index / segments) * 100;
                 const active = level > threshold;
                 let color = 'bg-pioneer-green';
                 if (index >= 10) color = 'bg-orange-500';
                 if (index >= 13) color = 'bg-red-600';
                 return (
                     <div key={i} className={`w-full h-[5px] rounded-[0.5px] ${active ? color : 'bg-[#080808]'} transition-all`} />
                 )
             })}
        </div>
    )
}

const MixerStrip: React.FC<{ 
  label: string; 
  eq: EQState; 
  setEq: React.Dispatch<React.SetStateAction<EQState>>;
}> = ({ label, eq, setEq }) => {
  const updateEqVal = (key: keyof EQState, val: number) => {
    setEq(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="flex flex-col items-center gap-2 py-4 w-[100px] border-x border-black bg-[#0d0d10] shadow-inner">
      <div className="text-[7px] font-black text-neutral-500 uppercase tracking-widest mb-1">{label}</div>
      <div className="flex flex-col gap-2 items-center">
        <Knob label="TRIM" value={eq.gain} min={0} max={100} onChange={(v) => updateEqVal('gain', v)} type="gain" size="sm" />
        <div className="h-4 w-[1px] bg-white/5 my-1"></div>
        <Knob label="HI" value={eq.high} min={0} max={100} onChange={(v) => updateEqVal('high', v)} size="sm" />
        <Knob label="MID" value={eq.mid} min={0} max={100} onChange={(v) => updateEqVal('mid', v)} size="sm" />
        <Knob label="LOW" value={eq.low} min={0} max={100} onChange={(v) => updateEqVal('low', v)} size="sm" />
        <div className="h-4 w-[1px] bg-white/5 my-1"></div>
        <Knob label="COLOR" value={50} min={0} max={100} onChange={() => {}} type="filter" size="md" centerColor="bg-pioneer-led" />
      </div>
    </div>
  );
};

export const Mixer: React.FC<MixerProps> = ({ 
  eqA, eqB, setEqA, setEqB, 
  faderA, faderB, crossfader, setCrossfader 
}) => {
  return (
    <div className="h-[550px] bg-[#0c0c0e] flex flex-col z-20 shadow-2xl relative border-x border-black overflow-hidden">
       <div className="h-10 flex items-center justify-center bg-black border-b border-white/5">
          <div className="text-[9px] text-white font-mono font-black italic tracking-widest opacity-80">DJM-V12 CORE</div>
       </div>
       
       <div className="flex flex-1">
         {/* UTILITY */}
         <div className="w-[60px] border-r border-black bg-[#111] flex flex-col items-center py-4 gap-6">
            <Radio size={14} className="text-neutral-700" />
            <Knob label="HP" value={40} min={0} max={100} onChange={()=>{}} size="sm" />
            <div className="mt-auto mb-6">
                <Zap size={14} className="text-pioneer-led/20" />
            </div>
         </div>
         
         <MixerStrip label="CH 1" eq={eqA} setEq={setEqA} />
         
         {/* MASTER SECTION */}
         <div className="w-[80px] bg-black border-x border-white/5 flex flex-col items-center py-4 gap-6">
             <div className="flex flex-col items-center gap-2">
                 <span className="text-[7px] text-neutral-600 font-black uppercase tracking-widest">MASTER</span>
                 <div className="flex gap-1">
                    <LEDMeter level={Math.max(faderA, faderB) * 0.8} type="master" />
                    <LEDMeter level={Math.max(faderA, faderB) * 0.8} type="master" />
                 </div>
             </div>
             <Knob label="LEVEL" value={70} min={0} max={100} onChange={()=>{}} size="sm" type="gain" />
             <div className="mt-auto mb-4">
                 <Mic size={14} className="text-neutral-700"/>
             </div>
         </div>

         <MixerStrip label="CH 2" eq={eqB} setEq={setEqB} />
       </div>

       {/* CROSSFADER */}
       <div className="h-28 bg-black border-t border-white/5 flex flex-col items-center justify-center relative shadow-inner">
          <div className="relative w-[180px] h-10 bg-[#050505] border border-neutral-900 rounded-lg flex items-center px-6">
             <div className="absolute left-6 right-6 h-[1px] bg-white/5"></div>
             <div className="absolute w-8 h-9 bg-[#1a1a1c] border border-black shadow-xl cursor-ew-resize flex items-center justify-center rounded transition-all active:brightness-125 z-10" style={{ left: `${crossfader}%`, transform: 'translateX(-50%)' }}>
                <div className="w-[1px] h-6 bg-white/20"></div>
                <input type="range" min="0" max="100" value={crossfader} onChange={(e) => setCrossfader(Number(e.target.value))} className="absolute inset-0 opacity-0 cursor-ew-resize" />
             </div>
          </div>
          <div className="text-[6px] text-neutral-800 font-black uppercase mt-2 tracking-widest">MAGVEL FADER PRO</div>
       </div>
    </div>
  );
};
