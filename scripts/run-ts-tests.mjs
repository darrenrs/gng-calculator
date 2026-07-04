import { readdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const tsc = join("node_modules", ".bin", "tsc");
execFileSync(tsc, ["-p", "tsconfig.test.json"], { stdio: "inherit" });

const testsDir = join(".tmp", "spec2-tests", "tests");
const tests = readdirSync(testsDir)
  .filter((file) => file.endsWith(".test.js"))
  .map((file) => join(testsDir, file));

execFileSync(process.execPath, ["--test", ...tests], { stdio: "inherit" });
