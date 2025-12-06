import { useState, useCallback } from "react";

interface ChessPiece {
  type: "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";
  color: "white" | "black";
}

interface ChessProps {
  gameState: {
    board: (ChessPiece | null)[][];
    currentPlayer: string;
  };
  isMyTurn: boolean;
  myColor: "white" | "black";
  onMove: (newState: Record<string, unknown>, winnerId?: string) => void;
  myId: string;
  opponentId: string;
}

const PIECE_SYMBOLS: Record<string, Record<string, string>> = {
  white: {
    king: "♔",
    queen: "♕",
    rook: "♖",
    bishop: "♗",
    knight: "♘",
    pawn: "♙",
  },
  black: {
    king: "♚",
    queen: "♛",
    rook: "♜",
    bishop: "♝",
    knight: "♞",
    pawn: "♟",
  },
};

export const Chess = ({
  gameState,
  isMyTurn,
  myColor,
  onMove,
  myId,
  opponentId,
}: ChessProps) => {
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);

  const isValidPosition = (row: number, col: number) =>
    row >= 0 && row < 8 && col >= 0 && col < 8;

  const getValidMoves = useCallback(
    (row: number, col: number, board: (ChessPiece | null)[][]): [number, number][] => {
      const piece = board[row][col];
      if (!piece || piece.color !== myColor) return [];

      const moves: [number, number][] = [];
      const addMove = (r: number, c: number) => {
        if (!isValidPosition(r, c)) return false;
        const target = board[r][c];
        if (!target) {
          moves.push([r, c]);
          return true;
        }
        if (target.color !== myColor) {
          moves.push([r, c]);
        }
        return false;
      };

      switch (piece.type) {
        case "pawn": {
          const direction = myColor === "white" ? -1 : 1;
          const startRow = myColor === "white" ? 6 : 1;
          
          // Forward move
          if (!board[row + direction]?.[col]) {
            moves.push([row + direction, col]);
            // Double move from start
            if (row === startRow && !board[row + direction * 2]?.[col]) {
              moves.push([row + direction * 2, col]);
            }
          }
          // Captures
          for (const dc of [-1, 1]) {
            const target = board[row + direction]?.[col + dc];
            if (target && target.color !== myColor) {
              moves.push([row + direction, col + dc]);
            }
          }
          break;
        }
        case "knight": {
          const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1],
          ];
          for (const [dr, dc] of knightMoves) {
            addMove(row + dr, col + dc);
          }
          break;
        }
        case "bishop": {
          for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
            for (let i = 1; i < 8; i++) {
              if (!addMove(row + dr * i, col + dc * i)) break;
              if (board[row + dr * i]?.[col + dc * i]) break;
            }
          }
          break;
        }
        case "rook": {
          for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            for (let i = 1; i < 8; i++) {
              if (!addMove(row + dr * i, col + dc * i)) break;
              if (board[row + dr * i]?.[col + dc * i]) break;
            }
          }
          break;
        }
        case "queen": {
          for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
            for (let i = 1; i < 8; i++) {
              if (!addMove(row + dr * i, col + dc * i)) break;
              if (board[row + dr * i]?.[col + dc * i]) break;
            }
          }
          break;
        }
        case "king": {
          for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
            addMove(row + dr, col + dc);
          }
          break;
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
        const newBoard = gameState.board.map((r) => r.map((c) => (c ? { ...c } : null)));
        const [fromRow, fromCol] = selectedCell;
        const movingPiece = { ...newBoard[fromRow][fromCol]! };

        // Check for pawn promotion
        if (
          movingPiece.type === "pawn" &&
          ((myColor === "white" && row === 0) || (myColor === "black" && row === 7))
        ) {
          movingPiece.type = "queen";
        }

        // Check if capturing king
        const capturedPiece = newBoard[row][col];
        const isKingCaptured = capturedPiece?.type === "king";

        newBoard[row][col] = movingPiece;
        newBoard[fromRow][fromCol] = null;

        setSelectedCell(null);
        setValidMoves([]);

        if (isKingCaptured) {
          onMove(
            { board: newBoard, currentPlayer: myColor === "white" ? "black" : "white" },
            myId
          );
        } else {
          onMove({
            board: newBoard,
            currentPlayer: myColor === "white" ? "black" : "white",
          });
        }
      }
    },
    [gameState.board, isMyTurn, myColor, selectedCell, validMoves, getValidMoves, onMove, myId]
  );

  // Flip board for black
  const displayBoard = myColor === "black" 
    ? [...gameState.board].reverse().map(row => [...row].reverse())
    : gameState.board;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center mb-2">
        <p className="text-sm text-muted-foreground">
          Вы играете за:{" "}
          <span className="font-bold">
            {myColor === "white" ? "⬜ Белые" : "⬛ Чёрные"}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-8 gap-0 border-2 border-foreground/20 rounded overflow-hidden">
        {displayBoard.map((row, displayRowIndex) => {
          const actualRowIndex = myColor === "black" ? 7 - displayRowIndex : displayRowIndex;
          
          return row.map((cell, displayColIndex) => {
            const actualColIndex = myColor === "black" ? 7 - displayColIndex : displayColIndex;
            const isLight = (actualRowIndex + actualColIndex) % 2 === 0;
            const isSelected =
              selectedCell?.[0] === actualRowIndex && selectedCell?.[1] === actualColIndex;
            const isValidMove = validMoves.some(
              ([r, c]) => r === actualRowIndex && c === actualColIndex
            );

            return (
              <button
                key={`${actualRowIndex}-${actualColIndex}`}
                onClick={() => handleCellClick(actualRowIndex, actualColIndex)}
                className={`
                  w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center
                  text-xl sm:text-2xl transition-all
                  ${isLight ? "bg-amber-100" : "bg-amber-700"}
                  ${isSelected ? "ring-2 ring-primary ring-inset" : ""}
                  ${isValidMove ? "ring-2 ring-green-500 ring-inset" : ""}
                `}
              >
                {cell && PIECE_SYMBOLS[cell.color][cell.type]}
              </button>
            );
          });
        })}
      </div>
    </div>
  );
};
