import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { TicTacToe } from "@/components/games/TicTacToe";
import { Checkers } from "@/components/games/Checkers";
import { Chess, type ChessPiece } from "@/components/games/Chess";
import type { Json } from "@/integrations/supabase/types";

interface GameSession {
  id: string;
  game_type: string;
  parent_id: string;
  child_id: string;
  status: string;
  current_turn: string | null;
  game_state: Record<string, unknown>;
  winner_id: string | null;
}

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isChild } = useUserRole();
  const homePath = isChild ? "/" : "/parent";
  const { toast } = useToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [opponentName, setOpponentName] = useState<string>("");

  const fetchSession = useCallback(async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching game:", error);
      toast({
        title: "Ошибка",
        description: "Игра не найдена",
        variant: "destructive",
      });
      navigate(homePath);
      return;
    }

    setSession(data as GameSession);
    setLoading(false);

    // Fetch opponent name
    const opponentId = data.parent_id === user?.id ? data.child_id : data.parent_id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, avatar_url")
      .eq("id", opponentId)
      .single();
    
    if (profile) {
      setOpponentName(`${profile.avatar_url || "👤"} ${profile.first_name || "Игрок"}`);
    }
  }, [id, user?.id, navigate, toast]);

  useEffect(() => {
    fetchSession();

    // Subscribe to game updates
    const channel = supabase
      .channel(`game-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_sessions",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setSession(payload.new as GameSession);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchSession]);

  const updateGame = async (newState: Record<string, unknown>, winnerId?: string) => {
    if (!session || !user) return;

    const nextTurn = session.current_turn === session.parent_id 
      ? session.child_id 
      : session.parent_id;

    const updates: { game_state: Json; current_turn: string; status?: string; winner_id?: string } = {
      game_state: newState as Json,
      current_turn: nextTurn,
    };
    
    if (winnerId) {
      updates.status = "finished";
      updates.winner_id = winnerId;
    }

    await supabase
      .from("game_sessions")
      .update(updates)
      .eq("id", session.id);
  };

  const resetGame = async () => {
    if (!session) return;

    const initialState = getInitialState(session.game_type);
    await supabase
      .from("game_sessions")
      .update({
        game_state: initialState as Json,
        current_turn: session.parent_id,
        status: "active",
        winner_id: null,
      })
      .eq("id", session.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-bounce">🎮</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isMyTurn = session.current_turn === user?.id;
  const amIParent = session.parent_id === user?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(homePath)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">
            {session.game_type === "tic_tac_toe" && "Крестики-нолики"}
            {session.game_type === "checkers" && "Шашки"}
            {session.game_type === "chess" && "Шахматы"}
          </h1>
          {session.status === "finished" && (
            <Button variant="outline" size="sm" onClick={resetGame}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Ещё раз
            </Button>
          )}
        </div>

        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Противник</p>
                <p className="font-medium">{opponentName}</p>
              </div>
              <div className="text-right">
                {session.status === "finished" ? (
                  <p className="font-bold text-lg">
                    {session.winner_id === user?.id ? "🎉 Победа!" : "😢 Поражение"}
                  </p>
                ) : (
                  <p className={`font-medium ${isMyTurn ? "text-green-600" : "text-muted-foreground"}`}>
                    {isMyTurn ? "Ваш ход" : "Ход противника"}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            {session.game_type === "tic_tac_toe" && (
              <TicTacToe
                gameState={session.game_state as unknown as { board: (string | null)[]; isXNext: boolean }}
                isMyTurn={isMyTurn}
                mySymbol={amIParent ? "X" : "O"}
                onMove={updateGame}
                myId={user?.id || ""}
                opponentId={amIParent ? session.child_id : session.parent_id}
              />
            )}
            {session.game_type === "checkers" && (
              <Checkers
                gameState={session.game_state as unknown as { board: { color: "red" | "black"; isKing: boolean }[][]; currentPlayer: string }}
                isMyTurn={isMyTurn}
                myColor={amIParent ? "red" : "black"}
                onMove={updateGame}
                myId={user?.id || ""}
                opponentId={amIParent ? session.child_id : session.parent_id}
              />
            )}
            {session.game_type === "chess" && (
              <Chess
                gameState={session.game_state as unknown as { board: (ChessPiece | null)[][]; currentPlayer: string }}
                isMyTurn={isMyTurn}
                myColor={amIParent ? "white" : "black"}
                onMove={updateGame}
                myId={user?.id || ""}
                opponentId={amIParent ? session.child_id : session.parent_id}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getInitialState(gameType: string): Record<string, unknown> {
  switch (gameType) {
    case "tic_tac_toe":
      return { board: Array(9).fill(null), isXNext: true };
    case "checkers": {
      const board = Array(8).fill(null).map(() => Array(8).fill(null));
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 8; col++) {
          if ((row + col) % 2 === 1) {
            board[row][col] = { color: "red", isKing: false };
          }
        }
      }
      for (let row = 5; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if ((row + col) % 2 === 1) {
            board[row][col] = { color: "black", isKing: false };
          }
        }
      }
      return { board, currentPlayer: "red" };
    }
    case "chess": {
      const pieces = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
      const board = Array(8).fill(null).map(() => Array(8).fill(null));
      for (let col = 0; col < 8; col++) {
        board[0][col] = { type: pieces[col], color: "black" };
        board[1][col] = { type: "pawn", color: "black" };
        board[7][col] = { type: pieces[col], color: "white" };
        board[6][col] = { type: "pawn", color: "white" };
      }
      return { board, currentPlayer: "white" };
    }
    default:
      return {};
  }
}
