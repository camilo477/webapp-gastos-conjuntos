const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { runCommand } = require("./run-command.cjs");
async function run(executable, args, verify) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "gastos-runner-"));
  const logFile = path.join(directory, "output.log");
  try {
    const result = await runCommand(executable, args, {
      env: process.env,
      logFile,
    });
    verify(result, fs.readFileSync(logFile, "utf8"));
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
}
test("Conserva stdout y stderr reales del hijo aunque los pipes estén restringidos", async () => {
  await run(
    process.execPath,
    ["-e", 'console.log("salida");console.error("error");'],
    (result, text) => {
      assert.equal(result.code, 0);
      assert.match(text, /salida/);
      assert.match(text, /error/);
    },
  );
});
test("Un comando fallido conserva su código y evidencia", async () => {
  await run(
    process.execPath,
    ["-e", 'console.error("fallo esperado");process.exitCode=7;'],
    (result, text) => {
      assert.equal(result.code, 7);
      assert.match(text, /fallo esperado/);
    },
  );
});
test("Ejecutable ausente produce fallo explícito", async () => {
  await run("/ruta-inexistente/gastos-test", [], (result) => {
    assert.equal(result.code, 1);
    assert.match(result.error, /ENOENT/);
  });
});
