const inquirer = require("@inquirer/prompts");
const { OpenPaymentsClientError } = require("@interledger/open-payments");
const querystring = require("querystring");

async function getOutgoingPaymentGrant(deps, session, args) {
  const debitAmount = args[0];
  const receiveAmount = args[1];

  deps.logger.info("Fetching outgoing payment grant...");
  await getPendingOutgoingPaymentGrant(
    deps,
    session,
    debitAmount,
    receiveAmount
  );

  const interactRef = await getInteractRef(deps, session);

  if (!interactRef) {
    return;
  }

  session.vars.INTERACT_REF = interactRef;

  const grant = await continueOutgoingPaymentGrant(deps, session);
  return grant;
}

async function getInteractRef(deps, session) {
  const urlWithInteractRef = await inquirer.input({
    message: "Enter URL...",
    validate: (input) =>
      !!querystring.parse(input).interact_ref || input === "exit",
  });

  if (urlWithInteractRef === "exit") {
    return;
  }

  return querystring.parse(urlWithInteractRef).interact_ref;
}

async function getPendingOutgoingPaymentGrant(
  deps,
  session,
  debitAmount,
  receiveAmount
) {
  const { sendingWalletAddress, receivingWalletAddress } = session;

  const pendingOutgoingPaymentGrant = await deps.client.grant.request(
    { url: sendingWalletAddress.authServer },
    {
      access_token: {
        access: [
          {
            type: "outgoing-payment",
            actions: ["read", "create", "list"],
            identifier: sendingWalletAddress.id,
            limits: {
              debitAmount: {
                assetCode: sendingWalletAddress.assetCode,
                assetScale: sendingWalletAddress.assetScale,
                value: debitAmount ?? session.vars.QUOTE_DEBIT_AMOUNT,
              },
              receiveAmount: {
                assetCode: receivingWalletAddress.assetCode,
                assetScale: receivingWalletAddress.assetScale,
                value: receiveAmount ?? session.vars.QUOTE_RECEIVE_AMOUNT,
              },
            },
          },
        ],
      },
      interact: {
        start: ["redirect"],
        finish: {
          method: "redirect",
          uri: "https://example.com",
          nonce: "456",
        },
      },
    }
  );

  session.vars.CONTINUE_URL = pendingOutgoingPaymentGrant.continue.uri;
  session.vars.CONTINUE_TOKEN =
    pendingOutgoingPaymentGrant.continue.access_token.value;

  deps.logger.info(
    pendingOutgoingPaymentGrant,
    "Got pending grant. Navigate to interact.redirect to complete interaction."
  );

  return pendingOutgoingPaymentGrant;
}

async function continueOutgoingPaymentGrant(deps, session) {
  const finalizedOutgoingPaymentGrant = await deps.client.grant.continue(
    {
      accessToken: session.vars.CONTINUE_TOKEN,
      url: session.vars.CONTINUE_URL,
    },
    { interact_ref: session.vars.INTERACT_REF }
  );

  session.vars.OUTGOING_PAYMENT_TOKEN =
    finalizedOutgoingPaymentGrant.access_token.value;

  deps.logger.info(
    finalizedOutgoingPaymentGrant,
    "Finalized outgoing payment grant"
  );

  return finalizedOutgoingPaymentGrant;
}

async function getOutgoingPayment(deps, session, args) {
  if (!session.vars.OUTGOING_PAYMENT_ID) {
    deps.logger.info("No outgoing payment in session. Call `op:create` first.");
    return;
  }

  if (!session.vars.OUTGOING_PAYMENT_TOKEN) {
    deps.logger.info("No existing outgoing payment grant.");
    if (!(await getOutgoingPaymentGrant(deps, session, args))) {
      return;
    }
  }

  const outgoingPayment = await deps.client.outgoingPayment.get({
    url: session.vars.OUTGOING_PAYMENT_ID,
    accessToken: session.vars.OUTGOING_PAYMENT_TOKEN,
  });

  deps.logger.info(outgoingPayment, "Got outgoing payment");
}

async function createOutgoingPayment(deps, session, args) {
  if (!session.vars.QUOTE_ID) {
    deps.logger.info("No existing quote. Call `quote:create` first.");
    return;
  }

  if (!session.vars.OUTGOING_PAYMENT_TOKEN) {
    deps.logger.info("No existing outgoing payment grant.");
    if (!(await getOutgoingPaymentGrant(deps, session, args))) {
      return;
    }
  }

  const { sendingWalletAddress } = session;

  try {
    const outgoingPayment = await deps.client.outgoingPayment.create(
      {
        url: new URL(sendingWalletAddress.id).origin,
        accessToken: session.vars.OUTGOING_PAYMENT_TOKEN,
      },
      {
        walletAddress: sendingWalletAddress.id,
        quoteId: session.vars.QUOTE_ID,
        metadata: {
          description: "Hi from the CLI :)",
        },
      }
    );

    session.vars.OUTGOING_PAYMENT_ID = outgoingPayment.id;

    deps.logger.info(outgoingPayment, "Created outgoing payment");
  } catch (e) {
    if (e instanceof OpenPaymentsClientError) {
      if (e.status === 403) {
        deps.logger.error(
          "Insufficient or invalid grant. Get a new grant by calling `grant:op`"
        );
      } else if (e.status === 401) {
        deps.logger.error(
          "Unauthorized. Get a new grant by calling `grant:op`"
        );
      }
    }
    return;
  }
}

module.exports = {
  createOutgoingPayment,
  getOutgoingPayment,
  getOutgoingPaymentGrant,
};
