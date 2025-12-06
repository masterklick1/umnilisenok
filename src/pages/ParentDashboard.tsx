import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParentalControl } from "@/hooks/useParentalControl";
import { useAuth } from "@/contexts/AuthContext";
import { CreateChildForm } from "@/components/parental/CreateChildForm";
import { ChildCard } from "@/components/parental/ChildCard";
import { ActivityMirror } from "@/components/parental/ActivityMirror";
import { AIRecommendations } from "@/components/parental/AIRecommendations";
import { GamesList } from "@/components/parental/GamesList";
import { ArrowLeft, Users, Eye, Brain, Gamepad2, LogOut } from "lucide-react";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const {
    children,
    loading,
    selectedChild,
    setSelectedChild,
    createChildAccount,
    childActivities,
    childAnalysis,
    analyzeChild,
    analyzingChild,
    gameSessions,
    createGameSession,
  } = useParentalControl();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleStartChildSession = (childId: string) => {
    // Store child session info and navigate to main app
    sessionStorage.setItem("activeChildId", childId);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="text-4xl animate-bounce">👨‍👩‍👧‍👦</div>
      </div>
    );
  }

  const selectedChildData = children.find((c) => c.child_id === selectedChild);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/auth")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Родительский кабинет</h1>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="w-5 h-5 mr-2" />
            Выйти
          </Button>
        </div>

        <Tabs defaultValue="children" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="children" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Дети</span>
            </TabsTrigger>
            <TabsTrigger value="mirror" className="gap-2" disabled={!selectedChild}>
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Зеркало</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2" disabled={!selectedChild}>
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">ИИ-Анализ</span>
            </TabsTrigger>
            <TabsTrigger value="games" className="gap-2">
              <Gamepad2 className="w-4 h-4" />
              <span className="hidden sm:inline">Игры</span>
            </TabsTrigger>
          </TabsList>

          {/* Children Tab */}
          <TabsContent value="children" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Аккаунты детей</h2>
              <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                {showCreateForm ? "Отмена" : "Добавить ребёнка"}
              </Button>
            </div>

            {showCreateForm && (
              <CreateChildForm
                onSubmit={async (name, avatar) => {
                  await createChildAccount(name, avatar);
                  setShowCreateForm(false);
                }}
              />
            )}

            {children.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <div className="text-5xl mb-4">👶</div>
                  <p className="text-muted-foreground">
                    Добавьте аккаунт ребёнка, чтобы начать
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {children.map((child) => (
                  <ChildCard
                    key={child.child_id}
                    child={child}
                    isSelected={selectedChild === child.child_id}
                    onSelect={() => setSelectedChild(child.child_id)}
                    onStartSession={() => handleStartChildSession(child.child_id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Mirror Tab */}
          <TabsContent value="mirror">
            {selectedChildData ? (
              <ActivityMirror
                childName={selectedChildData.first_name || "Ребёнок"}
                activities={childActivities}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Выберите ребёнка на вкладке "Дети"
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* AI Analysis Tab */}
          <TabsContent value="analysis">
            {selectedChildData ? (
              <AIRecommendations
                childName={selectedChildData.first_name || "Ребёнок"}
                analysis={childAnalysis}
                onAnalyze={() => analyzeChild(selectedChild!)}
                isAnalyzing={analyzingChild}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Выберите ребёнка на вкладке "Дети"
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Games Tab */}
          <TabsContent value="games">
            <GamesList
              children={children}
              sessions={gameSessions}
              onCreateGame={createGameSession}
              selectedChild={selectedChild}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
