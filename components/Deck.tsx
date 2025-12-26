
import React, { useState, useRef, useEffect } from 'react';
import { Track } from '../types';
import { Play, Disc, Music2 } from 'lucide-react';
import { useDeckAudio } from '../hooks/useDeckAudio';

interface DeckProps {
  channel: 'A' | 'B';
  track: Track | null;
  onLoadTrack: (file: File) => void;
  volume: number; 
  setVolume: (v: number) => void;
  eqState: any;
  onPlay?: () => void;
}

export const Deck: React.FC<DeckProps> = React.memo(({ 
  channel, 
  track, 
  volume, 
  setVolume,
  eqState, 
  onPlay
}) => {
  const { 
    audioRef, 
    togglePlay, 
    updateEQ, 
    updateVolume, 
    updateTempo, 
    currentTime, 
    initAudio
  } = useDeckAudio(channel);

  const [isPlaying, setIsPlaying] = useState(false);
  const [pitch, setPitch] = useState(0); 
  const [jogRotation, setJogRotation] = useState(0);

  useEffect(() => { updateVolume(volume); }, [volume]);
  useEffect(() => { updateEQ(eqState); }, [eqState]);

  useEffect(() => {
    if (track && audioRef.current) {
        audioRef.current.pause();
        initAudio();
        audioRef.current.src = track.url;
        audioRef.current.load();
        setIsPlaying(false);
    }
  }, [track]);

  const handlePlayPause = () => {
    if (!track) return;
    togglePlay();
    setIsPlaying(!isPlaying);
    if (onPlay) onPlay();
  };

  const handleCue = () => {
    if (audioRef.current && track) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return {
        main: `${min}:${sec < 10 ? '0' : ''}${sec}`,
        sub: `.${ms < 10 ? '0' : ''}${ms}`
    };
  };

  useEffect(() => {
    let animationFrame: number;
    if (isPlaying) {
      const spin = () => {
        setJogRotation(r => (r + (1 + pitch/10)) % 360);
        animationFrame = requestAnimationFrame(spin);
      };
      animationFrame = requestAnimationFrame(spin);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, pitch]);

  const timeDisplay = formatTime(currentTime);

  return (
    <div className="w-[420px] bg-[#0c0c0e] rounded-xl border border-white/5 relative flex flex-col select-none shadow-2xl overflow-hidden p-4">
      
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />

      {/* TOP SCREEN */}
      <div className="h-[140px] bg-black rounded-lg relative p-4 flex flex-col justify-between border border-white/10 shadow-inner">
        <div className="flex justify-between items-start">
            <div className="flex flex-col">
                <span className="text-pioneer-led text-[8px] font-black uppercase tracking-widest mb-1">PLAYER {channel}</span>
                <span className="text-white font-black text-lg truncate max-w-[180px] uppercase italic tracking-tighter leading-tight">{track ? track.artist : "NO USB"}</span>
                <span className="text-neutral-500 text-[9px] font-bold truncate max-w-[180px] uppercase tracking-widest">{track ? track.name : "LOAD TRACK"}</span>
            </div>
            <div className="text-right">
                <div className="text-[8px] text-neutral-600 font-black">BPM</div>
                <div className="text-2xl text-white font-mono font-black italic">{track ? (track.bpm * (1 + pitch/100)).toFixed(1) : "0.0"}</div>
            </div>
        </div>

        <div className="flex justify-between items-end">
            <div className="text-[8px] text-neutral-600 font-black uppercase">REMAIN</div>
            <div className="font-mono text-white leading-none">
                <span className="text-4xl font-black italic">{timeDisplay.main}</span>
                <span className="text-xl text-red-600 ml-1 italic">{timeDisplay.sub}</span>
            </div>
        </div>
      </div>

      {/* JOG & CONTROLS SECTION */}
      <div className="flex-1 flex gap-4 mt-4">
          
          {/* LEFT: JOG WHEEL */}
          <div className="flex-1 flex flex-col items-center">
              <div className={`w-[180px] h-[180px] rounded-full border-[4px] flex items-center justify-center shadow-xl transition-all duration-300 ${isPlaying ? 'border-pioneer-led' : 'border-[#222]'}`}>
                  <div className="w-[165px] h-[165px] rounded-full bg-[repeating-radial-gradient(#1a1a1c_0,#111_1px,#1a1a1c_2px)] flex items-center justify-center relative overflow-hidden" style={{ transform: `rotate(${jogRotation}deg)` }}>
                      <div className="absolute w-[60px] h-[60px] bg-black rounded-full border-2 border-[#333] flex items-center justify-center z-20" style={{ transform: `rotate(-${jogRotation}deg)` }}>
                          <Disc className={`text-neutral-700 w-8 h-8 ${isPlaying ? 'animate-spin' : ''}`} />
                      </div>
                  </div>
              </div>

              {/* TRANSPORT BELOW JOG */}
              <div className="flex gap-4 mt-4">
                  <button onClick={handleCue} className="w-12 h-12 rounded-full border-2 border-neutral-700 flex items-center justify-center hover:border-orange-500 hover:text-orange-500 active:scale-95 transition-all">
                      <span className="text-[10px] font-black italic">CUE</span>
                  </button>
                  <button onClick={handlePlayPause} className={`w-12 h-12 rounded-full border-2 flex items-center justify-center active:scale-95 transition-all ${isPlaying ? 'border-pioneer-led text-pioneer-led' : 'border-neutral-700 text-white'}`}>
                      <Play size={18} fill="currentColor" />
                  </button>
              </div>
          </div>

          {/* RIGHT: VOLUME LEVER (FADER MÉDIO) */}
          <div className="w-24 bg-[#08080a] border border-white/5 rounded-lg p-3 flex flex-col items-center gap-2">
              <span className="text-[7px] text-neutral-600 font-black uppercase tracking-widest">VOLUME {channel}</span>
              
              <div className="flex-1 flex gap-2">
                  {/* VU METER */}
                  <div className="w-2 flex flex-col gap-[1px] py-1">
                      {[...Array(15)].map((_, i) => {
                          const idx = 14 - i;
                          const active = (volume * 0.9) > (idx / 15 * 100);
                          let color = 'bg-pioneer-green';
                          if (idx > 10) color = 'bg-orange-500';
                          if (idx > 12) color = 'bg-red-600';
                          return <div key={i} className={`flex-1 w-full rounded-[0.5px] ${active ? color : 'bg-black'} transition-all`} />;
                      })}
                  </div>

                  {/* ACTUAL FADER */}
                  <div className="relative w-8 h-full bg-black/60 rounded border border-white/5 flex flex-col items-center">
                      <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/5" />
                      {/* SCALE */}
                      {[...Array(6)].map((_, i) => (
                          <div key={i} className="absolute w-full h-[1px] bg-white/10" style={{ bottom: `${i * 20}%` }} />
                      ))}
                      <div 
                        className="absolute left-1/2 -translate-x-1/2 w-7 h-10 bg-[#1a1a1c] border border-black shadow-2xl flex flex-col items-center justify-center rounded-sm z-10 cursor-ns-resize active:brightness-125"
                        style={{ bottom: `${volume}%`, transform: 'translate(-50%, 50%)' }}
                      >
                         <div className="w-full h-[2px] bg-pioneer-led/50 shadow-[0_0_5px_rgba(0,229,255,0.5)]"></div>
                         <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={volume} 
                            onChange={(e) => setVolume(Number(e.target.value))} 
                            className="absolute inset-0 opacity-0 cursor-ns-resize"
                         />
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* TEMPO/PITCH SLIDER (SMALLER ON SIDE) */}
      <div className="absolute top-[165px] right-2 flex flex-col items-center gap-1">
          <span className="text-[6px] text-neutral-600 font-black">TEMPO</span>
          <div className="h-28 w-1 bg-white/5 relative">
              <div 
                  className="absolute left-1/2 -translate-x-1/2 w-4 h-6 bg-neutral-800 border border-black rounded-xs z-10" 
                  style={{ top: `${50 - (pitch / 16) * 50}%`, transform: 'translateX(-50%)' }}
              />
              <input type="range" min="-16" max="16" step="0.1" value={pitch} onChange={(e) => { setPitch(parseFloat(e.target.value)); updateTempo(parseFloat(e.target.value)); }} className="absolute inset-0 opacity-0 cursor-pointer h-full" />
          </div>
      </div>

    </div>
  );
});
