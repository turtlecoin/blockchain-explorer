$(document).ready(function () {
  const hash = getQueryStringParam('hash')

  if (!isHash(hash)) {
    return window.location = './?search=' + hash
  }

  $('#checkTransaction').click(function () {
    checkTransaction()
  })

  $('#privateViewKey').keydown(function (e) {
    setPrivateViewKeyState(false)
    if (e.which === 13) {
      checkTransaction()
    }
  })

  $('#recipientAddress').keydown(function (e) {
    setRecipientAddressState(false)
    if (e.which === 13) {
      checkTransaction()
    }
  })

  window.cnUtils = new TurtleCoinUtils.CryptoNote({
    coinUnitPlaces: ExplorerConfig.decimalPoints,
    addressPrefix: ExplorerConfig.addressPrefix
  })

  TurtleCoinUtils.on('ready', () => {
    $.ajax({
      url: ExplorerConfig.apiBaseUrl + '/transaction/' + hash,
      dataType: 'json',
      type: 'GET',
      cache: 'false',
      success: async function (txn) {
        $('#transactionHeaderHash').text(txn.tx.hash)
        $('#transactionTimestamp').text((new Date(txn.block.timestamp * 1000)).toGMTString())
        $('#transactionFee').text(numeral(txn.tx.fee / Math.pow(10, ExplorerConfig.decimalPoints)).format('0,0.00') + ' ' + ExplorerConfig.ticker)
        $('#transactionConfirmations').text(numeral(txn.block.depth).format('0,0'))
        $('#transactionSize').text(numeral(txn.tx.size).format('0,0') + ' bytes')
        $('#transactionRingSize').text(numeral(txn.tx.mixin).format('0,0'))
        $('#transactionAmount').text(numeral(txn.tx.amount_out / Math.pow(10, ExplorerConfig.decimalPoints)).format('0,0.00') + ' ' + ExplorerConfig.ticker)
        if (txn.tx.paymentId.length !== 0) {
          $('#transactionPaymentId').html('<a href="./paymentid.html?id=' + txn.tx.paymentId + '">' + txn.tx.paymentId + '</a>')
        }
        $('#blockHeight').html('<a href="./?search=' + txn.block.height + '">' + numeral(txn.block.height).format('0,0') + '</a>')
        $('#blockHash').html('<a href="./block.html?hash=' + txn.block.hash + '">' + txn.block.hash + '</a>')
        $('#transactionNonce').text(txn.tx.nonce)
        $('#transactionUnlockTime').text(numeral(txn.tx.unlock_time).format('0,0'))
        $('#transactionPublicKey').text(txn.tx.publicKey)
        $('#inputCount').text(txn.tx.inputs.length)
        $('#outputCount').text(txn.tx.outputs.length)

        /**
         * If a transaction has 0 ring participants AND the fee is 0 AND there is only one input
         * then it is probably a coinbase transaction and we want to display extra information
         * that is available in the interface
         */
        if (txn.tx.mixin === 0 && txn.tx.fee === 0 && txn.tx.inputs.length === 1) {
          const transaction = new TurtleCoinUtils.Transaction()
          await transaction.parseExtra(txn.tx.extra)

          if (transaction.recipientPublicSpendKey && transaction.recipientPublicViewKey) {
            const crypto = new TurtleCoinUtils.Crypto()

            TurtleCoinUtils.on('ready', async () => {
              const fingerprint = await crypto.cn_fast_hash(
                  transaction.recipientPublicSpendKey, transaction.recipientPublicViewKey)

              $('#minerFingerprint').text(fingerprint.replace(/(..)/g, '$1:').slice(0, -1))

              $('#fingerPrintRow').css('display', '')
            })
          }

          if (transaction.poolNonceHex) {
            $('#poolNonce').text(transaction.poolNonceHex)

            $('#poolNonceRow').css('display', '')
          }
        }

        const inputs = $('#inputs').DataTable({
          columnDefs: [{
            targets: [1, 2],
            searchable: false
          }, {
            targets: [0],
            render: function (data, type, row, meta) {
              if (type === 'display') {
                data = numeral(data / Math.pow(10, ExplorerConfig.decimalPoints)).format('0,0.00')
              }
              return data
            },
            searchable: false
          }],
          order: [
            [0, 'asc'],
            [1, 'asc']
          ],
          searching: false,
          info: false,
          paging: false,
          lengthMenu: -1,
          language: {
            emptyTable: "No Transaction Inputs"
          },
          autoWidth: false
        }).columns.adjust().responsive.recalc()

        for (var i = 0; i < txn.tx.inputs.length; i++) {
          var input = txn.tx.inputs[i]
          inputs.row.add([
            input.amount,
            (input.keyImage.length === 0) ? 'Miner Reward' : input.keyImage,
            input.type.toUpperCase()
          ])
        }
        inputs.draw(false)

        localData.outputs = $('#outputs').DataTable({
          columnDefs: [{
            targets: [0, 1, 2],
            searchable: false
          }, {
            targets: [0],
            render: function (data, type, row, meta) {
              if (type === 'display') {
                data = numeral(data / Math.pow(10, ExplorerConfig.decimalPoints)).format('0,0.00')
              }
              return data
            },
            searchable: false
          }],
          order: [
            [0, 'asc'],
            [1, 'asc']
          ],
          searching: false,
          info: false,
          paging: false,
          lengthMenu: -1,
          language: {
            emptyTable: "No Transaction Outputs"
          },
          autoWidth: false
        }).columns.adjust().responsive.recalc()

        for (var i = 0; i < txn.tx.outputs.length; i++) {
          var output = txn.tx.outputs[i]
          localData.outputs.row.add([
            output.amount,
            output.key,
            output.type.toUpperCase()
          ])
        }
        localData.outputs.draw(false)
      },
      error: function () {
        window.location = './?search=' + hash
      }
    })
  })
})

async function checkTransaction() {
  var recipient = $('#recipientAddress').val()
  var key = $('#key').val()
  var txnPublicKey = $('#transactionPublicKey').text()

  localData.outputs.rows().every(function (idx, tableLoop, rowLoop) {
    $(localData.outputs.row(idx).nodes()).removeClass('is-ours')
  })

  if (!isHash(key)) {
    setPrivateViewKeyState(true)
  }

  var address;

  try {
    address = await TurtleCoinUtils.Address.fromAddress(recipient)
    if (!address) {
      setRecipientAddressState(true)
      return
    }
  } catch (e) {
    setRecipientAddressState(true)
    return
  }

  var totalOwned = 0
  localData.outputs.rows().every(async function (idx, tableLoop, rowLoop) {
    var data = this.data()
    var owned = await checkOutput(txnPublicKey, key, address, {
      index: idx,
      key: data[1]
    })
    if (owned) {
      totalOwned = totalOwned + parseInt(data[0])
      $(localData.outputs.row(idx).nodes()).addClass('is-ours')
      $('#ourAmount').text(': Found ' + numeral(totalOwned / Math.pow(10, ExplorerConfig.decimalPoints)).format('0,0.00') + ' ' + ExplorerConfig.ticker)
    }
  })
}

async function checkOutput(transactionPublicKey, key, address, output) {
  let isOursTxnPublicKey;
  try {
    isOursTxnPublicKey = await cnUtils.isOurTransactionOutput(transactionPublicKey, output, key, address.spend.publicKey)
  } catch (e) {}

  let isOursTxnPrivKey;
  try {
    isOursTxnPrivKey = await cnUtils.isOurTransactionOutput(address.view.publicKey, output, key, address.spend.publicKey)
  } catch (e) {}

  return (isOursTxnPublicKey || isOursTxnPrivKey)
}

function setPrivateViewKeyState(state) {
  if (state) {
    $('#privateViewKey').removeClass('is-danger').addClass('is-danger')
  } else {
    $('#privateViewKey').removeClass('is-danger')
  }
}

function setRecipientAddressState(state) {
  if (state) {
    $('#recipientAddress').removeClass('is-danger').addClass('is-danger')
  } else {
    $('#recipientAddress').removeClass('is-danger')
  }
}
