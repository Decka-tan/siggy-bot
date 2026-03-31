'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { usePathname } from 'next/navigation';

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
  playHeavyClick: () => void;
  playTransition: () => void;
  playTyping: () => void;
  playVoiceLine: (type?: 'CAT' | 'ANIME') => void;
}

// localStorage key
const SETTINGS_KEY = 'siggy-settings';

// Default settings
const defaultSettings = {
  sfxEnabled: true,
  sfxVolume: 55,
  typingSfxEnabled: true,
  bgmEnabled: false, // Default OFF as user requested
  bgmVolume: 25,
  textSpeed: 0, // 0 = instant as user requested
  showTimestamps: false,
};

// Load settings from localStorage
function loadSettings() {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return defaultSettings;
}

// Save settings to localStorage
function saveSettings(settings: Record<string, any>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

const SettingsContext = createContext<SettingsContextType>({
  ...defaultSettings,
  setSfxEnabled: () => {},
  setSfxVolume: () => {},
  setTypingSfxEnabled: () => {},
  setBgmEnabled: () => {},
  setBgmVolume: () => {},
  setTextSpeed: () => {},
  setShowTimestamps: () => {},
  playHover: () => {},
  playClick: () => {},
  playHeavyClick: () => {},
  playTransition: () => {},
  playTyping: () => {},
  playVoiceLine: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Initialize from localStorage
  const [sfxEnabled, setSfxEnabledState] = useState(defaultSettings.sfxEnabled);
  const [sfxVolume, setSfxVolumeState] = useState(defaultSettings.sfxVolume);
  const [typingSfxEnabled, setTypingSfxEnabledState] = useState(defaultSettings.typingSfxEnabled);
  const [bgmEnabled, setBgmEnabledState] = useState(defaultSettings.bgmEnabled);
  const [bgmVolume, setBgmVolumeState] = useState(defaultSettings.bgmVolume);
  const [textSpeed, setTextSpeedState] = useState(defaultSettings.textSpeed);
  const [showTimestamps, setShowTimestampsState] = useState(defaultSettings.showTimestamps);

  // Load settings on mount
  useEffect(() => {
    const saved = loadSettings();
    setSfxEnabledState(saved.sfxEnabled);
    setSfxVolumeState(saved.sfxVolume);
    setTypingSfxEnabledState(saved.typingSfxEnabled);
    setBgmEnabledState(saved.bgmEnabled);
    setBgmVolumeState(saved.bgmVolume);
    setTextSpeedState(saved.textSpeed);
    setShowTimestampsState(saved.showTimestamps);
  }, []);

  // Wrapper functions that save to localStorage
  const setSfxEnabled = useCallback((value: boolean) => {
    setSfxEnabledState(value);
    saveSettings({ ...loadSettings(), sfxEnabled: value });
  }, []);

  const setSfxVolume = useCallback((value: number) => {
    setSfxVolumeState(value);
    saveSettings({ ...loadSettings(), sfxVolume: value });
  }, []);

  const setTypingSfxEnabled = useCallback((value: boolean) => {
    setTypingSfxEnabledState(value);
    saveSettings({ ...loadSettings(), typingSfxEnabled: value });
  }, []);

  const setBgmEnabled = useCallback((value: boolean) => {
    setBgmEnabledState(value);
    saveSettings({ ...loadSettings(), bgmEnabled: value });
  }, []);

  const setBgmVolume = useCallback((value: number) => {
    setBgmVolumeState(value);
    saveSettings({ ...loadSettings(), bgmVolume: value });
  }, []);

  const setTextSpeed = useCallback((value: number) => {
    setTextSpeedState(value);
    saveSettings({ ...loadSettings(), textSpeed: value });
  }, []);

  const setShowTimestamps = useCallback((value: boolean) => {
    setShowTimestampsState(value);
    saveSettings({ ...loadSettings(), showTimestamps: value });
  }, []);

  const [bgmAudio, setBgmAudio] = useState<HTMLAudioElement | null>(null);
  const [hoverAudio, setHoverAudio] = useState<HTMLAudioElement | null>(null);
  const [clickAudio, setClickAudio] = useState<HTMLAudioElement | null>(null);
  const [heavyClickAudio, setHeavyClickAudio] = useState<HTMLAudioElement | null>(null);
  const [transitionAudio, setTransitionAudio] = useState<HTMLAudioElement | null>(null);
  const [typingAudio, setTypingAudio] = useState<HTMLAudioElement | null>(null);
  const [animeVoices, setAnimeVoices] = useState<HTMLAudioElement[]>([]);
  const [catVoice, setCatVoice] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Only run in the browser
    if (typeof window !== 'undefined') {
      const bgm = new Audio('/BGM_VN_STORY_MODE.mp3');
      bgm.loop = true;
      setBgmAudio(bgm);
      
      setHoverAudio(new Audio('https://raw.githubusercontent.com/KenneyNL/Audio-UI/master/Audio/rollover2.ogg'));
      setClickAudio(new Audio('/Click_Sound_Light.mp3'));
      setHeavyClickAudio(new Audio('/Click_Sound_HEAVY.mp3'));
      setTransitionAudio(new Audio('https://raw.githubusercontent.com/KenneyNL/Audio-UI/master/Audio/switch2.ogg'));
      setTypingAudio(new Audio('https://raw.githubusercontent.com/KenneyNL/Audio-UI/master/Audio/click4.ogg'));
      
      const voices = ['/Click_Sound_Light.mp3'];
      setAnimeVoices(voices.map(v => new Audio(v)));
      setCatVoice(new Audio('/Click_Sound_Light.mp3'));
    }
  }, []);

  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const handleInitialInteract = () => {
      setHasInteracted(true);
      if (bgmAudio && bgmEnabled && pathname !== '/') {
         bgmAudio.play().catch(() => {});
      }
      document.removeEventListener('click', handleInitialInteract);
      document.removeEventListener('keydown', handleInitialInteract);
    };

    document.addEventListener('click', handleInitialInteract);
    document.addEventListener('keydown', handleInitialInteract);

    return () => {
      document.removeEventListener('click', handleInitialInteract);
      document.removeEventListener('keydown', handleInitialInteract);
    };
  }, [bgmAudio, bgmEnabled, pathname]);

  useEffect(() => {
    if (bgmAudio) {
      bgmAudio.volume = bgmVolume / 100;
      bgmAudio.loop = true;

      if (bgmEnabled && pathname !== '/') {
        if (hasInteracted) {
           bgmAudio.play().catch(() => {});
        }
      } else {
        bgmAudio.pause();
      }
    }
  }, [bgmAudio, bgmEnabled, bgmVolume, pathname, hasInteracted]);

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

  const playHeavyClick = () => {
    if (sfxEnabled && heavyClickAudio) {
      heavyClickAudio.currentTime = 0;
      heavyClickAudio.volume = sfxVolume / 100;
      heavyClickAudio.play().catch(() => {});
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
        playHover, playClick, playHeavyClick, playTransition, playTyping, playVoiceLine
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
