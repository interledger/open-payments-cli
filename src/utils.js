function parseWalletAddress(walletAddressUrl) {
  if (!walletAddressUrl) {
    return;
  }

  if (walletAddressUrl.startsWith("$")) {
    return walletAddressUrl.replace("$", "https://");
  }
  return walletAddressUrl;
}

module.exports = {
  parseWalletAddress,
};
