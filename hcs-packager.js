#! /usr/bin/env node

import meow from "meow";
import path, { join } from "node:path";
import { createTarGz, fixTarGzPaths } from "./dist/main.js";

const cli = meow(
  `
  Usage
    $ hcs-packager <input> -o <output>
    $ hcs-packager --fix <input> -o <output>

  Options
    --fix    Fix path separators in an existing tar.gz file
    -o, --output    Output file path
  `,
  {
    importMeta: import.meta,
    flags: {
      output: {
        type: "string",
        shortFlag: "o",
      },
      fix: {
        type: "boolean",
      },
    },
  }
);

if (cli.flags.fix) {
  // Fix mode
  const inputFile = cli.input.at(0);
  if (!inputFile) {
    console.error("Error: Input file is required when using --fix");
    process.exit(1);
  }

  const outputFile =
    cli.flags.output ?? inputFile.replace(".tar.gz", "-fixed.tar.gz");

  fixTarGzPaths(path.resolve(inputFile), path.resolve(outputFile))
    .then(() => {
      console.log("Successfully fixed path separators in archive");
    })
    .catch((error) => {
      console.error("Error fixing archive:", error);
      process.exit(1);
    });
} else {
  // Normal packaging mode
  const dir = cli.input.at(0) ?? process.cwd();

  const appVersionAndIdentifier = await getAppVersionAndIdentifier(dir);
  createTarGz(
    dir,
    cli.flags.output
      ? path.resolve(join(process.cwd(), cli.flags.output))
      : path.resolve(
          join(
            process.cwd(),
            `${appVersionAndIdentifier.identifier}-${appVersionAndIdentifier.version}.tar.gz`
          )
        )
  )
    .then(() => {
      console.log("Successfully created archive");
    })
    .catch((error) => {
      console.error("Error creating archive:", error);
      process.exit(1);
    });
}
