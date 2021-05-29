$(document).ready(function () {
  const workers = $('#workers').DataTable({
    columnDefs: [{
      targets: [3, 4],
      render: function (data, type, row, meta) {
        if (type === 'display') {
          data = numeral(data).format('0,0')
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
    }],
    order: [
      [0, 'asc']
    ],
    searching: false,
    info: false,
    paging: false,
    lengthMenu: -1,
    language: {
      emptyTable: 'No Workers Found'
    },
    autoWidth: false
  }).columns.adjust().responsive.recalc()

  const address = localStorage.getItem('address')

  if (address) {
    $('#address').val(address)

    fetch_miner_data()
    fetch_miner_worker_data(workers)
  }

  $('#lookup_stats').click(function () {
    fetch_miner_data()
    fetch_miner_worker_data(workers)
  })

  $('#minerhashrate').keyup(function () {
    calculate_solo_block_time()
  })

  $('#minerunit').change(function () {
    calculate_solo_block_time()
  })

  fetch_pool_data()
})

function calculate_solo_block_time () {
  $('#minerhashrate').removeClass('is-danger')

  try {
    const hashrate = parseFloat($('#minerhashrate').val())

    const unit = parseInt($('#minerunit').find(':selected').val())

    if (isNaN(hashrate) || isNaN(unit)) {
      throw new Error('Invalid value')
    }

    const seconds = Math.round(localData.average.hashrate / (hashrate * unit))

    const result = secondsToHumanReadable(seconds)

    const readable = result.days + ' days, ' + result.hours + ' hours, ' + result.minutes + ' minutes, ' + result.seconds + ' seconds'

    $('#minertimetofind').val(readable)
  } catch (e) {
    $('#minerhashrate').addClass('is-danger')
  }
}

function fetch_pool_data () {
  $.ajax({
    url: ExplorerConfig.soloApiBaseUrl + '/stats?' + (new Date()).getTime(),
    dataType: 'json',
    method: 'GET',
    cache: 'false',
    success: function (data) {
      $('#pool_address').text(data.hostname + ':' + (data.port || 0).toString())
      $('#pool_host').text(data.hostname)
      $('#pool_port').text((data.port || 0).toString())
      $('#default_node').text(data.node.host + ':' + data.node.port)

      render_pool_data(data)
    },
    error: function () {
      setTimeout(() => fetch_pool_data(), 5000)
    }
  })
}

function render_pool_data (data) {
  $('#height').text(numeral(data.height).format('0,0'))
  $('#hashrate').text(numeral(data.hashrate).format('0,0') + ' H/s')
  $('#miners').text(numeral(data.miners).format('0,0'))
  $('#reward').text(numeral(data.minPayout / Math.pow(10, ExplorerConfig.decimalPoints)).format('0,0.00') + ' TRTL')
  $('#lastblocktime').text((data.lastBlock === 0) ? 'Never' : (new Date(data.lastBlock * 1000)).toGMTString())
  if (data.lastBlockHash !== 'Never') {
    $('#lastblock').html('<a href="/?search=' + data.lastBlockHash + '">' + data.lastBlockHash + '</a>')
  } else {
    $('#lastblock').text(data.lastBlockHash)
  }
  $('#difficulty').text(numeral(data.difficulty).format('0,0'))
  $('#node_host').text(data.node.host)
  $('#node_port').text(data.node.port)
  $('#node_ssl').text(data.node.ssl ? 'Yes' : 'No')
  $('#node_timeout').text(numeral(data.node.timeout).format('0,0') + 'ms')

  setTimeout(() => fetch_pool_data(), 5000)
}

function fetch_miner_data () {
  const address = $('#address').val()

  if (address.length === 0) {
    return
  }

  $('#address').removeClass('is-danger')

  $.ajax({
    url: ExplorerConfig.soloApiBaseUrl + '/stats/' + address + '?' + (new Date()).getTime(),
    dataType: 'json',
    method: 'GET',
    cache: 'false',
    success: function (data) {
      localStorage.setItem('address', address)

      render_miner_data(data)
    },
    error: function () {
      $('#miner_stats').hide()
      $('#address').addClass('is-danger')

      setTimeout(() => fetch_miner_data(), 5000)
    }
  })
}

function fetch_miner_worker_data (table) {
  const address = $('#address').val()

  if (address.length === 0) {
    return
  }

  $('#address').removeClass('is-danger')

  $.ajax({
    url: ExplorerConfig.soloApiBaseUrl + '/stats/' + address + '/workers?' + (new Date()).getTime(),
    dataType: 'json',
    method: 'GET',
    cache: 'false',
    success: function (data) {
      render_miner_worker_data(table, data)
    },
    error: function () {
      $('#miner_stats').hide()
      $('#address').addClass('is-danger')

      setTimeout(() => fetch_miner_worker_data(table), 5000)
    }
  })
}

function render_miner_data (data) {
  $('#miner_node').text(data.node.host)
  $('#miner_node_port').text(data.node.port)
  $('#miner_node_ssl').text((data.node.ssl) ? 'Yes' : 'No')
  $('#miner_node_timeout').text(numeral(data.node.timeout).format('0,0') + 'ms')
  $('#miner_workers').text(numeral(data.workers).format('0,0'))
  $('#miner_hashrate').text(numeral(data.hashrate).format('0,0') + ' H/s')
  if (data.last_block_hash !== 'Never') {
    $('#miner_lastblock').html('<a href="/?search=' + data.last_block_hash + '">' + data.last_block_hash + '</a>')
  } else {
    $('#miner_lastblock').text(data.last_block_hash)
  }
  $('#miner_lastblocktime').text((data.last_block === 0) ? 'Never' : (new Date(data.last_block * 1000)).toGMTString())

  $('#miner_stats').show()

  setTimeout(() => fetch_miner_data(), 5000)
}

function render_miner_worker_data (table, data) {
  table.clear()

  for (var i = 0; i < data.length; ++i) {
    const worker = data[i]

    table.row.add([
      worker.id,
      (worker.rig_id.length === 0) ? 'None' : worker.rig_id,
      worker.hashrate,
      worker.difficulty,
      worker.next_difficulty
    ])
  }
  table.draw(false)

  setTimeout(() => fetch_miner_worker_data(table), 5000)
}
