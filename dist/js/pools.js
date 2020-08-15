$(document).ready(function () {
  localData.poolTable = $('#pools').DataTable({
    searching: false,
    info: false,
    paging: false,
    lengthMenu: -1,
    language: {
      emptyTable: 'No Mining Pools Found'
    },
    columnDefs: [
      {
        targets: [0],
        render: function (data, type, row, meta) {
          if (type === 'display') {
            data = '<a href="' + data.url + '" target="_blank">' + data.name + '</a> ' + data.merged + data.child
          } else if (type === 'sort') {
            data = data.name
          }
          return data
        }
      },
      {
        targets: [2],
        render: function (data, type, row, meta) {
          if (type === 'display') {
            data = numeral(data).format('0,0') + ' H/s'
          }
          return data
        }
      },
      {
        targets: [5],
        render: function (data, type, row, meta) {
          if (type === 'display') {
            data = numeral(data / Math.pow(10, ExplorerConfig.decimalPoints)).format('0,0.00')
          }
          return data
        }
      },
      {
        targets: [6],
        render: function (data, type, row, meta) {
          if (type === 'display') {
            data = (new Date(data)).toGMTString()
          }
          return data
        }
      },
      {
        targets: [7],
        type: 'num',
        render: function (data, type, row, meta) {
          if (type === 'display') {
            data = '<span title="' + data.percent + '%" style="font-size: 0.8em;">' + data.hist + '</span>'
          } else if (type === 'sort') {
            data = data.percent
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

  google.charts.setOnLoadCallback(function () {
    getCurrentNetworkHashRateLoop()
    getAndDrawPoolStats()
  })
})

function getAndDrawPoolStats () {
  $.ajax({
    url: ExplorerConfig.apiBaseUrl + '/pool/stats',
    dataType: 'json',
    method: 'GET',
    cache: 'false',
    success: function (data) {
      localData.poolTable.clear()
      for (var i = 0; i < data.length; i++) {
        var pool = data[i]

        var hist = []

        if (pool.history) {
          for (var j = 0; j < pool.history.length; j++) {
            var evt = pool.history[j]
            if (evt.online) {
              hist.unshift('<i class="fas fa-circle has-trtl-green"></i>')
            } else {
              hist.unshift('<i class="far fa-circle has-trtl-red"></i>')
            }
          }
        }

        localData.poolTable.row.add([
          {
            name: pool.name,
            url: pool.url,
            merged: (pool.mergedMining) ? ' <i class="fas fa-object-group has-trtl-green" title="Merged Mining"></i>' : '',
            child: (pool.mergedMining && !pool.mergedMiningIsParentChain) ? ' <i class="fas fa-child has-trtl-green" title="Child Chain"></i>' : ''
          },
          numeral(pool.height).format('0,0'),
          pool.hashrate,
          numeral(pool.miners).format('0,0'),
          numeral(pool.fee).format('0,0.00') + '%',
          pool.minPayout,
          pool.lastBlock * 1000,
          {
            hist: hist.join(''),
            percent: numeral(pool.availability).format('0,0.00')
          }
        ])
      }
      localData.poolTable.draw(false)
      drawPoolPieChart()
    },
    error: function () {}
  })
  setTimeout(() => {
    getAndDrawPoolStats()
  }, 15000)
}

function drawPoolPieChart () {
  var data = [
    ['Pool', 'Hashrate']
  ]
  var slices = {}

  var count = 0
  var currentHashRate = localData.networkHashRate
  localData.poolTable.rows().every(function (idx, tableLoop, rowLoop) {
    var row = this.data()
    data.push([row[0].name, row[2]])
    currentHashRate = currentHashRate - row[2]
    slices[count] = {
      offset: 0
    }
    count++
  })
  if (currentHashRate > 0) {
    data.push(['Unknown', currentHashRate])
    slices[count] = {
      offset: 0
    }
    count++
  }

  var options = {
    is3D: false,
    colors: ['#212721', '#fac5c3', '#6d9eeb', '#40c18e', '#8e7cc3', '#00853d', '#f6b26b', '#45818e', '#de5f5f'],
    chartArea: {
      width: '100%'
    },
    pieHole: 0.45,
    legend: 'none',
    pieSliceText: 'label',
    height: 800,
    slices: slices
  }

  try {
    var chart = new google.visualization.PieChart(document.getElementById('poolPieChart'))
    chart.draw(google.visualization.arrayToDataTable(data), options)
  } catch (e) {}
}
