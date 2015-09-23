var EthereumTransaction = require('ethereumjs-tx');
var crypto = require('crypto');
var utils = require('ethereumjs-util');

Transaction = function(_params) {
  this.params = _params;

  // {gas: 3000000, gasLimit: 10000000000000})
  //this.raw = {
  //  gasPrice: '09184e72a000',
  //  gasLimit: '20710'
  //};
  this.raw = {
    gasPrice: '2dc6c0',
    gasLimit: '5f5e100'
  };

  if (_params.data !== undefined) {
    this.raw.data = utils.stripHexPrefix(_params.data);
  }
  this.hash = '0x' + crypto.randomBytes(64).toString('hex');

  if (_params.to !== undefined) {
    this.raw.to = utils.stripHexPrefix(_params.to);
  }

  if (_params.value !== undefined) {
    this.raw.value = _params.value;
  }

  this.receipt = {
    transactionHash: this.hash,
    contractAddress: null,
    logs: []
  }

  if (_params.from !== undefined) {
    this.receipt.from = _params.from;
  }

  if (_params.to !== undefined) {
    this.receipt.to = _params.to;
  }

}

Transaction.prototype.run = function(block, cb) {
  var _this = this;
  this.raw.nonce = block.blockchain.nonce;

  //TODO: might need to remove 0x
  this.raw.from = block.blockchain.accounts[0].address;
  block.blockchain.transactions[this.hash] = this;

  block.blockchain.nonce += 1;

  var secretKey = block.blockchain.accounts[0].secretKey;

  var tx = new EthereumTransaction(this.raw);
  tx.sign(new Buffer(secretKey, 'hex'));
  var data = this.raw.data;

  block.blockchain.vm.runTx({tx: tx}, function(err, results) {
    if (err) {
      console.log(err);
      cb({status: 'error'});
      return;
    }

    _this.receipt.blockHash = block._hash;
    _this.receipt.blockNumber = block.number;
    _this.receipt.transactionIndex = 0;
    _this.receipt.cumulativeGasUsed = results.gasUsed.toString();
    _this.receipt.gasUsed = results.gasUsed.toString();
    _this.receipt.transactionHash = _this.hash;

     console.log("running callback");

    var createdAddress = results.createdAddress;
    if (createdAddress) {
      block.blockchain.contracts[createdAddress.toString('hex')] = data;
      console.log('==> address created: ' + createdAddress.toString('hex'));

      _this.receipt.contractAddress = createdAddress.toString('hex');
      console.log(_this.receipt);

      cb({status: 'contract', result: _this.hash, address: createdAddress.toString('hex')});
      return;
    }

    //results.vm.exception
    if (results.vm.return !== undefined && results.vm.return.toString('hex') !== '') {
      var result = results.vm.return.toString('hex');
      cb({status: 'result', result: '0x' + result});
    }
    else {
      cb({status: 'transaction', result: _this.hash});
    }
    return;
  });
}

module.exports = Transaction;
