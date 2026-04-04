import fs from "fs";

async function rescueData() {
    const backupId = "291jO0zyhCeHAM4RylplwFiSOOC3";
    const projectId = "liquita-67764";

    const endpoints = [
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/backups/${backupId}`,
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${backupId}`,
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/backups`,
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users`
    ];

    for (const url of endpoints) {
        console.log(`Fetching ${url}...`);
        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                console.log(`Success! Found data at ${url}`);
                const filename = url.includes("users") ? "rescued_user.json" : "rescued_backup.json";
                fs.writeFileSync(filename, JSON.stringify(data, null, 2));
                console.log(`Saved to ${filename}`);
                break;
            } else {
                console.log(`Failed. Status: ${res.status}`);
                if (res.status === 403) {
                    console.log(`Access denied for ${url}.`);
                }
            }
        } catch (err) {
            console.error("Fetch error:", err.message);
        }
    }
}

rescueData();
