import esbuilt from 'esbuild';
import sveltePlugin from "esbuild-svelte";
import sveltePreprocess from "svelte-preprocess";
import serve, { error, log } from 'create-serve';

import FsExtra from 'fs-extra';

import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
    copySync, readFileSync, writeFileSync
} = FsExtra;

const isDev = process.argv.includes('--dev');
const pkg = JSON.parse(readFileSync('./package.json'));

const outdir = 'dist/';

function finishing() {
    pkg.toCopy.forEach(item => copySync(item.in, item.out));
    writeFileSync('./dist/evaluation/index.html', readFileSync('./src/evaluation/index.html'));
    let js = readFileSync('./dist/evaluation/index.js').toString();

    // const configs = readFileSync('./testConfig.json').toString();
    // js = js.replace(`"__configuration__"`, configs);
    writeFileSync('./dist/evaluation/index.js', js);
    js = readFileSync('./dist/plugin/index.js').toString();
    writeFileSync('./dist/evaluation/GeoserverTerrainProvider.js', js);
}
esbuilt.build(
    {
        target: 'esnext',
        sourcemap: false,
        platform: 'browser',
        legalComments: 'none',
        format: 'iife',
        entryPoints: ['src/plugin/index.ts', 'src/evaluation/index.js'],
        minify: !isDev,
        treeShaking: true,
        ignoreAnnotations: true,
        bundle: true,
        outdir,
        platform: 'browser',
        write: true,
        define: { global: 'window' },
        loader: { ".ts": "ts" },
        plugins: [sveltePlugin({
            preprocess: sveltePreprocess(),
        })],
        logLevel: "info",
        external: ['cesium'],
        watch: isDev && {
            onRebuild(err) {
                finishing();
                serve.update();
                if (err) {
                    error('× Failed');
                } else {
                    log('✓ Updated');
                }
            }
        }
    }).then(finishing);
if (isDev) {
    console.info('http://localhost:8000/application.html')
    serve.start({
        root: './dist/evaluation/',
        port: 8000,
        // live: true
    });

}