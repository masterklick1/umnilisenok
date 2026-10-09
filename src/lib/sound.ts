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
let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

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
      const voices = window.speechSynthesis.getVoices();
      if (voices.length || tries > 20) {
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
  voices.find((v) => v.lang?.toLowerCase().replace('_', '-').startsWith("ru")) ||
  voices.find((v) => v.name?.toLowerCase().includes("russ")) ||
  null;

const doSpeakWeb = (text: string, voices: SpeechSynthesisVoice[]) => {
  const synth = window.speechSynthesis;

  if (pendingTimeout !== null) {
    clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }

  try {
    synth.cancel();
    if (synth.paused) {
      synth.resume();
    }
  } catch {
    /* игнорируем */
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ru-RU";
  utterance.rate = 0.85;
  utterance.volume = 1;
  
  const voice = pickRussianVoice(voices);
  if (voice) utterance.voice = voice;

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

  // Нативная озвучка для Android / iOS через Capacitor
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
      return;
    } catch (error) {
      console.warn('Ошибка нативного TTS, переключаемся на Web TTS:', error);
    }
  }

  // Озвучка для Браузера (Web / Fallback)
  if (!hasTTS()) return;

  const currentVoices = window.speechSynthesis.getVoices();
  if (voicesReady || currentVoices.length > 0) {
    doSpeakWeb(text, currentVoices);
    return;
  }

  loadVoices().then((voices) => doSpeakWeb(text, voices));
};

const pickEnglishVoice = (voices: SpeechSynthesisVoice[]) =>
  voices.find((v) => v.lang?.toLowerCase().replace("_", "-") === "en-us") ||
  voices.find((v) => v.lang?.toLowerCase().replace("_", "-").startsWith("en")) ||
  null;

const doSpeakWebEnglish = (text: string, voices: SpeechSynthesisVoice[], rate: number) => {
  const synth = window.speechSynthesis;
  if (pendingTimeout !== null) {
    clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }
  try {
    synth.cancel();
    if (synth.paused) synth.resume();
  } catch {
    /* игнорируем */
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;
  utterance.volume = 1;
  const voice = pickEnglishVoice(voices);
  if (voice) utterance.voice = voice;
  pendingTimeout = setTimeout(() => {
    try {
      synth.speak(utterance);
    } catch {
      /* игнорируем */
    }
    pendingTimeout = null;
  }, 50);
};

let nativeEnglishLang: string | null = null;

/**
 * Озвучка английских слов. На Android/iOS — нативный голос телефона
 * (WebView в APK не поддерживает window.speechSynthesis), в браузере — Web Speech.
 */
export const speakEnglish = async (text: string, rate = 0.8): Promise<void> => {
  if (!text || !isSoundEnabled()) return;

  if (Capacitor.isNativePlatform()) {
    try {
      await TextToSpeech.stop();
    } catch {
      /* игнорируем */
    }
    const candidates = nativeEnglishLang
      ? [nativeEnglishLang]
      : ["en-US", "en-GB", "en"];
    for (const lang of candidates) {
      try {
        await TextToSpeech.speak({
          text,
          lang,
          rate: Math.min(1, rate + 0.1),
          pitch: 1.0,
          volume: 1.0,
          category: "ambient",
        });
        nativeEnglishLang = lang;
        return;
      } catch (error) {
        console.warn(`Native TTS (${lang}) failed:`, error);
      }
    }
    // Последняя попытка — системный голос по умолчанию без указания языка
    try {
      await TextToSpeech.speak({ text, rate: Math.min(1, rate + 0.1), volume: 1.0, category: "ambient" });
      return;
    } catch (error) {
      console.warn("Native TTS default voice failed:", error);
    }
  }

  if (!hasTTS()) return;
  const currentVoices = window.speechSynthesis.getVoices();
  if (voicesReady || currentVoices.length > 0) {
    doSpeakWebEnglish(text, currentVoices, rate);
    return;
  }
  loadVoices().then((voices) => doSpeakWebEnglish(text, voices, rate));
};

export const stopSpeech = async (): Promise<void> => {
  if (pendingTimeout !== null) {
    clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }

  try {
    if (Capacitor.isNativePlatform()) {
      await TextToSpeech.stop();
    }
    if (hasTTS()) {
      window.speechSynthesis.cancel();
    }
  } catch (error) {
    console.error('Ошибка остановки речи:', error);
  }
};
