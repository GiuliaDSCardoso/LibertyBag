const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const publicIconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(publicIconsDir)) {
  fs.mkdirSync(publicIconsDir, { recursive: true });
}

// SVG puro da flor original do LibertyBag
const flowerPaths = `
  <g fill="#F8D56B">
    <path d="M98 18C107 18 113 38 109 58C106 72 95 72 92 58C88 38 89 18 98 18Z"/>
    <path d="M142 26C151 31 144 52 130 68C121 78 112 72 117 59C125 41 133 21 142 26Z"/>
    <path d="M174 58C179 67 161 82 141 89C128 93 123 84 133 74C148 59 169 49 174 58Z"/>
    <path d="M182 102C182 112 160 117 139 112C126 109 126 98 139 95C160 90 182 92 182 102Z"/>
    <path d="M172 145C167 154 146 146 130 132C120 123 125 114 139 119C157 127 177 136 172 145Z"/>
    <path d="M140 176C131 181 116 163 110 142C106 129 115 124 125 134C140 149 149 171 140 176Z"/>
    <path d="M98 184C88 184 83 162 88 141C91 128 102 128 105 141C110 162 108 184 98 184Z"/>
    <path d="M55 174C46 169 54 148 68 132C77 122 86 127 81 141C73 159 64 179 55 174Z"/>
    <path d="M25 142C20 133 38 118 59 111C72 107 77 116 67 126C52 141 30 151 25 142Z"/>
    <path d="M18 98C18 88 40 83 61 88C74 91 74 102 61 105C40 110 18 108 18 98Z"/>
    <path d="M28 55C33 46 54 54 70 68C80 77 75 86 61 81C43 73 23 64 28 55Z"/>
    <path d="M58 24C67 19 82 37 89 58C93 71 84 76 74 66C59 51 49 29 58 24Z"/>
  </g>
  <path d="M100 79C112 78 122 88 121 101C120 113 110 122 98 121C86 120 78 111 79 99C80 87 88 80 100 79Z" fill="#F89C3D"/>
`;

function createHtml(size, { hasRounded = false, isMaskable = false } = {}) {
  // Para ícone maskable, a flor deve ficar dentro de 75-80% do canvas para não cortar nas bordas circulares do Android
  const flowerScale = isMaskable ? 0.72 : hasRounded ? 0.82 : 0.82;
  const flowerSize = size * flowerScale;
  const flowerOffset = (size - flowerSize) / 2;
  const borderRadius = hasRounded ? Math.round(size * 0.22) : 0;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: ${size}px;
            height: ${size}px;
            overflow: hidden;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            width: ${size}px;
            height: ${size}px;
            background: #2346C8;
            border-radius: ${borderRadius}px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          svg {
            width: ${flowerSize}px;
            height: ${flowerSize}px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <svg viewBox="0 0 200 200" fill="none">
            ${flowerPaths}
          </svg>
        </div>
      </body>
    </html>
  `;
}

async function generate() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });

  const targets = [
    {
      filename: 'pwa-192x192.png',
      size: 192,
      opts: { hasRounded: false, isMaskable: false }
    },
    {
      filename: 'pwa-512x512.png',
      size: 512,
      opts: { hasRounded: false, isMaskable: false }
    },
    {
      filename: 'apple-touch-icon.png',
      size: 180,
      opts: { hasRounded: false, isMaskable: false } // iOS corta automaticamente
    },
    {
      filename: 'maskable-icon-512x512.png',
      size: 512,
      opts: { hasRounded: false, isMaskable: true } // Safe area Android
    }
  ];

  for (const { filename, size, opts } of targets) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1
    });

    const html = createHtml(size, opts);
    await page.setContent(html, { waitUntil: 'load' });
    const outPath = path.join(publicIconsDir, filename);
    await page.screenshot({ path: outPath, omitBackground: true });
    await page.close();
    console.log(`Generated: ${filename} (${size}x${size})`);
  }

  await browser.close();
  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
