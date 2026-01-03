#!/usr/bin/env node
import { execSync } from 'child_process';

/**
 * Generate math questions using AI (Claude + Gemini).
 *
 * Usage:
 *   npm run generate:math 100                           # 100 random math questions
 *   npm run generate:math 50 algebra,geometry_trig      # 50 questions from specific domains
 *   npm run generate:math 25 advanced_math              # 25 advanced math questions
 *
 * Available domains:
 *   - algebra (linear equations, inequalities, systems, functions)
 *   - advanced_math (quadratic, polynomial, exponential, radical)
 *   - problem_solving (ratios, percentages, statistics, probability)
 *   - geometry_trig (triangles, circles, coordinate geometry, trig)
 */

const count = parseInt(process.argv[2], 10);
const domainsArg = process.argv[3];

if (!count || isNaN(count)) {
  console.log('Generate math questions using AI (Claude + Gemini)');
  console.log('');
  console.log('Usage:');
  console.log('  npm run generate:math <count> [domains]');
  console.log('');
  console.log('Examples:');
  console.log('  npm run generate:math 100                       # 100 random questions');
  console.log('  npm run generate:math 50 algebra                # 50 algebra questions');
  console.log('  npm run generate:math 50 geometry_trig          # 50 geometry/trig questions');
  console.log('  npm run generate:math 25 algebra,problem_solving # 25 from multiple domains');
  console.log('');
  console.log('Available domains:');
  console.log('  - algebra (35% of SAT): linear equations, inequalities, systems, functions');
  console.log('  - advanced_math (35%): quadratic, polynomial, exponential, radical');
  console.log('  - problem_solving (15%): ratios, percentages, statistics, probability');
  console.log('  - geometry_trig (15%): triangles, circles, coordinate geometry, trig');
  console.log('');
  console.log('To generate from static templates instead:');
  console.log('  npx convex run seed:seedGraphQuestions');
  process.exit(0);
}

// Build the arguments object
const args = { count };

if (domainsArg) {
  const domains = domainsArg.split(',').map(d => d.trim()).filter(Boolean);
  const validDomains = ['algebra', 'advanced_math', 'problem_solving', 'geometry_trig'];

  // Validate domains
  for (const domain of domains) {
    if (!validDomains.includes(domain)) {
      console.error(`Error: Unknown domain "${domain}"`);
      console.error(`Valid domains: ${validDomains.join(', ')}`);
      process.exit(1);
    }
  }

  args.domains = domains;
}

console.log(`Generating ${count} math questions with AI...`);
if (args.domains) {
  console.log(`Domains: ${args.domains.join(', ')}`);
}
console.log('');
console.log('Pipeline: Claude (problem) → Gemini (figure) → Claude (question) → Store');
console.log('');

try {
  execSync(`npx convex run seed:batchGenerateMathQuestions '${JSON.stringify(args)}'`, {
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.error('');
  console.error('Some questions may have failed. Check the DLQ:');
  console.error('  npm run dlq:math:stats');
  console.error('  npm run dlq:math:retry');
  process.exit(1);
}
