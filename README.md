<p align="center">
  <img src="./assets/bunest-icon.svg" width="500" alt="Nest Logo" />
</p>

  <p align="center">A <a href="https://bun.sh/">Bun</a> integration for <a href="https://nestjs.com/">Nest</a>, made with Bun, for Bun runtime</p>

## Table of contents

- [Description](#description)
- [Project setup](#project-setup)
- [~~Compile &~~ run the project](#compile--run-the-project)
- [Build the project](#build-the-project)
- [Run tests](#run-tests)
- [Libraries Guides](#libraries-guides)
  - [1. TypeORM](#1-typeorm)
  - [2. Serving static files (`@nestjs/serve-static`)](#2-serving-static-files-nestjsserve-static)
- [Support](#support)
- [Stay in touch](#stay-in-touch)
- [License](#license)

## Description

The starter template for <a href="https://bun.sh/">Nest</a> with Bun runtime. This template utilizes the perks of Bun runtime & API to provide a seamless & performant development experience without taking away the familiarity of Nest & Node.js.

> ⚠️ **Warning**:
>
> - This template is still in development and may not be suitable for production use. Please report any issues you encounter.
> - **Do NOT** use [Nest CLI](https://www.npmjs.com/package/@nestjs/cli) with this template. A Nest-like, dedicated CLI tool for this template is currently in development.

## Project setup

```bash
$ bun install
```

## ~~Compile &~~ run the project

Bun can run TypeScript code directly, so there is no need to transpile the project before running it. At the same time, however, Bun **will NOT** perform any type-checking during development. Hence, [`tsc-watch`](https://www.npmjs.com/package/tsc-watch) & `tsc` is added to start scripts by default. Feel free to remove it if you want.

```bash
# development
$ bun run start

# watch mode
$ bun run start:dev

# production mode
$ bun run start:prod
```

## Build the project

This template leverages a custom build script, located in [`scripts/build.ts`](./scripts/build.ts), using [Bun Build API](https://bun.sh/docs/bundler) to build the project. Feel free to modify the script to suit your needs.

```bash
$ bun run build # ⚠️ Be careful not to confuse this command with `bun build`.
```

The build output will be located in the `dist` folder, containing JS files. Unlike the default Nest template, the JS code inside the `dist` folder includes bundled dependencies, thanks to Bun. The result is that the server starts almost twice as fast as the default Nest template & the `bun run start:dev` script. You can run the built output directly with Bun using the following command:

```bash
$ bun run dist/main.js
```

However, using the [`bun run start:prod`](./package.json) command is recommended, due to the `NODE_ENV` environment variable will be set to `production`.

## Run tests

Bun is also a test runner and provides a Jest-like API for running tests. Hence, `jest` is not included in this template. You can run tests using the following commands:

```bash
# unit tests
$ bun run test

# e2e tests
$ bun run test:e2e

# test coverage
$ bun run test:cov
```

## Libraries Guides

### 1. [TypeORM](https://typeorm.io/)

TypeORM can be used seamlessly with this template, just like any other Nest projects. However, by default, TypeORM CLI uses Node runtime, which requires you to install `ts-node` to execute TypeScript files. Therefore, using TypeORM CLI with Bun runtime is recommended, which can be achieved by passing the `--bun` flag like this:

```bash
# With bunx
$ bunx --bun typeorm <typeorm-command>

# Or with `bun run`, only if you have TypeORM installed as a dependency
$ bun run --bun typeorm <typeorm-command>
```

If you wish to transpile TypeORM's migrations to JS in order to use them in production, you can modify the build script (`scripts/build.ts`) to include the migration files:

1. Retrieve all the names of migration files, in this case, from the `src/database/migrations` folder, using [Bun Glob API](https://bun.sh/docs/api/glob).

```typescript
import { Glob } from 'bun';

const migrationFileNames = Array.from(
  new Glob('./src/database/migrations/*.ts').scanSync(),
).map((name) => name.replaceAll(/\\/g, '/'));
```

2. In the `Bun.build` function, add the migration files to the `entrypoints` array, and you are good to go:

```typescript
import { build } from 'bun';

const result = await build({
  entrypoints: ['./src/main.ts', ...migrationFileNames],
  // ...
```

3. In order to execute TypeORM's CLI migration-related commands in production, you also have to specify the [datasource config file](https://typeorm.io/data-source-options#data-source-options-example) in the `entrypoints` array:

```typescript
const result = await build({
  entrypoints: [
    './src/main.ts',
    './src/database/migrations/ormconfig.ts', // Or path to your datasource config file
    ...migrationFileNames
  ],
  // ...
```

> ⚠️ **Warning**: While the entrypoint of the application is `main.ts` placed at `src/` folder, if the migrations are **NOT** placed in the `src/` folder, the build output `main.js` file will be **placed at `dist/src/`, not `dist/`**. The same goes for the datasource config file.

### 2. [Serving static files (`@nestjs/serve-static`)](https://docs.nestjs.com/recipes/serve-static)

To serve static files in production, you must modify the build script to include them in the build output. There are two methods to achieve this:

#### Method 1. Specify the path to the static files in the `entrypoints` array:

```typescript
import { Glob, build } from 'bun';

const staticFileNames = Array.from(
  new Glob('./src/static/*').scanSync(),
).map((name) => name.replaceAll(/\\/g, '/'));

const result = await build({
  entrypoints: ['./src/main.ts', ...staticFileNames],
  // ...
```

Just like the warning with TypeORM, if the static files (folder) are **NOT** placed in the `src/` folder, the build output `main.js` file will be **placed at `dist/src/`, not `dist/**.

#### Method 2. Copy the static files to the build output folder using [Bun Shell Scripting](https://bun.sh/docs/runtime/shell) and the good old `cp` command:

```typescript
import { $ } from 'bun';
import { join } from 'node:path';

await $`cp -R ${join(__dirname, '../src/static')} ${join(__dirname, '../dist/static')}`;
```

Using this method, you can place the static files (folder) anywhere you want.

## Support

- Support Nest [here](https://docs.nestjs.com/support).
- Contribute to Bun [here](https://bun.sh/docs/project/contributing).

## Stay in touch

- Nest:

  - Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
  - Website - [https://nestjs.com](https://nestjs.com/)
  - Twitter - [@nestframework](https://twitter.com/nestframework)

- Bun:

  - Author - [oven-sh](https://github.com/oven-sh)
  - Website - [https://bun.sh](https://bun.sh/)
  - Twitter - [@bunjavascript](https://x.com/bunjavascript)

- Me, the author of this template:
  - GitHub - [@dung204](https://github.com/dung204)
  - Twiter - [@mantrilogix](https://x.com/mantrilogix)

## License

- Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
- Bun is [MIT licensed](https://github.com/oven-sh/bun/blob/main/LICENSE.md)
- This template is also [MIT licensed](./LICENSE).
