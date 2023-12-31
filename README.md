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

## Wallet addresses

When entering wallet addresses into the CLI (for initializing the client, or setting sending and receiving wallet addresses), you can use the `https://` prefix (`https://ilp.five.rafikilabs.com/alice`) or the `$` [payment pointer](https://paymentpointers.org) prefix (`$ilp.five.rafikilabs.com/alice`).

## Commands

| Command                                                                             | Description                                     |
| ----------------------------------------------------------------------------------- | ----------------------------------------------- |
| [`ip:create <incomingAmount?>`](#ipcreate-incomingamount)                           | Create an incoming payment                      |
| [`ip:complete`](#ipcomplete)                                                        | Complete an incoming payment                    |
| [`ip:get`](#ipget)                                                                  | Retrieve an incoming payment                    |
| [`quote:create <debitAmount?>`](#quotecreate-debitamount)                           | Create a quote                                  |
| [`quote:get`](#quoteget)                                                            | Retrieve a quote                                |
| [`op:create`](#opcreate)                                                            | Create an outgoing payment                      |
| [`op:get`](#opget)                                                                  | Retrieve an outgoing payment                    |
| [`grant:op <debitAmount?> <receiveAmount?>` ](#grantop-debitamount-receiveamount)   | Request a grant for an outgoing payment         |
| [`session:get`](#sessionget)                                                        | Displays the information of the current session |
| [`session:wa:set-receiving <walletAddress>`](#sessionwaset-receiving-walletaddress) | Set sending wallet address for the session      |
| [`session:wa:set-sending <walletAddress>`](#sessionwaset-receiving-walletaddress)   | Set receiving wallet address for the session    |
| [`scenario <fileName>`](#scenario-filename)                                         | Run a list of commands from a file              |
| [`exit`](#exit)                                                                     | Exits the application                           |

### `ip:create <incomingAmount?>`

Creates an incoming payment on the receiving wallet address for an optionally specified incoming amount.
If no saved grant in the session, requests a default grant before creating an incoming payment.
Then, saves the incoming payment and possibly its corresponding grant in the session.

### `ip:complete`

Completes the incoming payment previously created in the session.

### `ip:get`

Fetches the incoming payment previously created in the session.

### `quote:create <debitAmount?>`

Creates an quote on the sending wallet address for an optionally specified debit amount.
If there is no existing quote grant in the session, requests a default grant before creating a quote.
Then, saves the quote and possibly its corresponding grant in the session.

### `quote:get`

Fetches the quote previously created in the session.

### `op:create`

Creates an outgoing payment on the sending wallet address. If there is no existing saved grant in the session, requests a default grant, prompts to complete the interaction and creates the outgoing payment. Then, saves the outgoing payment and its corresponding grant in the session.

### `op:get`

Fetches an outgoing payment previously created in the session.

### `grant:op <debitAmount?> <receiveAmount?>`

Initiates an outgoing payment grant request. If no `debitAmount` or `receiveAmount` provided, uses the amounts from the created quote of the session. After the pending grant is requested, a prompt will apprear to enter the URL of the completed redirect site of the interaction. The URL must contain a `interact_ref`. Once entered, the grant will be finalized, and outgoing payments can now be created.

### `session:get`

Displays the information of the current session.

### `session:wa:set-receiving <walletAddress>`

Sets the receiving wallet address for the session to be used in incoming payment requests going forward.

### `session:wa:set-sending <walletAddress>`

Sets the sending wallet address for the session to be used in requests for quotes and outgoing payments going forward.

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

The commands in the example scenario file will initiate a payment between `https://ilp.five.rafikilabs.com/ffc52473` and `https://ilp.five.rafikilabs.com/a76f14b7`. Like a normal session, `grant:op` will prompt you to enter the URL of the resulting redirect site of the interaction, after which it will run the final `op:create` command to create the outgoing payment.

### `exit`

Exits the application.

## Logging

By default, the application saves all of the logs for each session in `/logs`.
