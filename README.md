# Open Payments CLI

This is an interactive command line tool that makes it easy to call the [Open Payments APIs](https://openpayments.guide/) in order to initiate payments between wallet addresses.

## Prerequisites

The tool uses an authenticated [Open Payments SDK](https://github.com/interledger/open-payments/tree/main/packages/open-payments) to make the Open Payment requests. As a result, you will need to provide authentication information to get started, specifically, the `clientWalletAddress` (by which the client identifies itself by) a `privateKey` and its corresponding `keyId`. A guide on how to get these credentials can be found [here](https://openpayments.guide/snippets/before-you-begin/#obtain-a-public-private-key-pair-and-key-id).

Once `clientWalletAddress`, the `privateKey` and `keyId` are generated, you can begin using the tool.

## Installation

`pnpm i`

## Usage

#### `pnpm start`

This will prompt you to enter the information to create the client: `clientWalletAddress`, `privateKey` and `keyId`, as well as the sending and reciving wallet addresses.

#### `pnpm start:config`

This will start up the session using values that are set in `.env`:

```
CLIENT_WALLET_ADDRESS=
KEY_ID=
PRIVATE_KEY=
SENDING_WALLET_ADDRESS=
RECEIVING_WALLET_ADDRESS=
```

## Commands

| Command                                    | Description                                     |
| ------------------------------------------ | ----------------------------------------------- |
| `ip:create <incomingAmount?>`              | Create an incoming payment                      |
| `ip:complete`                              | Complete an incoming payment                    |
| `ip:get`                                   | Retrieve an incoming payment                    |
| `quote:create <debitAmount?>`              | Create a quote                                  |
| `quote:get`                                | Retrieve a quote                                |
| `op:create`                                | Create an outgoing payment                      |
| `op:get`                                   | Retrieve an outgoing payment                    |
| `grant:op`                                 | Request a grant for an outgoing payment         |
| `session:get`                              | Displays the information of the current session |
| `session:wa:set-sending <walletAddress>`   | Set sending wallet address for the session      |
| `session:wa:set-receiving <walletAddress>` | Set receiving wallet address for the session    |
| `scenario <fileName>`                      | Run a list of commands from a file              |
| `exit`                                     | Exits the application                           |

### `ip:create <incomingAmount?>`

Creates an incoming payment on the receiving wallet address for an optionally specified incoming amount.
If no saved grant in the session, requests a default grant before creating an incoming payment.
Saves the incoming payment (and possibly the grant) in the session.

### `ip:complete`

Completes the incoming payment previously created in the session.

### `ip:get`

Fetches the incoming payment previously created in the session.

### `quote:create <debitAmount?>`

Creates an quote on the sending wallet address for an optionally specified debit amount.
If there is no existing quote grant in the session, requests a default grant before creating a quote.
Saves the quote (and possibly the grant) in the session.

### `quote:get`

Fetches the quote previously created in the session.

### `op:create`

Creates an outgoing payment on the sending wallet address. If there is no existing saved grant in the session, requests a default grant before creating a quote.

### `op:get`

Fetches an outgoing payment previously created in the session.

### `grant:op`

Initiates an outgoing payment grant request. After the pending grant is requested, a prompt will apprear to enter the URL of the completed redirect site of the interaction. The URL must contain a `interact_ref`. Once entered, the grant will be finalized, and outgoing payments can now be created.

### `session:wa:set-sending <walletAddress>`

Sets the sending wallet address for the session to be used in requests going forward.

### `session:wa:set-receiving <walletAddress>`

Sets the receiving wallet address for the session to be used in requests going forward.

### `scenario <fileName>`

Runs a list of commands in the provided file. For example, with a file named `scenario-1.txt`:

```
session:wa:set-sending https://ilp.five.rafikilabs.com/ffc52473
session:wa:set-receiving https://ilp.five.rafikilabs.com/a76f14b7
ip:create
quote:create 10
grant:op
op:create
```

calling `scenario scenario-1.txt` will run the given commands sequentially in the session.

This example scenario will initiate a payment between `https://ilp.five.rafikilabs.com/ffc52473` and `https://ilp.five.rafikilabs.com/a76f14b7`. Like a normal session, `grant:op` will prompt you to enter the URL of the resulting redirect site of the interaction, after which it will run the final `op:create` command to create the outgoing payment.

## Logging

By default, the application saves all of the logs for each session in `/logs`.
