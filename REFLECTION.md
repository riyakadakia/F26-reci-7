# Reflection

**Name / Andrew ID:**

**Recitation group members (Task 2):**

---

### 1. Valid but weak

Pick a property you wrote that passes on the correct implementation but
kills few or no mutants. Why is it still a *valid* property? Describe a
concrete bug (not one of our mutants) that it *would* catch.

/ Pattern: differential. Points at and just beside every input endpoint are covered by the output exactly when they're covered by the input.
'covers the same points as the input'

This property I wrote passes on correct implementations but doesn't kill the desired mutant. It's still valid because it follows the specs that the result covers exactly the same points of the number line as the input. But since the intervals are created at random it will rarely hit the case of the overlapping invervals. A bug it would catch: overwriting the end when merging (last[1] = end) instead of taking the max. For [1, 10] and [2, 3], that returns [1, 3]. The property checks the point 10, which is an endpoint of the input, so it’s covered by the input but not by the output, and the test fails.


### 2. A generator problem, not a property problem

Describe a mutant, from either task, that survived or was flaky because of
your **generator** rather than your property. What did the generator fail to
produce? How did you fix it? Paste the runner output from before and after.

Mutant: mergesIntegerNeighbors, which merges intervals like [1, 2] and [3, 4] that are 1 apart but don’t touch.

What the generator failed to produce: My general generator, intervalList, uses unrestricted fc.integer(), so two intervals almost never land exactly 1 apart. None of the properties that use it (including the differential, which would catch this bug by probing 2.5) ever saw the one input shape where the bug shows up. With my targeted tests turned off, the mutant survived.

Fix: I wrote a targeted generator, integerNeighbors, that builds two intervals with a gap of exactly 1 by construction (the second starts at end1 + 1). With a conditional property that expects the output to equal the input, every generated case triggers the bug, so the mutant dies in all 5 runs. My disjointList generator also reaches it, since it produces gaps of 1 as well.

Before:   ✘ mergesIntegerNeighbors  SURVIVED
After:  ✔ mergesIntegerNeighbors  killed  by: does not merge intervals separated by a gap of 1; leaves already-disjoint input unchanged
      Counterexample: [[[0,0],[1,1]]]
      AssertionError: expected [ [ +0, 1 ] ] to deeply equal [ [ +0, +0 ], [ 1, 1 ] ]


### 3. Reading a counterexample

Paste one counterexample that the mutation runner printed for a killed
mutant. In 2–3 sentences, explain using the *specification* why that input
exposes the bug.

~ mergesIntegerNeighbors  flaky: killed in 2/5 runs  by: covers the same points as the input
      Counterexample: [[[-15,-15],[-14,0]]]
      AssertionError: expected true to be false // Object.is equality

The spec says the result must cover exactly the same points as the input, where points means all real numbers, not just integers. [-15, -15] and [-14, 0] leave a gap (−15 < x < −14), so they must stay separate. But the mutant treats integer neighbors as touching and merges them into [-15, 0]. My property probed −14.5 (an input endpoint − 0.5), which the mutant’s output covers (true) but the input doesn’t (false), so the test failed.

### 4. Your project

Name one function or module in your team's project that would benefit from
property-based testing. State two properties in English, name the pattern of
each, and describe the generator you'd need, including anything about its
inputs that a naive generator would get wrong.

he hysteresis state machine next(state, promptTier) in our auto-model routing feature would benefit from property-based testing, because its rule (“switch up immediately, down only after 3 lower prompts in a row”) is simple to state but easy to get wrong in edge cases. One property is an invariant (“some things never change”): after any sequence of prompts, the streak stays between 0 and 2, the remembered lower tiers match the streak and are all below the active tier, and the active tier is never below the latest prompt’s tier. A second property uses a test oracle: the active tier after each step must match a simple reference implementation that keeps the full prompt history and recomputes the answer from scratch. The generator should produce sequences of tiers and build states by running next over them, because a naive generator of random state objects would create mostly invalid states that only test the reset path, and uniform random tiers would rarely produce the runs of three lower prompts or mid-streak resets that exercise the interesting logic.


