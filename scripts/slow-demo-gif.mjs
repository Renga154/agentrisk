import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../assets/agentrisk-demo.gif", import.meta.url);
const data = readFileSync(file);

// GIF frame delays are stored in hundredths of a second inside Graphic Control
// Extension blocks. These values make the README demo readable on GitHub.
const delays = [120, 140, 180, 180, 220, 220, 220, 180, 220, 260];
let frame = 0;

for (let i = 0; i < data.length - 7; i += 1) {
  if (data[i] !== 0x21 || data[i + 1] !== 0xf9 || data[i + 2] !== 0x04) {
    continue;
  }

  const delay = delays[Math.min(frame, delays.length - 1)];
  data[i + 4] = delay & 0xff;
  data[i + 5] = (delay >> 8) & 0xff;
  frame += 1;
}

if (frame === 0) {
  throw new Error("No GIF frame delay blocks found.");
}

writeFileSync(file, data);
console.log(`Updated ${frame} frame delays in ${file.pathname}`);
