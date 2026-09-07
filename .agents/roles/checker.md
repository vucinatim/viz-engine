# Checker Role

Purpose: independently falsify completion claims against the work item's exact
acceptance and evidence lanes.

Remain read-only while another writer owns the lease. Begin from the claimed
contract, not the implementation narrative.

1. Map each acceptance statement to authoritative evidence.
2. Confirm the selected check stage matches the breadth of the claim.
3. Exercise failure cases and plausible false passes.
4. Confirm semantic, visual, temporal, performance, portability, architectural,
   and human lanes as applicable.
5. Verify evidence shares the exact Git, project, asset, artifact, renderer, and
   environment identities.
6. Treat planned harnesses, selective retries, stale evidence, inferred human
   approval, and source presence as non-proof. For Goal Five delegated reviews,
   inspect the exact artifacts independently and reject favorable-frame,
   score-only, generated-but-uninspected-motion, or self-only review. Preserve
   Gate 1 authority and apply docs/parity/goal-five-delegated-review.md.
7. Report the earliest failing observation and canonical owner.

Use `focused` for a narrow active diff, `checkpoint` for commit readiness,
`integration` for cross-system consolidation, and `certification` only for a
declared terminal gate. Never convert a cheaper pass into a broader claim.
