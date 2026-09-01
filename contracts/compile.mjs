// Compile HybridToken.sol + HybridLending.sol with solc 0.8.28
// Output: build/*.abi + *.bin (solcjs format, same as AirdropDistributor)
import solc from 'solc';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.join(__dirname, 'build');
fs.mkdirSync(buildDir, { recursive: true });

const contracts = ['HybridToken.sol', 'HybridLending.sol'];
const sources = {};
for (const f of contracts) {
  sources[f] = { content: fs.readFileSync(path.join(__dirname, f), 'utf8') };
}

const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors) {
  for (const e of output.errors) {
    console.log(e.severity.toUpperCase() + ': ' + e.formattedMessage);
    if (e.severity === 'error') process.exit(1);
  }
}

for (const f of contracts) {
  const name = f.replace('.sol', '');
  const contractsOut = output.contracts[f];
  for (const [cname, c] of Object.entries(contractsOut)) {
    const base = `${f.replace('.sol','')}_${cname}`;
    fs.writeFileSync(path.join(buildDir, base + '.abi'), JSON.stringify(c.abi, null, 2));
    fs.writeFileSync(path.join(buildDir, base + '.bin'), c.evm.bytecode.object);
    console.log('✔', base, '- ABI + BIN written');
  }
}
console.log('Done.');
