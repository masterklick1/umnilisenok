import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';

export const SOUND_KEY = "settings.soundEnabled";

export const isSoundEnabled = (): boolean => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SOUND_KEY) !== "false";
};

const hasTTS = () =>
  typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

let voicesReady = false;
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;
let pendingTimeout: ReturnType<typeof setTimeout> | null = null; // Флаг отмены таймера

const loadVoices = (): Promise<SpeechSynthesisVoice[]> => {
  if (!hasTTS()) return Promise.resolve([]);
  const existing = window.speechSynthesis.getVoices();
  if (existing.length) {
    voicesReady = true;
    return Promise.resolve(existing);
  }
  if (voicesPromise) return voicesPromise;

  voicesPromise = new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      voicesReady = true;
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener?.("voiceschanged", finish, { once: true });
    
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (window.speechSynthesis.getVoices().length || tries > 20) {
        clearInterval(timer);
        finish();
      }
    }, 150);
  });
  return voicesPromise;
};

if (hasTTS()) {
  loadVoices();
}

const pickRussianVoice = (voices: SpeechSynthesisVoice[]) =>
  voices.find((v) => v.lang?.toLowerCase().startsWith("ru")) ||
  voices.find((v) => v.name?.toLowerCase().includes("russ")) ||
  null;

const doSpeakWeb = (text: string, voices: SpeechSynthesisVoice[]) => {
  const synth = window.speechSynthesis;

  // Отменяем запущенный ранее таймер, если он еще не успел сработать
  if (pendingTimeout !== null) {
    clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }

  // Сразу отменяем текущую речь
  try {
    synth.cancel();
  } catch {
    /* игнорируем */
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ru-RU";
  utterance.rate = 0.85;
  utterance.volume = 1;
  const voice = pickRussianVoice(voices);
  if (voice) utterance.voice = voice;

  try {
    synth.resume();
  } catch {
    /* игнорируем */
  }

  // Небольшая задержка для корректного сброса очереди в Chromium/Safari
  pendingTimeout = setTimeout(() => {
    try {
      synth.speak(utterance);
    } catch {
      /* игнорируем */
    }
    pendingTimeout = null;
  }, 50);
};

export const speak = async (text: string): Promise<void> => {
  if (!text || !isSoundEnabled()) return;

  // Нативная озвучка для Android / iOS (Capacitor)
  if (Capacitor.isNativePlatform()) {
    try {
      await TextToSpeech.stop();
      await TextToSpeech.speak({
        text,
        lang: 'ru-RU',
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient',
      });
    } catch (error) {
      console.error('Ошибка нативной речи Android:', error);
    }
    return;
  }

  // Озвучка для Браузера (Web)
  if (!hasTTS()) return;

  if (voicesReady) {
    doSpeakWeb(text, window.speechSynthesis.getVoices());
    return;
  }
  
  loadVoices().then((voices) => doSpeakWeb(text, voices));
};

export const stopSpeech = async (): Promise<void> => {
  if (pendingTimeout !== null) {
    clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }
  
  try {
    if (Capacitor.isNativePlatform()) {
      await TextToSpeech.stop();
    } else if (hasTTS()) {
      window.speechSynthesis.cancel();
    }
  } catch (error) {
    console.error('Ошибка остановки речи:', error);
  }
};
