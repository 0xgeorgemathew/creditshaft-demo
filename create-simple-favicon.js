const fs = require('fs');

// Create a simple, clear 16x16 ICO file with a bold "C" for CreditShaft
const header = Buffer.from([
  0x00, 0x00, // Reserved (must be 0)
  0x01, 0x00, // Type (1 = ICO)
  0x01, 0x00  // Number of images (1)
]);

const directoryEntry = Buffer.from([
  0x10,       // Width (16)
  0x10,       // Height (16)
  0x00,       // Color count (0 = more than 256 colors)
  0x00,       // Reserved
  0x01, 0x00, // Planes (1)
  0x20, 0x00, // Bits per pixel (32)
  0x00, 0x04, 0x00, 0x00, // Size of bitmap data (1024 bytes)
  0x16, 0x00, 0x00, 0x00  // Offset to bitmap data (22 bytes)
]);

const width = 16;
const height = 16;
const pixelData = [];

// Define colors
const darkBg = [26, 26, 46, 255];      // Dark background
const accent = [59, 130, 246, 255];    // Blue accent
const white = [255, 255, 255, 255];    // White for contrast

// Create a bold "C" pattern
const cPattern = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
  [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    let color;
    
    if (cPattern[y][x] === 1) {
      color = accent; // Blue for the "C"
    } else {
      color = darkBg; // Dark background
    }
    
    // BGRA format for ICO
    pixelData.push(color[2], color[1], color[0], color[3]);
  }
}

const bitmapHeader = Buffer.from([
  0x28, 0x00, 0x00, 0x00, // Header size (40)
  0x10, 0x00, 0x00, 0x00, // Width (16)
  0x20, 0x00, 0x00, 0x00, // Height (32, includes AND mask)
  0x01, 0x00,             // Planes (1)
  0x20, 0x00,             // Bits per pixel (32)
  0x00, 0x00, 0x00, 0x00, // Compression (0 = none)
  0x00, 0x04, 0x00, 0x00, // Image size (1024)
  0x00, 0x00, 0x00, 0x00, // X pixels per meter
  0x00, 0x00, 0x00, 0x00, // Y pixels per meter
  0x00, 0x00, 0x00, 0x00, // Colors used
  0x00, 0x00, 0x00, 0x00  // Important colors
]);

// Flip vertically (BMP format requirement)
const flippedPixelData = [];
for (let y = height - 1; y >= 0; y--) {
  for (let x = 0; x < width; x++) {
    const index = (y * width + x) * 4;
    flippedPixelData.push(
      pixelData[index],     // B
      pixelData[index + 1], // G
      pixelData[index + 2], // R
      pixelData[index + 3]  // A
    );
  }
}

// AND mask (all opaque)
const andMask = Buffer.alloc(32, 0x00);

// Combine all parts
const icoData = Buffer.concat([
  header,
  directoryEntry,
  bitmapHeader,
  Buffer.from(flippedPixelData),
  andMask
]);

// Write to file
fs.writeFileSync('./src/app/favicon.ico', icoData);
console.log('Clear CreditShaft "C" favicon created successfully!');