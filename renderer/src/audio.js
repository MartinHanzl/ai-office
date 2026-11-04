/** Chiptune sound effects (WebAudio). */
import { COMPACT } from './core/canvas.js';
import { state } from './state.js';

export let audio = null;

/** Plays a short chiptune phrase. Only the main window plays sounds (popover would double them). */
export function play(notes, { type = 'square', volume = 0.05, step = 0.12, length = 0.18 } = {}) {
  if (COMPACT || !state.soundOn) return;
  try {
    audio ??= new AudioContext();
    const t0 = audio.currentTime;
    notes.forEach((freq, i) => {
      const start = t0 + i * step;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
      osc.connect(gain).connect(audio.destination);
      osc.start(start);
      osc.stop(start + length + 0.02);
    });
  } catch { /* audio unavailable */ }
}


export const fanfare = () => play([523, 659, 784, 1047, 784, 1047], { type: 'triangle', volume: 0.07, step: 0.1, length: 0.22 });

export const pop = () => play([660, 990], { type: 'triangle', volume: 0.05, step: 0.07, length: 0.12 });

export const buzz = () => play([196, 147], { type: 'sawtooth', volume: 0.025, step: 0.14, length: 0.2 });

export const ding = () => play([880, 1320]);                                                 // needs permission

export const chime = () => play([523, 659, 784, 1047], { type: 'triangle', volume: 0.07, step: 0.09, length: 0.25 }); // task done
