import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Gamepad2, Plus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GameSession {
  id: string;
  game_type: string;
  parent_id: string;
  child_id: string;
  status: string;
  winner_id: string | null;
  created_at: string;
}

interface Child {
  child_id: string;
  first_name: string | null;
  avatar_url: string | null;
}

interface GamesListProps {
  children: Child[];
  sessions: GameSession[];
  onCreateGame: (childId: string, gameType: string, initialState: Record<string, unknown>) => Promise<{ error: unknown; session?: unknown }>;
  selectedChild: string | null;
}

const GAMES = [
  { id: "tic_tac_toe", name: "Крестики-нолики", icon: "⭕", description: "Классическая игра 3x3" },
  { id: "checkers", name: "Шашки", icon: "🔴", description: "Русские шашки 8x8" },
  { id: "chess", name: "Шахматы", icon: "♟️", description: "Классические шахматы" },
];

const getInitialState = (gameType: string): Record<string, unknown> => {
  switch (gameType) {
    case "tic_tac_toe":
      return { board: Array(9).fill(null), isXNext: true };
    case "checkers":
      return { board: createCheckersBoard(), currentPlayer: "red" };
    case "chess":
      return { board: createChessBoard(), currentPlayer: "white" };
    default:
      return {};
  }
};

const createCheckersBoard = () => {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  // Red pieces (top)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: "red", isKing: false };
      }
    }
  }
  // Black pieces (bottom)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: "black", isKing: false };
      }
    }
  }
  return board;
};

const createChessBoard = () => {
  const pieces = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Black pieces
  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: pieces[col], color: "black" };
    board[1][col] = { type: "pawn", color: "black" };
  }
  // White pieces
  for (let col = 0; col < 8; col++) {
    board[7][col] = { type: pieces[col], color: "white" };
    board[6][col] = { type: "pawn", color: "white" };
  }
  return board;
};

const getGameName = (type: string) => {
  return GAMES.find((g) => g.id === type)?.name || type;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-500">Активна</Badge>;
    case "waiting":
      return <Badge variant="secondary">Ожидание</Badge>;
    case "finished":
      return <Badge variant="outline">Завершена</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export const GamesList = ({ children, sessions, onCreateGame, selectedChild }: GamesListProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  const handleCreateGame = async (childId: string, gameType: string) => {
    setIsCreating(true);
    const initialState = getInitialState(gameType);
    const { error, session } = await onCreateGame(childId, gameType, initialState);
    setIsCreating(false);
    
    if (!error && session) {
      setDialogOpen(false);
      navigate(`/games/${(session as { id: string }).id}`);
    }
  };

  const activeSessions = sessions.filter((s) => s.status === "active" || s.status === "waiting");
  const finishedSessions = sessions.filter((s) => s.status === "finished").slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Gamepad2 className="w-5 h-5" />
          Совместные игры
        </h2>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={children.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Новая игра
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создать игру</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Выберите ребёнка:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {children.map((child) => (
                    <Button
                      key={child.child_id}
                      variant={selectedChild === child.child_id ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => {}}
                    >
                      <span className="text-xl mr-2">{child.avatar_url || "👶"}</span>
                      {child.first_name || "Ребёнок"}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Выберите игру:</h4>
                <div className="space-y-2">
                  {GAMES.map((game) => (
                    <Button
                      key={game.id}
                      variant="outline"
                      className="w-full justify-start h-auto py-3"
                      disabled={!selectedChild || isCreating}
                      onClick={() => selectedChild && handleCreateGame(selectedChild, game.id)}
                    >
                      <span className="text-2xl mr-3">{game.icon}</span>
                      <div className="text-left">
                        <div className="font-medium">{game.name}</div>
                        <div className="text-xs text-muted-foreground">{game.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Games */}
      {activeSessions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Активные игры</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeSessions.map((session) => {
                const child = children.find((c) => c.child_id === session.child_id);
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigate(`/games/${session.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{child?.avatar_url || "👶"}</span>
                      <div>
                        <div className="font-medium">{getGameName(session.game_type)}</div>
                        <div className="text-sm text-muted-foreground">
                          с {child?.first_name || "Ребёнок"}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Games */}
      {finishedSessions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">История игр</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {finishedSessions.map((session) => {
                const child = children.find((c) => c.child_id === session.child_id);
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl opacity-60">{child?.avatar_url || "👶"}</span>
                      <div>
                        <div className="font-medium text-muted-foreground">
                          {getGameName(session.game_type)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          с {child?.first_name || "Ребёнок"}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {session.winner_id === session.child_id ? "Победил ребёнок" : "Победил родитель"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {children.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Сначала добавьте ребёнка на вкладке "Дети"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
