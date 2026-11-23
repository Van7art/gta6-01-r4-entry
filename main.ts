// Port Solana — entrypoint for make.fun bounty gta6-01 (round 4).
// Copies game/ and screenshots/ from this repository into the output folder
// and writes the dossier there with the kit's buildDossier helper.
// The output folder comes from MAKEFUN_OUTPUT_DIR outside the grader, and
// defaults to /output, the folder the grader hands the program.
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const repoRoot = new URL('.', import.meta.url).pathname;

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`dossier written: ${dossier.length} bytes to ${join(outputDir, 'dossier.json')}`);
