import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, Eye, MousePointer, Navigation } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

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
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "answer_correct":
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "answer_wrong":
      return <XCircle className="w-5 h-5 text-red-500" />;
    case "page_view":
      return <Navigation className="w-5 h-5 text-blue-500" />;
    case "click":
      return <MousePointer className="w-5 h-5 text-purple-500" />;
    default:
      return <Eye className="w-5 h-5 text-muted-foreground" />;
  }
};

const getActivityLabel = (type: string) => {
  switch (type) {
    case "answer_correct":
      return "Правильный ответ";
    case "answer_wrong":
      return "Неправильный ответ";
    case "page_view":
      return "Открыл страницу";
    case "click":
      return "Нажал";
    default:
      return type;
  }
};

const getPathLabel = (path: string | null) => {
  if (!path) return "";
  const paths: Record<string, string> = {
    "/": "Главная",
    "/math": "Математика",
    "/alphabet": "Азбука",
    "/world": "Мир вокруг",
    "/creativity": "Творчество",
    "/home": "Виртуальный дом",
  };
  return paths[path] || path;
};

export const ActivityMirror = ({ childName, activities }: ActivityMirrorProps) => {
  const currentPage = activities.find((a) => a.activity_type === "page_view")?.page_path;
  const recentCorrect = activities.filter((a) => a.activity_type === "answer_correct").length;
  const recentWrong = activities.filter((a) => a.activity_type === "answer_wrong").length;

  return (
    <div className="space-y-4">
      {/* Live Status */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">{childName}</h3>
              <p className="text-sm text-muted-foreground">
                Сейчас: <span className="font-medium text-foreground">{getPathLabel(currentPage || null)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-600 font-medium">Онлайн</span>
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">
                <span className="font-bold text-green-600">{recentCorrect}</span> правильных
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm">
                <span className="font-bold text-red-600">{recentWrong}</span> ошибок
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Лента активности
          </CardTitle>
          <CardDescription>
            Что делает {childName} в реальном времени
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {activities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Пока нет активности
              </p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    {getActivityIcon(activity.activity_type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {getActivityLabel(activity.activity_type)}
                        </span>
                        {activity.page_path && (
                          <Badge variant="outline" className="text-xs">
                            {getPathLabel(activity.page_path)}
                          </Badge>
                        )}
                      </div>
                      {activity.details && Object.keys(activity.details).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {JSON.stringify(activity.details)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.created_at), {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
