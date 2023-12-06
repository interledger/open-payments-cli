const { open } = require("node:fs/promises");

async function runScenario(inputHandling, deps, session, args) {
  const { availableCommands, handleInput } = inputHandling;
  const fileName = args[0];

  if (!fileName) {
    deps.logger.info("No file provided. Use `scenario <fileName>`");
    return;
  }

  const file = await open(fileName);

  const scenario = [];

  let lines = 1;
  for await (const line of file.readLines()) {
    if (!line) {
      continue;
    }

    const [command, ..._] = line.split(" ");
    if (!availableCommands.has(command)) {
      deps.logger.info(`Unrecognized command on line ${line}: ${command}`);
      return;
    }

    scenario.push(line);
    lines++;
  }

  for (let i = 0; i < scenario.length; i++) {
    const command = scenario[i];
    deps.logger.info(`Running command ${i + 1}/${scenario.length} ${command}`);

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
