import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';
import { Mascot } from './Mascot';
import { supabase } from '../lib/supabase';
import { shareInviteCode } from '../lib/kakao';

type Step = 'loading' | 'login' | 'role' | 'method' | 'create' | 'enter' | 'success';
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

export function Pairing({ session, onPaired }: { session: Session | null; onPaired: () => void }) {
  const [step, setStep] = useState<Step>('loading');
  const [role, setRole] = useState<Role | null>(null);
  const [myCode, setMyCode] = useState('');
  const [pairingId, setPairingId] = useState<string | null>(null);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 카카오톡 공유 링크(?code=123456)로 들어온 경우, 로그인/역할 선택 후 이 코드로 바로 연결을 시도한다.
  const [inviteCode] = useState(() => new URLSearchParams(window.location.search).get('code') ?? '');

  // 세션이 생기면(카카오 로그인 완료) 프로필을 확인해서 역할 선택을 건너뛸지 판단한다.
  useEffect(() => {
    if (!session) {
      setStep('login');
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.role) {
        setRole(data.role as Role);
        if (inviteCode) {
          attemptJoin(inviteCode, data.role as Role);
        } else {
          setStep('method');
        }
      } else {
        setStep('role');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // 코드 만들기 화면에서는 상대방이 입력해서 status가 linked로 바뀌는 걸 실시간으로 기다린다.
  useEffect(() => {
    if (step !== 'create' || !pairingId) return;
    const channel = supabase
      .channel(`pairing-${pairingId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pairings', filter: `id=eq.${pairingId}` },
        (payload) => {
          if (payload.new.status === 'linked') setStep('success');
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [step, pairingId]);

  async function loginWithKakao() {
    setBusy(true);
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: window.location.origin,
        // account_email은 개인 개발자 카카오 앱에서 기본적으로 막혀있어 요청하지 않음(닉네임만으로 충분).
        scopes: 'profile_nickname',
      },
    });
    // 카카오 로그인 페이지로 리다이렉트되므로 이후 로직은 리다이렉트 복귀 후 useEffect가 이어받는다.
  }

  async function chooseRole(r: Role) {
    if (!session) return;
    setBusy(true);
    setError(null);
    const kakaoName =
      (session.user.user_metadata?.name as string | undefined) ??
      (session.user.user_metadata?.full_name as string | undefined) ??
      '이름 없음';
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, role: r, display_name: kakaoName });
    setBusy(false);
    if (upsertError) {
      setError('프로필 저장에 실패했어요. 다시 시도해주세요.');
      return;
    }
    setRole(r);
    if (inviteCode) {
      attemptJoin(inviteCode, r);
    } else {
      setStep('method');
    }
  }

  async function startCreate() {
    if (!session || !role) return;
    setBusy(true);
    setError(null);
    const code = randomCode();
    const row = role === 'gardener' ? { gardener_id: session.user.id } : { viewer_id: session.user.id };
    const { data, error: insertError } = await supabase
      .from('pairings')
      .insert({ code, status: 'pending', ...row })
      .select('id')
      .single();
    setBusy(false);
    if (insertError || !data) {
      setError('코드 생성에 실패했어요. 다시 시도해주세요.');
      return;
    }
    setMyCode(code);
    setPairingId(data.id);
    setStep('create');
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

  async function attemptJoin(codeStr: string, r: Role) {
    if (!session) return;
    setStep('enter');
    setDigits(codeStr.split('').slice(0, 6));
    setBusy(true);
    setError(null);

    const { data, error: selectError } = await supabase
      .from('pairings')
      .select('id, viewer_id, gardener_id')
      .eq('code', codeStr)
      .eq('status', 'pending')
      .maybeSingle();

    if (selectError || !data) {
      setBusy(false);
      setError('코드를 찾을 수 없어요. 다시 확인해주세요.');
      return;
    }

    const targetField = r === 'gardener' ? 'gardener_id' : 'viewer_id';
    if (data[targetField]) {
      setBusy(false);
      setError('이미 같은 역할로 연결된 코드예요. 상대방과 반대 역할로 시도해주세요.');
      return;
    }

    const { error: updateError } = await supabase
      .from('pairings')
      .update({ [targetField]: session.user.id, status: 'linked' })
      .eq('id', data.id)
      .eq('status', 'pending');

    setBusy(false);
    if (updateError) {
      setError('연결에 실패했어요. 다시 시도해주세요.');
      return;
    }
    setStep('success');
  }

  function joinWithCode() {
    if (!role) return;
    attemptJoin(digits.join(''), role);
  }

  async function shareCode() {
    setError(null);
    try {
      await shareInviteCode(myCode);
    } catch {
      setError('카카오톡 공유를 열지 못했어요. 코드를 직접 알려주셔도 돼요.');
    }
  }

  const enteredComplete = digits.every((d) => d !== '');

  return (
    <div className="flex h-svh w-full flex-col items-center justify-center gap-8 overflow-hidden bg-cream px-6 text-center">
      <AnimatePresence mode="wait">
        {step === 'loading' && (
          <motion.div key="loading" {...fadeSlide}>
            <Mascot size={90} />
          </motion.div>
        )}

        {step === 'login' && (
          <motion.div key="login" {...fadeSlide} className="flex flex-col items-center gap-6">
            <Mascot size={110} />
            <div>
              <h1 className="text-lg font-bold text-ink">Somden에 오신 걸 환영해요</h1>
              <p className="mt-1 text-sm text-ink/60">카카오 계정으로 간편하게 시작해요</p>
            </div>
            <button
              onClick={loginWithKakao}
              disabled={busy}
              className="flex w-64 items-center justify-center gap-2 rounded-2xl bg-[#FEE500] px-5 py-3 text-sm font-semibold text-[#3C1E1E] shadow-[0_6px_16px_rgba(120,110,180,0.15)] disabled:opacity-60"
            >
              💬 카카오로 시작하기
            </button>
          </motion.div>
        )}

        {step === 'role' && (
          <motion.div key="role" {...fadeSlide} className="flex flex-col items-center gap-6">
            <Mascot size={110} />
            <p className="text-sm text-ink/60">누구의 정원인가요?</p>
            <div className="flex gap-3">
              <button
                onClick={() => chooseRole('gardener')}
                disabled={busy}
                className="flex w-32 flex-col items-center gap-1 rounded-3xl bg-cream-deep px-4 py-5 shadow-[0_6px_20px_rgba(120,110,180,0.10)] active:scale-95 disabled:opacity-60"
              >
                <span className="text-2xl">🌿</span>
                <span className="text-sm font-semibold text-ink">부모</span>
                <span className="text-[11px] text-ink/50">정원을 가꿔요</span>
              </button>
              <button
                onClick={() => chooseRole('viewer')}
                disabled={busy}
                className="flex w-32 flex-col items-center gap-1 rounded-3xl bg-cream-deep px-4 py-5 shadow-[0_6px_20px_rgba(120,110,180,0.10)] active:scale-95 disabled:opacity-60"
              >
                <span className="text-2xl">💜</span>
                <span className="text-sm font-semibold text-ink">자녀</span>
                <span className="text-[11px] text-ink/50">정원을 응원해요</span>
              </button>
            </div>
            {error && <p className="text-xs text-cheek-pink">{error}</p>}
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
                onClick={startCreate}
                disabled={busy}
                className="rounded-2xl bg-garden-green px-5 py-3 text-sm font-semibold text-cream shadow-[0_6px_16px_rgba(120,110,180,0.15)] disabled:opacity-60"
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
            {error && <p className="text-xs text-cheek-pink">{error}</p>}
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
            <button
              onClick={shareCode}
              className="flex items-center gap-2 rounded-2xl bg-[#FEE500] px-5 py-2.5 text-sm font-semibold text-[#3C1E1E] shadow-[0_6px_16px_rgba(120,110,180,0.15)]"
            >
              💬 카카오톡으로 코드 보내기
            </button>
            {error && <p className="text-xs text-cheek-pink">{error}</p>}
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
            {error && <p className="text-xs text-cheek-pink">{error}</p>}
            <button
              onClick={joinWithCode}
              disabled={!enteredComplete || busy}
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
