import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QrScannerProps {
  onScan: (text: string) => void;
  onError?: (message: string) => void;
}

export const QrScanner = ({ onScan, onError }: QrScannerProps) => {
  const [starting, setStarting] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    const elementId = "child-qr-reader";
    const scanner = new Html5Qrcode(elementId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (handledRef.current) return;
          handledRef.current = true;
          onScan(decoded);
        },
        () => {},
      )
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Не удалось открыть камеру";
        onError?.(msg);
      })
      .finally(() => setStarting(false));

    return () => {
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {});
    };
  }, [onScan, onError]);

  return (
    <div className="space-y-3">
      <div
        id="child-qr-reader"
        className="w-full overflow-hidden rounded-xl border bg-black/5 [&>video]:rounded-xl"
      />
      {starting && <p className="text-center text-sm text-muted-foreground">Открываем камеру…</p>}
      <p className="text-center text-xs text-muted-foreground">
        Наведи камеру на QR-код от родителя
      </p>
    </div>
  );
};
