#!/usr/bin/env node
import { execSync } from 'child_process';

const count = parseInt(process.argv[2], 10);

if (!count || count < 1) {
  console.log('Usage: npm run generate:reading-data <count> [dataTypes]');
  console.log('');
  console.log('Examples:');
  console.log('  npm run generate:reading-data 100');
  console.log('  npm run generate:reading-data 50 bar_chart,line_graph');
  console.log('');
  console.log('Data Types:');
  console.log('  bar_chart, line_graph, data_table');
  process.exit(1);
}

const types = process.argv[3];
const args = { count };
if (types) {
  args.dataTypes = types.split(',').map(t => t.trim());
}

console.log(`Generating ${count} reading data questions (charts/graphs/tables)...`);
if (types) {
  console.log(`Types: ${args.dataTypes.join(', ')}`);
}
console.log('');

try {
  execSync(`npx convex run readingDataGeneration:batchGenerateReadingDataQuestions '${JSON.stringify(args)}'`, {
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  process.exit(1);
}
