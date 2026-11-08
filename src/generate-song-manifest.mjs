import fs from 'node:fs';
import path from 'node:path';

const folder = 'public/songs';

fs.mkdirSync(folder, { recursive: true });

const files = fs.readdirSync(folder)
  .filter(file => /\.(mid|midi)$/i.test(file))
  .sort();

fs.writeFileSync(
  path.join(folder, 'manifest.json'),
  JSON.stringify(files, null, 2)
);

console.log(`Found ${files.length} MIDI files.`);
