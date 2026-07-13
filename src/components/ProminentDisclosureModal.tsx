import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ProminentDisclosureModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ProminentDisclosureModal({ open, onConfirm, onCancel }: ProminentDisclosureModalProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">📍 Фоновое отслеживание геопозиции</AlertDialogTitle>
          <AlertDialogDescription className="text-base space-y-4 mt-4">
            <div>
              <p className="font-semibold text-foreground mb-2">Для чего это нужно?</p>
              <p className="text-sm">
                Приложение будет отслеживать местоположение вашего ребёнка <strong>даже когда приложение закрыто</strong>.
              </p>
            </div>
            
            <div>
              <p className="font-semibold text-foreground mb-2">Как это работает?</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Фоновый сервис записывает координаты каждые несколько минут</li>
                <li>В шторке уведомлений будет значок геолокации</li>
                <li>Это повлияет на батарею — может потребляться на 10–20% больше энергии</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-foreground mb-2">Советы</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Отключите оптимизацию батареи для приложения (в настройках телефона)</li>
                <li>Убедитесь, что включен GPS или сетевое определение местоположения</li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded text-sm">
              <p>
                После нажатия <strong>«Разрешить»</strong> система запросит постоянное разрешение на геопозицию.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex gap-2 pt-2">
          <AlertDialogCancel onClick={onCancel} className="flex-1">
            Отменить
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="flex-1">
            Разрешить всегда
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
