// Callsign + story generator for the Blue Angels Foundation quiz.
//
// Design notes
// ────────────
// Each answer (trait, hobby, animal, weather, motto) nudges a hidden
// personality archetype. The top-scoring archetype picks which story bank
// the closing narrative is drawn from. The callsign word itself is pulled
// from a trait pool or a weather pool — half and half.
//
// Why simple substitution? Earlier versions tried to weave the participant's
// hobby in as an appositive and the weather in as a mid-sentence clause.
// That produced run-on, off-theme stories. Here we keep the only inline
// variables to ${name} and ${homeCity} so every output is short, clean,
// and unmistakably about the picked archetype.
(function (root) {
  'use strict';

  // ── Personality archetypes ────────────────────────────────────────
  // instinct — calm, natural, unbothered
  // spark    — charismatic, performative, brings the energy
  // mind     — calculating, ahead of the curve, prepared
  // edge     — bold, rule-bending, willing to find out
  // heart    — protective, steady, never leaves a wingman
  // quick    — sharp, fast on the radio, fast on the controls
  const ARCHETYPES = ['instinct', 'spark', 'mind', 'edge', 'heart', 'quick'];

  // Each answer votes for two archetypes (a doubled pair = stronger vote).
  const ARCHETYPE_WEIGHTS = {
    // trait
    'Cool under pressure':   ['instinct', 'mind'],
    'Life of the party':     ['spark', 'spark'],
    'The strategist':        ['mind', 'mind'],
    'A daredevil':           ['edge', 'edge'],
    'The loyal one':         ['heart', 'heart'],
    'Quick-witted':          ['quick', 'quick'],
    // hobby
    'Sports':                ['instinct', 'quick'],
    'Music':                 ['spark', 'heart'],
    'Gaming':                ['quick', 'mind'],
    'Outdoors':              ['instinct', 'heart'],
    'Cooking':               ['heart', 'spark'],
    'Reading':               ['mind', 'mind'],
    'Building / Tinkering':  ['mind', 'instinct'],
    'Art / Photography':     ['spark', 'instinct'],
    // animal
    'Eagle':                 ['instinct', 'mind'],
    'Wolf':                  ['heart', 'edge'],
    'Shark':                 ['edge', 'quick'],
    'Falcon':                ['quick', 'instinct'],
    'Bear':                  ['heart', 'edge'],
    'Panther':               ['edge', 'instinct'],
    'Cobra':                 ['edge', 'quick'],
    'Phoenix':               ['spark', 'edge'],
    // weather
    'Clear blue skies':      ['instinct', 'spark'],
    'Through the storm':     ['edge', 'heart'],
    'Golden sunset':         ['spark', 'heart'],
    'Moonlit night':         ['mind', 'edge'],
    'Above the clouds':      ['mind', 'instinct'],
    'Low and fast at dawn':  ['edge', 'quick'],
    // motto
    'Fortune favors the bold': ['edge', 'spark'],
    'Stay low, move fast':     ['quick', 'edge'],
    'No guts, no glory':       ['edge', 'heart'],
    'Smooth is fast':          ['instinct', 'quick'],
    'Eyes on the horizon':     ['mind', 'heart'],
    'Born to fly':             ['instinct', 'spark']
  };

  // ── Callsign word pools ───────────────────────────────────────────
  const PREFIXES = {
    'Cool under pressure': ['Ice', 'Frost', 'Steel', 'Stone', 'Glacier', 'Zero', 'Subzero'],
    'Life of the party':   ['Flash', 'Blaze', 'Neon', 'Boom', 'Spark', 'Ruckus', 'Riot'],
    'The strategist':      ['Shadow', 'Ghost', 'Cipher', 'Sage', 'Rook', 'Bishop', 'Specter'],
    'A daredevil':         ['Maverick', 'Blitz', 'Rocket', 'Nitro', 'Fury', 'Bolt', 'Turbo'],
    'The loyal one':       ['Shield', 'Anchor', 'Bastion', 'Ironside', 'Guardian', 'Fortress', 'Valor'],
    'Quick-witted':        ['Razor', 'Viper', 'Fox', 'Ace', 'Dart', 'Reflex', 'Snap']
  };

  const WEATHER_MODS = {
    'Clear blue skies':     ['Horizon', 'Cobalt', 'Skyhawk', 'Halo'],
    'Through the storm':    ['Storm', 'Thunder', 'Tempest', 'Squall'],
    'Golden sunset':        ['Dusk', 'Amber', 'Ember', 'Sundown'],
    'Moonlit night':        ['Eclipse', 'Phantom', 'Midnight', 'Luna'],
    'Above the clouds':     ['Zenith', 'Apex', 'Stratos', 'Summit'],
    'Low and fast at dawn': ['Streak', 'Daybreak', 'Afterburner', 'Blur']
  };

  // ── Story banks ───────────────────────────────────────────────────
  // Each story is two short sentences, ~30–45 words. The pronoun is
  // always "they/them" — kept simple on purpose. Only ${name} and
  // ${homeCity} substitute.
  const INTROS = {
    instinct: [
      `Some pilots learn the jet; {name} just seems to agree with it.`,
      `{name} flies the way most people walk — no visible effort, no wasted motion.`,
      `There's a looseness to {name} in the cockpit that simply cannot be taught.`
    ],
    spark: [
      `{name} can't help it; every sortie turns into a little bit of a performance.`,
      `Some pilots fill a cockpit; {name} fills a whole flight line.`,
      `{name} flies like there's an audience, and somehow there always is.`
    ],
    mind: [
      `{name} is always a few minutes into the future, solving what hasn't happened yet.`,
      `The pause before {name} keys the mic is never hesitation — it's arithmetic.`,
      `{name} treats every sortie like a chess problem with the clock running.`
    ],
    edge: [
      `Nobody predicts {name}, and that includes {name}.`,
      `{name} has a gift for finding the exact edge of what's allowed and leaning on it.`,
      `Routine does not survive first contact with {name}.`
    ],
    heart: [
      `Ask the squadron who they want on their wing and the answer is always {name}.`,
      `{name} keeps a quiet headcount of the whole flight without ever being asked.`,
      `There's a steadiness to {name} that the entire unit quietly leans on.`
    ],
    quick: [
      `{name} answers the question while you're still forming it.`,
      `{name} thinks at the speed of the radio, and usually a half-beat faster.`,
      `{name} is always three words ahead of everyone on the frequency.`
    ]
  };

  // ── Version B: hobby-fused intros ─────────────────────────────────
  // Each (archetype, hobby) pair gets one bespoke opening sentence that
  // *replaces* the plain intro. The hobby is structurally inside the
  // personality statement (parallel construction) rather than tacked on
  // as a separate sentence — that was the lesson from the standalone
  // hobby-line draft, which read as a B-side fact.
  const INTROS_FUSED = {
    instinct: {
      'Sports':               `{name} is the same in a tied game in the last inning as in a tight sortie — calm, focused, nothing wasted.`,
      'Music':                `{name} flies the way they play music — quietly, on time, never rushing to the next note.`,
      'Gaming':               `{name} moves in the cockpit like a player who memorized the map a long time ago.`,
      'Outdoors':             `{name} flies the way they take a long trail — patient, unhurried, nothing wasted.`,
      'Cooking':              `{name} works the cockpit like a kitchen at dinner rush — calm hands, no panic, every move on cue.`,
      'Reading':              `{name} flies the way they read — at their own pace, taking in everything, never skipping ahead.`,
      'Building / Tinkering': `{name} handles the jet the way they handle a project: methodically, no hesitation.`,
      'Art / Photography':    `{name} flies the way they sketch — in long, unbroken lines, never lifting the pen.`
    },
    spark: {
      'Sports':               `{name} brings the same fire to a sortie that they bring to the last quarter of a tied game.`,
      'Music':                `{name} flies the way they play music — loud, on time, and somehow still improvising.`,
      'Gaming':               `{name} flies like they game — narrating every move, half-laughing the whole time.`,
      'Outdoors':             `{name} flies like they hike — telling a story the whole way up the mountain.`,
      'Cooking':              `{name} flies the way they cook for company — generously, with everyone invited and the music loud.`,
      'Reading':              `{name} reads out loud, with all the voices, and flies the same way — bright and unmissable.`,
      'Building / Tinkering': `{name} builds with the radio up and parts everywhere, and flies with the same friendly chaos that somehow works.`,
      'Art / Photography':    `{name} shoots for the dramatic frame and flies for the dramatic line — every sortie a little bit of theater.`
    },
    mind: {
      'Sports':               `{name} plays the way they fly: three moves ahead, calling the play before it actually happens.`,
      'Music':                `{name} flies the way they play music — counting bars, every entrance on time.`,
      'Gaming':               `{name} flies the way they game — two strategies deep, already knowing how the level ends.`,
      'Outdoors':             `{name} flies like they hike: route mapped, weather checked, timing tight.`,
      'Cooking':              `{name} flies the way they cook — every step measured, every result repeatable.`,
      'Reading':              `{name} flies the way they read — paying attention to what other people miss.`,
      'Building / Tinkering': `{name} builds by the plan, math worked twice, and flies exactly the same way.`,
      'Art / Photography':    `{name} plans their artwork the way they compose a sortie — every element exactly where it should be.`
    },
    edge: {
      'Sports':               `{name} plays sports the way they fly: full throttle, fouling out only when it's worth it.`,
      'Music':                `{name} plays music the way they fly: loud, fast, and right on the edge of the tempo.`,
      'Gaming':               `{name} games in speedrun mode, glitches included, and flies with the same disregard for the safe path.`,
      'Outdoors':             `{name} hikes off-trail and faster than recommended, and the cockpit gets the same treatment.`,
      'Cooking':              `{name} cooks with the burners high and the smoke alarm off, and flies the same way.`,
      'Reading':              `{name} reads three chapters ahead and flies past the safe altitude with the same instinct.`,
      'Building / Tinkering': `{name} welds first and documents later, and the cockpit is no different.`,
      'Art / Photography':    `{name} makes art that's daring more than safe, and flies exactly the same.`
    },
    heart: {
      'Sports':               `{name} plays for the rookie and the bench, and flies for the same kind of people.`,
      'Music':                `{name} plays music the way they fly: listening to the rest of the band first, soloing last.`,
      'Gaming':               `{name} games co-op only, never the lone wolf, and flies the same way.`,
      'Outdoors':             `{name} hikes at the back of the group, making sure nobody falls behind, and flies the same way.`,
      'Cooking':              `{name} cooks for whoever's hungry, however many show up. The cockpit gets the same loyalty.`,
      'Reading':              `{name} re-reads the same books every winter, and shows up for the same wingmen every sortie.`,
      'Building / Tinkering': `{name} is the friend everyone calls when something's broken, and the wingman everyone wants on their six.`,
      'Art / Photography':    `{name} photographs the moment after the laugh, and flies with the same attention to who's actually there.`
    },
    quick: {
      'Sports':               `{name} is first to the ball, last to the bench, and the cockpit isn't any different.`,
      'Music':                `{name} hears a melody once and has it. Same reflex works in a cockpit.`,
      'Gaming':               `{name}'s reflexes run ahead of the cutscene — same in a game, same in a cockpit.`,
      'Outdoors':             `{name} sets the pace on a hike and sets the pace in the air. Nobody's waiting on them.`,
      'Cooking':              `{name} cooks with six pans, each one timed perfectly. The cockpit is just a smaller kitchen.`,
      'Reading':              `{name} finishes a paperback in a weekend and a sortie before tower's done talking.`,
      'Building / Tinkering': `{name} improvises the fix before reaching for the manual — same in a hangar, same in a cockpit.`,
      'Art / Photography':    `{name} grabs the frame before the moment's gone — same instinct works for a busted approach.`
    }
  };

  // Each story is self-contained: it ends with the callsign-earning beat.
  // No closer is appended. A subset reference {homeCity} for personalization.
  const STORIES = {
    instinct: [
      `On the day a training sortie went sideways, {name} went quiet for ten seconds, made two corrections, and put it down so smooth the tower thought it was on autopilot. The callsign was on the duty board by debrief.`,
      `Half the formation was still calling out the problem when {name} keyed the mic exactly once: "I got it." They did, and the callsign followed within the hour.`,
      `{name} walked into debrief after a rough sortie like nothing had happened, then asked if anyone wanted to grab lunch. Word reached {homeCity} before they did.`
    ],
    spark: [
      `In their first week, {name} talked the maintenance crew into letting them DJ over the hangar intercom. By Friday they'd given half the base nicknames, and the callsign was less a decision than an inevitability.`,
      `{name} turned a long debrief into a party with one joke. Somebody said the callsign out loud mid-laugh, the room erupted, and that was that.`,
      `Somebody back in {homeCity} probably told {name} not to be the loudest person in the room, but the advice never took. The callsign caught the first time it was yelled across the ramp.`
    ],
    mind: [
      `{name} sketched the entire sortie on a whiteboard the night before and predicted exactly where it would go sideways. They were right on every count, and the instructor stared at the board and said, "Who are you?"`,
      `Three days before the exercise, {name} told their wingman exactly how it would go down. They were off by twelve seconds, no more. The squadron stopped questioning their hunches after that.`,
      `{name} spent the whole sortie narrating the opposing flight's next move, calling it out a beat before they made it. By the time the jets were back on the ramp, the callsign was already on the board.`
    ],
    edge: [
      `Two people told {name} the maneuver was a bad idea. They went for it anyway. It worked, the tower went silent, and they landed to applause they probably shouldn't have gotten.`,
      `The CO's exact words were, "That was unauthorized, unsafe, and the best flying I've seen all year." {name} just grinned. The crew chief had the callsign stenciled on the jet by morning.`,
      `{name} has a habit of asking "Is that a rule or a guideline?" and doing the thing before anyone answers. The callsign came from exactly one of those moments.`
    ],
    heart: [
      `When their wingman's radio cut out mid-sortie, {name} turned the whole formation around without hesitation and flew wing-to-wing all the way home. When the CO asked why, the answer was simple: "That's my wingman."`,
      `During a training exercise, {name} quietly gave up their shot at top marks to cover a rookie falling behind. They never mentioned it; the rookie did, and that's how the callsign got around.`,
      `{name} refused to leave the area until every jet in the flight was accounted for. The callsign was unanimous by the next morning, and word of it carried all the way back to {homeCity}.`
    ],
    quick: [
      `Tower called a correction and {name} fired back something so fast the frequency went dead for three seconds. Then the laughter started, and even the CO keyed up to say, "Good copy."`,
      `Something went weird with the avionics mid-sortie and {name} had no time to look it up. They did the math in their head, called the correction to tower, and nailed it. The maintenance chief still doesn't quite believe the story.`,
      `{name} talked their way out of a busted approach with nothing but mental math and a one-liner. The controller laughed mid-clearance, and the callsign followed.`
    ]
  };

  // ── Generator ─────────────────────────────────────────────────────
  // opts.version: 'a' (default) = plain personality intro + story.
  //               'b'           = hobby-fused intro + story (1 fused
  //                              opener per archetype × hobby).
  function generate(answers, opts) {
    const version = (opts && opts.version === 'b') ? 'b' : 'a';
    const name = (answers.name || 'Pilot').trim();
    const hometown = (answers.hometown || '').trim();
    const homeCity = (hometown.split(',')[0] || '').trim() || 'back home';
    const { hobby, trait, animal, weather, motto } = answers;

    // Deterministic PRNG seeded from the answers, so the same quiz
    // always produces the same callsign.
    let seed = 0;
    const allText = [name, hometown, hobby, trait, animal, weather, motto].join('|');
    for (let i = 0; i < allText.length; i++) {
      seed = ((seed << 5) - seed + allText.charCodeAt(i)) | 0;
    }
    const pick = (arr) => arr[Math.abs(seed = (seed * 16807 + 7) | 0) % arr.length];

    // Score archetypes. Every answer votes for two archetypes (a doubled
    // pair = stronger vote). The trait answer is *explicit* self-ID, so
    // its votes count double — other answers can still tip the balance
    // when they strongly converge elsewhere, but the trait isn't quietly
    // overruled by minority signals.
    const scores = Object.fromEntries(ARCHETYPES.map(a => [a, 0]));
    const voters = [
      { ans: trait,   weight: 2 },
      { ans: hobby,   weight: 1 },
      { ans: animal,  weight: 1 },
      { ans: weather, weight: 1 },
      { ans: motto,   weight: 1 }
    ];
    voters.forEach(({ ans, weight }) => {
      (ARCHETYPE_WEIGHTS[ans] || []).forEach(k => {
        if (k in scores) scores[k] += weight;
      });
    });
    const top = Math.max.apply(null, Object.values(scores));
    const archetype = pick(ARCHETYPES.filter(a => scores[a] === top));

    // Callsign: half the time we pull from the trait pool, half from the
    // weather pool. Both pools are tonally tight, so this stays on-brand.
    const prefix = pick(PREFIXES[trait] || ['Ace']);
    const weatherTag = pick(WEATHER_MODS[weather] || ['Sky']);
    const callsign = pick([prefix, weatherTag]);

    // Story: opener + earning-the-callsign beat. The opener differs by
    // version — A is a plain personality line, B is the hobby-fused one.
    // We always advance the seed by the same picks regardless of version
    // so that A and B for identical answers share the same story body
    // (and the only thing that differs is the intro — apples-to-apples).
    const fill = (s) => s.replace(/\{name\}/g, name).replace(/\{homeCity\}/g, homeCity);
    const plainIntro = pick(INTROS[archetype]);
    const storyTemplate = pick(STORIES[archetype]);
    const fusedIntro = (INTROS_FUSED[archetype] && INTROS_FUSED[archetype][hobby]) || null;
    const intro = (version === 'b' && fusedIntro) ? fusedIntro : plainIntro;
    const meaning = fill(`${intro} ${storyTemplate}`);

    return { callsign, meaning, archetype, scores, version };
  }

  const api = {
    generate,
    ARCHETYPES,
    ARCHETYPE_WEIGHTS,
    PREFIXES,
    WEATHER_MODS,
    INTROS,
    INTROS_FUSED,
    STORIES
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.CallsignGenerator = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
