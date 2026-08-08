import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Pairing } from './components/Pairing';
import { GardenHome } from './components/GardenHome';
import { Mascot } from './components/Mascot';
import { supabase } from './lib/supabase';

type AuthState = 'checking' | 'unpaired' | 'paired';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authState, setAuthState] = useState<AuthState>('checking');

  useEffect(() => {
    // 카카오 로그인 리다이렉트로 돌아온 경우(URL에 access_token/code가 붙어있음)가 아니라면,
    // 그냥 URL을 치고 들어온 "일반 방문"으로 보고 세션을 지운다. 데모/발표 중 이전에 로그인한
    // 세션이 남아있어서 로그인 화면(및 로그인 건너뛰기 버튼)을 건너뛰고 아무 데나 랜딩해버리는
    // 문제를 막기 위함 — 매번 URL만 치면 항상 로그인 화면부터 보이도록 보장한다.
    const isOAuthCallback = window.location.hash.includes('access_token') || new URLSearchParams(window.location.search).has('code');
    if (!isOAuthCallback) {
      supabase.auth.signOut().finally(() => setSession(null));
    } else {
      supabase.auth.getSession().then(({ data }) => setSession(data.session));
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => subscription.unsubscribe();
  }, []);

  // 세션이 바뀔 때마다 이미 연결된(linked) 페어링이 있는지 확인해서 온보딩을 건너뛸지 판단한다.
  useEffect(() => {
    if (!session) {
      setAuthState('unpaired');
      return;
    }
    let cancelled = false;
    setAuthState('checking');
    (async () => {
      const { data } = await supabase
        .from('pairings')
        .select('id')
        .eq('status', 'linked')
        .or(`viewer_id.eq.${session.user.id},gardener_id.eq.${session.user.id}`)
        .maybeSingle();
      if (!cancelled) setAuthState(data ? 'paired' : 'unpaired');
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (authState === 'checking') {
    return (
      <div className="flex h-svh w-full items-center justify-center bg-cream">
        <Mascot size={90} />
      </div>
    );
  }

  if (authState === 'unpaired') {
    return <Pairing session={session} onPaired={() => setAuthState('paired')} />;
  }

  return <GardenHome />;
}

export default App;
