#!/usr/bin/env node
import { execSync } from 'child_process';

console.log('Generating math graph questions from templates...');
console.log('');

try {
  execSync('npx convex run seed:seedGraphQuestions', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  process.exit(1);
}
