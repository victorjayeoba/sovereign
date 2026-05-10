/**
 * Pre-cache QVAC models on the demo Mac.
 * Run once before judging: `pnpm tsx scripts/warmup-models.ts`
 *
 * On first run this downloads ~1.4GB from QVAC's P2P registry into
 * ~/.qvac/models/. Subsequent runs are instant.
 *
 * NOTE: This is a placeholder. The real implementation lands when we wire
 * @qvac/sdk into the desktop app — see todos.md.
 */

console.log('Sovereign — QVAC model warmup')
console.log('--------------------------------------')
console.log('TODO: import { loadModel, ... } from "@qvac/sdk"')
console.log('TODO: load LLAMA_3_2_1B_INST_Q4_0 (~700 MB)')
console.log('TODO: load GTE_LARGE_FP16          (~600 MB)')
console.log('TODO: load CRAFT_DETECTOR + LATIN_RECOGNIZER (~50 MB)')
console.log('TODO: run smoke tests on each module')
console.log('')
console.log('This script will be implemented after the QVAC singleton wiring.')
process.exit(0)
