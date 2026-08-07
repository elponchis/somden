import { useEffect, useState } from 'react';

// 실제 서비스에서는 8시간마다 물방울 1개 자동 충전. 발표 데모에서 8시간을 기다릴 수
// 없으므로 DEMO_MODE일 때 같은 로직을 8초로 압축한다. 실제 값으로 되돌릴 땐
// REAL_COOLDOWN_MS만 쓰도록 데모 토글을 끄면 된다.
export const REAL_COOLDOWN_MS = 8 * 60 * 60 * 1000;
export const DEMO_COOLDOWN_MS = 8 * 1000;
export const DROPLET_CAP = 5;

export function formatCooldown(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// TODO: 실서비스에서는 Supabase에 마지막 충전 시각을 저장해 새로고침/재접속에도
// 이어지게 해야 함. 지금은 로컬 state뿐이라 새로고침하면 초기화된다.
export function useDroplets(cooldownMs: number) {
  // 데모 편의상 씨앗과 마찬가지로 100개로 시작 — 캡(DROPLET_CAP)은 이후 자동 충전에만 적용된다.
  const [droplets, setDroplets] = useState(100);
  const [nextRefillAt, setNextRefillAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (droplets >= DROPLET_CAP) {
      if (nextRefillAt !== null) setNextRefillAt(null);
      return;
    }
    if (nextRefillAt === null) {
      setNextRefillAt(Date.now() + cooldownMs);
      return;
    }
    if (now >= nextRefillAt) {
      setDroplets((d) => Math.min(DROPLET_CAP, d + 1));
      setNextRefillAt(Date.now() + cooldownMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, droplets]);

  function spendDroplet() {
    setDroplets((d) => Math.max(0, d - 1));
  }

  // 캡은 "가만히 둬도 차오르는" 자동 충전에만 적용된다. 퀘스트 보상 등으로 얻는 물방울은
  // 캡을 넘어도 그대로 더해진다(안 그러면 캡 이상 보유 중일 때 보상을 받고 오히려 줄어드는
  // 버그가 생김).
  function addDroplets(n: number) {
    setDroplets((d) => d + n);
  }

  // 데모용 초기화 — 씨앗과 함께 눌러서 바로 다시 100개로.
  function reset(n = 100) {
    setDroplets(n);
    setNextRefillAt(n < DROPLET_CAP ? Date.now() + cooldownMs : null);
  }

  const remainingMs = nextRefillAt ? Math.max(0, nextRefillAt - now) : 0;
  const progress = droplets >= DROPLET_CAP ? 1 : 1 - remainingMs / cooldownMs;

  return { droplets, remainingMs, progress, spendDroplet, addDroplets, reset };
}
