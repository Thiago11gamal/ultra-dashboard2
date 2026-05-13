const fs = require('fs');
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));

if (lock.packages) {
  for (const [name, pkg] of Object.entries(lock.packages)) {
    if (name === "") continue; // Skip root
    if (pkg.link) continue; // Skip symlinks
    if (!pkg.version) {
      console.log(`Package ${name} is missing version!`);
      console.log(JSON.stringify(pkg, null, 2));
    }
  }
}
console.log("Check complete");
