import fs from 'node:fs';
import process from 'node:process';

const coreConfigFiles = [
    './.next/required-server-files.json',
    './server.js'
];

const {
    ALLOWED_ORIGINS: allowedOrigins,
    IMAGE_HOSTNAME: imgHost,
    IMAGE_PROTOCOL: imgProto,
    IMAGE_PORT: imgPort
} = process.env;

console.log('🛠️ [Modern Patch] Starting ESM configuration injection...');

// --- 1. Patch Core Configs (Origins & Images) ---
for (const filePath of coreConfigFiles) {
    if (!fs.existsSync(filePath)) continue;

    try {
        let content = fs.readFileSync(filePath, 'utf8');

        if (allowedOrigins) {
            content = content.replace(/"allowedOrigins":\s*\[[^\]]*\]/g, `"allowedOrigins":["${allowedOrigins}"]`);
        }

        if (imgHost) {
            content = content.replace(/"hostname":"[^"]*","port":"[^"]*"/g, `"hostname":"${imgHost}","port":"${imgPort}"`);
            content = content.replace(/"protocol":"(http|https)"/g, `"protocol":"${imgProto}"`);
        }

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Patched: ${filePath}`);
    } catch (err) {
        console.error(`❌ Error patching ${filePath}:`, err);
    }
}

console.log('🚀 [Patch Complete] Modern ESM script finished.');