import { useCallback } from "react";

/** Универсальная игра «N в ряд»: 4 в ряд (с падением фишек) и Гомоку 5 в ряд. */
export const LINE_GAMES = {
  connect_four: { rows: 6, cols: 7, need: 4, gravity: true },
  gomoku: { rows: 9, cols: 9, need: 5, gravity: false },
} as const;

export type LineGameType = keyof typeof LINE_GAMES;

export const lineInitialState = (type: LineGameType) => {
  const c = LINE_GAMES[type];
  return { board: Array(c.rows * c.cols).fill(null) as (string | null)[] };
};

interface Props {
  type: LineGameType;
  gameState: { board: (string | null)[] };
  isMyTurn: boolean;
  mySymbol: "A" | "B";
  onMove: (newState: Record<string, unknown>, winnerId?: string, draw?: boolean) => void;
  myId: string;
}

const wins = (board: (string | null)[], rows: number, cols: number, need: number, idx: number) => {
  const s = board[idx];
  const r0 = Math.floor(idx / cols), c0 = idx % cols;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    let count = 1;
    for (const sign of [1, -1]) {
      let r = r0 + dr * sign, c = c0 + dc * sign;
      while (r >= 0 && r < rows && c >= 0 && c < cols && board[r * cols + c] === s) {
        count++; r += dr * sign; c += dc * sign;
      }
    }
    if (count >= need) return true;
  }
  return false;
};

export const LineGame = ({ type, gameState, isMyTurn, mySymbol, onMove, myId }: Props) => {
  const { rows, cols, need, gravity } = LINE_GAMES[type];
  const board = gameState.board?.length === rows * cols ? gameState.board : Array(rows * cols).fill(null);

  const click = useCallback((idx: number) => {
    if (!isMyTurn) return;
    let target = idx;
    if (gravity) {
      const col = idx % cols;
      target = -1;
      for (let r = rows - 1; r >= 0; r--) if (!board[r * cols + col]) { target = r * cols + col; break; }
      if (target < 0) return;
    } else if (board[idx]) return;
    const next = [...board];
    next[target] = mySymbol;
    if (wins(next, rows, cols, need, target)) onMove({ board: next }, myId);
    else if (next.every(Boolean)) onMove({ board: next }, undefined, true);
    else onMove({ board: next });
  }, [board, isMyTurn, gravity, rows, cols, need, mySymbol, onMove, myId]);

  const piece = (v: string | null) => (v === "A" ? "🔴" : v === "B" ? "🟡" : "");

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-muted-foreground">
        Ваши фишки: <span className="text-2xl">{piece(mySymbol)}</span> · Собери {need} в ряд!
        {gravity && " Нажми на столбик — фишка упадёт вниз."}
      </p>
      <div className="grid gap-1 p-2 rounded-xl bg-primary/20" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {board.map((v, i) => (
          <button
            key={i}
            onClick={() => click(i)}
            disabled={!isMyTurn}
            className={`${cols > 7 ? "w-8 h-8 text-lg" : "w-10 h-10 sm:w-12 sm:h-12 text-2xl"} rounded-full bg-card flex items-center justify-center`}
          >
            {piece(v)}
          </button>
        ))}
      </div>
    </div>
  );
};
