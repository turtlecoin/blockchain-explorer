const blockchainChartOptions = {
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
      logScale: false
    },
    1: {
      logScale: false
    }
  },
  series: {
    0: {
      targetAxisIndex: 0
    },
    1: {
      targetAxisIndex: 1
    }
  },
  colors: ['#f6b26b', '#40c18e', '#8e7cc3', '#00853d', '#212721', '#fac5c3', '#6d9eeb', '#45818e', '#de5f5f']
}

$(document).ready(function () {
  google.charts.setOnLoadCallback(function () {
    function setUpdateTimer() {
      updateCharts()
      setTimeout(function () {
        setUpdateTimer()
      }, 15000)
    }

    setUpdateTimer()
  })
})

function updateCharts() {
  $.ajax({
    url: ExplorerConfig.apiBaseUrl + '/chain/stats',
    dataType: 'json',
    type: 'GET',
    cache: false,
    success: function (data) {
      const difficultyChart = new google.visualization.AreaChart(document.getElementById('difficulty'))
      const blockSizeChart = new google.visualization.AreaChart(document.getElementById('blockSize'))
      const txnChart = new google.visualization.AreaChart(document.getElementById('txnCount'))
      const nonceChart = new google.visualization.AreaChart(document.getElementById('nonce'))

      const difficultyData = [
        ['Block Time', 'Difficulty', 'Hashrate']
      ]

      const blockSizeData = [
        ['Block Time', 'Block Size']
      ]

      const txnData = [
        ['Block Time', 'Transaction Count']
      ]

      const nonceData = [
        ['Block Time', 'Nonce']
      ]

      for (var i = 0; i < data.length; i++) {
        const block = data[i]
        difficultyData.push([
          (new Date(block.timestamp * 1000 + ((new Date()).getTimezoneOffset() * 60 * 1000))),
          parseInt(block.difficulty),
          parseInt(block.difficulty) / ExplorerConfig.blockTargetTime
        ])

        blockSizeData.push([
          (new Date(block.timestamp * 1000 + ((new Date()).getTimezoneOffset() * 60 * 1000))),
          parseInt(block.size)
        ])

        txnData.push([
          (new Date(block.timestamp * 1000 + ((new Date()).getTimezoneOffset() * 60 * 1000))),
          parseInt(block.txnCount),
        ])

        nonceData.push([
          (new Date(block.timestamp * 1000 + ((new Date()).getTimezoneOffset() * 60 * 1000))),
          parseInt(block.nonce)
        ])
      }

      const difficultyChartData = google.visualization.arrayToDataTable(difficultyData)
      const difficultyChartOptions = blockchainChartOptions
      difficultyChartOptions.colors = ['#f6b26b','#40c18e']
      difficultyChart.draw(difficultyChartData, difficultyChartOptions)

      const blockSizeChartData = google.visualization.arrayToDataTable(blockSizeData)
      const blockSizeChartOptions = blockchainChartOptions
      blockSizeChartOptions.colors = ['#8e7cc3']
      blockSizeChart.draw(blockSizeChartData, blockSizeChartOptions)

      const txnChartData = google.visualization.arrayToDataTable(txnData)
      const txnChartOptions = blockchainChartOptions
      txnChartOptions.colors = ['#00853d']
      txnChart.draw(txnChartData, txnChartOptions)

      const nonceChartData = google.visualization.arrayToDataTable(nonceData)
      const nonceChartOptions = blockchainChartOptions
      nonceChartOptions.colors = ['#212721']
      nonceChart.draw(nonceChartData, nonceChartOptions)
    }
  })
}