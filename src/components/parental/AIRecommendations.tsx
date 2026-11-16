import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, TrendingDown, Sparkles, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, ru } from "date-fns/locale";

interface Analysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string;
  last_analyzed_at: string;
}

interface AIRecommendationsProps {
  childName: string;
  analysis: Analysis | null;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export const AIRecommendations = ({
  childName,
  analysis,
  onAnalyze,
  isAnalyzing,
}: AIRecommendationsProps) => {
  const { t, language } = useLanguage();
  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-500" />
                {t("ИИ-Анализ для", "AI insights for")} {childName}
              </CardTitle>
              <CardDescription>
                {t("Персональные рекомендации на основе активности", "Personal suggestions based on activity")}
              </CardDescription>
            </div>
            <Button onClick={onAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t("Анализ...", "Analyzing…")}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t("Обновить анализ", "Update analysis")}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {analysis ? (
        <>
          {/* Strengths */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-green-600">
                <TrendingUp className="w-5 h-5" />
                {t("Сильные стороны", "Strengths")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analysis.strengths.map((strength, index) => (
                  <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                    {strength}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weaknesses */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-orange-600">
                <TrendingDown className="w-5 h-5" />
                {t("Области для улучшения", "What to work on")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analysis.weaknesses.map((weakness, index) => (
                  <Badge key={index} variant="secondary" className="bg-orange-100 text-orange-800">
                    {weakness}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-purple-600">
                <Sparkles className="w-5 h-5" />
                {t("Рекомендации для родителей", "Suggestions for parents")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line">
                {analysis.recommendations}
              </p>
              {analysis.last_analyzed_at && (
                <p className="text-xs text-muted-foreground mt-4">
                  {t("Последний анализ:", "Last analysis:")}{" "}
                  {formatDistanceToNow(new Date(analysis.last_analyzed_at), {
                    addSuffix: true,
                    locale: language === "en" ? enUS : ru,
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {t("Нажмите \"Обновить анализ\", чтобы получить персональные рекомендации от ИИ", "Select “Update analysis” to get personalized AI suggestions")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
