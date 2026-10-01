import fs from 'node:fs'
import { evaluatePredictions } from '../src/lib/estimation-ai/evaluation'

const [casesFile, predictionsFile] = process.argv.slice(2)
if (!casesFile || !predictionsFile) throw new Error('Usage: npx tsx scripts/evaluate-estimation-ai.ts cases.json predictions.json')
const document = JSON.parse(fs.readFileSync(casesFile, 'utf8'))
const cases = (document.cases ?? document).filter((c: { reviewed?: boolean }) => c.reviewed === true)
if (!cases.length) throw new Error('No human-reviewed cases. Set reviewed=true only after checking the label and frozen rates.')
console.log(JSON.stringify(evaluatePredictions(cases, JSON.parse(fs.readFileSync(predictionsFile, 'utf8'))), null, 2))
