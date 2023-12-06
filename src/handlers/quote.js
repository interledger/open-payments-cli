async function getQuoteGrant(deps, session) {
  const { sendingWalletAddress } = session;

  const grant = await deps.client.grant.request(
    { url: sendingWalletAddress.authServer },
    {
      access_token: {
        access: [
          {
            type: "quote",
            actions: ["read", "create"],
          },
        ],
      },
    }
  );

  session.vars.QUOTE_TOKEN = grant.access_token.value;

  deps.logger.info(grant, "Got quote grant");

  return grant;
}

async function getQuoteGrantToken(deps, session) {
  let quoteToken;
  if (session.vars.QUOTE_TOKEN) {
    deps.logger.info("Using existing grant...");
    quoteToken = session.vars.QUOTE_TOKEN;
  } else {
    deps.logger.info("No existing quote grant. Getting default grant...");
    quoteToken = (await getQuoteGrant(deps, session)).access_token.value;
  }

  return quoteToken;
}

async function getQuote(deps, session) {
  if (!session.vars.QUOTE_ID) {
    deps.logger.info("No quote in session. Call `quote:create` first.");
    return;
  }

  const quoteToken = await getQuoteGrantToken(deps, session);

  const quote = await deps.client.quote.get({
    url: session.vars.QUOTE_ID,
    accessToken: quoteToken,
  });

  deps.logger.info(quote, "Got quote");
}

async function createQuote(deps, session, args) {
  const debitAmount = args[0];
  const { sendingWalletAddress } = session;

  if (!session.vars.INCOMING_PAYMENT_ID) {
    deps.logger.info("No existing incoming payment. Call `ip:create` first.");
    return;
  }

  if (!debitAmount && !session.vars.INCOMING_PAYMENT_AMOUNT) {
    deps.logger.info(
      "No debitAmount provided for the quote, and no incomingAmount existing on the incoming payment."
    );
    deps.logger.info(
      "Use `quote:create <debitAmount>`, or create an incoming payment with an amount `ip:create <incomingAmount>`"
    );
    return;
  }

  const quoteToken = await getQuoteGrantToken(deps, session);

  const quote = await deps.client.quote.create(
    {
      url: new URL(sendingWalletAddress.id).origin,
      accessToken: quoteToken,
    },
    {
      receiver: session.vars.INCOMING_PAYMENT_ID,
      walletAddress: sendingWalletAddress.id,
      method: "ilp",
      ...(debitAmount
        ? {
            debitAmount: {
              value: debitAmount,
              assetCode: sendingWalletAddress.assetCode,
              assetScale: sendingWalletAddress.assetScale,
            },
          }
        : {}),
    }
  );

  session.vars.QUOTE_DEBIT_AMOUNT = quote.debitAmount.value;
  session.vars.QUOTE_RECEIVE_AMOUNT = quote.receiveAmount.value;
  session.vars.QUOTE_ID = quote.id;

  deps.logger.info(quote, "Created quote");
}

module.exports = {
  createQuote,
  getQuote,
};
