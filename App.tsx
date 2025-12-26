
import React, { useState, useRef, useEffect } from 'react';
import { Deck } from './components/Deck';
import { Mixer } from './components/Mixer';
import { Track, EQState } from './types';
import { generateAdScript, generateVoiceOver } from './services/geminiService';
import { 
  X, Loader2, Play, Download, Zap, 
  Mic2, Key, Plus, Music2, Search, ListMusic, 
  FileAudio, Settings, Cpu, Layers, Disc, Save,
  Activity, CheckCircle2, AlertTriangle, Sliders, Upload, ChevronRight, User
} from 'lucide-react';

declare const lamejs: any;
declare const window: any;

const defaultEQ: EQState = { high: 50, mid: 50, low: 50, gain: 50 };

interface PadInfo {
  id: string;
  label: string;
  color: string;
  pulseClass: string;
}

const samplerPads: PadInfo[] = [
  { id: '1', label: 'AIRHORN', color: 'bg-red-600', pulseClass: 'animate-pad-pulse-red' },
  { id: '2', label: 'LASER', color: 'bg-red-600', pulseClass: 'animate-pad-pulse-red' },
  { id: '3', label: 'SIREN', color: 'bg-orange-500', pulseClass: 'animate-pad-pulse-orange' },
  { id: '4', label: 'EXPLODE', color: 'bg-orange-500', pulseClass: 'animate-pad-pulse-orange' },
  { id: '5', label: 'SCRATCH', color: 'bg-amber-400', pulseClass: 'animate-pad-pulse-amber' },
  { id: '6', label: 'VOX 1', color: 'bg-amber-400', pulseClass: 'animate-pad-pulse-amber' },
  { id: '7', label: 'VOX 2', color: 'bg-green-600', pulseClass: 'animate-pad-pulse-green' },
  { id: '8', label: 'DRUM', color: 'bg-green-600', pulseClass: 'animate-pad-pulse-green' },
  { id: '9', label: 'BASS', color: 'bg-blue-600', pulseClass: 'animate-pad-pulse-blue' },
  { id: '10', label: 'SYNTH', color: 'bg-blue-600', pulseClass: 'animate-pad-pulse-blue' },
  { id: '11', label: 'PARA', color: 'bg-purple-600', pulseClass: 'animate-pad-pulse-purple' },
  { id: '12', label: 'MASTER_VO', color: 'bg-pioneer-led', pulseClass: 'animate-pad-pulse-cyan' },
];

const availableVoices = [
  { name: 'Kore', label: 'Kore (Padrão)', desc: 'Voz masculina equilibrada' },
  { name: 'Puck', label: 'Puck', desc: 'Voz jovem e enérgica' },
  { name: 'Charon', label: 'Charon', desc: 'Voz profunda e madura' },
  { name: 'Fenrir', label: 'Fenrir', desc: 'Voz firme e autoritária' },
  { name: 'Zephyr', label: 'Zephyr', desc: 'Voz suave e comercial' },
  { name: 'Aoide', label: 'Aoide', desc: 'Voz feminina expressiva' },
  { name: 'Icarus', label: 'Icarus', desc: 'Voz clara e direta' },
  { name: 'Leda', label: 'Leda', desc: 'Voz amigável e calorosa' },
  { name: 'Castor', label: 'Castor', desc: 'Voz dinâmica para rádio' },
  { name: 'Pollux', label: 'Pollux', desc: 'Voz marcante e impactante' },
];

export default function App() {
  const [trackA, setTrackA] = useState<Track | null>(null);
  const [trackB, setTrackB] = useState<Track | null>(null);
  const [eqA, setEqA] = useState<EQState>({ ...defaultEQ });
  const [eqB, setEqB] = useState<EQState>({ ...defaultEQ });
  const [faderA, setFaderA] = useState(100);
  const [faderB, setFaderB] = useState(100);
  const [crossfader, setCrossfader] = useState(50);
  
  const [showStudio, setShowStudio] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileProgress, setCompileProgress] = useState(0);
  const [d3Script, setD3Script] = useState(() => localStorage.getItem('pioneer_v12_script') || "");
  const [rawPcmData, setRawPcmData] = useState<Int16Array | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('Kore');

  // Pad Media State
  const [padMedia, setPadMedia] = useState<Record<string, { url: string, name: string }>>({});
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const padFileInputRef = useRef<HTMLInputElement>(null);
  const activePadToLoad = useRef<string | null>(null);

  useEffect(() => { localStorage.setItem('pioneer_v12_script', d3Script); }, [d3Script]);

  const handleAddMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file: File) => {
        const newTrack: Track = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          artist: "USB Local",
          bpm: 128,
          url: URL.createObjectURL(file),
          duration: 0
        };
        setPlaylist(prev => [...prev, newTrack]);
      });
    }
  };

  const handlePadMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && activePadToLoad.current) {
        const file = e.target.files[0];
        const url = URL.createObjectURL(file);
        const padId = activePadToLoad.current;
        setPadMedia(prev => ({
            ...prev,
            [padId]: { url, name: file.name }
        }));
        activePadToLoad.current = null;
    }
  };

  const triggerPadUpload = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    activePadToLoad.current = id;
    padFileInputRef.current?.click();
  };

  const playPad = (id: string) => {
    const media = padMedia[id];
    if (media && audioRef.current) {
        audioRef.current.src = media.url;
        audioRef.current.play();
    } else if (id === '12' && audioUrl && audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
    }
  };

  const compileMaster = async () => {
      if (!rawPcmData) return;
      setIsCompiling(true);
      setCompileProgress(0);
      try {
          const mp3encoder = new lamejs.Mp3Encoder(1, 24000, 192); 
          const mp3Data = [];
          const chunkSize = 1152;
          for (let i = 0; i < rawPcmData.length; i += chunkSize) {
              const chunk = rawPcmData.subarray(i, i + chunkSize);
              const buf = mp3encoder.encodeBuffer(chunk);
              if (buf.length > 0) mp3Data.push(buf);
              setCompileProgress(Math.floor((i / rawPcmData.length) * 100));
              if (i % (chunkSize * 20) === 0) await new Promise(r => setTimeout(r, 0));
          }
          const last = mp3encoder.flush();
          if (last.length > 0) mp3Data.push(last);
          const blob = new Blob(mp3Data, { type: 'audio/mp3' });
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          setAudioUrl(URL.createObjectURL(blob));
          setCompileProgress(100);
      } catch (err) {
          setApiError("Erro ao compilar áudio.");
      } finally {
          setIsCompiling(false);
      }
  };

  const generateRawAudio = async () => {
    if (!d3Script) return;
    setIsGenerating(true);
    setApiError(null);
    setRawPcmData(null);
    setAudioUrl(null);
    try {
      const base64 = await generateVoiceOver(d3Script, selectedVoice);
      const binary = window.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const int16 = new Int16Array(bytes.buffer);
      setRawPcmData(int16);
    } catch (e: any) {
      setApiError(e.message || "Erro na geração do áudio.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-pioneer-dark flex flex-col items-center">
      
      {/* PROFESSIONAL TOP BAR */}
      <header className="w-full h-12 bg-black flex items-center justify-between px-6 border-b border-white/5 z-50">
        <div className="flex items-center gap-6">
          <div className="text-white font-mono text-[10px] font-black tracking-widest flex items-center gap-2">
             <Disc size={16} className="text-pioneer-led animate-spin-slow"/> PIONEER DJ <span className="text-neutral-600 italic">V12 FLASH EDITION</span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
           <button onClick={() => window.aistudio.openSelectKey()} className="text-[9px] text-neutral-500 hover:text-white font-black uppercase flex items-center gap-1 px-2"> <Key size={12}/> API CONFIG </button>
           <button onClick={() => setShowStudio(true)} className="bg-pioneer-led text-black px-4 h-7 text-[9px] font-black uppercase tracking-widest shadow-lg hover:brightness-110"> ESTÚDIO DE VOZ </button>
        </div>
      </header>

      {/* CORE WORKSPACE */}
      <div className="flex-1 w-full max-w-[1550px] p-4 flex flex-col gap-4 overflow-hidden">
        
        {/* DJ DECKS & MIXER AREA */}
        <div className="flex justify-center gap-2 items-stretch p-2">
          <Deck channel="A" track={trackA} onLoadTrack={() => {}} volume={faderA} setVolume={setFaderA} eqState={eqA} />
          <Mixer eqA={eqA} eqB={eqB} setEqA={setEqA} setEqB={setEqB} faderA={faderA} faderB={faderB} setFaderA={setFaderA} setFaderB={setFaderB} crossfader={crossfader} setCrossfader={setCrossfader} />
          <Deck channel="B" track={trackB} onLoadTrack={() => {}} volume={faderB} setVolume={setFaderB} eqState={eqB} />
        </div>

        {/* PERFORMANCE PADS (SAMPLER) - PULSATING & MEDIA CAPABLE */}
        <div className="bg-[#0e0e11] p-5 rounded-2xl border border-white/5 mx-auto w-full max-w-[1300px] shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
           
           <input type="file" ref={padFileInputRef} onChange={handlePadMediaUpload} accept="audio/*" className="hidden" />
           
           <div className="grid grid-cols-6 md:grid-cols-12 gap-4">
              {samplerPads.map(pad => (
                <button 
                  key={pad.id} 
                  onClick={() => playPad(pad.id)}
                  className={`relative group ${pad.color} ${pad.pulseClass} h-16 rounded-xl border-b-[4px] border-black/50 flex flex-col items-center justify-center active:translate-y-[2px] active:border-b-0 transition-all shadow-xl overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  {/* UPLOAD BUTTON OVERLAY */}
                  <div 
                    onClick={(e) => triggerPadUpload(pad.id, e)}
                    className="absolute top-1 right-1 p-1 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                  >
                     <Plus size={10} className="text-white"/>
                  </div>

                  <span className="text-[10px] font-black text-black/70 italic mb-0.5">{pad.id}</span>
                  <span className="text-[8px] font-black text-black uppercase truncate px-2 leading-none">
                      {padMedia[pad.id]?.name || pad.label}
                  </span>

                  {padMedia[pad.id] && (
                      <div className="absolute bottom-1 right-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_5px_white] animate-ping"></div>
                      </div>
                  )}
                </button>
              ))}
           </div>
        </div>

        {/* PLAYLIST SECTION (BASE) */}
        <div className="flex-1 bg-[#08080a] rounded-xl border border-white/5 flex flex-col overflow-hidden shadow-2xl">
          <div className="h-10 bg-[#121215] flex items-center justify-between px-6 border-b border-white/5">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                  <ListMusic size={16} className="text-pioneer-led"/> USB PLAYLIST
               </div>
               <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                  <Search size={12} className="text-neutral-700"/>
                  <input type="text" placeholder="FILTER..." className="bg-transparent text-[9px] text-white outline-none w-32 font-bold"/>
               </div>
            </div>
            
            <div className="flex items-center gap-2">
               <input type="file" ref={fileInputRef} onChange={handleAddMedia} accept="audio/*" multiple className="hidden" />
               <button onClick={() => fileInputRef.current?.click()} className="bg-[#ff6600] text-white text-[9px] font-black px-4 h-6 rounded-sm shadow-lg uppercase flex items-center gap-2"> <Upload size={12}/> + ADICIONAR MÍDIA </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0c0c0e] text-[8px] font-black text-neutral-600 uppercase z-20 border-b border-white/10">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">TRACK</th>
                  <th className="p-3">ARTIST</th>
                  <th className="p-3 w-20 text-center">BPM</th>
                  <th className="p-3 w-32 text-center">LOAD</th>
                </tr>
              </thead>
              <tbody>
                {playlist.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center opacity-30 italic font-mono text-[10px] tracking-widest">USB DISK IDLE...</td>
                  </tr>
                ) : (
                  playlist.map((t, idx) => (
                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
                      <td className="p-3 text-center font-mono text-[9px] text-neutral-600">{idx + 1}</td>
                      <td className="p-3 font-black text-[11px] text-white flex items-center gap-3">
                         <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-pioneer-led"> <Music2 size={12}/> </div>
                         {t.name}
                      </td>
                      <td className="p-3 text-[10px] font-bold text-neutral-500 uppercase">{t.artist}</td>
                      <td className="p-3 text-center text-pioneer-led font-mono font-black italic">{t.bpm}</td>
                      <td className="p-3 flex gap-1">
                        <button onClick={() => setTrackA(t)} className="flex-1 h-6 bg-neutral-900 rounded text-[8px] font-black hover:bg-pioneer-led hover:text-black transition-all">A</button>
                        <button onClick={() => setTrackB(t)} className="flex-1 h-6 bg-neutral-900 rounded text-[8px] font-black hover:bg-pioneer-led hover:text-black transition-all">B</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* STUDIO MODAL */}
      {showStudio && (
        <div className="fixed inset-0 bg-black/98 z-[1000] flex items-center justify-center p-6 animate-in fade-in">
           <div className="w-full max-w-4xl bg-[#0d0d12] border border-pioneer-led/20 rounded-[30px] overflow-hidden shadow-2xl flex flex-col h-[85vh]">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-pioneer-led rounded-xl flex items-center justify-center text-black shadow-lg">
                        <Mic2 size={24}/>
                     </div>
                     <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">STUDIO MASTERING V12</h2>
                        <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">AI Locution & Mastering Rack</p>
                     </div>
                  </div>
                  <button onClick={() => setShowStudio(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-600 flex items-center justify-center transition-all"> <X size={20}/> </button>
              </div>

              <div className="flex-1 p-8 overflow-y-auto space-y-8 custom-scrollbar">
                  {/* SCRIPT EDITOR */}
                  <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2"> <Layers size={14} className="text-pioneer-led"/> EDITAR ROTEIRO </label>
                        <div className="flex gap-2">
                            <button onClick={async () => setD3Script(await generateAdScript("Abertura Master", 'comercial'))} className="px-3 py-1 bg-white/5 border border-white/10 rounded-sm text-[8px] font-black hover:bg-pioneer-led hover:text-black transition-all uppercase">Preset: Abertura</button>
                            <button onClick={async () => setD3Script(await generateAdScript("Homenagem Especial", 'homenagem'))} className="px-3 py-1 bg-white/5 border border-white/10 rounded-sm text-[8px] font-black hover:bg-pioneer-led hover:text-black transition-all uppercase">Preset: Homenagem</button>
                        </div>
                      </div>
                      <textarea 
                        value={d3Script}
                        onChange={(e) => setD3Script(e.target.value)}
                        placeholder="Digite aqui o texto para a locução AI..."
                        className="w-full h-32 bg-black/60 border border-white/10 rounded-2xl p-6 text-xl font-bold outline-none focus:border-pioneer-led/50 transition-all placeholder:text-neutral-800"
                      />
                  </div>

                  {/* VOICE SELECTION - 10 SUGESTÕES */}
                  <div className="space-y-4">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2 px-2"> <User size={14} className="text-pioneer-led"/> SELECIONAR VOZ (10 OPÇÕES) </label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {availableVoices.map((v) => (
                            <button 
                                key={v.name}
                                onClick={() => setSelectedVoice(v.name)}
                                className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all group ${selectedVoice === v.name ? 'bg-pioneer-led/10 border-pioneer-led' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                            >
                                <div className="flex items-center justify-between w-full">
                                   <span className={`text-[10px] font-black uppercase ${selectedVoice === v.name ? 'text-pioneer-led' : 'text-white'}`}>{v.name}</span>
                                   {selectedVoice === v.name && <CheckCircle2 size={10} className="text-pioneer-led animate-pulse"/>}
                                </div>
                                <span className="text-[7px] text-neutral-500 font-bold uppercase leading-tight group-hover:text-neutral-300 transition-colors">{v.desc}</span>
                            </button>
                          ))}
                      </div>
                  </div>

                  {/* GENERATE BUTTON */}
                  <button 
                    onClick={generateRawAudio}
                    disabled={isGenerating || !d3Script}
                    className="w-full py-6 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase tracking-[0.2em] hover:bg-pioneer-led hover:text-black transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-4"
                  >
                    {isGenerating ? <Loader2 className="animate-spin" size={24}/> : <><Zap size={20}/> 1. EXTRAIR ÁUDIO RAW (MODALIDADE {selectedVoice})</>}
                  </button>

                  {/* COMPILER ENGINE */}
                  {rawPcmData && (
                    <div className="p-8 bg-[#16161c] border border-pioneer-led/20 rounded-3xl space-y-6 animate-in slide-in-from-bottom-4 shadow-xl">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <Cpu size={20} className="text-pioneer-led animate-pulse"/>
                              <div className="text-lg font-black italic uppercase tracking-tighter">MP3 COMPILER ENGINE</div>
                           </div>
                           <div className="text-[8px] font-black text-pioneer-led border border-pioneer-led/30 px-3 py-1 rounded-full bg-pioneer-led/5 uppercase">PCM 24kHz / 192kbps</div>
                        </div>

                        <button onClick={compileMaster} disabled={isCompiling} className="w-full py-7 bg-gradient-to-r from-pioneer-led to-cyan-500 text-black font-black text-2xl uppercase tracking-[0.3em] shadow-[0_10px_30px_rgba(0,229,255,0.3)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-5">
                            {isCompiling ? <Loader2 className="animate-spin" size={32}/> : <><Disc size={28} className="animate-spin-slow"/> 2. COMPILAR MASTER FILE</>}
                        </button>
                        
                        {isCompiling && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black text-pioneer-led uppercase">
                                   <span>Processando Canal Master...</span>
                                   <span>{compileProgress}%</span>
                                </div>
                                <div className="h-2 bg-black rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full bg-pioneer-led shadow-[0_0_15px_#00e5ff] transition-all duration-300" style={{ width: `${compileProgress}%` }}></div>
                                </div>
                            </div>
                        )}
                    </div>
                  )}

                  {/* FINAL OUTPUT PREVIEW */}
                  {audioUrl && !isCompiling && (
                    <div className="p-8 bg-pioneer-led/5 border border-pioneer-led/30 rounded-3xl flex items-center justify-between animate-in zoom-in-95 shadow-inner">
                        <div className="flex items-center gap-6">
                           <button onClick={() => { if(audioRef.current) { audioRef.current.src = audioUrl; audioRef.current.play(); } }} className="w-20 h-20 bg-pioneer-led rounded-full flex items-center justify-center text-black shadow-[0_0_40px_rgba(0,229,255,0.4)] hover:scale-110 transition-transform active:scale-95"> <Play size={40} fill="currentColor" className="ml-1"/> </button>
                           <div className="space-y-1">
                              <h3 className="text-xl font-black uppercase italic tracking-tighter">MASTER READY</h3>
                              <div className="flex gap-3">
                                 <span className="text-[10px] font-black text-pioneer-led bg-pioneer-led/10 px-3 py-0.5 rounded-full border border-pioneer-led/20 uppercase tracking-widest flex items-center gap-1"> <CheckCircle2 size={10}/> PAD 12 SYNC</span>
                                 <span className="text-[10px] font-black text-neutral-500 uppercase">{selectedVoice} ENGINE</span>
                              </div>
                           </div>
                        </div>
                        <div className="flex gap-4">
                           <button onClick={() => { const a = document.createElement('a'); a.href=audioUrl!; a.download="PIONEER_VO_V12.mp3"; a.click(); }} className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all"> <Download size={24}/> </button>
                           <button onClick={() => setShowStudio(false)} className="px-8 bg-pioneer-led text-black font-black uppercase rounded-2xl shadow-xl hover:brightness-110 tracking-widest text-sm flex items-center gap-3"> <Save size={20}/> LOAD TO SETUP </button>
                        </div>
                    </div>
                  )}
              </div>
           </div>
        </div>
      )}

      <audio ref={audioRef} className="hidden" />

    </div>
  );
}
