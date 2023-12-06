const dotenv = require("dotenv");
const config = dotenv.config().parsed;

const { createAuthenticatedClient } = require("@interledger/open-payments");

const {
  getIncomingPayment,
  completeIncomingPayment,
  createIncomingPayment,
} = require("./src/handlers/incoming-payment");
const {
  createOutgoingPayment,
  getOutgoingPayment,
  getOutgoingPaymentGrant,
} = require("./src/handlers/outgoing-payment");
const { createQuote, getQuote } = require("./src/handlers/quote");
const {
  setReceivingWalletAddress,
  setSendingWalletAddress,
  getSession,
} = require("./src/handlers/session");
const { runScenario } = require("./src/handlers/scenario");
const fs = require("fs");
const inquirer = require("@inquirer/prompts");
const pino = require("pino");
const pretty = require("pino-pretty");

if (!fs.existsSync("./logs")) {
  fs.mkdirSync("./logs");
}

const streams = [
  {
    stream: pino.destination({
      dest: `./logs/${Date.now()}.log`,
      append: true,
      sync: true,
    }),
  },
  {
    stream: pretty({
      colorize: true,
      colorizeObjects: true,
      sync: true,
      ignore: "pid,hostname,time",
      translateTime: true,
    }),
  },
];

const logger = pino({ level: "info" }, pino.multistream(streams));

async function promptForWalletAddresses(client) {
  let sendingWalletAddress, receivingWalletAddress;

  await inquirer.input({
    message: `Enter sending wallet address:`,
    validate: async (input) => {
      try {
        new URL(input);
      } catch {
        return false;
      }

      const fetchedSendingWalletAddress = await client.walletAddress.get({
        url: input,
      });
      if (fetchedSendingWalletAddress) {
        sendingWalletAddress = fetchedSendingWalletAddress;
        return true;
      }
    },
  });

  logger.info(sendingWalletAddress);

  await inquirer.input({
    message: "Enter receiving wallet address:",
    validate: async (input) => {
      try {
        new URL(input);
      } catch {
        return false;
      }

      const fetchedReceivingWalletAddress = await client.walletAddress.get({
        url: input,
      });
      if (fetchedReceivingWalletAddress) {
        receivingWalletAddress = fetchedReceivingWalletAddress;
        return true;
      }
    },
  });

  logger.info(receivingWalletAddress);

  return { sendingWalletAddress, receivingWalletAddress };
}

async function promptToConfigureClient() {
  let possibleKeys;

  const clientWalletAddress = await inquirer.input({
    message: "Enter the wallet address to use for the client:",
    validate: async (input) => {
      try {
        new URL(input);
      } catch {
        return false;
      }

      const keyResponse = await (await fetch(`${input}/jwks.json`)).json();

      if (!keyResponse.keys || keyResponse.keys.length === 0) {
        console.log("\n");
        logger.info(
          "No configured keys found for wallet address. Please view the README for how to create developer keys."
        );
        process.exit(0);
      }

      possibleKeys = keyResponse.keys;

      return true;
    },
  });

  const keyId = await inquirer.select({
    message: "Select the private key id:",
    choices: possibleKeys.map((k) => ({
      value: k.kid,
    })),
  });

  const privateKey = await inquirer.input({
    message: "Enter the path to the private key file:",
    default: "private-key.pem",
  });

  return createAuthenticatedClient({
    logger,
    keyId,
    privateKey,
    walletAddressUrl: clientWalletAddress,
  });
}

async function initializeFromConfig() {
  logger.info(config, "Loaded from config.");

  if (!config["CLIENT_WALLET_ADDRESS"]) {
    logger.info("Missing clientWalletAddress");
    return;
  }

  if (!config["KEY_ID"]) {
    logger.info("Missing keyId");
    return;
  }

  if (!config["PRIVATE_KEY"]) {
    logger.info("Missing privateKey");
    return;
  }

  const client = await createAuthenticatedClient({
    logger,
    keyId: config["KEY_ID"],
    privateKey: config["PRIVATE_KEY"],
    walletAddressUrl: config["CLIENT_WALLET_ADDRESS"],
  });

  const [sendingWalletAddress, receivingWalletAddress] = await Promise.all([
    client.walletAddress.get({ url: config["SENDING_WALLET_ADDRESS"] }),
    client.walletAddress.get({ url: config["RECEIVING_WALLET_ADDRESS"] }),
  ]);

  logger.info(sendingWalletAddress, "Sending wallet address");
  logger.info(receivingWalletAddress, "Receiving wallet address");

  return { client, receivingWalletAddress, sendingWalletAddress };
}

async function initializeByPrompt() {
  const client = await promptToConfigureClient();

  const { receivingWalletAddress, sendingWalletAddress } =
    await promptForWalletAddresses(client);

  return { client, receivingWalletAddress, sendingWalletAddress };
}

async function initSession() {
  const session = {
    vars: {},
    sendingWalletAddress: undefined,
    receivingWalletAddress: undefined,
  };

  const { receivingWalletAddress, sendingWalletAddress, client } =
    process.argv[2] === "--from-config"
      ? await initializeFromConfig()
      : await initializeByPrompt();

  session.receivingWalletAddress = receivingWalletAddress;
  session.sendingWalletAddress = sendingWalletAddress;

  const deps = {
    logger,
    client,
  };

  return { deps, session };
}

const handlerMapper = {
  "ip:get": async (deps, session, args) =>
    getIncomingPayment(deps, session, args),
  "ip:create": async (deps, session, args) =>
    createIncomingPayment(deps, session, args),
  "ip:complete": async (deps, session, args) =>
    completeIncomingPayment(deps, session, args),
  "op:create": async (deps, session, args) =>
    createOutgoingPayment(deps, session, args),
  "op:get": async (deps, session, args) =>
    getOutgoingPayment(deps, session, args),
  "quote:create": async (deps, session, args) =>
    createQuote(deps, session, args),
  "quote:get": async (deps, session, args) => getQuote(deps, session, args),
  "grant:op": async (deps, session, args) =>
    getOutgoingPaymentGrant(deps, session, args),
  "session:get": async (deps, session, args) => getSession(deps, session, args),
  "session:wa:set-receiving": async (deps, session, args) =>
    setReceivingWalletAddress(deps, session, args),
  "session:wa:set-sending": async (deps, session, args) =>
    setSendingWalletAddress(deps, session, args),
  scenario: async (deps, session, args) =>
    runScenario({ handleInput, availableCommands }, deps, session, args),
  exit: () => {
    logger.info("Exiting...");
  },
};

const availableCommands = new Set(Object.keys(handlerMapper));

async function handleInput(deps, session, input) {
  const [command, ...args] = input.split(" ");
  const handler = handlerMapper[command];

  if (!handler) {
    return;
  }

  await handler(deps, session, args);
}

(async () => {
  const { deps, session } = await initSession();

  const startCli = async () => {
    let answer;
    while (answer !== "exit") {
      try {
        answer = await inquirer.input({ message: ">" });
      } catch (e) {
        await handleInput(deps, session, "exit");
        break;
      }

      if (answer) {
        try {
          await handleInput(deps, session, answer);
        } catch (e) {
          logger.error(e);
        }
      }
    }
  };

  await startCli();
})();
