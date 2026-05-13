const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

function check(deps) {
    if (!deps) return;
    for (const [name, ver] of Object.entries(deps)) {
        if (typeof ver !== 'string') {
            console.log(`Dependency ${name} has non-string version: ${typeof ver}`);
        } else if (ver.trim() === "") {
             console.log(`Dependency ${name} has empty version string`);
        }
    }
}

check(pkg.dependencies);
check(pkg.devDependencies);
check(pkg.peerDependencies);
check(pkg.optionalDependencies);

console.log("Check complete");
