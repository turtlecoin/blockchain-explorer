$(document).ready(function () {
  localData.mixableAmounts = $('#mixableAmounts').DataTable({
    searching: false,
    info: false,
    paging: false,
    lengthMenu: -1,
    language: {
      emptyTable: 'Loading mixable amounts... Please wait...'
    },
    columnDefs: [{
      targets: [3],
      type: 'num-fmt',
      render: function (data, type, row, meta) {
        if (type === 'display') {
          if (data.height !== null) {
            data = '<a href="./block.html?hash=' + data.hash + '">' + numeral(data.height).format('0,0') + '</a>'
          } else {
            data = ''
          }
        } else if (type === 'sort') {
          if (data.height !== null) {
            data = data.height
          } else {
            data = -1
          }
        }
        return data
      }
    },
    {
      targets: [1],
      render: function (data, type, row, meta) {
        if (type === 'display') {
          data = numeral(data).format('0,0')
        }
        return data
      }
    },
    {
      targets: [0],
      render: function (data, type, row, meta) {
        if (type === 'display') {
          data = numeral(data / Math.pow(10, ExplorerConfig.decimalPoints)).format('0,0.00') + ' ' + ExplorerConfig.ticker
        }
        return data
      }
    },
    {
      targets: [2],
      render: function (data, type, row, meta) {
        if (type === 'display') {
          if (data === null) {
            data = ''
          } else {
            data = (new Date(data * 1000)).toGMTString()
          }
        }
        return data
      }
    },
    {
      targets: [4],
      render: function (data, type, row, meta) {
        if (type === 'display') {
          if (data !== null) {
            data = '<a href="./transaction.html?hash=' + data + '">' + data + '</a>'
          } else {
            data = ''
          }
        }
        return data
      }
    }
    ],
    order: [
      [0, 'asc']
    ],
    autoWidth: false
  }).columns.adjust().responsive.recalc().draw(false)

  getMixableAmounts()
})

function isPrettyAmount (amount) {
  const length = amount.toString().length
  const base = Math.pow(10, length - 1)
  return (amount % base === 0)
}

function getMixableAmounts () {
  $.ajax({
    url: ExplorerConfig.apiBaseUrl + '/amounts',
    dataType: 'json',
    method: 'GET',
    cache: 'true',
    success: function (data) {
      localData.mixableAmounts.clear()
      var ignored = 0
      for (var i = 0; i < data.length; i++) {
        var denomination = data[i]
        if (!isPrettyAmount(denomination.amount)) {
          ignored += denomination.amount
          continue
        }
        localData.mixableAmounts.row.add([
          denomination.amount,
          denomination.outputs,
          denomination.timestamp,
          {
            height: denomination.height,
            hash: denomination.hash
          },
          denomination.txnHash
        ])
      }
      console.log('%s total shells filtered from list', ignored)
      localData.mixableAmounts.draw(false)
    },
    error: function () {
      alert('Could not retrieve mixable amounts from + ' + ExplorerConfig.apiBaseUrl + '/amounts')
    }
  })
  setTimeout(() => {
    getMixableAmounts()
  }, 15000)
}
