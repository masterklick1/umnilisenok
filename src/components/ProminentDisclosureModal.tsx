import { useLanguage } from "@/contexts/LanguageContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ProminentDisclosureModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

const DEFAULT_TITLE = "📍 Геолокация в фоновом режиме";
const DEFAULT_DESCRIPTION =
  "Приложение «Умный Лисёнок» собирает данные о местоположении в фоновом режиме, чтобы " +
  "родители могли видеть геопозицию ребёнка на карте в реальном времени, даже когда " +
  "приложение закрыто или не используется. Нажмите «Понятно» для перехода к настройкам " +
  "разрешений.";

export function ProminentDisclosureModal({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel,
  cancelLabel,
}: ProminentDisclosureModalProps) {
  const { t } = useLanguage();
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">{title ?? t(DEFAULT_TITLE, "📍 Background location")}</AlertDialogTitle>
          <AlertDialogDescription className="text-base mt-4">
            {description ?? t(DEFAULT_DESCRIPTION,
              "Clever Little Fox collects background location data so parents can see their child’s location on the map in real time, even when the app is closed or inactive. Select Continue to open permission settings.")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex gap-2 pt-2">
          <AlertDialogCancel onClick={onCancel} className="flex-1">
            {cancelLabel ?? t("Отмена", "Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="flex-1">
            {confirmLabel ?? t("Понятно", "Continue")}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
