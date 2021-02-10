const Block = require("./block");
const Transaction = require("../wallet/transaction");
const { cryptoHash } = require("../util");
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

  replaceChain(chain, onSuccess) {
    if (chain.length <= this.chain.length) {
      console.error("the incoming chain must be longer");
      return;
    }

    if (!Blockchain.isValidChain(chain)) {
      console.error("the incoming chain must be valid");

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
      console.log("called");

      for (let transaction of block.data) {
        console.log("transaction");
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
          console.log(transaction, "transaction");
          if (!Transaction.validTransaction(transaction)) {
            console.error("invalid transaction");
            return false;
          }
        }
      }
    }
    return true;
  }
}

module.exports = Blockchain;
