var recentBlocks, topBlockHeight, blockchainChart, blockchainChartData, blockchainChartOptions

$(window).resize(function () {
  if (typeof blockchainChart !== 'undefined') {
    drawBlockchainChart()
  }
})

$(document).ready(function () {
  checkForSearchTerm()

  blockchainChartOptions = {
    legend: {
      position: 'bottom'
    },
    vAxis: {
      scaleType: 'log',
      textPosition: 'none',
      gridlines: {
        count: 0
      },
      minorGridlines: {
        count: 0
      }
    },
    hAxis: {
      textPosition: 'none',
      gridlines: {
        count: 0
      },
      minorGridlines: {
        count: 0
      }
    },
    chartArea: {
      height: '75%',
      width: '100%',
    },
    vAxes: {
      0: {
        logScale: true
      },
      1: {
        logScale: false
      },
      2: {
        logScale: true
      },
      3: {
        logScale: true
      }
    },
    series: {
      0: {
        targetAxisIndex: 0
      },
      1: {
        targetAxisIndex: 1
      },
      2: {
        targetAxisIndex: 2
      },
      3: {
        targetAxisIndex: 3
      }
    },
    colors: ['#f6b26b', '#40c18e', '#8e7cc3', '#00853d', '#212721', '#fac5c3', '#6d9eeb', '#45818e', '#de5f5f']
  }

  localData.transactionPool = $('#transactionPool').DataTable({
    columnDefs: [{
      targets: [0, 1, 2, 3],
      searchable: false
    }],
    order: [
      [1, 'desc'],
      [2, 'desc'],
      [0, 'asc']
    ],
    searching: false,
    info: false,
    paging: false,
    lengthMenu: -1,
    language: {
      emptyTable: "No Transactions Currently in the Transaction Pool"
    },
    autoWidth: false
  }).columns.adjust().responsive.recalc()

  recentBlocks = $('#recentBlocks').DataTable({
    columnDefs: [{
      targets: 2,
      render: function (data, type, row, meta) {
        if (type === 'display') {
          data = '<a href="/block.html?hash=' + data + '">' + data + '</a>'
        }
        return data
      }
    },{
      targets: 6,
      render: function(data, type, row, meta) {
        if (type === 'display' && data.url) {
          const parts = data.name.split('.')
          while (parts.length > 2) {
            parts.shift()
          }
          data = '<a href="' + data.url + '" target="_blank">' + parts.join('.') + '</a>'
        } else if (type === 'display') {
          data = data.name
        }
        return data
      }
    }],
    order: [
      [0, 'desc']
    ],
    searching: false,
    info: false,
    paging: false,
    lengthMenu: -1,
    language: {
      emptyTable: "No recent blocks found"
    },
    autoWidth: false
  }).columns.adjust().responsive.recalc()

  google.charts.setOnLoadCallback(function () {
    getAndDisplayLastBlockHeader()

    function setLastBlockTimer() {
      setTimeout(function () {
        getAndDisplayLastBlockHeader()
        setLastBlockTimer()
      }, 15000)
    }
    setLastBlockTimer()

    updateTransactionPool(localData.transactionPool)

    function setTransactionPoolTimer() {
      setTimeout(function () {
        updateTransactionPool(localData.transactionPool)
        setTransactionPoolTimer()
      }, 15000)
    }
    setTransactionPoolTimer()
  })
})

function getAndDisplayLastBlockHeader() {
  $.ajax({
    url: ExplorerConfig.apiBaseUrl + '/block/header/top',
    dataType: 'json',
    type: 'GET',
    cache: 'false',
    success: function (data) {
      if (data.height !== topBlockHeight) {
        topBlockHeight = data.height
        updateRecentBlocks(recentBlocks, topBlockHeight)
      }
      $('#blockchainHeight').text(numeral(data.height).format('0,0'))
      $('#blockchainDifficulty').text(numeral(data.difficulty).format('0,0'))
      $('#blockchainHashRate').text(numeral(data.difficulty / ExplorerConfig.blockTargetTime).format('0,0') + ' H/s')
      $('#blockchainReward').text(numeral(data.reward / Math.pow(10, ExplorerConfig.decimalPoints)).format('0,0.00') + ' ' + ExplorerConfig.ticker)
      $('#blockchainTransactions').text(numeral(data.alreadyGeneratedTransactions).format('0,0'))
      $('#blockchainCirculatingSupply').text(numeral(data.alreadyGeneratedCoins / Math.pow(10, ExplorerConfig.decimalPoints)).format('0,0.00') + ' ' + ExplorerConfig.ticker)
      $('#blockchainTotalSupply').text(numeral(ExplorerConfig.maxSupply / Math.pow(10, ExplorerConfig.decimalPoints)).format('0,0.00') + ' ' + ExplorerConfig.ticker)

      var nextFork
      for (var i = ExplorerConfig.forkHeights.length; i > 0; i--) {
        if (data.height >= ExplorerConfig.forkHeights[i]) {
          nextFork = ExplorerConfig.forkHeights[i + 1]
          break
        }
      }
      var forkInSeconds = (nextFork - data.height) * ExplorerConfig.blockTargetTime
      var forkTime = secondsToHumanReadable(forkInSeconds)
      var estimatedFork = (Math.floor(Date.now() / 1000) + forkInSeconds)
      $('#nextForkIn').text(forkTime.days + 'd ' + forkTime.hours + 'h ' + forkTime.minutes + 'm ' + forkTime.seconds + 's').prop('title', (new Date(estimatedFork * 1000)).toGMTString())

      const maxSupply = ExplorerConfig.maxSupply
      const curSupply = data.alreadyGeneratedCoins
      const emiss = (curSupply / maxSupply) * 100

      $('#blockchainSupplyEmission').text(numeral(emiss).format('0.000000') + ' %')
    }
  })
}

function updateTransactionPool(table) {
  $.ajax({
    url: ExplorerConfig.apiBaseUrl + '/transaction/pool',
    dataType: 'json',
    type: 'GET',
    cache: 'false',
    success: function (data) {
      $("#transactionPoolCount").text(data.length)
      table.clear()
      for (var i = 0; i < data.length; i++) {
        var txn = data[i]
        table.row.add([
          numeral(txn.amount / Math.pow(10, ExplorerConfig.decimalPoints)).format('0,0.00'),
          numeral(txn.fee / Math.pow(10, ExplorerConfig.decimalPoints)).format('0,0.00'),
          numeral(txn.size).format('0,0'),
          txn.txnHash
        ])
      }
      table.draw(false)

      checkForSearchTerm()
    }
  })
}

function updateRecentBlocks(table, height) {
  $.ajax({
    url: ExplorerConfig.apiBaseUrl + '/block/headers/' + height,
    dataType: 'json',
    type: 'GET',
    cache: 'false',
    success: function (data) {
      table.clear()

      var chartData = [
        ['Block Time', 'Difficulty', 'Block Size', 'Txn Count']
      ]

      for (var i = 0; i < data.length; i++) {
        var block = data[i]
        chartData.push(
          [(new Date(block.timestamp * 1000 + ((new Date()).getTimezoneOffset() * 60 * 1000))), parseInt(block.difficulty), parseInt(block.size), parseInt(block.tx_count)]
        )

        table.row.add([
          numeral(block.height).format('0,0'),
          numeral(block.size).format('0,0'),
          block.hash,
          numeral(block.difficulty/1000/1000/1000).format('0,0.000') + ' B',
          numeral(block.tx_count).format('0,0'),
          (new Date(block.timestamp * 1000)).toLocaleTimeString(),
          {
            url: block.poolURL || false,
            name: block.poolName || 'Scanning...'
          }
        ])
      }

      blockchainChartData = google.visualization.arrayToDataTable(chartData)
      table.draw(false)
      drawBlockchainChart()
    }
  })
}

function drawBlockchainChart() {
  try {
    blockchainChart = new google.visualization.AreaChart(document.getElementById('blockchainChart'))
    blockchainChart.draw(blockchainChartData, blockchainChartOptions)
  } catch (e) {}
}
