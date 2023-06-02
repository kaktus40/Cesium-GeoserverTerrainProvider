import esbuilt from 'esbuild';
import sveltePlugin from "esbuild-svelte";
import sveltePreprocess from "svelte-preprocess";
import serve, { error, log } from 'create-serve';

import FsExtra from 'fs-extra';

import path from 'path';
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
    // let js = readFileSync('./dist/evaluation/eval.js').toString();

    // const configs = readFileSync('./testConfig.json').toString();
    // js = js.replace(`"__configuration__"`, configs);
    // writeFileSync('./dist/evaluation/index.js', js);
    let js = readFileSync('./dist/plugin/index.js').toString();
    writeFileSync('./dist/evaluation/GeoserverTerrainProvider.js', js);
    writeFileSync('./dist/GeoserverTerrainProvider.js', js);
}

const finishingPlugin = {
    name: 'finishingPlugin',
    setup(build) {
        build.onEnd(result => {
            finishing();
            if (isDev) {
                serve.update();
            }
        })
    },
}
const esBuiltOptions = {
    target: 'esnext',
    sourcemap: false,
    platform: 'browser',
    legalComments: 'none',
    format: 'iife',
    entryPoints: ['src/plugin/index.ts', 'src/evaluation/eval.js'],
    minify: !isDev,
    treeShaking: true,
    ignoreAnnotations: true,
    bundle: true,
    outdir,
    write: true,
    define: { global: 'window' },
    loader: { ".ts": "ts" },
    plugins: [sveltePlugin({
        preprocess: sveltePreprocess(),
    }), finishingPlugin],
    logLevel: "info",
    external: ['cesium'],
}

if (isDev) {
    console.info('http://localhost:8000/application.html')
    serve.start({
        root: './dist/evaluation/',
        port: 8000,
        // live: true
    });
    const ctx = await esbuilt.context(esBuiltOptions);
    await ctx.watch();
} else {
    esbuilt.build(esBuiltOptions)
}

