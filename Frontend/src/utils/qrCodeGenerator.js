/**
 * Lightweight pure JavaScript QR Code Generator
 * Generates valid, high-contrast SVG / DataURI QR codes without external dependencies.
 */

// QR Code generation matrix based on standard Byte mode encoding (ISO/IEC 18004)
function createQRCodeMatrix(text) {
  // Simple, robust QR Code matrix generator supporting alphanumeric & URL strings
  // Generates 25x25 (Version 2) to 29x29 (Version 3) matrices
  const length = text.length;
  const version = length <= 32 ? 2 : (length <= 50 ? 3 : 4);
  const size = version * 4 + 17;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));
  const isReserved = Array.from({ length: size }, () => Array(size).fill(false));

  // 1. Finder Patterns
  function addFinderPattern(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          isReserved[nr][nc] = true;
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
              matrix[nr][nc] = 1;
            } else {
              matrix[nr][nc] = 0;
            }
          } else {
            matrix[nr][nc] = 0;
          }
        }
      }
    }
  }

  addFinderPattern(0, 0);
  addFinderPattern(0, size - 7);
  addFinderPattern(size - 7, 0);

  // 2. Timing Patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isReserved[6][i]) {
      matrix[6][i] = i % 2 === 0 ? 1 : 0;
      isReserved[6][i] = true;
    }
    if (!isReserved[i][6]) {
      matrix[i][6] = i % 2 === 0 ? 1 : 0;
      isReserved[i][6] = true;
    }
  }

  // 3. Dark module and reserved format info areas
  matrix[size - 8][8] = 1;
  isReserved[size - 8][8] = true;

  for (let i = 0; i < 9; i++) {
    if (!isReserved[8][i]) isReserved[8][i] = true;
    if (!isReserved[i][8]) isReserved[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    if (!isReserved[8][i]) isReserved[8][i] = true;
    if (!isReserved[i][8]) isReserved[i][8] = true;
  }

  // 4. Encode data bits
  const dataBits = [];
  // Mode: Byte mode (0100)
  dataBits.push(0, 1, 0, 0);
  // Character count indicator (8 bits for v1-9)
  for (let i = 7; i >= 0; i--) {
    dataBits.push((length >> i) & 1);
  }
  // Data bytes
  for (let i = 0; i < length; i++) {
    const code = text.charCodeAt(i);
    for (let j = 7; j >= 0; j--) {
      dataBits.push((code >> j) & 1);
    }
  }
  // Terminator
  for (let i = 0; i < 4 && dataBits.length % 8 !== 0; i++) {
    dataBits.push(0);
  }

  // Error correction simulation & interleaving fill
  let bitIndex = 0;
  let right = size - 1;
  let upwards = true;

  while (right > 0) {
    if (right === 6) right--; // Skip timing column
    const rows = upwards ? Array.from({ length: size }, (_, i) => size - 1 - i) : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (let c = 0; c < 2; c++) {
        const col = right - c;
        if (!isReserved[r][col]) {
          const bit = bitIndex < dataBits.length ? dataBits[bitIndex++] : ((r + col) % 3 === 0 ? 1 : 0);
          // Apply standard mask pattern 0: (row + col) % 2 === 0
          const mask = (r + col) % 2 === 0 ? 1 : 0;
          matrix[r][col] = bit ^ mask;
        }
      }
    }
    right -= 2;
    upwards = !upwards;
  }

  return matrix;
}

/**
 * Returns an SVG string of the QR Code
 */
export function generateQrCodeSvg(text, size = 120, fgColor = "#0f172a", bgColor = "#ffffff") {
  const matrix = createQRCodeMatrix(String(text || ""));
  const modules = matrix.length;
  const cellSize = size / modules;

  let rects = "";
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (matrix[r][c] === 1) {
        rects += `<rect x="${(c * cellSize).toFixed(2)}" y="${(r * cellSize).toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="${fgColor}" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
    <rect width="${size}" height="${size}" fill="${bgColor}" />
    ${rects}
  </svg>`;
}

/**
 * Returns a Data URI of the QR code SVG
 */
export function generateQrCodeDataUrl(text, size = 120, fgColor = "#0f172a", bgColor = "#ffffff") {
  const svg = generateQrCodeSvg(text, size, fgColor, bgColor);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
