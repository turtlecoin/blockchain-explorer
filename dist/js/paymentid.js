$(document).ready(function () {
  const id = getQueryStringParam('id')

  if (!isHash(id)) {
    return window.location = '/?search=' + id
  }

  $.ajax({
    url: ExplorerConfig.apiBaseUrl + '/transactions/' + id,
    dataType: 'json',
    type: 'GET',
    cache: 'false',
    success: function (list) {
      $('#headerPaymentId').text(id)
      $('#txnCount').text(list.length)

      const transactions = $('#paymentIdTransactions').DataTable({
        columnDefs: [{
            targets: [5],
            render: function (data, type, row, meta) {
              if (type === 'display') {
                data = '<a href="./transaction.html?hash=' + data + '">' + data + '</a>'
              }
              return data
            }
          },
          {
            targets: [3, 4],
            render: function (data, type, row, meta) {
              if (type === 'display') {
                data = numeral(data).format('0,0')
              }
              return data
            }
          },
          {
            targets: [1, 2],
            render: function (data, type, row, meta) {
              if (type === 'display') {
                data = numeral(data / Math.pow(10, ExplorerConfig.decimalPoints)).format('0,0.00')
              }
              return data
            }
          },
          {
            targets: [0],
            render: function (data, type, row, meta) {
              if (type === 'display') {
                data = (new Date(data * 1000)).toGMTString()
              }
              return data
            }
          }
        ],
        order: [
          [0, 'asc']
        ],
        searching: false,
        info: false,
        paging: false,
        pageLength: 25,
        lengthMenu: [
          [25, 50, 100, -1],
          [25, 50, 100, "All"]
        ],
        language: {
          emptyTable: "No Transactions For This Payment ID"
        },
        autoWidth: false
      }).columns.adjust().responsive.recalc()

      for (var i = 0; i < list.length; i++) {
        var txn = list[i]
        transactions.row.add([
          txn.timestamp,
          txn.amount,
          txn.fee,
          txn.size,
          txn.mixin,
          txn.hash
        ])
      }
      transactions.draw(false)
    },
    error: function () {
      window.location = '/?search=' + id
    }
  })
})