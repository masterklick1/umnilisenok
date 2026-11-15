import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { ArrowLeft, Camera as CameraIcon, ImagePlus, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSoundEnabled, speak, stopSpeech } from "@/lib/sound";
import { createPageVoice, getPageVoiceChoices, pagePassages, pageVoiceSamples, type PageLanguage } from "@/lib/page-reader-voice";

const languageKey = "page-reader-language";
const voiceKey = (lang: PageLanguage) => `page-reader-voice-${lang}`;
const blurryMessage = "Не получилось прочитать страницу. Поднеси камеру ближе и попробуй ещё раз.";

function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function toPagePhoto(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 2400 / Math.max(width, height));
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context || !canvas.width || !canvas.height) throw new Error("Camera is not ready");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((photo) => photo ? resolve(photo) : reject(new Error("Capture failed")), "image/jpeg", 0.94);
  });
}

export default function PageReaderPage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<PageLanguage>(() => localStorage.getItem(languageKey) === "en" ? "en" : "ru");
  const [status, setStatus] = useState<"ready" | "opening" | "camera" | "scanning">("ready");
  const [cameraFallback, setCameraFallback] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [text, setText] = useState("");
  const [playing, setPlaying] = useState<"page" | "preview" | null>(null);
  const [voiceChoices, setVoiceChoices] = useState<Awaited<ReturnType<typeof getPageVoiceChoices>> | null>(null);
  const [paused, setPaused] = useState(false);
  const systemCameraOpen = useRef(false);
  const stream = useRef<MediaStream | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const imageInput = useRef<HTMLInputElement | null>(null);
  const operation = useRef<AbortController | null>(null);
  const playback = useRef<{ cancel: () => void } | null>(null);
  const position = useRef(0);
  const native = Capacitor.isNativePlatform();

  function closeCamera() {
    operation.current?.abort();
    stopCamera(stream.current);
    stream.current = null;
    setCameraReady(false);
    setStatus("ready");
  }

  function beginOperation() {
    operation.current?.abort();
    playback.current?.cancel();
    void stopSpeech();
    playback.current = null;
    setPlaying(null);
    setPaused(false);
    setMessage("");
    setText("");
    position.current = 0;
    const controller = new AbortController();
    operation.current = controller;
    return controller;
  }

  useEffect(() => {
    if (status === "camera" && video.current) video.current.srcObject = stream.current;
  }, [status]);

  useEffect(() => {
    const release = () => {
      if (document.hidden && !systemCameraOpen.current && (stream.current || status === "opening")) closeCamera();
    };
    document.addEventListener("visibilitychange", release);
    return () => document.removeEventListener("visibilitychange", release);
  }, [status]);

  useEffect(() => () => {
    operation.current?.abort();
    playback.current?.cancel();
    stopCamera(stream.current);
    void stopSpeech();
  }, []);

  useEffect(() => {
    let active = true;
    setVoiceChoices(null);
    async function refreshVoices() {
      const options = await getPageVoiceChoices(language).catch(() => []);
      if (active) setVoiceChoices(options);
    }
    const refreshOnReturn = () => {
      if (!document.hidden) void refreshVoices();
    };
    void refreshVoices();
    document.addEventListener("visibilitychange", refreshOnReturn);
    window.speechSynthesis?.addEventListener?.("voiceschanged", refreshOnReturn);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", refreshOnReturn);
      window.speechSynthesis?.removeEventListener?.("voiceschanged", refreshOnReturn);
    };
  }, [language]);

  function stopPlayback() {
    playback.current?.cancel();
    playback.current = null;
    setPlaying(null);
    if (playing === "page") setPaused(true);
  }

  async function readPage(content: string, fromStart = false, preview = false) {
    stopPlayback();
    if (fromStart) {
      position.current = 0;
      setPaused(false);
    }
    const controller = new AbortController();
    let voice: Awaited<ReturnType<typeof createPageVoice>>;
    const run = {
      cancel: () => {
        controller.abort();
        if (voice) void Promise.resolve(voice.stop()).catch(() => {});
      },
    };
    playback.current = run;
    const canceled = new Promise<false>((resolve) => {
      controller.signal.addEventListener("abort", () => resolve(false), { once: true });
    });
    setPlaying(preview ? "preview" : "page");
    setMessage("");
    try {
      voice = await createPageVoice(language, localStorage.getItem(voiceKey(language)) ?? "");
      if (controller.signal.aborted) return;
      if (!voice) {
        const name = language === "ru" ? "русский" : "английский";
        setMessage(`Скачай ${name} голос для чтения без интернета в настройках устройства.`);
        return;
      }
      const passages = pagePassages(content, voice.passageLimit);
      for (let index = preview ? 0 : position.current; index < passages.length; index += 1) {
        const finished = await Promise.race([voice.say(passages[index]).then(() => true), canceled]);
        if (!finished || controller.signal.aborted) return;
        if (!preview) position.current = index + 1;
      }
      if (!preview) {
        position.current = 0;
        setPaused(false);
      }
    } catch {
      if (!controller.signal.aborted) setMessage("Не удалось включить голос. Попробуй выбрать другой голос.");
    } finally {
      if (playback.current === run && !controller.signal.aborted) {
        playback.current = null;
        setPlaying(null);
      }
    }
  }

  async function scan(photo: Blob, controller: AbortController, resize = false) {
    if (controller.signal.aborted) return;
    setStatus("scanning");
    setProgress(0);
    const timeout = window.setTimeout(() => {
      if (controller.signal.aborted) return;
      controller.abort();
      setStatus("ready");
      setMessage("Распознавание заняло слишком много времени. Попробуй ещё раз.");
    }, 60_000);
    try {
      if (photo.size > 20 * 1024 * 1024) {
        setMessage("Фото слишком большое. Сделай новый снимок страницы.");
        return;
      }
      if (resize && typeof createImageBitmap === "function") {
        const bitmap = await createImageBitmap(photo);
        try {
          if (controller.signal.aborted) return;
          if (Math.max(bitmap.width, bitmap.height) > 2400) {
            photo = await toPagePhoto(bitmap, bitmap.width, bitmap.height);
          }
        } finally {
          bitmap.close();
        }
      }
      const { recognizePage } = await import("@/lib/page-ocr");
      const recognized = await recognizePage(photo, language, controller.signal, setProgress);
      if (controller.signal.aborted) return;
      if (recognized) {
        setText(recognized);
        if (isSoundEnabled()) void readPage(recognized, true);
      } else {
        setMessage(blurryMessage);
        void speak(blurryMessage);
      }
    } catch {
      if (!controller.signal.aborted) setMessage("Не удалось обработать фото. Попробуй снять страницу ещё раз.");
    } finally {
      clearTimeout(timeout);
      if (!controller.signal.aborted) setStatus("ready");
    }
  }

  async function openCamera() {
    const controller = beginOperation();
    setStatus("opening");
    try {
      const opened = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } },
        audio: false,
      });
      if (controller.signal.aborted) {
        stopCamera(opened);
        return;
      }
      stream.current = opened;
      setCameraFallback(false);
      setStatus("camera");
    } catch {
      if (controller.signal.aborted) return;
      setCameraFallback(true);
      setStatus("ready");
      setMessage(native ? "Открой камеру телефона или выбери фото." : "Камера недоступна. Проверь разрешение или выбери фото.");
    }
  }

  async function capture() {
    if (!video.current || !operation.current) return;
    const controller = operation.current;
    try {
      const photo = toPagePhoto(video.current, video.current.videoWidth, video.current.videoHeight);
      stopCamera(stream.current);
      stream.current = null;
      setCameraReady(false);
      setStatus("scanning");
      await scan(await photo, controller);
    } catch {
      if (!controller.signal.aborted) {
        closeCamera();
        setMessage("Не удалось сделать снимок. Открой камеру ещё раз.");
      }
    }
  }

  async function usePhoneCamera() {
    if (systemCameraOpen.current) return;
    systemCameraOpen.current = true;
    const controller = beginOperation();
    setStatus("opening");
    try {
      const photo = await Camera.takePhoto({
        quality: 94,
        targetWidth: 2400,
        targetHeight: 2400,
        correctOrientation: true,
        saveToGallery: false,
      });
      if (controller.signal.aborted) return;
      const url = photo.webPath ?? (photo.uri && Capacitor.convertFileSrc(photo.uri));
      if (!url) throw new Error("Photo unavailable");
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("Photo unavailable");
      await scan(await response.blob(), controller);
    } catch {
      if (!controller.signal.aborted) {
        setStatus("ready");
        setMessage("Камера закрылась. Попробуй ещё раз или выбери фото.");
      }
    } finally {
      systemCameraOpen.current = false;
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-background to-background p-4 dark:from-background">
      <div className="mx-auto max-w-xl space-y-5">
        <Button variant="ghost" onClick={() => navigate("/tales")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> К сказкам
        </Button>
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Лисёнок, прочитай мне</h1>
          <p className="text-muted-foreground">Сфотографируй страницу книги, и Лисёнок прочитает её вслух.</p>
        </div>

        <div role="group" aria-label="Язык страницы" className="grid grid-cols-2 gap-2">
          {(["ru", "en"] as const).map((choice) => (
            <Button key={choice} variant={language === choice ? "default" : "outline"}
              disabled={status !== "ready"} aria-pressed={language === choice}
              className="h-12 rounded-xl text-base"
              onClick={() => {
                if (choice === language) return;
                beginOperation();
                setLanguage(choice);
                localStorage.setItem(languageKey, choice);
              }}>
              {choice === "ru" ? "Русский" : "English"}
            </Button>
          ))}
        </div>

        {status === "ready" && (
          <details key={language} className="rounded-xl border bg-card p-3">
            <summary className="cursor-pointer font-medium">Голос Лисёнка</summary>
            <div className="mt-3 space-y-2">
              {voiceChoices && voiceChoices.length > 1 && (
                <select aria-label="Голос рассказчика"
                  className="h-11 w-full rounded-lg border bg-background px-3"
                  defaultValue={localStorage.getItem(voiceKey(language)) ?? ""}
                  onChange={(event) => {
                    stopPlayback();
                    localStorage.setItem(voiceKey(language), event.currentTarget.value);
                  }}>
                  <option value="">Выбирать автоматически</option>
                  {voiceChoices.map(({ id, lang }, index) => (
                    <option key={id} value={id}>Голос {index + 1} ({lang})</option>
                  ))}
                </select>
              )}
              <Button variant="outline" className="h-11 w-full" onClick={() => {
                if (playing === "preview") stopPlayback();
                else void readPage(pageVoiceSamples[language], false, true);
              }}>
                <Volume2 className="mr-2 h-4 w-4" />
                {playing === "preview" ? "Остановить пример" : "Послушать пример"}
              </Button>
            </div>
          </details>
        )}

        {status === "camera" && (
          <section className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl bg-slate-950">
              <video ref={video} muted autoPlay playsInline onCanPlay={() => setCameraReady(true)}
                className="mx-auto max-h-[55vh] w-full object-contain" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-[7%] rounded-xl border-2 border-white/90 shadow-[0_0_0_50px_rgba(0,0,0,.25)]" />
            </div>
            <p className="text-center text-sm text-muted-foreground">Помести одну страницу целиком в рамку.</p>
            <Button disabled={!cameraReady} className="h-14 w-full rounded-xl text-lg" onClick={() => void capture()}>
              <CameraIcon className="mr-2 h-5 w-5" /> Сфотографировать
            </Button>
          </section>
        )}

        {status === "opening" && <p role="status" className="text-center">Открываем камеру…</p>}
        {status === "scanning" && (
          <div className="space-y-2 rounded-2xl border bg-card p-5 text-center" role="status">
            <p>Лисёнок разбирает буквы…</p>
            <progress className="w-full accent-primary" aria-label="Распознавание страницы"
              max={1} value={progress > 0 ? progress : undefined} />
          </div>
        )}
        {status !== "ready" && (
          <Button variant="ghost" className="w-full" onClick={closeCamera}>Отмена</Button>
        )}

        {message && <p role="status" className="rounded-xl bg-muted p-3 text-center">{message}</p>}

        {text && status === "ready" && (
          <section className="space-y-3">
            <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
              <Button className="h-12 rounded-xl" onClick={() => {
                if (playing === "page") stopPlayback();
                else void readPage(text);
              }}>
                {playing === "page" ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                {playing === "page" ? "Пауза" : paused ? "Продолжить" : "Читать"}
              </Button>
              <Button variant="outline" className="h-12 rounded-xl" onClick={() => void readPage(text, true)}>
                <RotateCcw className="mr-2 h-4 w-4" /> С начала
              </Button>
            </div>
            <p lang={language} className="whitespace-pre-wrap break-words rounded-2xl border bg-card p-5 text-lg leading-relaxed">{text}</p>
          </section>
        )}

        {status === "ready" && (
          <div className="space-y-2">
            <Button className="h-14 w-full rounded-xl text-lg" onClick={() => void openCamera()}>
              <CameraIcon className="mr-2 h-5 w-5" /> {text ? "Следующая страница" : "Открыть камеру"}
            </Button>
            {cameraFallback && native && (
              <Button variant="outline" className="h-12 w-full rounded-xl" onClick={() => void usePhoneCamera()}>
                Камера телефона
              </Button>
            )}
            <input ref={imageInput} type="file" accept="image/*" hidden onChange={(event) => {
              const photo = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (photo) void scan(photo, beginOperation(), true);
            }} />
            <Button variant="ghost" className="h-12 w-full" onClick={() => imageInput.current?.click()}>
              <ImagePlus className="mr-2 h-5 w-5" /> Выбрать фото
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
