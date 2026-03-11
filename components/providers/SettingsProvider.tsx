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
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
