import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";

interface QrScannerProps {
  onScan: (text: string) => void;
  onError?: (message: string) => void;
}

export const QrScanner = ({ onScan, onError }: QrScannerProps) => {
  const { t } = useLanguage();
  const [starting, setStarting] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    const elementId = "child-qr-reader";
    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    const run = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          let st = await Camera.checkPermissions();
          if (st.camera !== "granted") st = await Camera.requestPermissions({ permissions: ["camera"] });
          if (st.camera !== "granted") throw new Error(t("Нет доступа к камере. Введи код вручную.", "No camera access. Enter the code manually."));
        } catch (e) {
          throw e instanceof Error ? e : new Error(String(e));
        }
      }
      if (!navigator.mediaDevices?.getUserMedia) throw new Error(t("Камера не поддерживается. Введи код вручную.", "Camera not supported. Enter the code manually."));
      if (cancelled) return;
      scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (handledRef.current) return;
          handledRef.current = true;
          onScan(decoded);
        },
        () => {},
      );
    };

    run()
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : t("Не удалось открыть камеру", "Couldn’t open the camera");
        onError?.(msg);
      })
      .finally(() => setStarting(false));

    return () => {
      cancelled = true;
      const s = scanner;
      if (!s) return;
      try {
        s.stop().then(() => s.clear()).catch(() => {});
      } catch { /* not started */ }
    };
  }, [onScan, onError]);

  return (
    <div className="space-y-3">
      <div
        id="child-qr-reader"
        className="w-full overflow-hidden rounded-xl border bg-black/5 [&>video]:rounded-xl"
      />
      {starting && <p className="text-center text-sm text-muted-foreground">{t("Открываем камеру…", "Opening the camera…")}</p>}
      <p className="text-center text-xs text-muted-foreground">
        {t("Наведи камеру на QR-код от родителя", "Point the camera at the QR code from your parent")}
      </p>
    </div>
  );
};
