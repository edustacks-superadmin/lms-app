const { exec } = require('child_process');
const http = require('http');

function checkServer() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000', (res) => {
            resolve(true);
        });
        req.on('error', () => {
            resolve(false);
        });
        req.end();
    });
}

function runScript(scriptName) {
    return new Promise((resolve, reject) => {
        console.log(`\n--- Running ${scriptName} ---`);
        exec(`node scripts/${scriptName}`, { cwd: process.cwd() }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error running ${scriptName}:`, error);
                console.error(stderr);
            } else {
                console.log(stdout);
            }
            resolve();
        });
    });
}

async function start() {
    console.log('Waiting for server to be ready...');
    let ready = false;
    for (let i = 0; i < 60; i++) { // 60 attempts * 2s = 2 minutes (Next.js can be slow)
        ready = await checkServer();
        if (ready) break;
        await new Promise(r => setTimeout(r, 2000));
        process.stdout.write('.');
    }

    if (!ready) {
        console.error('\nServer did not start in time (2 mins). Please check terminal.');
        process.exit(1);
    }

    console.log('\nServer is up! Starting Sync Sequence...');

    // 1. Sync Exams
    await runScript('trigger-exams-sync.js');

    // 2. Sync Contents
    console.log('Starting Contents Sync...');
    await runScript('trigger-contents-sync.js');

    console.log('\nFull Sync Process Finished.');
}

start();
