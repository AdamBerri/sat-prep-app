#!/usr/bin/env node
import { execSync } from 'child_process';

const count = parseInt(process.argv[2], 10);

if (!count || count < 1) {
  console.log('Usage: npm run generate:reading <count> [questionTypes]');
  console.log('');
  console.log('Examples:');
  console.log('  npm run generate:reading 100');
  console.log('  npm run generate:reading 50 central_ideas,inferences');
  console.log('');
  console.log('Question Types:');
  console.log('  central_ideas, inferences, vocabulary_in_context,');
  console.log('  text_structure, command_of_evidence, rhetorical_synthesis');
  process.exit(1);
}

const types = process.argv[3];
const args = { count };
if (types) {
  args.questionTypes = types.split(',').map(t => t.trim());
}

console.log(`Generating ${count} reading questions...`);
if (types) {
  console.log(`Types: ${args.questionTypes.join(', ')}`);
}
console.log('');

try {
  execSync(`npx convex run seed:batchGenerateReadingQuestions '${JSON.stringify(args)}'`, {
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  process.exit(1);
}
