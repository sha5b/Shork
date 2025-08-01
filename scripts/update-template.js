import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const templateDir = path.resolve(projectRoot, 'template');

const filesToCopy = [
  'src',
  'static',
  'scripts',
  '.gitignore',
  'jsconfig.json',
  'vitest.config.js',
  'package.json' // We'll handle this separately to avoid recursion
];

async function updateTemplate() {
  console.log('Updating template directory...');

  try {
    // 1. Clean the template directory
    await fs.emptyDir(templateDir);
    console.log('Template directory cleaned.');

    // 2. Copy files and directories
    for (const file of filesToCopy) {
      if (file === 'package.json') continue; // Skip for now
      const sourcePath = path.resolve(projectRoot, file);
      const destPath = path.resolve(templateDir, file);
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, destPath, {
          filter: (src) => {
            // Exclude init.js and update-template.js from being copied into the template's scripts folder
            if (src.endsWith('init.js') || src.endsWith('update-template.js')) {
              return false;
            }
            return true;
          }
        });
        console.log(`Copied ${file}`);
      }
    }

    // 3. Create a template-specific package.json
    const rootPackageJson = await fs.readJson(path.resolve(projectRoot, 'package.json'));
    const templatePackageJson = {
      name: 'my-shork-app',
      version: '1.0.0',
      description: 'A new project created with Shork',
      main: rootPackageJson.main,
      type: rootPackageJson.type,
      scripts: rootPackageJson.scripts,
      devDependencies: rootPackageJson.devDependencies
    };
    // Remove the scripts we don't want in the final project
    delete templatePackageJson.scripts['update-template'];

    await fs.writeJson(path.resolve(templateDir, 'package.json'), templatePackageJson, { spaces: 2 });
    console.log('Created template package.json');

    console.log('\nTemplate update complete!');

  } catch (err) {
    console.error('Error updating template:', err);
  }
}

updateTemplate();
