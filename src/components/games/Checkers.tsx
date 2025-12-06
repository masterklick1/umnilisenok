import { useState, useCallback } from "react";

interface Piece {
  color: "red" | "black";
  isKing: boolean;
}

interface CheckersProps {
  gameState: {
    board: (Piece | null)[][];
    currentPlayer: string;
  };
  isMyTurn: boolean;
  myColor: "red" | "black";
  onMove: (newState: Record<string, unknown>, winnerId?: string) => void;
  myId: string;
  opponentId: string;
}

export const Checkers = ({
  gameState,
  isMyTurn,
  myColor,
  onMove,
  myId,
  opponentId,
}: CheckersProps) => {
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);

  const getValidMoves = useCallback(
    (row: number, col: number, board: (Piece | null)[][]): [number, number][] => {
      const piece = board[row][col];
      if (!piece || piece.color !== myColor) return [];

      const moves: [number, number][] = [];
      const directions = piece.isKing
        ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
        : myColor === "red"
        ? [[1, -1], [1, 1]]
        : [[-1, -1], [-1, 1]];

      for (const [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;

        // Simple move
        if (
          newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8 &&
          !board[newRow][newCol]
        ) {
          moves.push([newRow, newCol]);
        }

        // Jump move
        const jumpRow = row + dr * 2;
        const jumpCol = col + dc * 2;
        if (
          jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8 &&
          board[newRow]?.[newCol]?.color !== myColor &&
          board[newRow]?.[newCol] &&
          !board[jumpRow][jumpCol]
        ) {
          moves.push([jumpRow, jumpCol]);
        }
      }

      return moves;
    },
    [myColor]
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!isMyTurn) return;

      const piece = gameState.board[row][col];

      // Select piece
      if (piece && piece.color === myColor) {
        setSelectedCell([row, col]);
        setValidMoves(getValidMoves(row, col, gameState.board));
        return;
      }

      // Move piece
      if (selectedCell && validMoves.some(([r, c]) => r === row && c === col)) {
        const newBoard = gameState.board.map((r) => [...r]);
        const [fromRow, fromCol] = selectedCell;
        const movingPiece = { ...newBoard[fromRow][fromCol]! };

        // Check for king promotion
        if (
          (myColor === "red" && row === 7) ||
          (myColor === "black" && row === 0)
        ) {
          movingPiece.isKing = true;
        }

        newBoard[row][col] = movingPiece;
        newBoard[fromRow][fromCol] = null;

        // Check for jump (capture)
        if (Math.abs(row - fromRow) === 2) {
          const capturedRow = (row + fromRow) / 2;
          const capturedCol = (col + fromCol) / 2;
          newBoard[capturedRow][capturedCol] = null;
        }

        // Check for winner
        const opponentPieces = newBoard.flat().filter(
          (p) => p && p.color !== myColor
        );

        setSelectedCell(null);
        setValidMoves([]);

        if (opponentPieces.length === 0) {
          onMove(
            { board: newBoard, currentPlayer: myColor === "red" ? "black" : "red" },
            myId
          );
        } else {
          onMove({
            board: newBoard,
            currentPlayer: myColor === "red" ? "black" : "red",
          });
        }
      }
    },
    [gameState.board, isMyTurn, myColor, selectedCell, validMoves, getValidMoves, onMove, myId]
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center mb-2">
        <p className="text-sm text-muted-foreground">
          Вы играете за:{" "}
          <span className={`font-bold ${myColor === "red" ? "text-red-600" : "text-gray-800"}`}>
            {myColor === "red" ? "🔴 Красные" : "⚫ Чёрные"}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-8 gap-0 border-2 border-foreground/20 rounded overflow-hidden">
        {gameState.board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isLight = (rowIndex + colIndex) % 2 === 0;
            const isSelected =
              selectedCell?.[0] === rowIndex && selectedCell?.[1] === colIndex;
            const isValidMove = validMoves.some(
              ([r, c]) => r === rowIndex && c === colIndex
            );

            return (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                className={`
                  w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center
                  transition-all
                  ${isLight ? "bg-amber-100" : "bg-amber-800"}
                  ${isSelected ? "ring-2 ring-primary ring-inset" : ""}
                  ${isValidMove ? "ring-2 ring-green-500 ring-inset" : ""}
                `}
              >
                {cell && (
                  <div
                    className={`
                      w-6 h-6 sm:w-8 sm:h-8 rounded-full
                      flex items-center justify-center text-xs font-bold
                      ${cell.color === "red" ? "bg-red-600" : "bg-gray-800"}
                      ${cell.color === "red" ? "text-white" : "text-white"}
                      ${cell.isKing ? "ring-2 ring-yellow-400" : ""}
                    `}
                  >
                    {cell.isKing && "👑"}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
