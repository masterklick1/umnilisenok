export const SOUND_KEY = "settings.soundEnabled";

export const isSoundEnabled = (): boolean => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SOUND_KEY) !== "false";
};

const hasTTS = () =>
  typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

let voicesReady = false;
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

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
    // некоторые движки (Android WebView) не шлют событие — опрашиваем сами
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

// Прогреваем список голосов заранее, чтобы первое нажатие уже звучало
if (hasTTS()) {
  loadVoices();
}

const pickRussianVoice = (voices: SpeechSynthesisVoice[]) =>
  voices.find((v) => v.lang?.toLowerCase().startsWith("ru")) ||
  voices.find((v) => v.name?.toLowerCase().includes("russ")) ||
  null;

const doSpeak = (text: string, voices: SpeechSynthesisVoice[]) => {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ru-RU";
  utterance.rate = 0.85;
  utterance.volume = 1;
  const voice = pickRussianVoice(voices);
  if (voice) utterance.voice = voice;

  try {
    synth.cancel();
  } catch {
    /* игнорируем */
  }
  // Chrome/Android иногда остаётся в состоянии paused
  try {
    synth.resume();
  } catch {
    /* игнорируем */
  }
  // небольшая задержка после cancel(), иначе речь молча проглатывается
  setTimeout(() => {
    try {
      synth.speak(utterance);
    } catch {
      /* игнорируем */
    }
  }, 60);
};

export const speak = (text: string) => {
  if (!text || !isSoundEnabled() || !hasTTS()) return;
  if (voicesReady) {
    doSpeak(text, window.speechSynthesis.getVoices());
    return;
  }
  loadVoices().then((voices) => doSpeak(text, voices));
};
