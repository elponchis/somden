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
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
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
