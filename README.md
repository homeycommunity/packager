# Homey Community Packager

This tool is used to create a tar.gz file of a Homey app.

## Usage

```bash
npx @homeycommunity/packager@latest <path-to-app> -o <output-file>
```

## Options

- `-o, --output`: The output file name (default: `app-identifier-version.tar.gz`)
- `<path-to-app>`: The path to the app (default: current working directory)

## Example

```bash
npx @homeycommunity/packager@latest ./my-app -o my-app.tar.gz
```

This will create a tar.gz file in the current working directory.

## Ignoring files

You can ignore files by adding them to the `.hcsignore` file.
