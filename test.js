import PiwigoClient from './index.js';

if (!process.argv[2]) {
    throw 'No URL supplied';
}

const PWG = new PiwigoClient(process.argv[2])

PWG.getSessionStatus().then(console.log)