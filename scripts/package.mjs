import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";

await mkdir("artifacts", { recursive: true });
execFileSync("zip", ["-q", "-r", "../../artifacts/verbia-v0.1.0.zip", "."], { cwd: "dist/extension", stdio: "inherit" });
console.log("Created artifacts/verbia-v0.1.0.zip");
