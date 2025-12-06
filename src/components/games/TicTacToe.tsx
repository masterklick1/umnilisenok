import { useCallback } from "react";

interface TicTacToeProps {
  gameState: {
    board: (string | null)[];
    isXNext: boolean;
  };
  isMyTurn: boolean;
  mySymbol: "X" | "O";
  onMove: (newState: Record<string, unknown>, winnerId?: string) => void;
  myId: string;
  opponentId: string;
}

const checkWinner = (board: (string | null)[]): string | null => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6], // diagonals
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
};

const isBoardFull = (board: (string | null)[]): boolean => {
  return board.every((cell) => cell !== null);
};

export const TicTacToe = ({
  gameState,
  isMyTurn,
  mySymbol,
  onMove,
  myId,
  opponentId,
}: TicTacToeProps) => {
  const handleCellClick = useCallback(
    (index: number) => {
      if (!isMyTurn || gameState.board[index]) return;

      const newBoard = [...gameState.board];
      newBoard[index] = mySymbol;
      const newState = {
        board: newBoard,
        isXNext: !gameState.isXNext,
      };

      const winner = checkWinner(newBoard);
      if (winner) {
        onMove(newState, winner === mySymbol ? myId : opponentId);
      } else if (isBoardFull(newBoard)) {
        onMove(newState);
      } else {
        onMove(newState);
      }
    },
    [gameState, isMyTurn, mySymbol, onMove, myId, opponentId]
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center mb-2">
        <p className="text-sm text-muted-foreground">
          Вы играете за: <span className="font-bold text-2xl">{mySymbol}</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 w-fit">
        {gameState.board.map((cell, index) => (
          <button
            key={index}
            onClick={() => handleCellClick(index)}
            disabled={!isMyTurn || !!cell}
            className={`
              w-20 h-20 sm:w-24 sm:h-24 
              text-4xl sm:text-5xl font-bold
              rounded-lg transition-all
              ${!cell && isMyTurn ? "bg-muted hover:bg-muted/80 cursor-pointer" : "bg-muted/50"}
              ${cell === "X" ? "text-blue-600" : "text-red-600"}
            `}
          >
            {cell}
          </button>
        ))}
      </div>
    </div>
  );
};
