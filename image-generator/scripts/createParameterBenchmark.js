import { createBenchmarkManifest } from '../shared/parameterBenchmark.js';

process.stdout.write(`${JSON.stringify(createBenchmarkManifest(), null, 2)}\n`);
