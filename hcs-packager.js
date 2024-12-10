#! /usr/bin/env node

import meow from "meow";
import { promises as fs } from "node:fs";
import path, { join } from "node:path";
import { createTarGz } from "./dist/main.js";

const cli = meow(
  `
  Usage
    $ hcs-packager <input> -o <output>
  `,
  {
    importMeta: import.meta,
    flags: {
      output: {
        type: "string",
        shortFlag: "o",
      },
    },
  }
);

const getAppVersionAndIdentifier = async (directory) => {
  try {
    const appJsonPath = join(directory, "app.json");
    const appJson = JSON.parse(await fs.readFile(appJsonPath, "utf8"));
    return {
      version: appJson.version,
      identifier: appJson.id,
    };
  } catch (error) {
    return {
      version: "unknown",
      identifier: "unknown",
    };
  }
};

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
);
