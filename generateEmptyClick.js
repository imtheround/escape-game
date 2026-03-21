const fs = require('fs');
const sampleRate = 44100;
const duration = 0.05; // 50ms click
const numSamples = sampleRate * duration;
const buffer = Buffer.alloc(44 + numSamples * 2);

buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + numSamples * 2, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(numSamples * 2, 40);

for (let i = 0; i < numSamples; i++) {
  const env = Math.exp(-i / (sampleRate * 0.01));
  const sample = (Math.random() * 2 - 1) * 32767 * env;
  buffer.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), 44 + i * 2);
}
fs.writeFileSync('public/assets/audio/empty_click.wav', buffer);
console.log('empty_click.wav generated.');
