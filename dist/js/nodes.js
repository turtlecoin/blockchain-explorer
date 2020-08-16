$(document).ready(function () {
  localData.nodeTable = $('#nodes').DataTable({
    searching: false,
    info: false,
    paging: false,
    lengthMenu: -1,
    language: {
      emptyTable: 'No Community Nodes Found'
    },
    columnDefs: [
      {
        targets: [0],
        render: function (data, type, row, meta) {
          if (type === 'display') {
            data = '<span title="' + data.address + '"><svg data-jdenticon-value="' + data.address + '" width="20" height="20" style="vertical-align: middle;"></svg> ' + data.name
          } else if (type === 'sort') {
            data = data.name
          }
          return data
        }
      },
      {
        targets: [1],
        render: function (data, type, row, meta) {
          if (type === 'display') {
            data = data.host + ':' + data.port + data.ssl + data.cache
          } else if (type === 'sort') {
            data = data.host + ':' + data.port
          }
          return data
        }
      },
      {
        targets: [5],
        type: 'num',
        render: function (data, type, row, meta) {
          if (type === 'display') {
            if (!data.offline) {
              data = data.ins + '/' + data.outs + ' (' + data.tx + ')'
            } else {
              data = ''
            }
          } else if (type === 'sort') {
            data = data.ins + data.outs
          }
          return data
        }
      },
      {
        targets: [6],
        type: 'num',
        render: function (data, type, row, meta) {
          if (type === 'display') {
            data = '<span title="'+data.percent+'%" style="font-size: 0.8em;">' + data.hist + '</span>'
          } else if (type === 'sort') {
            data = data.percent
          }
          return data
        }
      }
    ],
    order: [
      [6, 'dsc'],
      [0, 'asc']
    ],
    autoWidth: false
  }).columns.adjust().responsive.recalc().draw(false)

  google.charts.setOnLoadCallback(function () {
    getAndDrawNodeStats()
  })
})

function getAndDrawNodeStats () {
  $.ajax({
    url: ExplorerConfig.apiBaseUrl + '/node/stats',
    dataType: 'json',
    method: 'GET',
    cache: 'false',
    success: function (data) {
      localData.nodeTable.clear()
      for (var i = 0; i < data.length; i++) {
        var node = data[i]
        var hist = []

        if (node.history) {
          for (var j = 0; j < node.history.length; j++) {
            var evt = node.history[j]
            if (evt.online) {
              hist.unshift('<i class="fas fa-circle has-trtl-green"></i>')
            } else {
              hist.unshift('<i class="far fa-circle has-trtl-red"></i>')
            }
          }
        }

        localData.nodeTable.row.add([
          {
            name: node.name,
            address: node.fee.address || node.url
          },
          {
            host: node.url,
            port: node.port,
            ssl: (node.ssl) ? ' <i class="fas fa-user-shield has-trtl-green" title="SSL Required"></i>' : '',
            cache: (node.cache) ? ' <i class="fas fa-tachometer-alt has-trtl-green" title="Blockchain Cache"></i>' : ''
          },
          (node.version && node.version !== 'offline') ? numeral(node.fee.amount / Math.pow(10, ExplorerConfig.decimalPoints)).format('0,0.00') : '',
          (node.version && node.version !== 'offline') ? node.version : '',
          (node.version && node.version !== 'offline') ? numeral(node.height).format('0,0') : '',
          {
            offline: !(node.version && node.version !== 'offline'),
            ins: node.connectionsIn,
            outs: node.connectionsOut,
            tx: numeral(node.txPoolSize).format('0,0')
          },
          {
            hist: hist.join(''),
            percent: numeral(node.availability).format('0,0.00')
          }
        ])
      }
      localData.nodeTable.draw(false)
      jdenticon()
    },
    error: function () {
      alert('Could not retrieve node statistics from + ' + ExplorerConfig.apiBaseUrl + '/node/stats')
    }
  })
  setTimeout(() => {
    getAndDrawNodeStats()
  }, 15000)
}
