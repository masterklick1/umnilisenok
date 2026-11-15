import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

export type PageLanguage = "ru" | "en";

export function pagePassages(text: string) {
  return (text.match(/[^.!?…]+[.!?…]*/g) ?? [text])
    .flatMap((sentence) => sentence.trim().match(/.{1,240}(?:\s|$)|\S+/gu) ?? [])
    .map((part) => part.trim())
    .filter(Boolean);
}

export async function createPageVoice(language: PageLanguage) {
  const matches = (voice: { lang: string; localService: boolean }) =>
    voice.localService && voice.lang.toLowerCase().split(/[-_]/)[0] === language;
  const locale = language === "ru" ? "ru-RU" : "en-US";

  if (Capacitor.isNativePlatform()) {
    const { voices } = await TextToSpeech.getSupportedVoices();
    const preferred = voices.findIndex((voice) => matches(voice) && voice.lang === locale);
    const voice = preferred >= 0 ? preferred : voices.findIndex(matches);
    if (voice < 0) return undefined;
    return {
      say: (text: string) => TextToSpeech.speak({ text, lang: voices[voice].lang, voice, rate: 0.85 }),
      stop: () => TextToSpeech.stop(),
    };
  }

  const synth = window.speechSynthesis;
  const voices = synth?.getVoices() ?? [];
  const voice = voices.find((entry) => matches(entry) && entry.lang === locale) ?? voices.find(matches);
  if (!voice) return undefined;
  return {
    say: (text: string) => new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.85;
      utterance.onend = () => resolve();
      utterance.onerror = () => reject(new Error("Speech failed"));
      synth.speak(utterance);
    }),
    stop: () => { synth.cancel(); },
  };
}
