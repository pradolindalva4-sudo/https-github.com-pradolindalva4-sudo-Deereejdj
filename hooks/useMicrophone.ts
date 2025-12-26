import { useState, useRef, useEffect, useCallback } from 'react';

export const useMicrophone = () => {
  const [isMicActive, setIsMicActive] = useState(false);
  
  // Audio Context & Stream Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Node Refs for parameter control
  const robotGainRef = useRef<GainNode | null>(null);
  const echoGainRef = useRef<GainNode | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // State for UI Sliders
  const [robotLevel, setRobotLevelState] = useState(0);
  const [echoLevel, setEchoLevelState] = useState(0);

  // Parameter Setters
  const setRobotLevel = (val: number) => {
      setRobotLevelState(val);
      if (robotGainRef.current) {
          // Map 0-100 to 0.0-1.0
          // Smoother transition to prevent clicking
          robotGainRef.current.gain.setTargetAtTime(val / 100, audioContextRef.current?.currentTime || 0, 0.1);
      }
  };

  const setEchoLevel = (val: number) => {
      setEchoLevelState(val);
      if (echoGainRef.current) {
          // Map 0-100 to 0.0-1.0
          echoGainRef.current.gain.setTargetAtTime(val / 100, audioContextRef.current?.currentTime || 0, 0.1);
      }
  };

  const toggleMic = useCallback(async () => {
    if (isMicActive) {
      // --- TURN OFF ---
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (oscillatorRef.current) {
          try { oscillatorRef.current.stop(); } catch(e) {}
          oscillatorRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setIsMicActive(false);
    } else {
      // --- TURN ON ---
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
                // CRITICAL FIX: Enable Echo Cancellation and Noise Suppression to stop feedback loop (Zumbido)
                echoCancellation: true, 
                noiseSuppression: true, 
                autoGainControl: false, // Turn off AGC to prevent breathing noise
                latency: 0
            } as any
        });
        
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        audioContextRef.current = ctx;
        
        // Master Compressor to prevent clipping/feedback spikes
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        
        // MAKEUP GAIN: Boost the signal after compression because it gets squashed
        const makeupGain = ctx.createGain();
        makeupGain.gain.value = 3.0; // Boost mic volume by 3x

        // Connect Chain: Compressor -> MakeupGain -> Speakers
        compressor.connect(makeupGain);
        makeupGain.connect(ctx.destination);

        const source = ctx.createMediaStreamSource(stream);
        
        // 1. DRY SIGNAL (Normal Voice)
        const dryGain = ctx.createGain();
        dryGain.gain.value = 1.0;
        source.connect(dryGain);
        dryGain.connect(compressor); 

        // 2. ROBOT EFFECT (Ring Modulator - Refined)
        // Source -> RingModGain (Modulated by Oscillator) -> RobotLevelGain -> Compressor
        const ringModGain = ctx.createGain();
        ringModGain.gain.value = 0; 

        const oscillator = ctx.createOscillator();
        oscillator.type = 'sine';
        // Changed frequency to 30Hz for a cleaner "tremolo/robot" sound, 50Hz+ causes hum
        oscillator.frequency.value = 30; 
        oscillator.start();
        oscillatorRef.current = oscillator;

        oscillator.connect(ringModGain.gain);

        const robotOutGain = ctx.createGain();
        robotOutGain.gain.value = robotLevel / 100;
        robotGainRef.current = robotOutGain;

        source.connect(ringModGain);
        ringModGain.connect(robotOutGain);
        robotOutGain.connect(compressor);

        // 3. ECHO EFFECT (Delay)
        // Source -> Delay -> Feedback -> Delay
        //                -> EchoOutGain -> Compressor
        const delayNode = ctx.createDelay();
        delayNode.delayTime.value = 0.3; // 300ms delay (Stadium style)

        const feedbackGain = ctx.createGain();
        feedbackGain.gain.value = 0.3; // Lower feedback to prevent buildup

        const echoOutGain = ctx.createGain();
        echoOutGain.gain.value = echoLevel / 100;
        echoGainRef.current = echoOutGain;

        // Highpass filter on delay to remove muddy lows from the echo
        const echoFilter = ctx.createBiquadFilter();
        echoFilter.type = 'highpass';
        echoFilter.frequency.value = 500;

        source.connect(delayNode);
        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode); // Loop
        
        delayNode.connect(echoFilter);
        echoFilter.connect(echoOutGain);
        echoOutGain.connect(compressor);
        
        streamRef.current = stream;
        setIsMicActive(true);

      } catch (error) {
        console.error("Microphone access denied or error:", error);
        alert("Erro ao acessar microfone. O 'zumbido' pode ser causado por falta de permissão ou hardware.");
        setIsMicActive(false);
      }
    }
  }, [isMicActive, robotLevel, echoLevel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (oscillatorRef.current) {
          try { oscillatorRef.current.stop(); } catch(e) {}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { 
      isMicActive, 
      toggleMic,
      robotLevel,
      setRobotLevel,
      echoLevel,
      setEchoLevel
  };
};