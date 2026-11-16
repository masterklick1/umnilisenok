import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle,
  XCircle,
  Eye,
  MousePointer,
  Navigation,
  GraduationCap,
  Layers,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import {
  formatActivityDescription,
  getActivityLocationLabel,
  getActivityTypeLabel,
  getPathLabel,
} from "@/lib/activity-labels";

interface Activity {
  id: string;
  child_id: string;
  activity_type: string;
  page_path: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface ActivityMirrorProps {
  childName: string;
  activities: Activity[];
  connectedViaInvite?: boolean;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "answer_correct":
      return <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />;
    case "answer_wrong":
      return <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
    case "page_view":
      return <Navigation className="w-5 h-5 text-blue-500 shrink-0" />;
    case "click":
      return <MousePointer className="w-5 h-5 text-purple-500 shrink-0" />;
    case "select_level":
      return <Layers className="w-5 h-5 text-amber-500 shrink-0" />;
    case "start_learning":
      return <GraduationCap className="w-5 h-5 text-teal-500 shrink-0" />;
    default:
      return <Eye className="w-5 h-5 text-muted-foreground shrink-0" />;
  }
};

export const ActivityMirror = ({
  childName,
  activities,
  connectedViaInvite,
}: ActivityMirrorProps) => {
  const { t, language } = useLanguage();
  const currentPage = activities.find((a) => a.activity_type === "page_view")?.page_path;
  const recentCorrect = activities.filter((a) => a.activity_type === "answer_correct").length;
  const recentWrong = activities.filter((a) => a.activity_type === "answer_wrong").length;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">{childName}</h3>
              <p className="text-sm text-muted-foreground">
                {t("Сейчас:", "Now:")}{" "}
                <span className="font-medium text-foreground">
                  {getPathLabel(currentPage || null, language) || t("неизвестно", "unknown")}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-600 font-medium">{t("Онлайн", "Online")}</span>
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">
                <span className="font-bold text-green-600">{recentCorrect}</span> {t("правильных", "correct")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm">
                <span className="font-bold text-red-600">{recentWrong}</span> {t("ошибок", "mistakes")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {t("Лента активности", "Activity feed")}
          </CardTitle>
          <CardDescription>
            {t("Что делает", "What")} {childName} {t("в реальном времени — простым языком, без технических данных", "is doing in real time")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {activities.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 space-y-2">
                <p>{t("Пока нет активности от", "No activity yet from")} {childName}.</p>
                {connectedViaInvite ? (
                  <p className="text-xs max-w-sm mx-auto">
                    {t("Ребёнок играет на своём телефоне? Убедитесь, что выбрана карточка с меткой «📱 Свой телефон». Если в списке два одинаковых имени — выберите ту, где написано «Сейчас играет» или свежая «Активность».", "If your child is using their own phone, select the card marked “📱 Own phone.” If two cards have the same name, choose the one that shows recent activity.")}
                  </p>
                ) : (
                  <p className="text-xs max-w-sm mx-auto">
                    {t("Этот аккаунт для игры на вашем телефоне. Если ребёнок на своём устройстве — выберите карточку с меткой «📱 Свой телефон».", "This account is for playing on your phone. Select “📱 Own phone” if your child is on a different device.")}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => {
                  const description = formatActivityDescription(activity, language);
                  const location = getActivityLocationLabel(activity, language);

                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      {getActivityIcon(activity.activity_type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {getActivityTypeLabel(activity.activity_type, language)}
                          </span>
                          {location && (
                            <Badge variant="outline" className="text-xs">
                              {location}
                            </Badge>
                          )}
                        </div>
                        {description && (
                          <p className="text-sm text-foreground mt-1 leading-snug">
                            {description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(activity.created_at), {
                            addSuffix: true,
                            locale: language === "en" ? enUS : ru,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
