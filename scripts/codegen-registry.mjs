import fs from "node:fs";
import path from "node:path";

const customsDir = path.resolve("components/customs");
const outputFile = path.resolve("lib/component-registry.generated.ts");

// Ensure customs directory exists
if (!fs.existsSync(customsDir)) {
  fs.mkdirSync(customsDir, { recursive: true });
}

// Scan project custom components (e.g. components/customs/[projectCode]/[ComponentName].tsx)
const projectDirs = fs.existsSync(customsDir)
  ? fs
      .readdirSync(customsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  : [];

let customImports = "";
let customEntries = "";

projectDirs.forEach((projectCode) => {
  const projectPath = path.join(customsDir, projectCode);
  const files = fs
    .readdirSync(projectPath)
    .filter((f) => f.endsWith(".tsx") || f.endsWith(".jsx"));

  if (files.length > 0) {
    customEntries += `  '${projectCode}': {\n`;
    files.forEach((file) => {
      const compName = path.parse(file).name;
      const safeCode = projectCode.replace(/[^a-zA-Z0-9]/g, "_");
      const varName = `${safeCode}_${compName}`;
      customImports += `import ${varName} from '@/components/customs/${projectCode}/${compName}';\n`;
      customEntries += `    ${compName}: ${varName},\n`;
    });
    customEntries += `  },\n`;
  }
});

const generatedCode = `// ⚠️ AUTO-GENERATED FILE BY scripts/codegen-registry.mjs. DO NOT EDIT DIRECTLY.
import type { ElementType } from "react";

// Project Custom Components
${customImports}
export const generatedCustoms: Record<string, Record<string, ElementType>> = {
${customEntries}};

// Backward compatibility aliases
export const generatedOverrides = generatedCustoms;
export const generatedSharedRegistry: Record<string, ElementType> = {};
`;

fs.writeFileSync(outputFile, generatedCode.trim() + "\n", "utf-8");
console.log("✓ Component customs registry successfully auto-generated.");

