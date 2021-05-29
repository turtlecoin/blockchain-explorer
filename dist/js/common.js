const localData = {
  average: {
    difficulty: 0,
    hashrate: 0
  }
}

if (typeof google !== 'undefined') {
  google.charts.load('current', {
    packages: ['corechart']
  })
}

$(document).ready(function () {
  $('#searchButton').click(function () {
    searchForTerm($('#searchValue').val())
  })

  $('#searchValue').keydown(function (e) {
    setSearchValueErrorState(false)
    if (e.which === 13) {
      searchForTerm($('#searchValue').val())
    }
  })

  $('.navbar-burger').click(function () {
    $('.navbar-burger').toggleClass('is-active')
    $('.navbar-menu').toggleClass('is-active')
  })

  getAverageNetworkHashRateLoop()
  getCurrentNetworkHashRateLoop()
})

function checkForSearchTerm () {
  const searchTerm = getQueryStringParam('search')
  /* If we were given a search term, let's plug it in
     and then run a search for them */
  if (searchTerm && searchTerm.length !== 0) {
    $('#searchValue').val(searchTerm)
    searchForTerm(searchTerm)
  }
}

function searchTransactionPool (term) {
  var found = false
  if (localData.transactionPool) {
    /* Clear any highlights */
    localData.transactionPool.rows().every(function (idx, tableLoop, rowLoop) {
      $(localData.transactionPool.row(idx).nodes()).removeClass('is-ours')
    })

    localData.transactionPool.rows().every(function (idx, tableLoop, rowLoop) {
      if (localData.transactionPool.row(idx).data()[3] === term) {
        $(localData.transactionPool.row(idx).nodes()).addClass('is-ours')
        found = true
      }
    })
  }

  return found
}

function isHash (str) {
  const regex = new RegExp('^[0-9a-fA-F]{64}$')
  return regex.test(str)
}

function getAverageNetworkHashRateLoop () {
  $.ajax({
    url: ExplorerConfig.apiBaseUrl + '/chain/difficulty',
    dataType: 'json',
    type: 'GET',
    cache: 'false',
    success: function (data) {
      setTimeout(function () {
        getAverageNetworkHashRateLoop()
      }, 30000)

      localData.average = data
    }
  })
}

function getCurrentNetworkHashRateLoop () {
  $.ajax({
    url: ExplorerConfig.apiBaseUrl + '/block/header/top',
    dataType: 'json',
    type: 'GET',
    cache: 'false',
    success: function (header) {
      localData.networkHashRate = Math.floor(header.difficulty / ExplorerConfig.blockTargetTime)
      $('#globalHashRate').text(numeral(localData.networkHashRate).format('0,0') + ' H/s')
      setTimeout(function () {
        getCurrentNetworkHashRateLoop()
      }, 15000)

	  const v2LaunchSeconds = (ExplorerConfig.v2LaunchHeight - header.height) * ExplorerConfig.blockTargetTime
      const v1DeathSeconds = (ExplorerConfig.v1DeathHeight - header.height) * ExplorerConfig.blockTargetTime

      const v2Launch = secondsToHumanReadable(v2LaunchSeconds)
      const v1Death = secondsToHumanReadable(v1DeathSeconds)

      const estimatedLaunch = (Math.floor(Date.now() / 1000) + v2LaunchSeconds)
      const estimatedDeath = (Math.floor(Date.now() / 1000) + v1DeathSeconds)

      $("#v2LaunchIn").text(v2Launch.days + 'd ' + v2Launch.hours + 'h ' + v2Launch.minutes + 'm ' + v2Launch.seconds + 's').prop('title', (new Date(estimatedLaunch * 1000)).toGMTString())
      $("#v1DeathIn").text(v1Death.days + 'd ' + v1Death.hours + 'h ' + v1Death.minutes + 'm ' + v1Death.seconds + 's').prop('title', (new Date(estimatedDeath * 1000)).toGMTString())

      if (header.height >= ExplorerConfig.v2LaunchHeight && header.height < ExplorerConfig.v1DeathHeight) {
        $("#swapPeriodIs").text("Is Active")
      } else if (header.height < ExplorerConfig.v2LaunchHeight) {
        $("#swapPeriodIs").text("Has not started")
      } else if (header.height >= ExplorerConfig.v1DeathHeight) {
        $("#swapPeriodIs").text("Is Complete")
      } else {
        $("#swapPeriodIs").text("Is Inactive")
      }

	  setInterval(() => {
		$("#swapPeriodIs").fadeOut(1000)
		$("#swapPeriodIs").fadeIn(1000)
	  }, 2000)
    },
    error: function () {
      setTimeout(function () {
        getCurrentNetworkHashRateLoop()
      }, 15000)
    }
  })
}

function searchForTerm (term) {
  term = term.trim()
  /* Allow commas in a height search */
  term = term.replace(',', '')

  if (parseInt(term).toString() === term) {
    /* This should be height so we know to perform a search on height */
    $.ajax({
      url: ExplorerConfig.apiBaseUrl + '/block/header/' + term + '?random=' + (new Date()).getTime(),
      dataType: 'json',
      type: 'GET',
      cache: 'false',
      success: function (data) {
        window.location = './block.html?hash=' + data.hash
      },
      error: function () {
        setSearchValueErrorState(true)
      }
    })
  } else if (isHash(term)) {
    /* Great, we're pretty sure that this is a hash, let's see if we can find out what type */

    /* Let's see if it's a block hash first? */
    $.ajax({
      url: ExplorerConfig.apiBaseUrl + '/block/header/' + term + '?random=' + (new Date()).getTime(),
      dataType: 'json',
      type: 'GET',
      cache: 'false',
      success: function (data) {
        /* We found a block that matched, let's go take a look at it */
        window.location = './block.html?hash=' + data.hash
      },
      error: function () {
        /* It's not a block, is it a transaction? */
        $.ajax({
          url: ExplorerConfig.apiBaseUrl + '/transaction/' + term + '?random=' + (new Date()).getTime(),
          dataType: 'json',
          type: 'GET',
          cache: 'false',
          success: function (data) {
            /* Great, we found a matching transaction, let's go take a look at it */
            window.location = './transaction.html?hash=' + data.tx.hash
          },
          error: function () {
            /* It's not a transaction hash, must be a paymentId */
            $.ajax({
              url: ExplorerConfig.apiBaseUrl + '/transactions/' + term + '?random=' + (new Date()).getTime(),
              dataType: 'json',
              type: 'GET',
              cache: 'false',
              success: function (data) {
                if (data.length !== 0) {
                  /* It's a payment Id, let's display the list */
                  window.location = './paymentid.html?id=' + term
                } else {
                  $.ajax({
                    url: ExplorerConfig.apiBaseUrl + '/keyImage/' + term + '?random=' + (new Date()).getTime(),
                    dataType: 'json',
                    type: 'GET',
                    cache: 'false',
                    success: function(data) {
                      /* Great, we found a match, now redirect there */
                      window.location = './transaction.html?hash=' + data.tx + '&keyImage=' + data.keyImage
                    },
                    error: function () {
                      if (!searchTransactionPool(term)) {
                        setSearchValueErrorState(true)
                      }
                    }
                  })
                }
              },
              error: function () {
                $.ajax({
                  url: ExplorerConfig.apiBaseUrl + '/keyImage/' + term + '?random=' + (new Date()).getTime(),
                  dataType: 'json',
                  type: 'GET',
                  cache: 'false',
                  success: function(data) {
                    /* Great, we found a match, now redirect there */
                    window.location = './transaction.html?hash=' + data.tx + '&keyimage=' + data.keyImage
                  },
                  error: function () {
                    if (!searchTransactionPool(term)) {
                      setSearchValueErrorState(true)
                    }
                  }
                })
              }
            })
          }
        })
      }
    })
  } else {
    setSearchValueErrorState(true)
  }
}

function setSearchValueErrorState (state) {
  if (state) {
    $('#searchValue').removeClass('is-danger').addClass('is-danger')
  } else {
    $('#searchValue').removeClass('is-danger')
  }
}

function getQueryStringParam (key) {
  const queryString = window.location.search.substring(1)
  const params = queryString.split('&')
  for (var i = 0; i < params.length; i++) {
    var param = params[i].split('=')
    if (param[0] === key) {
      return param[1]
    }
  }
}

function secondsToHumanReadable (seconds) {
  var days = Math.floor(seconds / (3600 * 24))
  seconds -= days * 3600 * 24
  var hrs = Math.floor(seconds / 3600)
  seconds -= hrs * 3600
  var mnts = Math.floor(seconds / 60)
  seconds -= mnts * 60

  return {
    days: days,
    hours: hrs,
    minutes: mnts,
    seconds: seconds
  }
}
