Template.swaperc20.helpers({
    balanceAvalon: function() {
        return Users.findOne({ username: Session.get('activeUsername'), network: 'avalon' }).balance
    },
    balanceErc20: function() {
        return Session.get('metamaskBalance')
    },
    dtcFee: function() {
        var liquid = Session.get('metamaskUniswapLiquidities')
        if (!liquid) return ''
        var dtcEther = liquid.weth / liquid.dtc
        var avgGasUsedPerTx = 38074
        var gasPrice = Session.get('metamaskGasPrice')
        var txFeeEth = avgGasUsedPerTx * gasPrice
        var txFeeDtc = Math.ceil(100 * txFeeEth / dtcEther)
        Session.set('swapFee', txFeeDtc)
        return txFeeDtc
    },
    finalAmount: function() {
        var amount = Session.get('swapAmount')*100
        if (!amount) return ''
        if (!Session.get('metamaskSwapInverse')) {
            var fee = Session.get('swapFee')
            return (amount - fee)
        }
        return amount
    },
    metamaskSwapInverse: function() {
        return Session.get('metamaskSwapInverse')
    }
})

Template.swaperc20.events({
    "click #swapInverse": function() {
        Session.set('metamaskSwapInverse', !Session.get('metamaskSwapInverse'))
        Session.set('swapAmount', null)
    },
    "click #cancelSwap": function() {
        $('.swaperc20').hide()
    },
    "input #swapAmount": function() {
        var balance = Users.findOne({ username: Session.get('activeUsername'), network: 'avalon' }).balance
        if (Session.get('metamaskSwapInverse'))
            balance = Session.get('metamaskBalance')
        var amount = parseFloat($('#swapAmount').val())
        Session.set('swapAmount', amount)
        var decimals = countDecimals(amount)

        if (decimals > 2 || amount*100 > balance) {
            $('#swapAmount').parent().parent().addClass('error')
        } else {
            $('#swapAmount').parent().parent().removeClass('error')
        }
    },
    "click #confirmSwap": function() {
        $("#confirmSwap").addClass('disabled')
        $("#confirmSwap > i.check").addClass('dsp-non')
        $("#confirmSwap > i.loading").removeClass('dsp-non')

        if (Session.get('metamaskSwapInverse')) {
            // erc20 -> avalon
            metamask.transferToAvalon(Session.get('swapAmount'), function(err, res) {
                $("#confirmSwap").removeClass('disabled')
                $("#confirmSwap > i.loading").addClass('dsp-non')
                $("#confirmSwap > i.check").removeClass('dsp-non')
                if (err) toastr.error(err.message)
                else {
                    console.log('Sent Ethereum transaction: '+res)
                    toastr.success(res, 'Ethereum Transaction Sent')
                    $('.swaperc20').hide()
                }
            })
        } else {
            // avalon -> erc20
            var amount = Math.floor(Session.get('swapAmount')*100)
            var memo = Session.get('metamaskAddress') + '@eth'
            var receiver = 'dtube.swap'
            broadcast.avalon.transfer(receiver, amount, memo, function(err, res) {
                $("#confirmSwap").removeClass('disabled')
                $("#confirmSwap > i.loading").addClass('dsp-non')
                $("#confirmSwap > i.check").removeClass('dsp-non')
                if (err) Meteor.blockchainError(err)
                else {
                  toastr.success(translate('TRANSFER_SUCCESS_DESC', amount, receiver), translate('TRANSFER_SUCCESS_TITLE'))
                  $('.swaperc20').hide()
                }
            })
        }
    }
})

var countDecimals = function (amount) {
    if (amount.toString().indexOf('.') === -1) return 0
    return amount.toString().split(".")[1].length || 0; 
}