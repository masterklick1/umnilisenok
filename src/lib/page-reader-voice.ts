import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { loadVoices } from "@/lib/sound";

export type PageLanguage = "ru" | "en";

export const pageVoiceSamples: Record<PageLanguage, string> = {
  ru: "Однажды утром лисёнок выглянул из норы. «Вот это снег!» — удивился он. Скоро весь лес проснётся, а пока слышно только, как ветер шуршит в ветвях.",
  en: "One morning, a little fox peeked out of his den. “Look at all that snow!” he said. Soon the forest would wake up, but for now he could only hear the wind in the trees.",
};

export function pagePassages(text: string, limit: number) {
  const passages: string[] = [];
  for (const paragraph of text.split(/\n\s*\n/)) {
    let rest = paragraph.replace(/\s+/g, " ").trim();
    while (rest.length > limit) {
      const prefix = rest.slice(0, limit + 1);
      const sentenceEnd = [...prefix.matchAll(/[.!?…]+[»”"’')]*\s/g)].pop();
      const boundary = sentenceEnd ? (sentenceEnd.index ?? 0) + sentenceEnd[0].length : 0;
      const space = prefix.lastIndexOf(" ");
      const split = boundary >= limit / 2 ? boundary : space > 0 ? space : limit;
      passages.push(rest.slice(0, split).trim());
      rest = rest.slice(split).trimStart();
    }
    if (rest) passages.push(rest);
  }
  return passages;
}

async function availableVoices(language: PageLanguage, native: boolean) {
  const voices = native ? (await TextToSpeech.getSupportedVoices()).voices : await loadVoices();
  const locale = language === "ru" ? "ru-ru" : "en-us";
  const tag = (lang: string) => lang.toLowerCase().replace(/_/g, "-");
  return voices
    .map((voice, index) => ({ voice, index }))
    .filter(({ voice }) => voice.localService && tag(voice.lang).split("-")[0] === language)
    .sort((a, b) => Number(b.voice.default) - Number(a.voice.default)
      || Number(tag(b.voice.lang) === locale) - Number(tag(a.voice.lang) === locale));
}

export async function getPageVoiceChoices(language: PageLanguage) {
  const voices = await availableVoices(language, Capacitor.isNativePlatform());
  return voices.map(({ voice }) => ({ id: voice.voiceURI, lang: voice.lang }));
}

export async function createPageVoice(language: PageLanguage, selectedVoice: string) {
  const native = Capacitor.isNativePlatform();
  const voices = await availableVoices(language, native);
  const selected = voices.find(({ voice }) => voice.voiceURI === selectedVoice) ?? voices[0];
  if (!selected) return undefined;

  const { voice, index } = selected;
  const rate = 0.9;

  if (native) {
    return {
      passageLimit: 450,
      say: (text: string) => TextToSpeech.speak({ text, lang: voice.lang, voice: index, rate, pitch: 1, volume: 1, category: "ambient" }),
      stop: () => TextToSpeech.stop(),
    };
  }

  const synth = window.speechSynthesis;
  return {
    passageLimit: 220,
    say: (text: string) => new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = rate;
      utterance.onend = () => resolve();
      utterance.onerror = () => reject(new Error("Speech failed"));
      synth.speak(utterance);
    }),
    stop: () => { synth.cancel(); },
  };
}
