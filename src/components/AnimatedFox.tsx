export default function AnimatedFox({ size = 150 }: { size?: number }) {
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <style>{`
        @keyframes fox-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes fox-tail { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(14deg)} }
        @keyframes fox-blink { 0%,92%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.1)} }
        @keyframes fox-ear { 0%,85%,100%{transform:rotate(0)} 90%{transform:rotate(-10deg)} }
        @keyframes fox-shadow { 0%,100%{transform:scaleX(1);opacity:.25} 50%{transform:scaleX(.85);opacity:.15} }
        @keyframes fox-spark { 0%,100%{opacity:0;transform:scale(.4)} 50%{opacity:1;transform:scale(1)} }
        .fox-bob{animation:fox-bob 2.6s ease-in-out infinite}
        .fox-tail{transform-origin:62px 150px;animation:fox-tail 1.8s ease-in-out infinite}
        .fox-eye{transform-box:fill-box;transform-origin:center;animation:fox-blink 4s infinite}
        .fox-ear{transform-box:fill-box;transform-origin:bottom right;animation:fox-ear 5s infinite}
        .fox-shadow{transform-box:fill-box;transform-origin:center;animation:fox-shadow 2.6s ease-in-out infinite}
        .fox-spark{transform-box:fill-box;transform-origin:center;animation:fox-spark 2.2s ease-in-out infinite}
      `}</style>
      <svg viewBox="0 0 200 200" width={size} height={size} aria-label="Лисёнок">
        <ellipse className="fox-shadow" cx="100" cy="188" rx="48" ry="7" fill="hsl(var(--foreground))" />
        <g className="fox-spark" style={{ animationDelay: "0s" }}><path d="M24 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="hsl(var(--accent))" /></g>
        <g className="fox-spark" style={{ animationDelay: "1.1s" }}><path d="M172 30l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="hsl(var(--primary))" /></g>
        <g className="fox-bob">
          {/* tail */}
          <g className="fox-tail">
            <path d="M62 150 C20 150 12 105 32 92 C40 120 60 128 78 132 Z" fill="hsl(24 95% 55%)" />
            <path d="M32 92 C26 104 28 116 36 124 C40 112 38 100 32 92 Z" fill="hsl(0 0% 100%)" />
          </g>
          {/* body */}
          <ellipse cx="100" cy="150" rx="40" ry="32" fill="hsl(24 95% 55%)" />
          <ellipse cx="100" cy="158" rx="22" ry="20" fill="hsl(0 0% 100%)" />
          <ellipse cx="82" cy="180" rx="10" ry="6" fill="hsl(20 30% 22%)" />
          <ellipse cx="118" cy="180" rx="10" ry="6" fill="hsl(20 30% 22%)" />
          {/* ears */}
          <g className="fox-ear"><path d="M58 70 L66 22 L96 56 Z" fill="hsl(24 95% 55%)" /><path d="M66 60 L69 36 L86 56 Z" fill="hsl(20 30% 22%)" /></g>
          <path d="M142 70 L134 22 L104 56 Z" fill="hsl(24 95% 55%)" />
          <path d="M134 60 L131 36 L114 56 Z" fill="hsl(20 30% 22%)" />
          {/* head */}
          <path d="M50 72 Q100 30 150 72 Q150 108 100 128 Q50 108 50 72 Z" fill="hsl(24 95% 55%)" />
          <path d="M62 92 Q100 82 138 92 Q126 116 100 128 Q74 116 62 92 Z" fill="hsl(0 0% 100%)" />
          {/* eyes */}
          <g className="fox-eye"><ellipse cx="80" cy="84" rx="6" ry="8" fill="hsl(20 30% 15%)" /><circle cx="82" cy="81" r="2" fill="hsl(0 0% 100%)" /></g>
          <g className="fox-eye"><ellipse cx="120" cy="84" rx="6" ry="8" fill="hsl(20 30% 15%)" /><circle cx="122" cy="81" r="2" fill="hsl(0 0% 100%)" /></g>
          {/* cheeks */}
          <ellipse cx="70" cy="100" rx="7" ry="4" fill="hsl(350 90% 75%)" opacity=".7" />
          <ellipse cx="130" cy="100" rx="7" ry="4" fill="hsl(350 90% 75%)" opacity=".7" />
          {/* nose & smile */}
          <ellipse cx="100" cy="104" rx="6" ry="4.5" fill="hsl(20 30% 15%)" />
          <path d="M92 112 Q100 120 108 112" stroke="hsl(20 30% 15%)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
