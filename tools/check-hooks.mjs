/**
 * Catches React hooks that are CALLED but never imported or declared.
 *
 * Why this exists: `npm run build` cannot see this class of mistake. Leaving a
 * `const navigate = useNavigate();` behind after deleting the import compiles
 * perfectly and only throws "useNavigate is not defined" when the component
 * actually renders — which is how a chef dashboard ended up blank while the
 * build stayed green.
 *
 * The project has an `npm run lint` script, but eslint is not installed and
 * cannot be fetched here, so this is a small stand-in that needs no dependencies.
 * It is deliberately narrow (hooks only) to avoid false positives.
 *
 * Usage:  node tools/check-hooks.mjs
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.argv[2] || 'client/src';
const EXTENSIONS = new Set(['.js', '.jsx', '.mjs']);

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXTENSIONS.has(extname(full))) out.push(full);
  }
  return out;
};

/** Everything the file brings into scope by name. */
const declaredNames = (source) => {
  const names = new Set();

  // import X from '...' / import { a, b as c } from '...' / import * as ns
  for (const m of source.matchAll(/import\s+([^;]+?)\s+from\s+['"][^'"]+['"]/g)) {
    const clause = m[1];
    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) {
      for (const part of braces[1].split(',')) {
        const aliased = part.trim().split(/\s+as\s+/);
        const name = (aliased[1] || aliased[0] || '').trim();
        if (name) names.add(name);
      }
    }
    const beforeBrace = clause.split('{')[0].replace(/,/g, ' ').trim();
    for (const token of beforeBrace.split(/\s+/)) {
      // `* as ns` -> ns
      const ns = token.match(/\*\s+as\s+([\w$]+)/);
      if (ns) names.add(ns[1]);
      else if (/^([A-Za-z_$][\w$]*)$/.test(token)) names.add(token);
    }
  }

  // Local declarations: const/let/var/function/class, plus destructuring names.
  for (const m of source.matchAll(/(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]);
  }
  for (const m of source.matchAll(/(?:const|let|var)\s*\{([^}]*)\}\s*=/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(':').pop().trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }

  return names;
};

const files = walk(ROOT);
const problems = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const declared = declaredNames(source);

  // Strip comments and string literals so prose never looks like a hook call.
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ')
    .replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, ' ');

  for (const m of code.matchAll(/\buse[A-Z]\w*/g)) {
    const hook = m[0];
    if (!declared.has(hook)) {
      const line = code.slice(0, m.index).split('\n').length;
      problems.push(`${file}:${line}  '${hook}' is used but never imported or declared`);
    }
  }
}

if (problems.length === 0) {
  console.log(`OK: no missing hooks across ${files.length} file(s) in ${ROOT}`);
} else {
  console.error(`${problems.length} problem(s) found:\n`);
  problems.forEach((p) => console.error('  ' + p));
  process.exitCode = 1;
}
