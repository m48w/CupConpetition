import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const outputDirectory = fileURLToPath(new URL("../dist/", import.meta.url));

function removeAppleDoubleFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.name.startsWith("._") || entry.name === ".DS_Store") {
      rmSync(path, { recursive: true, force: true });
    } else if (entry.isDirectory()) {
      removeAppleDoubleFiles(path);
    }
  }
}

removeAppleDoubleFiles(outputDirectory);
