const { parseWalletAddress } = require("../utils");

function getSession(deps, session) {
  deps.logger.info(
    {
      vars: session.vars,
      receivingWalletAddress: session.receivingWalletAddress,
      sendingWalletAddress: session.sendingWalletAddress,
    },
    "Current session"
  );
}

async function getWalletAddress(deps, session, args) {
  const walletAddressUrl = parseWalletAddress(args[0]);

  try {
    new URL(walletAddressUrl);
  } catch {
    deps.logger.info("Invalid wallet address.");
    return;
  }

  return deps.client.walletAddress.get({
    url: walletAddressUrl,
  });
}

async function setReceivingWalletAddress(deps, session, args) {
  deps.logger.info("Setting receiving wallet address...");
  const walletAddress = await getWalletAddress(deps, session, args);

  deps.logger.info(walletAddress);
  session.receivingWalletAddress = walletAddress;
}

async function setSendingWalletAddress(deps, session, args) {
  deps.logger.info("Setting sending wallet address...");
  const walletAddress = await getWalletAddress(deps, session, args);

  deps.logger.info(walletAddress);
  session.sendingWalletAddress = walletAddress;
}

module.exports = {
  getSession,
  setReceivingWalletAddress,
  setSendingWalletAddress,
};
