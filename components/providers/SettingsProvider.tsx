'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsContextType {
  sfxEnabled: boolean;
  setSfxEnabled: (v: boolean) => void;
  sfxVolume: number;
  setSfxVolume: (v: number) => void;
  typingSfxEnabled: boolean;
  setTypingSfxEnabled: (v: boolean) => void;
  bgmEnabled: boolean;
  setBgmEnabled: (v: boolean) => void;
  bgmVolume: number;
  setBgmVolume: (v: number) => void;
  textSpeed: number;
  setTextSpeed: (v: number) => void;
  showTimestamps: boolean;
  setShowTimestamps: (v: boolean) => void;
  playHover: () => void;
  playClick: () => void;
  playTransition: () => void;
  playTyping: () => void;
  playVoiceLine: (type?: 'CAT' | 'ANIME') => void;
}

const defaultSettings: SettingsContextType = {
  sfxEnabled: true,
  setSfxEnabled: () => {},
  sfxVolume: 55,
  setSfxVolume: () => {},
  typingSfxEnabled: true,
  setTypingSfxEnabled: () => {},
  bgmEnabled: true,
  setBgmEnabled: () => {},
  bgmVolume: 25,
  setBgmVolume: () => {},
  textSpeed: 30, // 30ms default interval
  setTextSpeed: () => {},
  showTimestamps: false,
  setShowTimestamps: () => {},
  playHover: () => {},
  playClick: () => {},
  playTransition: () => {},
  playTyping: () => {},
  playVoiceLine: () => {},
};

const SettingsContext = createContext<SettingsContextType>(defaultSettings);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [sfxVolume, setSfxVolume] = useState(55);
  const [typingSfxEnabled, setTypingSfxEnabled] = useState(true);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [bgmVolume, setBgmVolume] = useState(25);
  const [textSpeed, setTextSpeed] = useState(30);
  const [showTimestamps, setShowTimestamps] = useState(false);

  const [bgmAudio, setBgmAudio] = useState<HTMLAudioElement | null>(null);
  const [hoverAudio, setHoverAudio] = useState<HTMLAudioElement | null>(null);
  const [clickAudio, setClickAudio] = useState<HTMLAudioElement | null>(null);
  const [transitionAudio, setTransitionAudio] = useState<HTMLAudioElement | null>(null);
  const [typingAudio, setTypingAudio] = useState<HTMLAudioElement | null>(null);
  const [animeVoices, setAnimeVoices] = useState<HTMLAudioElement[]>([]);
  const [catVoice, setCatVoice] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Only run in the browser
    if (typeof window !== 'undefined') {
      const bgm = new Audio('https://actions.google.com/sounds/v1/science_fiction/dark_space_drone.ogg');
      bgm.loop = true;
      setBgmAudio(bgm);
      
      setHoverAudio(new Audio('https://raw.githubusercontent.com/KenneyNL/Audio-UI/master/Audio/rollover2.ogg'));
      setClickAudio(new Audio('https://raw.githubusercontent.com/KenneyNL/Audio-UI/master/Audio/click1.ogg'));
      setTransitionAudio(new Audio('https://raw.githubusercontent.com/KenneyNL/Audio-UI/master/Audio/switch2.ogg'));
      setTypingAudio(new Audio('https://raw.githubusercontent.com/KenneyNL/Audio-UI/master/Audio/click4.ogg'));
      
      // External links for Anime Voices (Using generic CC0 chirps as placeholders since exact voice direct-links vary)
      const voices = [
        'https://raw.githubusercontent.com/KenneyNL/Audio-UI/master/Audio/maximize_004.ogg', 
        'https://raw.githubusercontent.com/KenneyNL/Audio-UI/master/Audio/minimize_004.ogg'
      ];
      setAnimeVoices(voices.map(v => new Audio(v)));
      // External link for cat meow placeholder
      setCatVoice(new Audio('https://actions.google.com/sounds/v1/animals/cat_purr_close.ogg'));
    }
  }, []);

  useEffect(() => {
    if (bgmAudio) {
      if (bgmEnabled) {
        bgmAudio.play().catch(e => console.warn("Autoplay prevented:", e));
      } else {
        bgmAudio.pause();
      }
      bgmAudio.volume = bgmVolume / 100;
    }
  }, [bgmAudio, bgmEnabled, bgmVolume]);

  const playHover = () => {
    if (sfxEnabled && hoverAudio) {
      hoverAudio.currentTime = 0;
      hoverAudio.volume = sfxVolume / 100;
      hoverAudio.play().catch(() => {});
    }
  };

  const playClick = () => {
    if (sfxEnabled && clickAudio) {
      clickAudio.currentTime = 0;
      clickAudio.volume = sfxVolume / 100;
      clickAudio.play().catch(() => {});
    }
  };

  const playTransition = () => {
    if (sfxEnabled && transitionAudio) {
      transitionAudio.currentTime = 0;
      transitionAudio.volume = sfxVolume / 100;
      transitionAudio.play().catch(() => {});
    }
  };

  const playTyping = () => {
    if (typingSfxEnabled && sfxEnabled && typingAudio) {
      const clone = typingAudio.cloneNode() as HTMLAudioElement;
      clone.volume = Math.max(0, (sfxVolume / 100) * 0.3); 
      clone.play().catch(() => {});
    }
  };

  const playVoiceLine = (type?: 'CAT' | 'ANIME') => {
    if (sfxEnabled) {
      let sourceAudio: HTMLAudioElement | null = null;
      if (type === 'CAT' && catVoice) {
        sourceAudio = catVoice;
      } else if (type === 'ANIME' && animeVoices.length > 0) {
        sourceAudio = animeVoices[Math.floor(Math.random() * animeVoices.length)];
      }

      if (sourceAudio) {
        const clone = sourceAudio.cloneNode() as HTMLAudioElement;
        clone.volume = Math.max(0, (sfxVolume / 100) * 0.8);
        clone.play().catch(() => {});
      }
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        sfxEnabled, setSfxEnabled,
        sfxVolume, setSfxVolume,
        typingSfxEnabled, setTypingSfxEnabled,
        bgmEnabled, setBgmEnabled,
        bgmVolume, setBgmVolume,
        textSpeed, setTextSpeed,
        showTimestamps, setShowTimestamps,
        playHover, playClick, playTransition, playTyping, playVoiceLine
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
