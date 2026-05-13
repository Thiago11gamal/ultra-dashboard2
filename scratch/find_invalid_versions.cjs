const fs = require('fs');
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));

function checkPackages(packages) {
  for (const [name, pkg] of Object.entries(packages)) {
    if (pkg.version !== undefined && typeof pkg.version !== 'string') {
      console.log(`Package ${name} has non-string version: ${typeof pkg.version}`);
    }
    if (pkg.version === "") {
        console.log(`Package ${name} has empty version string`);
    }
    
    if (pkg.dependencies) {
        for (const [depName, depVer] of Object.entries(pkg.dependencies)) {
            if (typeof depVer !== 'string') {
                console.log(`Package ${name} has non-string dependency version for ${depName}: ${typeof depVer}`);
            } else if (depVer === "") {
                 console.log(`Package ${name} has empty dependency version string for ${depName}`);
            }
        }
    }

    if (pkg.engines) {
        for (const [engineName, engineVer] of Object.entries(pkg.engines)) {
             if (typeof engineVer !== 'string') {
                console.log(`Package ${name} has non-string engine version for ${engineName}: ${typeof engineVer}`);
            } else if (engineVer === "") {
                 console.log(`Package ${name} has empty engine version string for ${engineName}`);
            }
        }
    }
  }
}

if (lock.packages) {
  checkPackages(lock.packages);
}
console.log("Check complete");
