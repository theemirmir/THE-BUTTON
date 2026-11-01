(function () {
  "use strict";

  let ctx = null;
  let master = null;
  let ambientGain = null;
  let musicGain = null;
  let sfxGain = null;
  let muted = false;
  let started = false;
  let titleNodes = [];
  let factoryNodes = [];
  let padNodes = [];
  let ambienceMode = "off"; // off | title | factory
  let flickerTimer = null;
  let melodyTimer = null;
  let chordTimer = null;
  let breathTimer = null;
  let musicFxReady = false;

  // Cold / hollow eerie palette (A Phrygian-ish + tritones)
  const ROOT = 55;
  const PAD_CHORDSETS = [
    [ROOT, ROOT * 1.189, ROOT * 1.498], // dark minor-ish
    [ROOT * 0.944, ROOT * 1.122, ROOT * 1.682], // uneasy cluster
    [ROOT, ROOT * 1.414, ROOT * 1.888], // tritone color
    [ROOT * 1.059, ROOT * 1.335, ROOT * 1.782], // sinking
  ];
  const MELODY = [
    220, 233.08, 261.63, 277.18, 311.13, 329.63, 349.23, 369.99, 415.3,
  ];

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);

    ambientGain = ctx.createGain();
    ambientGain.gain.value = 0.7;
    ambientGain.connect(master);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.0;

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.85;
    sfxGain.connect(master);
    return ctx;
  }

  function ensureMusicFx() {
    if (musicFxReady || !ctx || !musicGain || !ambientGain) return;
    // Soft echo chamber for cavernous feel (kept alive across scenes)
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.48;
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.42;
    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = "lowpass";
    delayFilter.frequency.value = 1400;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    const dry = ctx.createGain();
    dry.gain.value = 0.72;

    musicGain.connect(dry);
    dry.connect(ambientGain);
    musicGain.connect(delay);
    delay.connect(delayFilter);
    delayFilter.connect(wet);
    wet.connect(ambientGain);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delay);
    musicFxReady = true;
  }

  function resume() {
    const c = ensure();
    if (!c) return null;
    if (c.state === "suspended") c.resume();
    started = true;
    return c;
  }

  function now() {
    return ctx ? ctx.currentTime : 0;
  }

  function noiseBuffer(seconds) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(1, len, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function envGain(peak, attack, hold, release, dest) {
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(dest || sfxGain);
    const t = now();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    return g;
  }

  function tone(freq, type, peak, attack, hold, release, detune) {
    if (!resume()) return;
    const osc = ctx.createOscillator();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    const g = envGain(peak, attack, hold, release);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = Math.max(400, freq * 4);
    osc.connect(filter);
    filter.connect(g);
    osc.start();
    osc.stop(now() + attack + hold + release + 0.05);
  }

  function stopNodes(list) {
    list.forEach(function (node) {
      try {
        if (node.frequency && node.stop) node.stop();
        else if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (err) {
        /* already stopped */
      }
    });
    list.length = 0;
  }

  function clearTimers() {
    if (flickerTimer) {
      clearInterval(flickerTimer);
      flickerTimer = null;
    }
    if (melodyTimer) {
      clearTimeout(melodyTimer);
      melodyTimer = null;
    }
    if (chordTimer) {
      clearTimeout(chordTimer);
      chordTimer = null;
    }
    if (breathTimer) {
      clearInterval(breathTimer);
      breathTimer = null;
    }
  }

  function fadeMusicIn(level, seconds) {
    if (!musicGain) return;
    const t = now();
    musicGain.gain.cancelScheduledValues(t);
    musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), t);
    musicGain.gain.linearRampToValueAtTime(level, t + seconds);
  }

  function createPadVoice(freq, type, gainLevel, dest) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const detuneOsc = ctx.createOscillator();
    detuneOsc.type = type === "sawtooth" ? "triangle" : "sine";
    detuneOsc.frequency.value = freq * 1.002;
    const g = ctx.createGain();
    g.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.7;
    osc.connect(filter);
    detuneOsc.connect(filter);
    filter.connect(g);
    g.connect(dest);
    const t = now();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gainLevel, t + 2.8);
    osc.start();
    detuneOsc.start();
    return { osc: osc, detuneOsc: detuneOsc, g: g, filter: filter };
  }

  function startMusicBed(intensity) {
    // intensity: lower = title (colder), higher = factory (heavier)
    ensureMusicFx();

    const bed = ctx.createGain();
    bed.gain.value = 1;
    bed.connect(musicGain);

    const voices = [];
    const chord = PAD_CHORDSETS[0];
    chord.forEach(function (freq, i) {
      const voice = createPadVoice(
        freq,
        i === 0 ? "sine" : i === 1 ? "triangle" : "sawtooth",
        (i === 0 ? 0.11 : 0.045) * (0.85 + intensity * 0.25),
        bed
      );
      voices.push(voice);
      padNodes.push(voice.osc, voice.detuneOsc, voice.g, voice.filter);
    });
    padNodes.push(bed);

    // Sub heartbeat — slow dread pulse
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = intensity > 0.5 ? 36 : 41;
    const subGain = ctx.createGain();
    const subLfo = ctx.createOscillator();
    subLfo.frequency.value = intensity > 0.5 ? 0.08 : 0.055;
    const subLfoDepth = ctx.createGain();
    subLfoDepth.gain.value = intensity > 0.5 ? 0.14 : 0.09;
    sub.connect(subGain);
    subGain.connect(musicGain);
    subLfo.connect(subLfoDepth);
    subLfoDepth.connect(subGain.gain);
    sub.start();
    subLfo.start();
    subGain.gain.value = intensity > 0.5 ? 0.1 : 0.07;
    padNodes.push(sub, subGain, subLfo, subLfoDepth);

    // High ghost whistle (barely there)
    const ghost = ctx.createOscillator();
    ghost.type = "sine";
    ghost.frequency.value = 1480;
    const ghostGain = ctx.createGain();
    ghostGain.gain.value = 0.012 + intensity * 0.008;
    const ghostLfo = ctx.createOscillator();
    ghostLfo.frequency.value = 0.04;
    const ghostDepth = ctx.createGain();
    ghostDepth.gain.value = 18;
    ghostLfo.connect(ghostDepth);
    ghostDepth.connect(ghost.frequency);
    ghost.connect(ghostGain);
    ghostGain.connect(musicGain);
    ghost.start();
    ghostLfo.start();
    padNodes.push(ghost, ghostGain, ghostLfo, ghostDepth);

    // Slowly morph pad chord
    let chordIndex = 0;
    function nextChord() {
      if (ambienceMode === "off" || muted) return;
      chordIndex = (chordIndex + 1) % PAD_CHORDSETS.length;
      const next = PAD_CHORDSETS[chordIndex];
      const t = now();
      voices.forEach(function (voice, i) {
        if (!next[i]) return;
        voice.osc.frequency.cancelScheduledValues(t);
        voice.detuneOsc.frequency.cancelScheduledValues(t);
        voice.osc.frequency.setValueAtTime(voice.osc.frequency.value, t);
        voice.detuneOsc.frequency.setValueAtTime(
          voice.detuneOsc.frequency.value,
          t
        );
        voice.osc.frequency.linearRampToValueAtTime(next[i], t + 5.5);
        voice.detuneOsc.frequency.linearRampToValueAtTime(
          next[i] * 1.002,
          t + 5.5
        );
        voice.filter.frequency.linearRampToValueAtTime(
          280 + Math.random() * 320,
          t + 5.5
        );
      });
      chordTimer = setTimeout(nextChord, 9000 + Math.random() * 5000);
    }
    chordTimer = setTimeout(nextChord, 7000);

    // Sparse mournful melody
    function scheduleMelody() {
      if (ambienceMode === "off" || muted) return;
      const note = MELODY[(Math.random() * MELODY.length) | 0];
      const harm = note * (Math.random() > 0.55 ? 1.498 : 1.414);
      playMelodyNote(note, 0.045 + intensity * 0.02);
      if (Math.random() > 0.55) {
        setTimeout(function () {
          if (ambienceMode === "off") return;
          playMelodyNote(harm, 0.025 + intensity * 0.015);
        }, 180 + Math.random() * 400);
      }
      const wait = 2200 + Math.random() * 4200;
      melodyTimer = setTimeout(scheduleMelody, wait);
    }
    melodyTimer = setTimeout(scheduleMelody, 1800 + Math.random() * 1500);

    // Breathing swell on music bed
    breathTimer = setInterval(function () {
      if (!musicGain || muted || ambienceMode === "off") return;
      const t = now();
      const base = intensity > 0.5 ? 0.62 : 0.48;
      const swell = base + (Math.random() * 0.08 - 0.02);
      musicGain.gain.cancelScheduledValues(t);
      musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), t);
      musicGain.gain.linearRampToValueAtTime(swell, t + 2.2);
    }, 4800);

    fadeMusicIn(intensity > 0.5 ? 0.62 : 0.48, 3.2);
  }

  function playMelodyNote(freq, peak) {
    if (!resume() || !musicGain) return;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = freq * 0.995;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.value = 0;
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(g);
    g.connect(musicGain);
    const t = now();
    const dur = 1.8 + Math.random() * 1.4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t);
    osc2.start(t);
    osc.stop(t + dur + 0.1);
    osc2.stop(t + dur + 0.1);
  }

  function stopMusicBed() {
    clearTimers();
    if (musicGain) {
      const t = now();
      musicGain.gain.cancelScheduledValues(t);
      musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), t);
      musicGain.gain.linearRampToValueAtTime(0.0001, t + 1.2);
    }
    const toStop = padNodes.slice();
    padNodes.length = 0;
    setTimeout(function () {
      toStop.forEach(function (node) {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (err) {
          /* ignore */
        }
      });
    }, 1300);
  }

  function startTitleAmbience() {
    if (!resume() || ambienceMode === "title") return;
    stopNodes(factoryNodes);
    stopNodes(titleNodes);
    stopMusicBed();
    clearTimers();
    ambienceMode = "title";

    // Quiet room tone under the score
    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 46;
    const drone2 = ctx.createOscillator();
    drone2.type = "triangle";
    drone2.frequency.value = 69.5;
    const hum = ctx.createGain();
    hum.gain.value = 0.07;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 160;
    drone.connect(filter);
    drone2.connect(filter);
    filter.connect(hum);
    hum.connect(ambientGain);
    drone.start();
    drone2.start();
    titleNodes.push(drone, drone2, hum, filter);

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(2);
    noise.loop = true;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = "bandpass";
    nFilter.frequency.value = 700;
    nFilter.Q.value = 0.5;
    const nGain = ctx.createGain();
    nGain.gain.value = 0.012;
    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(ambientGain);
    noise.start();
    titleNodes.push(noise, nFilter, nGain);

    startMusicBed(0.25);

    flickerTimer = setInterval(function () {
      if (muted || ambienceMode !== "title") return;
      if (Math.random() > 0.6) distantTick();
    }, 3200);
  }

  function startFactoryAmbience() {
    if (!resume() || ambienceMode === "factory") return;
    stopNodes(titleNodes);
    stopNodes(factoryNodes);
    stopMusicBed();
    clearTimers();
    ambienceMode = "factory";

    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = 32;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.1;
    sub.connect(subGain);
    subGain.connect(ambientGain);
    sub.start();
    factoryNodes.push(sub, subGain);

    const buzz = ctx.createOscillator();
    buzz.type = "sawtooth";
    buzz.frequency.value = 118;
    const buzzFilter = ctx.createBiquadFilter();
    buzzFilter.type = "bandpass";
    buzzFilter.frequency.value = 220;
    buzzFilter.Q.value = 9;
    const buzzGain = ctx.createGain();
    buzzGain.gain.value = 0.018;
    buzz.connect(buzzFilter);
    buzzFilter.connect(buzzGain);
    buzzGain.connect(ambientGain);
    buzz.start();
    factoryNodes.push(buzz, buzzFilter, buzzGain);

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(3);
    noise.loop = true;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = "lowpass";
    nFilter.frequency.value = 650;
    const nGain = ctx.createGain();
    nGain.gain.value = 0.022;
    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(ambientGain);
    noise.start();
    factoryNodes.push(noise, nFilter, nGain);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.01;
    lfo.connect(lfoGain);
    lfoGain.connect(buzzGain.gain);
    lfo.start();
    factoryNodes.push(lfo, lfoGain);

    startMusicBed(0.85);

    flickerTimer = setInterval(function () {
      if (muted || ambienceMode !== "factory") return;
      if (Math.random() > 0.45) pipeClank();
      if (Math.random() > 0.75) distantTick();
    }, 4500);
  }

  function distantTick() {
    if (!resume()) return;
    tone(880 + Math.random() * 220, "sine", 0.025, 0.001, 0.02, 0.25);
    setTimeout(function () {
      tone(220 + Math.random() * 40, "triangle", 0.035, 0.01, 0.05, 0.4);
    }, 40);
  }

  function pipeClank() {
    if (!resume()) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.15);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 180 + Math.random() * 120;
    filter.Q.value = 4;
    const g = envGain(0.07, 0.001, 0.02, 0.35);
    src.connect(filter);
    filter.connect(g);
    src.start();
  }

  function enterFactory() {
    if (!resume()) return;
    tone(90, "sine", 0.2, 0.05, 0.15, 0.8);
    tone(180, "triangle", 0.08, 0.08, 0.2, 1.0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.6);
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1200;
    const g = envGain(0.12, 0.02, 0.1, 0.55);
    src.connect(filter);
    filter.connect(g);
    src.start();
    startFactoryAmbience();
  }

  function buttonPress() {
    if (!resume()) return;
    tone(70, "sine", 0.28, 0.005, 0.04, 0.18);
    tone(140, "square", 0.06, 0.001, 0.02, 0.12);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.08);
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 2000;
    const g = envGain(0.1, 0.001, 0.01, 0.08);
    src.connect(filter);
    filter.connect(g);
    src.start();
  }

  function buttonRelease() {
    if (!resume()) return;
    tone(95, "sine", 0.08, 0.001, 0.02, 0.12);
  }

  function coin() {
    if (!resume()) return;
    tone(660, "sine", 0.12, 0.005, 0.05, 0.25);
    setTimeout(function () {
      tone(990, "triangle", 0.1, 0.005, 0.06, 0.35);
    }, 55);
    setTimeout(function () {
      tone(1320, "sine", 0.05, 0.005, 0.04, 0.45);
    }, 120);
  }

  function death() {
    if (!resume()) return;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now());
    osc.frequency.exponentialRampToValueAtTime(28, now() + 1.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now());
    g.gain.linearRampToValueAtTime(0.22, now() + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now() + 1.6);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, now());
    filter.frequency.exponentialRampToValueAtTime(120, now() + 1.4);
    osc.connect(filter);
    filter.connect(g);
    g.connect(sfxGain);
    osc.start();
    osc.stop(now() + 1.7);

    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(1.2);
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = "bandpass";
    nFilter.frequency.value = 1400;
    const nGain = envGain(0.2, 0.01, 0.25, 0.9);
    src.connect(nFilter);
    nFilter.connect(nGain);
    src.start();

    [0.15, 0.28, 0.38].forEach(function (delay, i) {
      setTimeout(function () {
        tone(440 - i * 90, "square", 0.07, 0.001, 0.03, 0.08);
      }, delay * 1000);
    });

    // Music collapses with you
    if (musicGain) {
      const t = now();
      musicGain.gain.cancelScheduledValues(t);
      musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), t);
      musicGain.gain.linearRampToValueAtTime(0.08, t + 1.2);
    }
    if (ambientGain) {
      const t = now();
      ambientGain.gain.cancelScheduledValues(t);
      ambientGain.gain.setValueAtTime(ambientGain.gain.value, t);
      ambientGain.gain.linearRampToValueAtTime(0.28, t + 0.9);
    }
  }

  function shopUnlock() {
    if (!resume()) return;
    const notes = [220, 277, 330, 440, 554];
    notes.forEach(function (f, i) {
      setTimeout(function () {
        tone(f, i % 2 ? "triangle" : "sine", 0.08, 0.01, 0.05, 0.2);
      }, i * 90);
    });
    setTimeout(function () {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.25);
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 2500;
      const g = envGain(0.07, 0.01, 0.05, 0.2);
      src.connect(filter);
      filter.connect(g);
      src.start();
    }, 480);
  }

  function upgrade() {
    if (!resume()) return;
    tone(320, "sine", 0.1, 0.01, 0.05, 0.2);
    setTimeout(function () {
      tone(480, "triangle", 0.1, 0.01, 0.06, 0.25);
    }, 70);
    setTimeout(function () {
      tone(720, "sine", 0.12, 0.01, 0.08, 0.4);
    }, 150);
  }

  function returnTitle() {
    if (!resume()) return;
    tone(180, "sine", 0.08, 0.02, 0.1, 0.5);
    if (ambientGain) {
      const t = now();
      ambientGain.gain.cancelScheduledValues(t);
      ambientGain.gain.setValueAtTime(Math.max(0.0001, ambientGain.gain.value), t);
      ambientGain.gain.linearRampToValueAtTime(0.7, t + 0.8);
    }
    startTitleAmbience();
  }

  function setMuted(next) {
    muted = !!next;
    if (!ensure()) return muted;
    master.gain.setTargetAtTime(muted ? 0 : 0.9, now(), 0.05);
    return muted;
  }

  function toggleMute() {
    return setMuted(!muted);
  }

  window.ButtonAudio = {
    unlock: resume,
    startTitle: startTitleAmbience,
    enterFactory: enterFactory,
    buttonPress: buttonPress,
    buttonRelease: buttonRelease,
    coin: coin,
    death: death,
    shopUnlock: shopUnlock,
    upgrade: upgrade,
    returnTitle: returnTitle,
    setMuted: setMuted,
    toggleMute: toggleMute,
    isMuted: function () {
      return muted;
    },
    isStarted: function () {
      return started;
    },
  };
})();
