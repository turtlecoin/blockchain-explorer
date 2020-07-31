$(document).ready(function () {
  $('#decodeButton').click(function () {
    decodeAddress()
  })

  $('#generateWalletButton').click(function () {
    generateWallet(true)
  })

  $('#walletAddress').keydown(function (e) {
    if (e.which === 13) {
      decodeAddress()
    }
  })

  $('#restoreFromSeedButton').click(function () {
    $('#mnemonic').val('')
    generateWallet(false)
  })

  $('#restoreFromMnemonicButton').click(function () {
    $('#seed').val('')
    generateWallet(false)
  })

  $('#encodeAddressButton').click(function () {
    encodeAddress()
  })

  $('#generateRandomPaymentIDButton').click(function () {
    generateRandomPaymentID()
  })

  window.cnUtils = new TurtleCoinUtils.CryptoNote({
    coinUnitPlaces: ExplorerConfig.decimalPoints,
    addressPrefix: ExplorerConfig.addressPrefix
  })
})

async function generateWallet(newWallet) {
  const entropy = $('#entropy').val().trim()
  if (newWallet) {
    $('#seed').val('')
    $('#mnemonic').val('')
  }
  const seed = $('#seed').val().trim()
  const mnemonic = $('#mnemonic').val().trim().toLowerCase()

  $('#newPrivateSpendKey').val('')
  $('#newPublicSpendKey').val('')
  $('#newPrivateViewKey').val('')
  $('#newPublicViewKey').val('')
  $('#newWalletAddress').val('')

  $('#entropy').removeClass('is-danger')
  $('#seed').removeClass('is-danger')
  $('#mnemonic').removeClass('is-danger')

  let wallet

  const crypto = new TurtleCoinUtils.Crypto();

  if (entropy.length !== 0 && newWallet) {
    wallet = await TurtleCoinUtils.Address.fromEntropy(entropy);
  } else if (seed.length !== 0) {
    if (!isHash(seed) || !await crypto.checkScalar(seed)) {
      return $('#seed').addClass('is-danger')
    }
    wallet = await TurtleCoinUtils.Address.fromSeed(seed.toLowerCase());
  } else if (mnemonic.length !== 0) {
    if ((mnemonic.split(' ')).length !== 25) {
      return $('#mnemonic').addClass('is-danger')
    }
    wallet = await TurtleCoinUtils.Address.fromMnemonic(mnemonic.toLowerCase());
  } else if (newWallet) {
    wallet = await TurtleCoinUtils.Address.fromEntropy();
  }

  if (!wallet) return

  $('#seed').val(wallet.seed)
  $('#mnemonic').val(wallet.mnemonic)
  $('#newPrivateSpendKey').val(wallet.spend.privateKey)
  $('#newPublicSpendKey').val(wallet.spend.publicKey)
  $('#newPrivateViewKey').val(wallet.view.privateKey)
  $('#newPublicViewKey').val(wallet.view.publicKey)
  $('#newWalletAddress').val(await wallet.address())

  return true
}

async function decodeAddress() {
  const walletAddress = $('#walletAddress').val()

  try {
    const addr = await TurtleCoinUtils.Address.fromAddress(walletAddress)

    $('#publicViewKey').val(addr.view.publicKey)
    $('#publicSpendKey').val(addr.spend.publicKey)
    $('#paymentId').val(addr.paymentId)
    $('#walletAddress').removeClass('is-danger')
    $('#encodedAddress').val(walletAddress)
  } catch (e) {
    $('#walletAddress').removeClass('is-danger').addClass('is-danger')
  }
}

async function encodeAddress() {
  const publicViewKey = $('#publicViewKey').val().trim()
  const publicSpendKey = $('#publicSpendKey').val().trim()
  const paymentId = $('#paymentId').val().trim()

  $('#publicViewKey').removeClass('is-danger')
  $('#publicSpendKey').removeClass('is-danger')
  $('#paymentId').removeClass('is-danger')
  $('#encodedAddress').removeClass('is-danger')

  if (!isHash(publicSpendKey)) {
    return $('#publicSpendKey').addClass('is-danger')
  }

  if (!isHash(publicViewKey)) {
    return $('#publicViewKey').addClass('is-danger')
  }

  if (paymentId.length !== 0 && !isHash(paymentId)) {
    return $('#paymentId').addClass('is-danger')
  }

  try {
    const addr = await TurtleCoinUtils.Address.fromPublicKeys(publicSpendKey, publicViewKey, paymentId)
    $('#encodedAddress').val(await addr.address())
  } catch (e) {
    $('#encodedAddress').removeClass('is-danger').addClass('is-danger')
  }
}

async function generateRandomPaymentID() {
  const entropy = (new Date()).toString()
      .toUpperCase();
  const random = await TurtleCoinUtils.Address.generateSeed(entropy);

  $('#paymentId').val(random)
}
