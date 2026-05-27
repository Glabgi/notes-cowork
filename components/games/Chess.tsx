'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Chess as ChessEngine } from 'chess.js';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';

type Piece = { type: string; color: string } | null;
type Board = (Piece)[][];

// Use single set of black Unicode symbols for both colors, style via CSS
const PIECE_SYMBOLS: Record<string, string> = {
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];

// Board colors
const LIGHT_CELL = '#E8EDF2';
const DARK_CELL  = '#6B8FA8';

export default function ChessGame() {
  const [engine] = useState(() => new ChessEngine());
  const [board, setBoard] = useState<Board>(engine.board());
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [status, setStatus] = useState('Ход белых');
  const [history, setHistory] = useState<string[]>([]);
  const [promotionPending, setPromotionPending] = useState<string | null>(null);
  const [vsBot, setVsBot] = useState(true);
  const [gameOver, setGameOver] = useState(false);

  const updateGame = useCallback(() => {
    setBoard(engine.board());
    setHistory(engine.history({ verbose: false }));
    if (engine.isCheckmate()) {
      setStatus(`Мат! ${engine.turn() === 'w' ? 'Чёрные' : 'Белые'} победили!`);
      setGameOver(true);
    } else if (engine.isDraw()) {
      setStatus('Ничья!');
      setGameOver(true);
    } else if (engine.isCheck()) {
      setStatus(`Шах! Ход ${engine.turn() === 'w' ? 'белых' : 'чёрных'}`);
    } else {
      setStatus(`Ход ${engine.turn() === 'w' ? 'белых' : 'чёрных'}`);
    }
  }, [engine]);

  const makeBotMove = useCallback(() => {
    if (engine.turn() !== 'b' || engine.isGameOver()) return;
    const moves = engine.moves();
    if (!moves.length) return;
    const captures = moves.filter(m => m.includes('x'));
    const checks   = moves.filter(m => m.includes('+'));
    const move = captures.length > 0
      ? captures[Math.floor(Math.random() * captures.length)]
      : checks.length > 0
      ? checks[Math.floor(Math.random() * checks.length)]
      : moves[Math.floor(Math.random() * moves.length)];
    engine.move(move);
    updateGame();
    setSelected(null);
    setLegalMoves([]);
  }, [engine, updateGame]);

  useEffect(() => {
    if (vsBot && engine.turn() === 'b' && !engine.isGameOver()) {
      const t = setTimeout(makeBotMove, 500);
      return () => clearTimeout(t);
    }
  }, [board, vsBot, makeBotMove, engine]);

  const handleCellClick = (rank: number, file: number) => {
    if (gameOver) return;
    if (vsBot && engine.turn() === 'b') return;
    const square = FILES[file] + RANKS[rank] as any;
    const piece = engine.get(square);

    if (selected) {
      const [selRank, selFile] = selected;
      const fromSq = FILES[selFile] + RANKS[selRank];
      const movingPiece = engine.get(fromSq as any);
      if (movingPiece?.type === 'p') {
        const targetRank = parseInt(RANKS[rank]);
        const isPromotion = (movingPiece.color === 'w' && targetRank === 8) || (movingPiece.color === 'b' && targetRank === 1);
        if (isPromotion) { setPromotionPending(`${fromSq}${square}`); return; }
      }
      try {
        const result = engine.move({ from: fromSq as any, to: square });
        if (result) { updateGame(); setSelected(null); setLegalMoves([]); return; }
      } catch {}
      if (piece && piece.color === engine.turn()) {
        setSelected([rank, file]);
        const moves = engine.moves({ square, verbose: true });
        setLegalMoves((moves as any[]).map(m => m.to));
      } else { setSelected(null); setLegalMoves([]); }
    } else {
      if (piece && piece.color === engine.turn()) {
        setSelected([rank, file]);
        const moves = engine.moves({ square, verbose: true });
        setLegalMoves((moves as any[]).map(m => m.to));
      }
    }
  };

  const handlePromotion = (p: string) => {
    if (!promotionPending) return;
    try {
      engine.move({ from: promotionPending.slice(0,2) as any, to: promotionPending.slice(2,4) as any, promotion: p as any });
      updateGame();
    } catch {}
    setPromotionPending(null); setSelected(null); setLegalMoves([]);
  };

  const resetGame = () => {
    engine.reset(); updateGame(); setSelected(null); setLegalMoves([]);
    setGameOver(false); setPromotionPending(null);
  };

  const lastMoveSquares = engine.history({ verbose: true }).slice(-1)[0];
  const lastFrom = lastMoveSquares?.from;
  const lastTo   = lastMoveSquares?.to;

  let checkKingSquare: string | null = null;
  if (engine.isCheck()) {
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = FILES[f] + RANKS[r];
        const p = engine.get(sq as any);
        if (p?.type === 'k' && p.color === engine.turn()) checkKingSquare = sq;
      }
    }
  }

  const isCheckmate = engine.isCheckmate();
  const isDraw = engine.isDraw();

  return (
    <div className="flex gap-4 p-4 flex-wrap justify-center">
      <div className="flex flex-col gap-3">
        {/* Status */}
        <div className={cn(
          'text-sm text-center py-2 px-4 rounded-[12px] font-medium border',
          isCheckmate ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]'
          : isDraw    ? 'bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--text-secondary)]'
          : engine.isCheck() ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
          : 'bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--text-primary)]'
        )}>{status}</div>

        {/* Board */}
        <div className="relative rounded-[12px] overflow-hidden border border-[var(--border)] shadow-[0_8px_32px_rgba(15,23,42,0.10),0_4px_12px_rgba(15,23,42,0.06)]">
          {board.map((row, ri) => (
            <div key={ri} className="flex">
              {row.map((piece, fi) => {
                const sq = FILES[fi] + RANKS[ri];
                const isSelected  = selected?.[0] === ri && selected?.[1] === fi;
                const isLegal     = legalMoves.includes(sq);
                const isLight     = (ri + fi) % 2 === 0;
                const isLastMove  = sq === lastFrom || sq === lastTo;
                const isInCheck   = sq === checkKingSquare;

                let cellBg = isLight ? LIGHT_CELL : DARK_CELL;
                if (isSelected) cellBg = '#FEF08A';

                return (
                  <div
                    key={fi}
                    onClick={() => handleCellClick(ri, fi)}
                    className="w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] flex items-center justify-center cursor-pointer relative select-none"
                    style={{ background: cellBg }}
                  >
                    {/* Last move overlay */}
                    {isLastMove && !isSelected && (
                      <div className="absolute inset-0 bg-[#FDE68A]/50 pointer-events-none" />
                    )}
                    {/* Check overlay */}
                    {isInCheck && (
                      <div className="absolute inset-0 bg-[#FEE2E2]/70 pointer-events-none" />
                    )}
                    {/* Legal move: ring on occupied */}
                    {isLegal && piece && (
                      <div className="absolute inset-0 ring-inset ring-4 ring-[#2563EB]/50 pointer-events-none" />
                    )}
                    {/* Legal move: dot on empty */}
                    {isLegal && !piece && (
                      <div className="absolute w-3.5 h-3.5 rounded-full bg-[#2563EB]/40 border-2 border-[#2563EB]/60 pointer-events-none z-10" />
                    )}
                    {/* Piece */}
                    {piece && (
                      <span
                        className="select-none z-20 leading-none"
                        style={piece.color === 'w' ? {
                          fontSize: '32px',
                          color: '#FFFFFF',
                          WebkitTextStroke: '1.5px #1E293B',
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
                          fontWeight: 900,
                        } : {
                          fontSize: '32px',
                          color: '#1E293B',
                          WebkitTextStroke: '0.5px #475569',
                          filter: 'drop-shadow(0 1px 1px rgba(255,255,255,0.3))',
                          fontWeight: 900,
                        }}
                      >
                        {PIECE_SYMBOLS[piece.type]}
                      </span>
                    )}
                    {/* Coordinates */}
                    {fi === 0 && (
                      <span className={cn('absolute top-0.5 left-0.5 text-[11px] font-bold leading-none',
                        isLight ? 'text-[#6B8FA8]' : 'text-[#E8EDF2]')}>
                        {RANKS[ri]}
                      </span>
                    )}
                    {ri === 7 && (
                      <span className={cn('absolute bottom-0.5 right-0.5 text-[11px] font-bold leading-none',
                        isLight ? 'text-[#6B8FA8]' : 'text-[#E8EDF2]')}>
                        {FILES[fi]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Promotion picker */}
        {promotionPending && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 justify-center p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[16px] shadow-[var(--shadow-md)]">
            <p className="text-xs text-[var(--text-muted)] w-full text-center mb-1">Выберите фигуру:</p>
            {['q','r','b','n'].map(p => (
              <button key={p} onClick={() => handlePromotion(p)}
                className="w-12 h-12 bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-[12px] text-3xl flex items-center justify-center transition-all">
                <span style={{ fontSize: '24px', color: '#1E293B', WebkitTextStroke: '0.5px #475569', fontWeight: 900 }}>
                  {PIECE_SYMBOLS[p]}
                </span>
              </button>
            ))}
          </motion.div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={resetGame}>Новая игра</Button>
          <Button variant="secondary" className="flex-1" onClick={() => setVsBot(!vsBot)}>
            {vsBot ? <><Bot size={14} /> Бот</> : <><User size={14} /> Человек</>}
          </Button>
        </div>
      </div>

      {/* Move history */}
      <div className="w-36 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[16px] p-3">
        <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2">Ходы</p>
        <div className="space-y-0.5 max-h-80 overflow-y-auto text-xs">
          {history.map((move, i) => (
            <div key={i} className={cn('px-1.5 py-0.5 rounded-[6px] font-mono',
              i === history.length - 1
                ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                : 'text-[var(--text-primary)]')}>
              {i % 2 === 0 && <span className="text-[var(--text-muted)] mr-1">{Math.floor(i/2)+1}.</span>}
              {move}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
