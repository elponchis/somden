import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mascot } from './Mascot';

type Step = 'role' | 'method' | 'create' | 'enter' | 'success';
type Role = 'gardener' | 'viewer';

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25, ease: 'easeOut' as const },
};

// TODO: 실서비스에서는 pairings 테이블에 code insert/update로 연결(섹션 7).
// 지금은 백엔드 연결 전이라 "연결됨으로 표시"로 성공 상태를 시뮬레이션하는 데모 플로우.
export function Pairing({ onPaired }: { onPaired: () => void }) {
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<Role | null>(null);
  const [myCode] = useState(randomCode);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function selectRole(r: Role) {
    setRole(r);
    setStep('method');
  }

  function handleDigitChange(index: number, value: string) {
    const v = value.replace(/[^0-9]/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = v;
      return next;
    });
    if (v && index < 5) inputRefs.current[index + 1]?.focus();
  }

  const enteredComplete = digits.every((d) => d !== '');

  return (
    <div className="flex h-svh w-full flex-col items-center justify-center gap-8 overflow-hidden bg-cream px-6 text-center">
      <AnimatePresence mode="wait">
        {step === 'role' && (
          <motion.div key="role" {...fadeSlide} className="flex flex-col items-center gap-6">
            <Mascot size={110} />
            <div>
              <h1 className="text-lg font-bold text-ink">Somden에 오신 걸 환영해요</h1>
              <p className="mt-1 text-sm text-ink/60">누구의 정원인가요?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => selectRole('gardener')}
                className="flex w-32 flex-col items-center gap-1 rounded-3xl bg-cream-deep px-4 py-5 shadow-[0_6px_20px_rgba(120,110,180,0.10)] active:scale-95"
              >
                <span className="text-2xl">🌿</span>
                <span className="text-sm font-semibold text-ink">부모</span>
                <span className="text-[11px] text-ink/50">정원을 가꿔요</span>
              </button>
              <button
                onClick={() => selectRole('viewer')}
                className="flex w-32 flex-col items-center gap-1 rounded-3xl bg-cream-deep px-4 py-5 shadow-[0_6px_20px_rgba(120,110,180,0.10)] active:scale-95"
              >
                <span className="text-2xl">💜</span>
                <span className="text-sm font-semibold text-ink">자녀</span>
                <span className="text-[11px] text-ink/50">정원을 응원해요</span>
              </button>
            </div>
          </motion.div>
        )}

        {step === 'method' && (
          <motion.div key="method" {...fadeSlide} className="flex flex-col items-center gap-5">
            <span className="rounded-full bg-cream-deep px-3 py-1 text-xs font-medium text-ink/60">
              {role === 'gardener' ? '🌿 부모' : '💜 자녀'}로 시작해요
            </span>
            <h1 className="text-lg font-bold text-ink">어떻게 연결할까요?</h1>
            <div className="flex w-64 flex-col gap-2.5">
              <button
                onClick={() => setStep('create')}
                className="rounded-2xl bg-garden-green px-5 py-3 text-sm font-semibold text-cream shadow-[0_6px_16px_rgba(120,110,180,0.15)]"
              >
                코드 만들기
              </button>
              <button
                onClick={() => setStep('enter')}
                className="rounded-2xl bg-cream-deep px-5 py-3 text-sm font-semibold text-ink"
              >
                받은 코드 입력하기
              </button>
            </div>
            <button onClick={() => setStep('role')} className="text-xs text-ink/40">
              ← 뒤로
            </button>
          </motion.div>
        )}

        {step === 'create' && (
          <motion.div key="create" {...fadeSlide} className="flex flex-col items-center gap-5">
            <h1 className="text-base font-bold text-ink">이 코드를 상대방에게 알려주세요</h1>
            <div className="rounded-3xl bg-cream-deep px-8 py-5 text-4xl font-bold tracking-[0.3em] text-purple-ink">
              {myCode}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink/50">
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                🌱
              </motion.span>
              상대방이 코드를 입력하길 기다리는 중이에요
            </div>
            {/* TODO: 실서비스에서는 pairings.status가 realtime으로 'linked' 되는 걸 구독해서 자동 전환 */}
            <button
              onClick={() => setStep('success')}
              className="rounded-2xl bg-garden-green px-5 py-2.5 text-sm font-semibold text-cream shadow-[0_6px_16px_rgba(120,110,180,0.15)]"
            >
              연결됨으로 표시 (데모)
            </button>
            <button onClick={() => setStep('method')} className="text-xs text-ink/40">
              ← 뒤로
            </button>
          </motion.div>
        )}

        {step === 'enter' && (
          <motion.div key="enter" {...fadeSlide} className="flex flex-col items-center gap-5">
            <h1 className="text-base font-bold text-ink">받은 6자리 코드를 입력하세요</h1>
            <div className="flex gap-2">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  value={d}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  maxLength={1}
                  inputMode="numeric"
                  className="h-12 w-9 rounded-xl bg-cream-deep text-center text-lg font-bold text-ink outline-none focus:ring-2 focus:ring-garden-green"
                />
              ))}
            </div>
            <button
              onClick={() => setStep('success')}
              disabled={!enteredComplete}
              className="rounded-2xl bg-garden-green px-5 py-2.5 text-sm font-semibold text-cream shadow-[0_6px_16px_rgba(120,110,180,0.15)] disabled:opacity-40"
            >
              연결하기
            </button>
            <button onClick={() => setStep('method')} className="text-xs text-ink/40">
              ← 뒤로
            </button>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div key="success" {...fadeSlide} className="flex flex-col items-center gap-4">
            <Mascot size={130} hopping />
            <h1 className="text-lg font-bold text-ink">🎉 연결됐어요!</h1>
            <p className="text-sm text-ink/60">이제 함께 정원을 키워볼까요?</p>
            <button
              onClick={onPaired}
              className="mt-2 rounded-2xl bg-garden-green px-8 py-3 text-sm font-semibold text-cream shadow-[0_6px_16px_rgba(120,110,180,0.15)]"
            >
              시작하기
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
