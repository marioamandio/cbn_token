const Block = require("./block");
const Transaction = require("../wallet/transaction");
const { cryptoHash } = require("../util");
const Wallet = require("../wallet");
const { REWARD_INPUT, MINING_REWARD } = require("../config");
class Blockchain {
  constructor() {
    this.chain = [Block.genesis()];
  }

  static isValidChain(chain) {
    if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())) {
      return false;
    }

    for (let i = 1; i < chain.length; i++) {
      const { timestamp, lastHash, hash, data, difficulty, nonce } = chain[i];

      const actualLastHash = chain[i - 1].hash;
      const lastDifficulty = chain[i - 1].difficulty;

      if (lastHash !== actualLastHash) return false;

      const validatedHash = cryptoHash(
        timestamp,
        lastHash,
        data,
        difficulty,
        nonce
      );

      if (hash !== validatedHash) return false;

      if (Math.abs(lastDifficulty - difficulty) > 1) return false;
    }

    return true;
  }

  addBlock({ data }) {
    const newBlock = Block.mineBlock({
      lastBlock: this.chain[this.chain.length - 1],
      data,
    });

    this.chain.push(newBlock);
  }

  replaceChain(chain, validateTransactions, onSuccess) {
    if (chain.length <= this.chain.length) {
      console.error("the incoming chain must be longer");
      return;
    }

    if (!Blockchain.isValidChain(chain)) {
      console.error("the incoming chain must be valid");

      return;
    }

    if (validateTransactions && !this.validTransactionData({ chain })) {
      console.error("the incoming chain has invalid data");
      return;
    }

    if (onSuccess) onSuccess();
    console.log("the incoming chain will change");
    this.chain = chain;
  }

  validTransactionData({ chain }) {
    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      let rewardTransactionCount = 0;
      const transactionSet = new Set();

      for (let transaction of block.data) {
        if (transaction.input.address === REWARD_INPUT.address) {
          rewardTransactionCount += 1;

          if (rewardTransactionCount > 1) {
            console.error("Miner rewards exceeds 1");
            return false;
          }

          if (Object.values(transaction.outputMap)[0] !== MINING_REWARD) {
            console.error("the mining reward amount is invalid");
            return false;
          }
        } else {
          if (!Transaction.validTransaction(transaction)) {
            console.error("invalid transaction");
            return false;
          }

          const trueBalance = Wallet.calculateBalance({
            chain: this.chain,
            address: transaction.input.address,
          });
          if (transaction.input.amount !== trueBalance) {
            console.error("Invalid input amount");
            return false;
          }

          if (transactionSet.has(transaction)) {
            console.error(
              "An identical transactions appears more than once in the block"
            );
            return false;
          } else {
            transactionSet.add(transaction);
          }
        }
      }
    }
    return true;
  }
}

module.exports = Blockchain;
