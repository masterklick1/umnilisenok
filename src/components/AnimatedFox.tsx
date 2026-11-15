import { useId } from "react";
import "./AnimatedFox.css";

export default function AnimatedFox({ size = 150 }: { size?: number }) {
  const id = useId();
  const fur = `url(#${id}-fur)`;
  const tail = `url(#${id}-tail)`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 220" width={size} role="img" aria-label="Лисёнок"
      className="fox-mascot mx-auto block h-auto max-w-full">
      <defs>
        <linearGradient id={`${id}-fur`} x1="0%" y1="0%" x2="80%" y2="100%">
          <stop stopColor="#ffad5e" />
          <stop offset="1" stopColor="#e66d37" />
        </linearGradient>
        <linearGradient id={`${id}-tail`} x1="100%" y1="100%" x2="5%" y2="10%">
          <stop stopColor="#d45c31" />
          <stop offset="1" stopColor="#fb9e4d" />
        </linearGradient>
      </defs>

      <ellipse cx="126" cy="199" rx="88" ry="12" fill="#f5cf9a" opacity=".45" />
      <ellipse cx="128" cy="199" rx="57" ry="6" fill="#a35735" opacity=".13" />
      <path d="M40 169c-4-7-9-8-13-9m11 17c-5-3-10-3-14-2m170-8c1-8 5-13 11-16m-8 28c5-5 11-6 17-6"
        fill="none" stroke="#c6a282" strokeWidth="2.5" strokeLinecap="round" />
      <g className="fox-mascot__tail">
        <path d="M103 175C80 197 42 194 27 170C13 148 20 119 38 102C40 125 50 135 67 141C86 147 104 151 103 175Z" fill={tail} />
        <path d="M27 170C13 148 20 119 38 102C40 119 46 128 54 135L42 134L45 147L34 143L35 154L23 151C23 158 24 164 27 170Z" fill="#fff0d6" />
      </g>

      <g className="fox-mascot__body">
        <path d="M88 177C87 151 101 128 130 129C156 129 174 155 174 174C174 191 158 200 130 200C104 200 88 193 88 177Z" fill={fur} />
        <path d="M108 156C109 143 121 136 131 137C145 138 153 150 153 163C153 180 142 190 130 190C117 190 107 175 108 156Z" fill="#fff0d6" />
        <path d="M104 167C103 180 98 187 100 191C103 197 119 197 123 190L125 174M157 167C158 180 163 187 161 191C158 197 142 197 138 190L136 174"
          fill="#ea7a41" stroke="#cf653a" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M101 185C108 183 115 186 123 190C119 197 103 197 100 191ZM160 185C153 183 146 186 138 190C142 197 158 197 161 191Z" fill="#82452f" />

        <g className="fox-mascot__head">
          <g className="fox-mascot__ear">
            <path d="M82 83C72 61 72 33 78 23C89 21 113 39 125 58Z" fill={fur} />
            <path d="M84 67C80 53 79 40 82 33C91 35 104 45 112 56Z" fill="#ac5543" />
            <path d="M86 68L93 55L99 61L105 56L110 62Z" fill="#ffd1a2" />
          </g>
          <path d="M141 58C151 42 171 24 183 22C190 32 191 61 181 84Z" fill={fur} />
          <path d="M154 57C161 47 174 37 180 34C184 43 181 60 177 67Z" fill="#ac5543" />
          <path d="M156 60L163 56L167 62L173 57L176 68Z" fill="#ffd1a2" />

          <path d="M74 111C73 82 95 55 130 54C164 54 188 79 190 108L201 125L189 126L195 136L181 134C167 153 148 161 131 161C108 160 89 150 81 136L67 138L73 128L61 126Z" fill={fur} />
          <path d="M73 113C97 106 112 114 131 134C148 114 166 105 190 112L201 125L189 126L195 136L181 134C165 153 147 161 131 161C110 161 92 150 81 136L67 138L73 128L61 126Z" fill="#fff0d6" />
          <path d="M112 62Q126 51 141 56Q133 64 120 67" fill="#ffb675" opacity=".8" />
          <path d="M93 87Q101 81 109 86M152 86Q160 81 168 87" fill="none" stroke="#ad5939" strokeWidth="2.5" strokeLinecap="round" />
          <g className="fox-mascot__eyes">
            <ellipse cx="103" cy="100" rx="7.4" ry="10" fill="#402625" />
            <circle cx="105" cy="97" r="2.7" fill="white" />
            <ellipse cx="159" cy="100" rx="7.4" ry="10" fill="#402625" />
            <circle cx="161" cy="97" r="2.7" fill="white" />
          </g>
          <ellipse cx="91" cy="123" rx="9" ry="4.5" fill="#f39183" opacity=".65" />
          <ellipse cx="172" cy="123" rx="9" ry="4.5" fill="#f39183" opacity=".65" />
          <path d="M122 126Q131 121 140 126Q141 132 131 136Q122 132 122 126Z" fill="#402625" />
          <path d="M131 136v4m-9-1q4 6 9 1q5 5 9-1" fill="none" stroke="#58332b" strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
