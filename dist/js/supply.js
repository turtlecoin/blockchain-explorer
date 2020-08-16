$(document).ready(function () {
  const chartOptions = {
    legend: {
      position: 'bottom'
    },
    chartArea: {
      height: '80%',
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
        targetAxisIndex: 0,
        curveType: 'function'
      },
      1: {
        targetAxisIndex: 1,
        curveType: 'function'
      }
    },
    hAxis: {
      title: 'Estimated Year',
      minorGridlines: {
        count: 0
      }
    },
    colors: ['#f6b26b', '#40c18e', '#8e7cc3', '#00853d', '#212721', '#fac5c3', '#6d9eeb', '#45818e', '#de5f5f']
  }

  google.charts.setOnLoadCallback(function () {
    const chart = new google.visualization.AreaChart(document.getElementById('supply'))

    const chartData = [
      ['', 'Emitted Supply', 'Block Reward']
    ]

    var generatedCoins = 0
    for (var i = 0; i < ExplorerConfig.emissionCurveDataPoints; i++) {
      var blockReward = getNextReward(generatedCoins)
      generatedCoins += blockReward
      var block = (i * ExplorerConfig.emissionCurveInterval)
      var date = calculateEstimatedBlockDate(block)
      var label = {
        v: date,
        f: 'Block: ' + numeral(block).format('0,0') + ' estimated at ' + date.toGMTString()
      }
      chartData.push([
        label,
        (generatedCoins / Math.pow(10, ExplorerConfig.decimalPoints)) * ExplorerConfig.emissionCurveInterval,
        (blockReward / Math.pow(10, ExplorerConfig.decimalPoints))
      ])
    }

    const gChartData = google.visualization.arrayToDataTable(chartData)
    chart.draw(gChartData, chartOptions)
  })
})

function calculateEstimatedBlockDate(block) {
  const estimatedTimestamp = ExplorerConfig.genesisTimestamp + (block * ExplorerConfig.blockTargetTime)
  return new Date(estimatedTimestamp * 1000)
}

function getNextReward(currentSupply) {
  const m_currentSupply = bigInt(currentSupply.toString()).multiply(ExplorerConfig.emissionCurveInterval)
  return bigInt(ExplorerConfig.maxSupply)
    .subtract(m_currentSupply.toString())
    .shiftRight(ExplorerConfig.emissionSpeed)
    .toJSNumber()
}