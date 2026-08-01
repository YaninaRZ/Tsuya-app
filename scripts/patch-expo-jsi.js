const fs = require('fs');
const path = require('path');

// Fix for https://github.com/expo/expo/issues/46242
// "weak let" is rejected by Xcode 26 / Swift 6.2 ("'weak' must be a mutable variable")
const base = path.join(__dirname, '..', 'node_modules', 'expo-modules-jsi', 'apple', 'Sources', 'ExpoModulesJSI');

function walk(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(walk(full));
    else if (entry.name.endsWith('.swift')) files.push(full);
  }
  return files;
}

if (fs.existsSync(base)) {
  for (const file of walk(base)) {
    const content = fs.readFileSync(file, 'utf8');
    let patched = content.replace(/\bweak\s+let\b/g, 'weak var');
    // Sendable-conforming types can't have a plain mutable weak var; opt out of the check.
    patched = patched.replace(/(?<!nonisolated\(unsafe\)\s)\bweak\s+var\b/g, 'nonisolated(unsafe) weak var');
    if (patched !== content) {
      fs.writeFileSync(file, patched, 'utf8');
      console.log('Patched:', path.basename(file));
    }
  }

  // Clear xcframework build cache so it rebuilds with the patched sources
  const cacheDir = path.join(base, '..', '..');
  for (const dir of ['.DerivedData', '.build', 'Products', '.xcframework-slices']) {
    const p = path.join(cacheDir, dir);
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true });
      console.log('Cleared cache:', dir);
    }
  }
}
