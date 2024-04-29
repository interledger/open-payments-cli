function parseWalletAddress(walletAddressUrl) {
  if (!walletAddressUrl) {
    return;
  }

  if (walletAddressUrl.startsWith("$")) {
    return walletAddressUrl.replace("$", "https://");
  }
  return walletAddressUrl;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function requestWithTimeout(request, timeoutMs) {
  const timeout = async () =>
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), timeoutMs)
    );

  return Promise.race([request(), timeout()]);
}

async function poll(args) {
  const {
    request,
    successCondition = (response) => !!response,
    timeoutMs,
    pollingFrequencyMs,
  } = args;

  let elapsedTimeMs = 0;
  let response;

  do {
    const requestStart = Date.now();

    response = await requestWithTimeout(
      () => request(),
      timeoutMs - elapsedTimeMs
    );

    if (successCondition(response)) {
      return response;
    }

    elapsedTimeMs += Date.now() - requestStart + pollingFrequencyMs;

    if (elapsedTimeMs >= timeoutMs) {
      throw new Error("Request timed out");
    }

    await sleep(pollingFrequencyMs);
    // eslint-disable-next-line no-constant-condition
  } while (true);
}

module.exports = {
  parseWalletAddress,
  poll,
  sleep,
};
