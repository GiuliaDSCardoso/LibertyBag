const path = require('path');
const { chromium } = require('playwright');

async function renderMascotPreview() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });

  const page = await browser.newPage({
    viewport: { width: 500, height: 560 },
    deviceScaleFactor: 2
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 24px;
            background: #FBF6EA;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          .card {
            background: #FFFFFF;
            padding: 24px 32px;
            border-radius: 28px;
            border: 3px solid #2346C8;
            box-shadow: 0 12px 36px rgba(13, 25, 83, 0.14);
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          h2 {
            margin: 0 0 4px 0;
            font-family: "Fraunces", Georgia, serif;
            font-style: italic;
            font-size: 24px;
            color: #2346C8;
          }
          p {
            margin: 0 0 14px 0;
            font-size: 13px;
            font-weight: 600;
            color: #0D1953;
            opacity: 0.85;
          }
          .badge {
            display: inline-block;
            background: #F8D56B;
            color: #0D1953;
            font-weight: 800;
            font-size: 11px;
            padding: 4px 12px;
            border-radius: 999px;
            margin-bottom: 12px;
            border: 1.5px solid #121212;
          }
          .dialogue {
            background: #FBF6EA;
            border: 2px solid #121212;
            padding: 8px 16px;
            border-radius: 16px;
            font-weight: 700;
            font-size: 12px;
            color: #0D1953;
            margin-bottom: 6px;
            box-shadow: 2px 2px 0px #121212;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">PROPOSTA DE MASCOTE 1930s (RUBBER HOSE)</div>
          <h2>Solzinho • Mascote do LibertyBag</h2>
          <p>Cabeça de Sol • Óculos Retrô • Luvas e Sapatos Vintage</p>
          <div class="dialogue">"Olá, Giulia! Bom ver você por aqui! ☀️"</div>

          <svg width="220" height="250" viewBox="0 0 240 280" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Sombra -->
            <ellipse cx="120" cy="255" rx="52" ry="11" fill="#0D1953" opacity="0.6"/>

            <!-- Pernas Rubber Hose -->
            <path d="M102 165 C 95 195, 88 215, 85 235" fill="none" stroke="#121212" stroke-width="9" stroke-linecap="round"/>
            <path d="M138 165 C 145 195, 155 215, 160 235" fill="none" stroke="#121212" stroke-width="9" stroke-linecap="round"/>

            <!-- Sapatos Vintage em Azul Royal e Branco -->
            <g transform="translate(62, 222)">
              <path d="M4 22 C4 22, 18 26, 38 24 C44 24, 46 17, 39 15 C26 13, 10 14, 4 22 Z" fill="#FFFFFF" stroke="#121212" stroke-width="3.5"/>
              <path d="M10 15 C10 8, 22 4, 30 7 C34 9, 36 14, 32 17 C26 21, 14 20, 10 15 Z" fill="#2346C8" stroke="#121212" stroke-width="3.5"/>
              <ellipse cx="14" cy="17" rx="6" ry="4.5" fill="#FFFFFF" stroke="#121212" stroke-width="2.5"/>
              <line x1="20" y1="21" x2="21" y2="25" stroke="#121212" stroke-width="2.5"/>
              <line x1="28" y1="20" x2="29" y2="24" stroke="#121212" stroke-width="2.5"/>
            </g>

            <g transform="translate(142, 222)">
              <path d="M38 22 C38 22, 24 26, 4 24 C-2 24, -4 17, 3 15 C16 13, 32 14, 38 22 Z" fill="#FFFFFF" stroke="#121212" stroke-width="3.5"/>
              <path d="M32 15 C32 8, 20 4, 12 7 C8 9, 6 14, 10 17 C16 21, 28 20, 32 15 Z" fill="#2346C8" stroke="#121212" stroke-width="3.5"/>
              <ellipse cx="28" cy="17" rx="6" ry="4.5" fill="#FFFFFF" stroke="#121212" stroke-width="2.5"/>
              <line x1="22" y1="21" x2="21" y2="25" stroke="#121212" stroke-width="2.5"/>
              <line x1="14" y1="20" x2="13" y2="24" stroke="#121212" stroke-width="2.5"/>
            </g>

            <!-- Braço Esquerdo Acenando -->
            <path d="M75 125 C 50 110, 42 85, 48 65" fill="none" stroke="#121212" stroke-width="8" stroke-linecap="round"/>
            <g transform="translate(34, 40) rotate(-15)">
              <ellipse cx="18" cy="28" rx="8" ry="4" fill="#FFFFFF" stroke="#121212" stroke-width="3"/>
              <path d="M10 24 C6 18, 9 8, 14 6 C17 5, 20 10, 20 12 C21 8, 26 7, 28 11 C29 13, 28 17, 25 24 Z" fill="#FFFFFF" stroke="#121212" stroke-width="3.5"/>
              <path d="M10 18 C5 17, 4 22, 8 26 Z" fill="#FFFFFF" stroke="#121212" stroke-width="3"/>
              <line x1="14" y1="18" x2="15" y2="24" stroke="#121212" stroke-width="2"/>
              <line x1="18" y1="17" x2="19" y2="23" stroke="#121212" stroke-width="2"/>
              <line x1="22" y1="18" x2="23" y2="23" stroke="#121212" stroke-width="2"/>
            </g>

            <!-- Braço Direito Relaxado -->
            <path d="M165 125 C 190 145, 195 170, 188 195" fill="none" stroke="#121212" stroke-width="8" stroke-linecap="round"/>
            <g transform="translate(172, 182) scale(-1, 1)">
              <ellipse cx="-18" cy="12" rx="7" ry="4" fill="#FFFFFF" stroke="#121212" stroke-width="3"/>
              <path d="M-12 14 C-9 18, -12 28, -17 30 C-22 31, -26 26, -25 20 C-25 15, -23 12, -18 12 Z" fill="#FFFFFF" stroke="#121212" stroke-width="3.5"/>
              <line x1="-15" y1="16" x2="-15" y2="22" stroke="#121212" stroke-width="2"/>
              <line x1="-19" y1="16" x2="-19" y2="22" stroke="#121212" stroke-width="2"/>
              <line x1="-22" y1="16" x2="-22" y2="22" stroke="#121212" stroke-width="2"/>
            </g>

            <!-- Raios do Sol -->
            <path d="M 120 30 L 129 48 L 152 35 L 148 56 L 175 52 L 160 72 L 188 80 L 165 96 L 190 112 L 164 122 L 182 144 L 154 146 L 164 172 L 140 162 L 142 190 L 122 174 L 114 191 L 102 173 L 88 190 L 88 163 L 64 173 L 73 147 L 46 144 L 62 124 L 38 111 L 61 97 L 39 80 L 66 73 L 53 53 L 79 56 L 76 35 L 98 48 Z" fill="#F8D56B" stroke="#121212" stroke-width="4.5" stroke-linejoin="round"/>

            <!-- Rosto Solar -->
            <circle cx="120" cy="110" r="54" fill="#F9CE47" stroke="#121212" stroke-width="4.5"/>

            <!-- Bochechas com Sardinhas -->
            <circle cx="86" cy="134" r="7" fill="#F89C3D" opacity="0.45"/>
            <circle cx="83" cy="132" r="1.5" fill="#121212"/>
            <circle cx="87" cy="131" r="1.5" fill="#121212"/>
            <circle cx="85" cy="136" r="1.5" fill="#121212"/>

            <circle cx="154" cy="134" r="7" fill="#F89C3D" opacity="0.45"/>
            <circle cx="151" cy="132" r="1.5" fill="#121212"/>
            <circle cx="155" cy="131" r="1.5" fill="#121212"/>
            <circle cx="153" cy="136" r="1.5" fill="#121212"/>

            <!-- Narizinho -->
            <path d="M117 122 C117 126, 123 126, 123 122" fill="none" stroke="#121212" stroke-width="3.5" stroke-linecap="round"/>

            <!-- Sorriso -->
            <path d="M102 133 C 112 146, 128 146, 138 133" fill="none" stroke="#121212" stroke-width="4" stroke-linecap="round"/>
            <path d="M100 131 C 101 135, 103 135, 104 133" fill="none" stroke="#121212" stroke-width="3"/>
            <path d="M140 131 C 139 135, 137 135, 136 133" fill="none" stroke="#121212" stroke-width="3"/>

            <!-- Óculos Escuros Retrô Anos 30 -->
            <path d="M74 100 Q 120 94 166 100" fill="none" stroke="#121212" stroke-width="4.5" stroke-linecap="round"/>
            <path d="M112 101 Q 120 98 128 101" fill="none" stroke="#121212" stroke-width="5" stroke-linecap="round"/>

            <!-- Lente Esquerda -->
            <path d="M78 97 C 78 88, 92 86, 110 88 C 114 97, 114 110, 108 116 C 96 122, 80 118, 78 97 Z" fill="#162573" stroke="#121212" stroke-width="4.5"/>
            <path d="M84 94 L94 92 M83 99 L98 96" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/>

            <!-- Lente Direita -->
            <path d="M162 97 C 162 88, 148 86, 130 88 C 126 97, 126 110, 132 116 C 144 122, 160 118, 162 97 Z" fill="#162573" stroke="#121212" stroke-width="4.5"/>
            <path d="M146 92 L156 94 M142 96 L157 99" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/>
          </svg>
        </div>
      </body>
    </html>
  `;

  await page.setContent(html);
  const outPath = path.join(__dirname, '..', 'public', 'mascote-preview.png');
  await page.screenshot({ path: outPath });
  console.log('Mascot preview screenshot saved at:', outPath);

  // Também copia para o diretório de artefatos
  const artifactPath = 'C:\\Users\\giuli\\.gemini\\antigravity\\brain\\2216477c-bfdf-4f53-9ddf-1a86e6cbc41e\\mascote-preview.png';
  await page.screenshot({ path: artifactPath });
  console.log('Artifact screenshot saved at:', artifactPath);

  await browser.close();
}

renderMascotPreview().catch(console.error);
