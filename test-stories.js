// Exhaustive sweep over every quiz combination. Run with:
//   node test-stories.js [--samples]
//
// Without --samples it prints summary statistics + any failures.
// With --samples it also dumps one example per (archetype, intro, story)
// triple so the prose can be eyeballed.

const G = require('./callsign-generator');

const HOBBIES  = ['Sports','Music','Gaming','Outdoors','Cooking','Reading','Building / Tinkering','Art / Photography'];
const TRAITS   = ['Cool under pressure','Life of the party','The strategist','A daredevil','The loyal one','Quick-witted'];
const ANIMALS  = ['Eagle','Wolf','Shark','Falcon','Bear','Panther','Cobra','Phoenix'];
const WEATHERS = ['Clear blue skies','Through the storm','Golden sunset','Moonlit night','Above the clouds','Low and fast at dawn'];
const MOTTOS   = ['Fortune favors the bold','Stay low, move fast','No guts, no glory','Smooth is fast','Eyes on the horizon','Born to fly'];

const TEST_NAMES = ['Sarah', 'Marcus', 'Riley', 'Devon'];
const TEST_HOMETOWNS = ['Pensacola, FL', 'Boise, ID', 'Brooklyn, NY', 'Tulsa, OK'];

// ── Checks run on every generated story ──────────────────────────────
function checkStory(out, inputs) {
  const problems = [];
  const m = out.meaning;

  // 1. No unsubstituted template tokens.
  if (/\{[^}]+\}/.test(m)) problems.push('unsubstituted template token');

  // 2. No double-spaces or stray punctuation.
  if (/ {2,}/.test(m))         problems.push('double-space');
  if (/\s+[,.;:!?]/.test(m))   problems.push('space before punctuation');
  if (/[,.;:!?]{2,}/.test(m))  problems.push('runaway punctuation');

  // 3. Reasonable length (after trim).
  const wc = m.trim().split(/\s+/).length;
  if (wc < 25)  problems.push(`too short (${wc} words)`);
  if (wc > 100) problems.push(`too long (${wc} words)`);

  // 4. Callsign is a single word, alphabetic-ish.
  if (!/^[A-Za-z]+$/.test(out.callsign)) problems.push(`bad callsign "${out.callsign}"`);

  // 5. Archetype is one of the known six.
  if (!G.ARCHETYPES.includes(out.archetype)) problems.push(`unknown archetype "${out.archetype}"`);

  // 6. The pilot's name appears at least once (sanity).
  if (m.indexOf(inputs.name) === -1) problems.push('name missing from meaning');

  // 7. No half-rendered pronoun artifact (catches accidental leftovers
  //    from the old pronoun-substitution code if someone reintroduces it).
  if (/\$\{|\bundefined\b/.test(m)) problems.push('substitution artifact');

  return problems;
}

// ── Main sweep ───────────────────────────────────────────────────────
function main() {
  const showSamples = process.argv.includes('--samples');
  const showFirst   = process.argv.includes('--first');

  let total = 0;
  let failures = 0;
  const failureExamples = [];
  const archetypeHits = Object.fromEntries(G.ARCHETYPES.map(a => [a, 0]));
  const introHits = {};
  const fusedIntroHits = {};
  const storyHits = {};
  const lengths = [];
  const lengthsB = [];
  // For each trait, how often does the chosen archetype include the
  // trait's primary archetype? (Catches "user picked X, got Y story".)
  const traitAlign = {};

  // Only sweep one (name, hometown) pair for the full combo cross-product;
  // it's the choice answers we care about for archetype + grammar coverage.
  // We do an extra small sweep at the end across other (name, hometown)
  // values to catch hometown-specific quirks.
  const name = TEST_NAMES[0];
  const hometown = TEST_HOMETOWNS[0];

  for (const hobby of HOBBIES)
  for (const trait of TRAITS)
  for (const animal of ANIMALS)
  for (const weather of WEATHERS)
  for (const motto of MOTTOS) {
    total++;
    const inputs = { name, hometown, hobby, trait, animal, weather, motto };
    const outA = G.generate(inputs, { version: 'a' });
    const outB = G.generate(inputs, { version: 'b' });
    const probsA = checkStory(outA, inputs);
    const probsB = checkStory(outB, inputs);

    archetypeHits[outA.archetype]++;
    const traitArchetypes = G.ARCHETYPE_WEIGHTS[trait] || [];
    if (!traitAlign[trait]) traitAlign[trait] = { match: 0, total: 0 };
    traitAlign[trait].total++;
    if (traitArchetypes.includes(outA.archetype)) traitAlign[trait].match++;
    const sentencesA = outA.meaning.split(/(?<=[.!?])\s/);
    const introKey = `${outA.archetype}::${sentencesA[0]}`;
    const storyKey = `${outA.archetype}::${sentencesA.slice(1).join(' ')}`;
    introHits[introKey] = (introHits[introKey] || 0) + 1;
    storyHits[storyKey] = (storyHits[storyKey] || 0) + 1;
    const fusedKey = `${outB.archetype}::${hobby}`;
    fusedIntroHits[fusedKey] = (fusedIntroHits[fusedKey] || 0) + 1;
    lengths.push(outA.meaning.trim().split(/\s+/).length);
    lengthsB.push(outB.meaning.trim().split(/\s+/).length);

    [probsA, probsB].forEach((probs, i) => {
      if (probs.length > 0) {
        failures++;
        if (failureExamples.length < 10) {
          failureExamples.push({
            inputs,
            out: i === 0 ? outA : outB,
            probs,
            note: `version ${i === 0 ? 'A' : 'B'}`
          });
        }
      }
    });
  }

  // Hometown variant check: for each hometown, do a small sweep to make
  // sure stories that reference {homeCity} read correctly (both versions).
  let homeFailures = 0;
  for (const ht of TEST_HOMETOWNS) {
    for (const trait of TRAITS) {
      const inputs = { name: 'Devon', hometown: ht, hobby: 'Reading',
                       trait, animal: 'Eagle', weather: 'Clear blue skies',
                       motto: 'Smooth is fast' };
      for (const v of ['a', 'b']) {
        const out = G.generate(inputs, { version: v });
        const probs = checkStory(out, inputs);
        if (probs.length > 0) {
          homeFailures++;
          if (failureExamples.length < 15) {
            failureExamples.push({ inputs, out, probs,
                                   note: `hometown sweep / v${v}` });
          }
        }
      }
    }
  }

  // Report
  const lenSorted = lengths.slice().sort((a,b)=>a-b);
  const p = (q) => lenSorted[Math.floor(lenSorted.length * q)];
  console.log(`Combinations tested:   ${total} (× 2 versions)`);
  console.log(`Hometown variants:     ${TEST_HOMETOWNS.length * TRAITS.length}`);
  console.log(`Failures:              ${failures + homeFailures}`);
  console.log('');
  const lenBSorted = lengthsB.slice().sort((a, b) => a - b);
  const pB = (q) => lenBSorted[Math.floor(lenBSorted.length * q)];
  console.log('Version A word counts (p10/p50/p90/p99/max):',
              `${p(0.10)} / ${p(0.50)} / ${p(0.90)} / ${p(0.99)} / ${lenSorted[lenSorted.length-1]}`);
  console.log('Version B word counts (p10/p50/p90/p99/max):',
              `${pB(0.10)} / ${pB(0.50)} / ${pB(0.90)} / ${pB(0.99)} / ${lenBSorted[lenBSorted.length-1]}`);
  console.log('');
  console.log('Archetype distribution:');
  for (const a of G.ARCHETYPES) {
    const pct = ((archetypeHits[a] / total) * 100).toFixed(1);
    console.log(`  ${a.padEnd(10)} ${String(archetypeHits[a]).padStart(5)}   ${pct}%`);
  }
  console.log('');
  console.log('Trait → archetype alignment (% of stories that match trait\'s primary archetype):');
  for (const t of TRAITS) {
    const ta = traitAlign[t] || { match: 0, total: 1 };
    const pct = ((ta.match / ta.total) * 100).toFixed(1);
    console.log(`  ${t.padEnd(22)} ${pct}%`);
  }
  console.log('');
  console.log('Intro reach (each opener seen at least once?):');
  for (const a of G.ARCHETYPES) {
    G.INTROS[a].forEach((line, i) => {
      const k = `${a}::${line.replace(/\{name\}/g, 'Sarah').replace(/\{homeCity\}/g, 'Pensacola')}`;
      const seen = introHits[k] || 0;
      console.log(`  [${a} ${i}] ${seen > 0 ? '✓' : '✗'}  ${line.slice(0, 70)}${line.length > 70 ? '…' : ''}`);
    });
  }
  console.log('');
  console.log('Version B fused-intro reach (each archetype × hobby seen?):');
  for (const a of G.ARCHETYPES) {
    for (const h of Object.keys(G.INTROS_FUSED[a])) {
      const seen = fusedIntroHits[`${a}::${h}`] || 0;
      const line = G.INTROS_FUSED[a][h];
      console.log(`  [${a.padEnd(8)} × ${h.padEnd(22)}] ${seen > 0 ? '✓' : '✗'}  ${line.slice(0, 60)}${line.length > 60 ? '…' : ''}`);
    }
  }
  console.log('');
  console.log('Story reach (each story seen at least once?):');
  for (const a of G.ARCHETYPES) {
    G.STORIES[a].forEach((line, i) => {
      // Re-key the way the sweep keys it (story-key uses everything past
      // first sentence — exact-string is fragile here; instead we look
      // for the story's first 30 chars among observed story bodies).
      const fingerprint = line.replace(/\{name\}/g, 'Sarah').replace(/\{homeCity\}/g, 'Pensacola').slice(0, 30);
      const seen = Object.keys(storyHits).some(k => k.startsWith(a + '::') && k.indexOf(fingerprint) !== -1);
      console.log(`  [${a} ${i}] ${seen ? '✓' : '✗'}  ${line.slice(0, 70)}${line.length > 70 ? '…' : ''}`);
    });
  }

  if (failureExamples.length) {
    console.log('');
    console.log('── Failure examples ──');
    failureExamples.forEach((f, i) => {
      console.log(`#${i + 1}  ${f.probs.join('; ')}${f.note ? ' [' + f.note + ']' : ''}`);
      console.log(`  inputs: ${JSON.stringify(f.inputs)}`);
      console.log(`  callsign: ${f.out.callsign}  archetype: ${f.out.archetype}`);
      console.log(`  meaning: ${f.out.meaning}`);
      console.log('');
    });
  }

  if (showFirst) {
    console.log('');
    console.log('── First example per archetype (A vs B side-by-side) ──');
    const seenArchetypes = new Set();
    for (const hobby of HOBBIES)
    for (const trait of TRAITS)
    for (const animal of ANIMALS)
    for (const weather of WEATHERS)
    for (const motto of MOTTOS) {
      if (seenArchetypes.size === G.ARCHETYPES.length) break;
      const inputs = { name, hometown, hobby, trait, animal, weather, motto };
      const outA = G.generate(inputs, { version: 'a' });
      const outB = G.generate(inputs, { version: 'b' });
      if (seenArchetypes.has(outA.archetype)) continue;
      seenArchetypes.add(outA.archetype);
      console.log(`[${outA.archetype}]  ${outA.callsign}  (hobby: ${hobby}, trait: ${trait})`);
      console.log(`  A: ${outA.meaning}`);
      console.log(`  B: ${outB.meaning}`);
      console.log('');
    }
  }

  if (showSamples) {
    console.log('');
    console.log('── Random samples (5 per archetype) ──');
    const rng = () => Math.floor(Math.random() * 1e9);
    const samplesByArchetype = Object.fromEntries(G.ARCHETYPES.map(a => [a, []]));
    for (let i = 0; i < 5000 && Object.values(samplesByArchetype).some(s => s.length < 5); i++) {
      const inputs = {
        name: TEST_NAMES[rng() % TEST_NAMES.length],
        hometown: TEST_HOMETOWNS[rng() % TEST_HOMETOWNS.length],
        hobby: HOBBIES[rng() % HOBBIES.length],
        trait: TRAITS[rng() % TRAITS.length],
        animal: ANIMALS[rng() % ANIMALS.length],
        weather: WEATHERS[rng() % WEATHERS.length],
        motto: MOTTOS[rng() % MOTTOS.length]
      };
      const out = G.generate(inputs);
      if (samplesByArchetype[out.archetype].length < 5) {
        samplesByArchetype[out.archetype].push({ inputs, out });
      }
    }
    for (const a of G.ARCHETYPES) {
      console.log(`\n=== ${a.toUpperCase()} ===`);
      samplesByArchetype[a].forEach(({ inputs, out }) => {
        console.log(`\n  ${out.callsign}  (${inputs.name} / ${inputs.trait} / ${inputs.weather})`);
        console.log(`  ${out.meaning}`);
      });
    }
  }

  process.exit(failures + homeFailures > 0 ? 1 : 0);
}

main();
