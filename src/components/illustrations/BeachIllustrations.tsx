import React from 'react';

interface IllustrationProps {
  className?: string;
  size?: number;
}

/**
 * Flor orgânica estilo Matisse inspirada na referência enviada:
 * pétalas fluidas amarelo-sol (#F8D56B) ao redor de um miolo oval orgânico laranja (#F89C3D).
 */
export const MatisseFlower: React.FC<IllustrationProps> = ({ className = '', size = 96 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <g fill="#F8D56B">
      <path d="M98 14C109 14 116 37 111 60C108 75 94 75 91 60C86 37 87 14 98 14Z" />
      <path d="M144 23C154 29 147 52 132 70C122 81 112 74 118 60C126 40 134 17 144 23Z" />
      <path d="M177 56C183 66 164 83 142 90C128 95 122 85 133 74C149 58 171 46 177 56Z" />
      <path d="M186 102C186 113 162 119 139 113C125 110 125 97 139 94C162 88 186 91 186 102Z" />
      <path d="M175 147C169 157 146 148 129 133C118 123 124 113 139 119C159 128 181 137 175 147Z" />
      <path d="M142 179C132 185 116 165 109 143C105 129 115 123 126 134C142 150 152 173 142 179Z" />
      <path d="M98 187C87 187 81 163 87 140C90 126 103 126 106 140C112 163 109 187 98 187Z" />
      <path d="M53 177C43 171 52 148 67 131C77 120 87 126 81 141C72 161 63 183 53 177Z" />
      <path d="M22 144C16 134 36 118 58 110C72 105 78 115 67 126C51 142 28 154 22 144Z" />
      <path d="M14 98C14 87 38 81 61 87C75 90 75 103 61 106C38 112 14 109 14 98Z" />
      <path d="M25 53C31 43 54 52 71 67C82 77 76 87 61 81C41 72 19 63 25 53Z" />
      <path d="M56 21C66 15 82 35 90 57C95 71 85 77 74 66C58 50 46 27 56 21Z" />
    </g>
    <path
      d="M100 77C113 76 124 87 123 101C122 114 111 124 98 123C85 122 76 112 77 99C78 86 87 78 100 77Z"
      fill="#F89C3D"
    />
  </svg>
);

/**
 * Ilustração leve de Sol sobre o mar (tema Praia).
 */
export const SunIllustration: React.FC<IllustrationProps> = ({ className = '', size = 96 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle cx="60" cy="60" r="52" fill="#BFD4F2" fillOpacity="0.45" />
    <circle cx="60" cy="54" r="24" fill="#F8D56B" />
    <circle cx="60" cy="54" r="14" fill="#F89C3D" />
    <path
      d="M22 82C32 76 44 88 58 82C72 76 84 88 98 82"
      stroke="#2346C8"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M30 94C40 89 50 99 62 94C74 89 82 99 90 94"
      stroke="#2346C8"
      strokeWidth="4"
      strokeLinecap="round"
      strokeOpacity="0.6"
    />
  </svg>
);

/**
 * Ilustração leve de Onda suave.
 */
export const WaveIllustration: React.FC<IllustrationProps> = ({ className = '', size = 96 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect x="10" y="10" width="100" height="100" rx="32" fill="#BFD4F2" fillOpacity="0.5" />
    <circle cx="82" cy="38" r="12" fill="#F8D56B" />
    <path
      d="M20 66C32 54 46 54 58 66C70 78 84 78 100 64"
      stroke="#2346C8"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <path
      d="M24 84C36 74 48 74 60 84C72 94 84 94 96 84"
      stroke="#12206B"
      strokeWidth="5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Ilustração leve de Concha do mar (conquistas e cofrinhos).
 */
export const ShellIllustration: React.FC<IllustrationProps> = ({ className = '', size = 96 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle cx="60" cy="60" r="50" fill="#F8D56B" fillOpacity="0.35" />
    <path
      d="M60 26C36 26 22 46 26 70C29 86 44 94 60 94C76 94 91 86 94 70C98 46 84 26 60 26Z"
      fill="#F8D56B"
      stroke="#2346C8"
      strokeWidth="4"
    />
    <path d="M60 30V92" stroke="#2346C8" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M42 34L56 92" stroke="#2346C8" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M78 34L64 92" stroke="#2346C8" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="60" cy="84" r="6" fill="#F89C3D" />
  </svg>
);
