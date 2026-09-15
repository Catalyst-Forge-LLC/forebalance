import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hold = join(dirname(fileURLToPath(import.meta.url)), '..', 'npm-hold');
const args = process.argv.slice(2);
const publish = args.includes('--publish');
const npmArgs = publish
	? ['publish', '--access', 'public']
	: ['pack', '--dry-run'];
const result = spawnSync('npm', npmArgs, {
	cwd: hold,
	stdio: 'inherit',
	shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
