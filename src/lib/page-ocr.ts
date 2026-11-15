import { createWorker, OEM, type Worker } from "tesseract.js";
import workerUrl from "tesseract.js/dist/worker.min.js?url";
import coreUrl from "tesseract.js-core/tesseract-core-lstm.wasm.js?url";
import russianModel from "@tesseract.js-data/rus/4.0.0_best_int/rus.traineddata.gz?url";
import englishModel from "@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz?url";

const models = { ru: { code: "rus", url: russianModel }, en: { code: "eng", url: englishModel } };

export async function recognizePage(
  photo: Blob,
  language: keyof typeof models,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
) {
  const model = models[language];
  if (signal.aborted) throw signal.reason;

  let worker: Worker | undefined;
  let cancel: () => void = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    cancel = () => reject(signal.reason);
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
  });
  let rejectWorker: (reason: unknown) => void = () => {};
  const workerFailure = new Promise<never>((_, reject) => { rejectWorker = reject; });

  try {
    const scan = async () => {
      const created = await createWorker(model.code, OEM.LSTM_ONLY, {
        langPath: new URL(".", new URL(model.url, window.location.href)).href,
        workerPath: workerUrl,
        corePath: new URL(coreUrl, window.location.href).href,
        workerBlobURL: false,
        cacheMethod: "none",
        logger: ({ status, progress }) => {
          if (status === "recognizing text" && !signal.aborted) onProgress(progress);
        },
        errorHandler: rejectWorker,
      });
      if (signal.aborted) {
        await created.terminate();
        throw signal.reason;
      }
      worker = created;
      const { data: result } = await created.recognize(photo);
      const alphabet = language === "ru" ? /[а-яё]/gi : /[a-z]/gi;
      if (result.confidence < 50 || (result.text.match(alphabet)?.length ?? 0) < 5) return "";
      return result.text
        .replace(/([\p{L}])-\s*\n\s*(?=[\p{Ll}])/gu, "$1")
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join("\n\n");
    };
    return await Promise.race([scan(), interrupted, workerFailure]);
  } finally {
    signal.removeEventListener("abort", cancel);
    if (worker) void worker.terminate().catch(() => {});
  }
}
