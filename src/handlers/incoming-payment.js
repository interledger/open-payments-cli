async function getIncomingPaymentGrant(deps, session) {
  const { receivingWalletAddress } = session;

  const grant = await deps.client.grant.request(
    { url: receivingWalletAddress.authServer },
    {
      access_token: {
        access: [
          {
            type: "incoming-payment",
            actions: ["read-all", "create", "list", "complete"],
          },
        ],
      },
    }
  );

  session.vars.INCOMING_PAYMENT_TOKEN = grant.access_token.value;
  deps.logger.info(grant, "Got incoming payment grant");

  return grant;
}

async function getIncomingPaymentGrantToken(deps, session) {
  let incomingPaymentToken;
  if (session.vars.INCOMING_PAYMENT_TOKEN) {
    deps.logger.info("Using existing grant.");
    incomingPaymentToken = session.vars.INCOMING_PAYMENT_TOKEN;
  } else {
    deps.logger.info(
      "No existing incoming payment grant. Getting default grant..."
    );
    incomingPaymentToken = (await getIncomingPaymentGrant(deps, session))
      .access_token.value;
  }

  return incomingPaymentToken;
}

async function getIncomingPayment(deps, session) {
  deps.logger.info("Getting incoming payment...");

  if (!session.vars.INCOMING_PAYMENT_ID) {
    deps.logger.info("No incoming payment in session. Call `ip:create` first.");
    return;
  }

  const incomingPaymentToken = await getIncomingPaymentGrantToken(
    deps,
    session
  );

  const incomingPayment = await deps.client.incomingPayment.get({
    url: session.vars.INCOMING_PAYMENT_ID,
    accessToken: incomingPaymentToken,
  });

  session.vars.INCOMING_PAYMENT_ID = incomingPayment.id;

  deps.logger.info(incomingPayment, "Got incoming Payment");

  return incomingPayment;
}

async function createIncomingPayment(deps, session, args) {
  const incomingAmount = args[0];

  const { receivingWalletAddress } = session;

  const incomingPaymentToken = await getIncomingPaymentGrantToken(
    deps,
    session
  );

  const incomingPayment = await deps.client.incomingPayment.create(
    {
      url: new URL(receivingWalletAddress.id).origin,
      accessToken: incomingPaymentToken,
    },
    {
      walletAddress: receivingWalletAddress.id,
      metadata: {
        description: "Hi from the CLI :)",
      },
      ...(incomingAmount
        ? {
            incomingAmount: {
              assetCode: receivingWalletAddress.assetCode,
              assetScale: receivingWalletAddress.assetScale,
              value: incomingAmount,
            },
          }
        : {}),
    }
  );

  session.vars.INCOMING_PAYMENT_ID = incomingPayment.id;

  if (incomingPayment.incomingAmount?.value) {
    session.vars.INCOMING_PAYMENT_AMOUNT = incomingPayment.incomingAmount.value;
  } else {
    delete session.vars.INCOMING_PAYMENT_AMOUNT;
  }

  deps.logger.info(incomingPayment, "Created incoming payment");

  return incomingPayment;
}

async function completeIncomingPayment(deps, session) {
  if (!session.vars.INCOMING_PAYMENT_ID) {
    deps.logger.info("No incoming payment in session. Call `ip:create` first.");
    return;
  }

  const incomingPaymentToken = await getIncomingPaymentGrantToken(
    deps,
    session
  );

  const incomingPayment = await deps.client.incomingPayment.complete({
    url: session.vars.INCOMING_PAYMENT_ID,
    accessToken: incomingPaymentToken,
  });

  deps.logger.info(incomingPayment, "Completed incoming payment");

  return incomingPayment;
}

module.exports = {
  completeIncomingPayment,
  getIncomingPayment,
  createIncomingPayment,
};
