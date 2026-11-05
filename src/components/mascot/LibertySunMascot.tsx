import React from 'react';
import { useReducedMotion } from 'motion/react';

export type MascotState =
  | 'idle'
  | 'greeting'
  | 'talking'
  | 'celebrating'
  | 'thinking'
  | 'goodbye';

interface LibertySunMascotProps {
  state?: MascotState;
  size?: number; // Tamanho base em pixels (ex.: 100, 130, 160, 200)
  className?: string;
  onClick?: () => void;
}

/**
 * Mascote Oficial do LibertyBag: "Solzinho" (Rubber Hose 1930s)
 * - Cabeça circular de sol com raios solares dourados
 * - Óculos escuros retrô dos anos 30 com reflexo vintage
 * - Braços e pernas de mangueira (Rubber Hose)
 * - Luvas brancas de 4 dedos com punhos e 3 listras
 * - Sapatos vintage em Azul Royal (#2346C8) com sola branca
 * - O braço direito agora é renderizado na frente do rosto para a pose de "pensando" (mão no queixo)
 */
export const LibertySunMascot: React.FC<LibertySunMascotProps> = ({
  state = 'idle',
  size = 140,
  className = '',
  onClick
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${
        onClick ? 'cursor-pointer hover-lift' : ''
      } ${className}`}
      onClick={onClick}
      role="img"
      aria-label={`Mascote do LibertyBag no estado ${state}`}
    >
      <svg
        width={size}
        height={size * 1.15}
        viewBox="0 0 240 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          <style>{`
            .rubber-black-line {
              stroke: #121212;
              stroke-width: 4px;
              stroke-linecap: round;
              stroke-linejoin: round;
            }
            .rubber-body {
              transform-origin: 120px 210px;
              ${
                shouldReduceMotion
                  ? ''
                  : state === 'idle'
                  ? 'animation: mascot-idle 2.4s ease-in-out infinite;'
                  : state === 'greeting'
                  ? 'animation: mascot-greeting 2s ease-in-out infinite;'
                  : state === 'talking'
                  ? 'animation: mascot-talking 1.6s ease-in-out infinite;'
                  : state === 'celebrating'
                  ? 'animation: mascot-celebrate 0.85s ease-in-out infinite;'
                  : state === 'thinking'
                  ? 'animation: mascot-think 2.8s ease-in-out infinite;'
                  : 'animation: mascot-goodbye 2.2s ease-in-out infinite;'
              }
            }
            .mascot-head {
              transform-origin: 120px 110px;
              ${
                shouldReduceMotion
                  ? ''
                  : state === 'celebrating'
                  ? 'animation: head-bob 0.85s ease-in-out infinite;'
                  : state === 'thinking'
                  ? 'animation: head-tilt 2.8s ease-in-out infinite;'
                  : 'animation: head-gentle 3.6s ease-in-out infinite;'
              }
            }
            .mascot-shadow {
              transform-origin: 120px 255px;
              ${
                shouldReduceMotion
                  ? ''
                  : state === 'celebrating'
                  ? 'animation: shadow-jump 0.85s ease-in-out infinite;'
                  : 'animation: shadow-scale 2.4s ease-in-out infinite;'
              }
            }
            .arm-left {
              transform-origin: 75px 125px;
              ${
                shouldReduceMotion
                  ? ''
                  : state === 'celebrating'
                  ? 'animation: arm-cheer-left 0.85s ease-in-out infinite alternate;'
                  : state === 'greeting' || state === 'goodbye'
                  ? 'animation: arm-wave 1.1s ease-in-out infinite alternate;'
                  : 'animation: arm-breathe-left 2.4s ease-in-out infinite;'
              }
            }
            .arm-right {
              transform-origin: 165px 125px;
              ${
                shouldReduceMotion
                  ? ''
                  : state === 'celebrating'
                  ? 'animation: arm-cheer-right 0.85s ease-in-out infinite alternate;'
                  : state === 'thinking'
                  ? 'animation: arm-chin 2.8s ease-in-out infinite;'
                  : state === 'talking'
                  ? 'animation: arm-gesticulate 1.6s ease-in-out infinite alternate;'
                  : 'animation: arm-breathe-right 2.4s ease-in-out infinite;'
              }
            }
            .sun-rays {
              transform-origin: 120px 110px;
              ${shouldReduceMotion ? '' : 'animation: rays-rotate 28s linear infinite;'}
            }
            .glasses-shine {
              ${shouldReduceMotion ? '' : 'animation: glasses-twinkle 4s ease-in-out infinite;'}
            }

            @keyframes mascot-idle {
              0%, 100% { transform: scale(1, 1) translateY(0); }
              50% { transform: scale(1.03, 0.97) translateY(2px); }
            }
            @keyframes mascot-greeting {
              0%, 100% { transform: translateY(0) rotate(0deg); }
              30% { transform: translateY(-4px) rotate(-3deg); }
              70% { transform: translateY(1px) rotate(2deg); }
            }
            @keyframes mascot-talking {
              0%, 100% { transform: translateY(0) rotate(0deg); }
              25% { transform: translateY(-3px) rotate(2.5deg); }
              75% { transform: translateY(1px) rotate(-2deg); }
            }
            @keyframes mascot-celebrate {
              0%, 100% { transform: scale(1.08, 0.92) translateY(3px); }
              50% { transform: scale(0.94, 1.06) translateY(-14px); }
            }
            @keyframes mascot-think {
              0%, 100% { transform: translateY(0) rotate(0deg); }
              50% { transform: translateY(-2px) rotate(3deg); }
            }
            @keyframes mascot-goodbye {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-3px); }
            }
            @keyframes head-gentle {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(2deg); }
            }
            @keyframes head-bob {
              0%, 100% { transform: rotate(-3deg); }
              50% { transform: rotate(3deg); }
            }
            @keyframes head-tilt {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(6deg); }
            }
            @keyframes shadow-scale {
              0%, 100% { transform: scale(1); opacity: 0.6; }
              50% { transform: scale(1.08); opacity: 0.75; }
            }
            @keyframes shadow-jump {
              0%, 100% { transform: scale(1.15); opacity: 0.8; }
              50% { transform: scale(0.7); opacity: 0.35; }
            }
            @keyframes arm-wave {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(-45deg); }
            }
            @keyframes arm-cheer-left {
              0% { transform: rotate(-25deg); }
              100% { transform: rotate(-70deg); }
            }
            @keyframes arm-cheer-right {
              0% { transform: rotate(25deg); }
              100% { transform: rotate(70deg); }
            }
            @keyframes arm-chin {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(15deg); }
            }
            @keyframes arm-gesticulate {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(28deg); }
            }
            @keyframes arm-breathe-left {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(-4deg); }
            }
            @keyframes arm-breathe-right {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(4deg); }
            }
            @keyframes rays-rotate {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes glasses-twinkle {
              0%, 85%, 100% { opacity: 0.85; transform: scale(1); }
              90% { opacity: 1; transform: scale(1.15); }
            }
          `}</style>
        </defs>

        {/* 1. Sombra Elíptica no Chão */}
        <ellipse
          cx="120"
          cy="255"
          rx="52"
          ry="11"
          fill="#0D1953"
          className="mascot-shadow opacity-60"
        />

        {/* Grupo com a estrutura completa e animação squash-and-stretch */}
        <g className="rubber-body">
          {/* 2. Pernas de Mangueira (Rubber Hose) - Pretas e flexíveis */}
          <g id="legs">
            <path
              d="M102 165 C 95 195, 88 215, 85 235"
              fill="none"
              stroke="#121212"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path
              d="M138 165 C 145 195, 155 215, 160 235"
              fill="none"
              stroke="#121212"
              strokeWidth="9"
              strokeLinecap="round"
            />
          </g>

          {/* 3. Sapatos Vintage Estilo Anos 30 em Azul Royal #2346C8 */}
          <g id="shoes">
            {/* Sapato Esquerdo */}
            <g transform="translate(62, 222)">
              <path
                d="M4 22 C4 22, 18 26, 38 24 C44 24, 46 17, 39 15 C26 13, 10 14, 4 22 Z"
                fill="#FFFFFF"
                stroke="#121212"
                strokeWidth="3.5"
              />
              <path
                d="M10 15 C10 8, 22 4, 30 7 C34 9, 36 14, 32 17 C26 21, 14 20, 10 15 Z"
                fill="#2346C8"
                stroke="#121212"
                strokeWidth="3.5"
              />
              <ellipse
                cx="14"
                cy="17"
                rx="6"
                ry="4.5"
                fill="#FFFFFF"
                stroke="#121212"
                strokeWidth="2.5"
              />
              <line x1="20" y1="21" x2="21" y2="25" stroke="#121212" strokeWidth="2.5" />
              <line x1="28" y1="20" x2="29" y2="24" stroke="#121212" strokeWidth="2.5" />
            </g>

            {/* Sapato Direito */}
            <g transform="translate(142, 222)">
              <path
                d="M38 22 C38 22, 24 26, 4 24 C-2 24, -4 17, 3 15 C16 13, 32 14, 38 22 Z"
                fill="#FFFFFF"
                stroke="#121212"
                strokeWidth="3.5"
              />
              <path
                d="M32 15 C32 8, 20 4, 12 7 C8 9, 6 14, 10 17 C16 21, 28 20, 32 15 Z"
                fill="#2346C8"
                stroke="#121212"
                strokeWidth="3.5"
              />
              <ellipse
                cx="28"
                cy="17"
                rx="6"
                ry="4.5"
                fill="#FFFFFF"
                stroke="#121212"
                strokeWidth="2.5"
              />
              <line x1="22" y1="21" x2="21" y2="25" stroke="#121212" strokeWidth="2.5" />
              <line x1="14" y1="20" x2="13" y2="24" stroke="#121212" strokeWidth="2.5" />
            </g>
          </g>

          {/* 4. Braço Esquerdo & Luva Branca (Rubber Hose) */}
          <g id="left-arm" className="arm-left">
            {state === 'greeting' || state === 'goodbye' ? (
              <>
                <path
                  d="M75 125 C 50 110, 42 85, 48 65"
                  fill="none"
                  stroke="#121212"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <g transform="translate(34, 40) rotate(-15)">
                  <ellipse cx="18" cy="28" rx="8" ry="4" fill="#FFFFFF" stroke="#121212" strokeWidth="3" />
                  <path
                    d="M10 24 C6 18, 9 8, 14 6 C17 5, 20 10, 20 12 C21 8, 26 7, 28 11 C29 13, 28 17, 25 24 Z"
                    fill="#FFFFFF"
                    stroke="#121212"
                    strokeWidth="3.5"
                  />
                  <path
                    d="M10 18 C5 17, 4 22, 8 26 Z"
                    fill="#FFFFFF"
                    stroke="#121212"
                    strokeWidth="3"
                  />
                  <line x1="14" y1="18" x2="15" y2="24" stroke="#121212" strokeWidth="2" />
                  <line x1="18" y1="17" x2="19" y2="23" stroke="#121212" strokeWidth="2" />
                  <line x1="22" y1="18" x2="23" y2="23" stroke="#121212" strokeWidth="2" />
                </g>
              </>
            ) : state === 'celebrating' ? (
              <>
                <path
                  d="M75 125 C 45 105, 38 75, 42 50"
                  fill="none"
                  stroke="#121212"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <g transform="translate(28, 25) rotate(-25)">
                  <ellipse cx="18" cy="28" rx="8" ry="4" fill="#FFFFFF" stroke="#121212" strokeWidth="3" />
                  <path
                    d="M10 24 C6 16, 12 6, 17 6 C20 6, 23 11, 23 14 C25 9, 30 10, 31 15 C32 18, 30 22, 26 26 Z"
                    fill="#FFFFFF"
                    stroke="#121212"
                    strokeWidth="3.5"
                  />
                  <line x1="15" y1="18" x2="16" y2="24" stroke="#121212" strokeWidth="2" />
                  <line x1="19" y1="17" x2="20" y2="23" stroke="#121212" strokeWidth="2" />
                  <line x1="23" y1="18" x2="24" y2="23" stroke="#121212" strokeWidth="2" />
                </g>
              </>
            ) : (
              <>
                <path
                  d="M75 125 C 50 145, 45 170, 52 195"
                  fill="none"
                  stroke="#121212"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <g transform="translate(36, 182)">
                  <ellipse cx="18" cy="12" rx="7" ry="4" fill="#FFFFFF" stroke="#121212" strokeWidth="3" />
                  <path
                    d="M12 14 C9 18, 12 28, 17 30 C22 31, 26 26, 25 20 C25 15, 23 12, 18 12 Z"
                    fill="#FFFFFF"
                    stroke="#121212"
                    strokeWidth="3.5"
                  />
                  <path d="M12 20 C8 20, 9 25, 13 26 Z" fill="#FFFFFF" stroke="#121212" strokeWidth="2.5" />
                  <line x1="15" y1="16" x2="15" y2="22" stroke="#121212" strokeWidth="2" />
                  <line x1="19" y1="16" x2="19" y2="22" stroke="#121212" strokeWidth="2" />
                  <line x1="22" y1="16" x2="22" y2="22" stroke="#121212" strokeWidth="2" />
                </g>
              </>
            )}
          </g>

          {/* 5. Cabeça Circular de Sol com Raios e Expressão Vintage */}
          <g id="head" className="mascot-head">
            {/* Coroa de Raios Solares Dourados */}
            <g id="sun-corona" className="sun-rays">
              <path
                d="
                  M 120 30 L 129 48 L 152 35 L 148 56 L 175 52 L 160 72 L 188 80 L 165 96 L 190 112 L 164 122 L 182 144 L 154 146 L 164 172 L 140 162 L 142 190 L 122 174 L 114 191 L 102 173 L 88 190 L 88 163 L 64 173 L 73 147 L 46 144 L 62 124 L 38 111 L 61 97 L 39 80 L 66 73 L 53 53 L 79 56 L 76 35 L 98 48 Z
                "
                fill="#F8D56B"
                stroke="#121212"
                strokeWidth="4.5"
                strokeLinejoin="round"
              />
            </g>

            {/* Rosto Solar Circular */}
            <circle
              cx="120"
              cy="110"
              r="54"
              fill="#F9CE47"
              stroke="#121212"
              strokeWidth="4.5"
            />

            {/* Bochechas Rosadas com 3 Sardinhas */}
            <g id="cheeks">
              <circle cx="86" cy="134" r="7" fill="#F89C3D" opacity="0.45" />
              <circle cx="83" cy="132" r="1.5" fill="#121212" />
              <circle cx="87" cy="131" r="1.5" fill="#121212" />
              <circle cx="85" cy="136" r="1.5" fill="#121212" />

              <circle cx="154" cy="134" r="7" fill="#F89C3D" opacity="0.45" />
              <circle cx="151" cy="132" r="1.5" fill="#121212" />
              <circle cx="155" cy="131" r="1.5" fill="#121212" />
              <circle cx="153" cy="136" r="1.5" fill="#121212" />
            </g>

            {/* Narizinho */}
            <path
              d="M117 122 C117 126, 123 126, 123 122"
              fill="none"
              stroke="#121212"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Sorriso */}
            <g id="mouth">
              <path
                d="M102 133 C 112 146, 128 146, 138 133"
                fill="none"
                stroke="#121212"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path d="M100 131 C 101 135, 103 135, 104 133" fill="none" stroke="#121212" strokeWidth="3" />
              <path d="M140 131 C 139 135, 137 135, 136 133" fill="none" stroke="#121212" strokeWidth="3" />
            </g>

            {/* Óculos Escuros Retrô Anos 30 */}
            <g id="retro-sunglasses">
              <path
                d="M74 100 Q 120 94 166 100"
                fill="none"
                stroke="#121212"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              <path
                d="M112 101 Q 120 98 128 101"
                fill="none"
                stroke="#121212"
                strokeWidth="5"
                strokeLinecap="round"
              />

              <g>
                <path
                  d="M78 97 C 78 88, 92 86, 110 88 C 114 97, 114 110, 108 116 C 96 122, 80 118, 78 97 Z"
                  fill="#162573"
                  stroke="#121212"
                  strokeWidth="4.5"
                />
                <path
                  d="M84 94 L94 92 M83 99 L98 96"
                  stroke="#FFFFFF"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  className="glasses-shine opacity-90"
                />
              </g>

              <g>
                <path
                  d="M162 97 C 162 88, 148 86, 130 88 C 126 97, 126 110, 132 116 C 144 122, 160 118, 162 97 Z"
                  fill="#162573"
                  stroke="#121212"
                  strokeWidth="4.5"
                />
                <path
                  d="M146 92 L156 94 M142 96 L157 99"
                  stroke="#FFFFFF"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  className="glasses-shine opacity-90"
                />
              </g>
            </g>
          </g>

          {/* 6. Braço Direito & Luva Branca — RENDERIZADO NA FRENTE DA CABEÇA! */}
          <g id="right-arm" className="arm-right">
            {state === 'thinking' ? (
              // Mão no queixo em pose pensativa NA FRENTE DO ROSTO
              <>
                {/* Braço curvado subindo em direção ao queixo */}
                <path
                  d="M160 128 C 182 152, 164 172, 136 150"
                  fill="none"
                  stroke="#121212"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                />
                {/* Luva branca repousando na frente do queixo */}
                <g transform="translate(122, 135) rotate(40)">
                  <ellipse cx="14" cy="10" rx="7" ry="4" fill="#FFFFFF" stroke="#121212" strokeWidth="3" />
                  <path
                    d="M8 12 C4 16, 7 25, 13 27 C18 28, 22 23, 21 16 C21 12, 17 10, 12 10 Z"
                    fill="#FFFFFF"
                    stroke="#121212"
                    strokeWidth="3.5"
                  />
                  <line x1="10" y1="14" x2="10" y2="20" stroke="#121212" strokeWidth="2" />
                  <line x1="14" y1="14" x2="14" y2="20" stroke="#121212" strokeWidth="2" />
                </g>
              </>
            ) : state === 'celebrating' ? (
              // Braço direito erguido na comemoração
              <>
                <path
                  d="M165 125 C 195 105, 202 75, 198 50"
                  fill="none"
                  stroke="#121212"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <g transform="translate(186, 25) rotate(25)">
                  <ellipse cx="18" cy="28" rx="8" ry="4" fill="#FFFFFF" stroke="#121212" strokeWidth="3" />
                  <path
                    d="M10 24 C6 16, 12 6, 17 6 C20 6, 23 11, 23 14 C25 9, 30 10, 31 15 C32 18, 30 22, 26 26 Z"
                    fill="#FFFFFF"
                    stroke="#121212"
                    strokeWidth="3.5"
                  />
                  <line x1="15" y1="18" x2="16" y2="24" stroke="#121212" strokeWidth="2" />
                  <line x1="19" y1="17" x2="20" y2="23" stroke="#121212" strokeWidth="2" />
                  <line x1="23" y1="18" x2="24" y2="23" stroke="#121212" strokeWidth="2" />
                </g>
              </>
            ) : (
              // Braço direito relaxado na lateral
              <>
                <path
                  d="M165 125 C 190 145, 195 170, 188 195"
                  fill="none"
                  stroke="#121212"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <g transform="translate(172, 182) scale(-1, 1)">
                  <ellipse cx="-18" cy="12" rx="7" ry="4" fill="#FFFFFF" stroke="#121212" strokeWidth="3" />
                  <path
                    d="M-12 14 C-9 18, -12 28, -17 30 C-22 31, -26 26, -25 20 C-25 15, -23 12, -18 12 Z"
                    fill="#FFFFFF"
                    stroke="#121212"
                    strokeWidth="3.5"
                  />
                  <line x1="-15" y1="16" x2="-15" y2="22" stroke="#121212" strokeWidth="2" />
                  <line x1="-19" y1="16" x2="-19" y2="22" stroke="#121212" strokeWidth="2" />
                  <line x1="-22" y1="16" x2="-22" y2="22" stroke="#121212" strokeWidth="2" />
                </g>
              </>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
};
