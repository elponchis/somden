// 정원의 모든 코드 오브젝트(마스코트·나무·연못·아이템)가 공유하는 렌더링 규칙:
// (1) deriveShades로 만든 radial-gradient 3톤 음영, (2) 이 연필 질감 필터,
// (3) 접지 그림자, (4) 뮤트 파스텔 채도. 새 정원 오브젝트를 그릴 땐 이 셋을 그대로 재사용할 것.

export function PencilFilter({ id }: { id: string }) {
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  );
}

export function GroundShadow({
  cx,
  cy,
  rx,
  ry,
  opacity = 0.28,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  opacity?: number;
}) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#4A3A28" opacity={opacity} />;
}
