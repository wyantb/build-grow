/**
 * Fails if any ESLint rule resolves to "warn" for any file in the project.
 *
 * The project policy is that every rule is either off or error, so lint output
 * never carries a severity the reader has to interpret. A plugin upgrade can
 * silently introduce new warn-level rules from a shared config, so this guard
 * runs as part of the lint script.
 */
import { ESLint } from 'eslint';

const eslint = new ESLint();
const files = await eslint.lintFiles(['.']);

const targets = new Set(['src/App.tsx', 'src/main.tsx', 'eslint.config.js', 'vite.config.ts']);

for (const file of files) {
  const relative = file.filePath.replace(`${process.cwd()}/`, '');

  targets.add(relative);

  for (const message of file.messages) {
    if (message.severity === 1) {
      console.error(`${relative}:${message.line}:${message.column}  warning  ${message.message}  (${message.ruleId})`);
    }
  }
}

const warnings = [];

for (const file of targets) {
  const config = await eslint.calculateConfigForFile(file);

  for (const [ruleId, entry] of Object.entries(config.rules ?? {})) {
    if (entry[0] === 'warn' || entry[0] === 1) {
      warnings.push(`${file}: ${ruleId}`);
    }
  }
}

if (warnings.length > 0) {
  console.error('Rules must be "off" or "error"; these resolve to "warn":');
  for (const warning of warnings) {
    console.error(`  ${warning}`);
  }
  process.exit(1);
}

console.log('All rules are "off" or "error".');
