import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Eye, MapPin, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, ru } from "date-fns/locale";

interface SelectedChildBarProps {
  childName: string;
  connectedViaInvite?: boolean;
  lastActivityAt?: string | null;
  onOpenSafety: () => void;
  onOpenMirror: () => void;
  onClear: () => void;
}

export const SelectedChildBar = ({
  childName,
  connectedViaInvite,
  lastActivityAt,
  onOpenSafety,
  onOpenMirror,
  onClear,
}: SelectedChildBarProps) => {
  const { t, language } = useLanguage();
  const isOnline =
    lastActivityAt &&
    Date.now() - new Date(lastActivityAt).getTime() < 5 * 60 * 1000;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {t("Следим за:", "Monitoring:")} <span className="text-primary">{childName}</span>
            </p>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {connectedViaInvite ? (
                <Badge variant="secondary" className="text-xs">
                  {t("📱 Свой телефон", "📱 Own phone")}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  {t("💻 Это устройство", "💻 This device")}
                </Badge>
              )}
              {isOnline ? (
                <Badge className="text-xs bg-green-500 hover:bg-green-500 gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {t("На связи", "Online")}
                </Badge>
              ) : lastActivityAt ? (
                <span className="text-xs text-muted-foreground">
                  {t("Был(а) активен(на)", "Last active")}{" "}
                  {formatDistanceToNow(new Date(lastActivityAt), { addSuffix: true, locale: language === "en" ? enUS : ru })}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">{t("Нет активности", "No activity")}</span>
              )}
            </div>
            {connectedViaInvite && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {t("Карта, геозона школы и SOS — во вкладке «Защита»", "Find the map, school safe zone and SOS alerts in Safety")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="default" className="gap-1" onClick={onOpenSafety}>
              <Shield className="w-4 h-4" />
              {t("Защита", "Safety")}
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={onOpenMirror}>
              <Eye className="w-4 h-4" />
              {t("Зеркало", "Monitor")}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={onClear}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
