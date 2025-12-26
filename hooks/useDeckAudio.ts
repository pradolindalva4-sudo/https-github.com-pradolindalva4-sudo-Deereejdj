import { useEffect, useRef, useState, useCallback } from 'react';
import { EQState } from '../types';

export const useDeckAudio = (channelId: string) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  
  // Web Audio Nodes refs
  const sourceNode = useRef<MediaElementAudioSourceNode | null>(null);
  const trimNode = useRef<GainNode | null>(null); // Formerly gainNode, now dedicated to Trim/Input Gain
  const faderNode = useRef<GainNode | null>(null); // New dedicated node for Channel Fader
  const lowFilter = useRef<BiquadFilterNode | null>(null);
  const midFilter = useRef<BiquadFilterNode | null>(null);
  const highFilter = useRef<BiquadFilterNode | null>(null);
  
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Initialize Audio Context lazily (user interaction required)
  const initAudio = useCallback(() => {
    if (!audioContext) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      setAudioContext(ctx);
    } else if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }, [audioContext]);

  // Setup nodes when audio element and context exist
  useEffect(() => {
    if (!audioContext || !audioRef.current || sourceNode.current) return;

    // Create Nodes
    const source = audioContext.createMediaElementSource(audioRef.current);
    const trim = audioContext.createGain(); // Input Gain (Trim)
    const fader = audioContext.createGain(); // Output Gain (Volume Fader)
    const low = audioContext.createBiquadFilter();
    const mid = audioContext.createBiquadFilter();
    const high = audioContext.createBiquadFilter();

    // Configure Filters
    low.type = 'lowshelf';
    low.frequency.value = 320; 
    
    mid.type = 'peaking';
    mid.frequency.value = 1000;
    mid.Q.value = 1.0;

    high.type = 'highshelf';
    high.frequency.value = 3200;

    // Connect Graph: Source -> Trim -> High -> Mid -> Low -> Fader -> Destination
    source.connect(trim);
    trim.connect(high);
    high.connect(mid);
    mid.connect(low);
    low.connect(fader);
    fader.connect(audioContext.destination);

    // Store refs
    sourceNode.current = source;
    trimNode.current = trim;
    faderNode.current = fader;
    lowFilter.current = low;
    midFilter.current = mid;
    highFilter.current = high;

  }, [audioContext]);

  // Handle Play/Pause
  const togglePlay = async () => {
    if (!audioRef.current) return;
    initAudio();
    
    if (audioContext?.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (e) {
        console.warn("Audio Context Resume Error", e);
      }
    }

    if (audioRef.current.paused) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          if (error.name === 'AbortError') {
             // The play() request was interrupted by a call to pause().
             // This is expected during rapid Play/Cue actions.
          } else {
             console.error("Playback Error:", error);
          }
        });
      }
    } else {
      audioRef.current.pause();
    }
  };

  // Update EQ
  const updateEQ = (eq: EQState) => {
    if (!trimNode.current || !lowFilter.current || !midFilter.current || !highFilter.current) return;

    // Gain (Trim)
    // BOOSTED: Input is 0-100.
    // Previous Max: 2.0x (+6dB)
    // New Max: 5.0x (+14dB approx) to fix "low sound" issue
    trimNode.current.gain.value = eq.gain / 100 * 5.0;

    // EQ Gains (Input 0-100, Center 50. Map to -20dB to +20dB)
    const mapEq = (val: number) => (val - 50) * 0.8; 

    lowFilter.current.gain.value = mapEq(eq.low);
    midFilter.current.gain.value = mapEq(eq.mid);
    highFilter.current.gain.value = mapEq(eq.high);
  };

  // Update Volume (Fader)
  const updateVolume = (vol: number) => {
    // When using MediaElementAudioSourceNode, the HTMLAudioElement's volume property is ignored.
    // We must control volume via a GainNode in the graph.
    if (faderNode.current) {
        // Map 0-100 to 0.0-1.0 linear gain
        // Using a slight curve can feel more natural, but linear is standard for web faders
        const gainValue = Math.max(0, Math.min(1, vol / 100));
        
        // Smooth transition to prevent clicking (de-zippering)
        const currentTime = audioContext?.currentTime || 0;
        faderNode.current.gain.cancelScheduledValues(currentTime);
        faderNode.current.gain.setTargetAtTime(gainValue, currentTime, 0.05);
    }
  };

  // Tempo/Pitch
  const updateTempo = (percent: number) => {
    if (audioRef.current) {
      // percent is e.g. 8 (meaning +8%)
      // rate = 1 + (8/100) = 1.08
      // Preserves pitch if browser supports it, but standard DJ CDJs change pitch with tempo (vinyl mode)
      // Browsers default to preserving pitch (time stretching) usually.
      // To simulate Vinyl mode (pitch changes with speed), we'd need preservesPitch=false
      audioRef.current.playbackRate = 1 + (percent / 100);
      if ((audioRef.current as any).preservesPitch !== undefined) {
          (audioRef.current as any).preservesPitch = false; 
      }
    }
  };

  // Time Update Listener
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onDurationChange = () => setDuration(el.duration);
    const onEnded = () => setCurrentTime(0); 

    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('durationchange', onDurationChange);
    el.addEventListener('ended', onEnded);

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('durationchange', onDurationChange);
      el.removeEventListener('ended', onEnded);
    };
  }, []);

  return {
    audioRef,
    togglePlay,
    updateEQ,
    updateVolume,
    updateTempo,
    currentTime,
    duration,
    initAudio
  };
};