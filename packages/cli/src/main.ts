#!/usr/bin/env node
import { runCli } from "./index.js";

const code = await runCli({ argv: process.argv, stdout: process.stdout, stderr: process.stderr });
process.exitCode = code;
