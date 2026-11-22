const fs = require("node:fs");
const { spawn } = require("node:child_process");
// Ficheros como stdio: este entorno pierde datos al leer pipes de hijos Node.
async function runCommand(
  executable,
  args,
  { cwd, env, logFile, onSpawn = () => {}, onOutput = () => {} },
) {
  const fd = fs.openSync(logFile, "w+");
  let offset = 0;
  function output() {
    const size = fs.fstatSync(fd).size;
    if (size <= offset) return;
    const buffer = Buffer.alloc(size - offset);
    const bytes = fs.readSync(fd, buffer, 0, buffer.length, offset);
    offset += bytes;
    onOutput(buffer.subarray(0, bytes));
  }
  const interval = setInterval(output, 250);
  try {
    return await new Promise((resolve) => {
      const child = spawn(executable, args, {
        cwd,
        env,
        detached: process.platform === "linux",
        stdio: ["ignore", fd, fd],
      });
      onSpawn(child);
      child.once("error", (error) =>
        resolve({ code: 1, error: error.message }),
      );
      child.once("close", (code, signal) => resolve({ code, signal }));
    });
  } finally {
    clearInterval(interval);
    output();
    fs.closeSync(fd);
  }
}
module.exports = { runCommand };
