#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectDir = process.argv[2] || 'my-shork-app';
const templateDir = path.resolve(__dirname, '../template');
const targetDir = path.resolve(process.cwd(), projectDir);

async function init() {
  console.log(`Creating a new Shork app in ${targetDir}...`);

  try {
    await fs.copy(templateDir, targetDir);
    console.log('Project created successfully!');
    console.log('Next steps:');
    console.log(`  cd ${projectDir}`);
    console.log('  npm install');
    console.log('  npm run dev');
  } catch (err) {
    console.error('Error creating project:', err);
  }
}

init();
