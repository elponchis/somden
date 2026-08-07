declare global {
  interface Window {
    Kakao: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: {
        sendDefault: (settings: Record<string, unknown>) => void;
      };
    };
  }
}

let sdkPromise: Promise<void> | null = null;

function loadKakaoSdk(): Promise<void> {
  if (window.Kakao?.isInitialized()) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      window.Kakao.init(import.meta.env.VITE_KAKAO_JS_KEY);
      resolve();
    };
    script.onerror = () => reject(new Error('카카오 SDK 로드에 실패했어요.'));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

// 친구 목록 API는 별도 카카오 심사가 필요해 대신 "카카오톡 공유하기"로 코드를 담은 메시지를
// 원하는 친구/채팅방에 직접 보낸다. 받는 쪽은 링크의 code 파라미터로 자동 입력된다.
export async function shareInviteCode(code: string) {
  await loadKakaoSdk();
  const shareUrl = `${window.location.origin}/?code=${code}`;
  window.Kakao.Share.sendDefault({
    objectType: 'text',
    text: `🌱 Somden 정원에 초대해요!\n초대 코드: ${code}\n아래 링크를 누르면 자동으로 연결돼요.`,
    link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
  });
}
