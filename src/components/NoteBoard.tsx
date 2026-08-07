import { useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type StrokePath = { d: string; color: string; width: number };
type StickerPlacement = { id: number; emoji: string; xPct: number; yPct: number };
type Vec = { x: number; y: number };
type SentNote = { strokes: StrokePath[]; stickers: StickerPlacement[] };

const PENS = [
  { color: '#2E3A28', label: '잉크' },
  { color: '#534AB7', label: '보라' },
  { color: '#EE9A94', label: '핑크' },
];

const STICKER_EMOJIS = ['🌸', '💐', '🦋', '⭐', '💝', '🌈'];

const VB_W = 300;
const VB_H = 170;

function pointsToPath(points: Vec[]) {
  return points.reduce(
    (d, p, i) => d + (i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    '',
  );
}

// TODO: 실서비스에서는 notes 테이블에 paths(jsonb)로 저장 + realtime 구독(섹션 7). 지금은 로컬 데모 상태.
// 손글씨는 인식(OCR) 대상이 아니라 획 좌표를 그대로 저장해 상대방 화면에서 "쓰는 순서" 그대로 리플레이한다.
export function NoteBoard({
  onSend,
  onStickerPlaced,
}: {
  onSend?: () => void;
  onStickerPlaced?: () => void;
} = {}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [color, setColor] = useState(PENS[0].color);
  const [strokes, setStrokes] = useState<StrokePath[]>([]);
  const [noteStickers, setNoteStickers] = useState<StickerPlacement[]>([]);
  const [armedSticker, setArmedSticker] = useState<string | null>(null);
  const [currentPoints, setCurrentPoints] = useState<Vec[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [sentNote, setSentNote] = useState<SentNote | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  function toLocalPoint(e: PointerEvent<SVGSVGElement>): Vec {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * VB_W,
      y: ((e.clientY - rect.top) / rect.height) * VB_H,
    };
  }

  function handlePointerDown(e: PointerEvent<SVGSVGElement>) {
    svgRef.current?.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setCurrentPoints([toLocalPoint(e)]);
  }

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!isDrawing) return;
    setCurrentPoints((pts) => [...pts, toLocalPoint(e)]);
  }

  function handlePointerUp() {
    if (isDrawing && currentPoints.length > 1) {
      setStrokes((list) => [...list, { d: pointsToPath(currentPoints), color, width: 4 }]);
    }
    setIsDrawing(false);
    setCurrentPoints([]);
  }

  function placeSticker(e: ReactMouseEvent<HTMLDivElement>) {
    if (!armedSticker) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const xPct = Math.min(92, Math.max(8, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.min(88, Math.max(10, ((e.clientY - rect.top) / rect.height) * 100));
    const isFirst = noteStickers.length === 0;
    setNoteStickers((list) => [...list, { id: Date.now() + Math.random(), emoji: armedSticker, xPct, yPct }]);
    setArmedSticker(null);
    if (isFirst) onStickerPlaced?.();
  }

  function clearNote() {
    setStrokes([]);
    setNoteStickers([]);
    setArmedSticker(null);
  }

  function sendNote() {
    if (strokes.length === 0 && noteStickers.length === 0) return;
    setSentNote({ strokes, stickers: noteStickers });
    setStrokes([]);
    setNoteStickers([]);
    setReplayKey((k) => k + 1);
    setToast('쪽지를 보냈어요 ✏️');
    setTimeout(() => setToast(null), 1600);
    onSend?.();
  }

  return (
    <div className="flex h-full flex-col items-center gap-3 overflow-y-auto px-4 pt-1 pb-3">
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-3xl bg-cream/80 px-4 py-2.5 shadow-[0_6px_20px_rgba(120,110,180,0.10)] backdrop-blur-sm">
        {PENS.map((p) => (
          <button
            key={p.color}
            onClick={() => {
              setColor(p.color);
              setArmedSticker(null);
            }}
            aria-label={p.label}
            className="h-6 w-6 rounded-full transition-transform"
            style={{
              backgroundColor: p.color,
              outline: !armedSticker && color === p.color ? '2px solid #534AB7' : 'none',
              outlineOffset: 2,
              transform: !armedSticker && color === p.color ? 'scale(1.15)' : 'scale(1)',
            }}
          />
        ))}
        <span className="mx-0.5 h-5 w-px bg-ink/10" />
        {STICKER_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => setArmedSticker((cur) => (cur === emoji ? null : emoji))}
            className="flex h-6 w-6 items-center justify-center rounded-full text-sm transition-transform"
            style={{
              background: armedSticker === emoji ? 'var(--color-soft-purple)' : 'transparent',
              transform: armedSticker === emoji ? 'scale(1.2)' : 'scale(1)',
            }}
          >
            {emoji}
          </button>
        ))}
        <button onClick={clearNote} className="ml-1 text-xs font-medium text-ink/50">
          지우기
        </button>
      </div>
      {armedSticker && <p className="text-[11px] text-ink/50">쪽지를 탭해서 스티커를 붙여주세요 🎀</p>}

      <div
        ref={canvasRef}
        onClick={placeSticker}
        className="relative w-full max-w-sm rounded-3xl bg-cream-deep/60 shadow-inner"
        style={{ cursor: armedSticker ? 'copy' : undefined }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {strokes.map((s, i) => (
            <path key={i} d={s.d} stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {isDrawing && currentPoints.length > 1 && (
            <path d={pointsToPath(currentPoints)} stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
        {noteStickers.map((s) => (
          <motion.span
            key={s.id}
            className="pointer-events-none absolute select-none text-2xl"
            style={{ left: `${s.xPct}%`, top: `${s.yPct}%`, marginLeft: -14, marginTop: -14 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
          >
            {s.emoji}
          </motion.span>
        ))}
      </div>

      <button
        onClick={sendNote}
        disabled={strokes.length === 0 && noteStickers.length === 0}
        className="rounded-full bg-garden-green px-6 py-2 text-sm font-semibold text-cream shadow-[0_6px_16px_rgba(120,110,180,0.15)] disabled:opacity-40"
      >
        쪽지 보내기 ✉️
      </button>

      {sentNote && (
        <div className="w-full max-w-sm rounded-3xl bg-cream/80 px-4 py-3 shadow-[0_6px_20px_rgba(120,110,180,0.10)]">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-ink/70">보낸 쪽지 · 획 리플레이</span>
            <button onClick={() => setReplayKey((k) => k + 1)} className="text-xs font-medium text-purple-ink">
              다시보기
            </button>
          </div>
          <div className="relative">
            <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="block w-full rounded-2xl bg-cream-deep/40">
              {sentNote.strokes.map((s, i) => (
                <motion.path
                  key={`${replayKey}-${i}`}
                  d={s.d}
                  stroke={s.color}
                  strokeWidth={s.width}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  strokeDasharray={1}
                  initial={{ strokeDashoffset: 1 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.45, ease: 'easeInOut' }}
                />
              ))}
            </svg>
            {sentNote.stickers.map((s, i) => (
              <motion.span
                key={`${replayKey}-sticker-${s.id}`}
                className="pointer-events-none absolute select-none text-2xl"
                style={{ left: `${s.xPct}%`, top: `${s.yPct}%`, marginLeft: -14, marginTop: -14 }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14, delay: sentNote.strokes.length * 0.45 + i * 0.15 }}
              >
                {s.emoji}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-full bg-purple-ink px-4 py-1.5 text-xs font-medium text-cream"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
