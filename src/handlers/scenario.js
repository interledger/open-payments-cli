const { open } = require("node:fs/promises");

async function runScenario(inputHandling, deps, session, args) {
  const { availableCommands, handleInput } = inputHandling;
  const fileName = args[0];

  if (!fileName) {
    deps.logger.info("No file provided. Use `scenario <fileName>`");
    return;
  }

  let file;

  try {
    file = await open(fileName);
  } catch {
    deps.logger.error(`Could not open file: ${fileName}`);
    return;
  }

  const scenario = [];

  try {
    let lines = 1;
    for await (const line of file.readLines()) {
      if (!line) {
        continue;
      }

      const [command, ..._] = line.split(" ");
      if (!availableCommands.has(command)) {
        deps.logger.error(`Unrecognized command on line ${lines}: ${command}`);
        break;
      }

      scenario.push(line);
      lines++;
    }
  } finally {
    await file.close();
  }

  for (let i = 0; i < scenario.length; i++) {
    const command = scenario[i];
    deps.logger.info(`(${i + 1}/${scenario.length}) running ${command}`);

    try {
      await handleInput(deps, session, command);
    } catch (e) {
      deps.logger.error(e);
      break;
    }
  }
}

module.exports = {
  runScenario,
};
