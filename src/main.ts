import { createWriteStream, promises as fs, readFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { createGzip } from "node:zlib";
import { pack } from "tar-stream";

function parseIgnoreFile(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function isIgnored(path: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some((pattern) => {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  });
}

async function getAllFiles(
  dir: string,
  baseDir: string = "",
  ignorePatterns: string[] = []
): Promise<
  {
    path: string;
    relativePath: string;
    type: "file" | "directory" | "symlink";
  }[]
> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: {
    path: string;
    relativePath: string;
    type: "file" | "directory" | "symlink";
  }[] = [];

  for (const entry of entries) {
    if (entry.name === ".hcsignore" && baseDir === "") {
      continue; // Skip .hcsignore file at root
    }

    const fullPath = join(dir, entry.name);
    const relativePath = baseDir ? join(baseDir, entry.name) : entry.name;

    if (isIgnored(entry.name, ignorePatterns)) {
      continue;
    }

    try {
      if (entry.isSymbolicLink()) {
        files.push({ path: fullPath, relativePath, type: "symlink" });
      } else if (entry.isDirectory()) {
        files.push({
          path: fullPath,
          relativePath: relativePath + "/",
          type: "directory",
        });
        files.push(
          ...(await getAllFiles(fullPath, relativePath, ignorePatterns))
        );
      } else {
        files.push({ path: fullPath, relativePath, type: "file" });
      }
    } catch (error) {
      console.error(`Error processing ${fullPath}:`, error);
      continue;
    }
  }

  return files;
}

export async function createTarGz(
  sourcePath: string,
  outputPath: string
): Promise<void> {
  const tempFile = join(os.tmpdir(), "hcs-temp.tar.gz");
  const archive = pack();
  const gzip = createGzip();
  const output = createWriteStream(tempFile);

  let ignorePatterns: string[] = [];

  try {
    const ignoreContent = await fs.readFile(
      join(sourcePath, ".hcsignore"),
      "utf-8"
    );
    ignorePatterns = parseIgnoreFile(ignoreContent);
  } catch (error) {
    console.log(".hcsignore file not found, no patterns will be ignored");
  }

  archive.pipe(gzip).pipe(output);

  try {
    const files = await getAllFiles(sourcePath, "", ignorePatterns);

    for (const file of files) {
      const stat = await fs.stat(file.path);

      if (file.type === "symlink") {
        const linkTarget = await fs.readlink(file.path);
        archive.entry({
          name: file.relativePath,
          type: "symlink",
          linkname: linkTarget,
          mode: stat.mode,
          mtime: stat.mtime,
        });
      } else if (file.type === "directory") {
        archive.entry({
          name: file.relativePath,
          type: "directory",
          mode: stat.mode,
          mtime: stat.mtime,
        });
      } else {
        try {
          const content = readFileSync(file.path);
          archive.entry(
            {
              name: file.relativePath,
              size: stat.size,
              mode: stat.mode,
              mtime: stat.mtime,
            },
            content
          );
        } catch (error) {
          console.error(`Error reading file ${file.path}:`, error);
          continue;
        }
      }
    }

    archive.finalize();
  } catch (error) {
    throw new Error(`Failed to create tar.gz: ${error}`);
  }

  return new Promise((resolve, reject) => {
    output.on("finish", async () => {
      await fs.copyFile(tempFile, outputPath);
      await fs.rm(tempFile);
      resolve();
    });
    output.on("error", reject);
    gzip.on("error", reject);
    archive.on("error", reject);
  });
}

// Example usage:
// createTarGz('.', 'output.tar.gz')
//     .then(() => console.log('Archive created successfully'))
//     .catch(error => console.error('Error:', error));
