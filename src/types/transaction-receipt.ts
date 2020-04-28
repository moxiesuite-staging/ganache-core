import Transaction from "./transaction";
import { Block } from "../ledgers/ethereum/components/block-manager";
import { encode as rlpEncode, decode as rlpDecode } from "rlp";
import { Data, Quantity } from "./json-rpc";

export default class TransactionReceipt {
  #contractAddress: Buffer;
  #raw: [Buffer, Buffer, Buffer, Buffer[]];

  constructor(data?: Buffer) {
    if (data) {
      const decoded = rlpDecode(data) as any as [Buffer, Buffer, Buffer, Buffer[], Buffer];
      this.#init(decoded[0], decoded[1], decoded[2], decoded[3], decoded[4]);
    }
  }
  #init = (status: Buffer, gasUsed: Buffer, logsBloom: Buffer, logs: Buffer[], contractAddress: Buffer = null) => {
    this.#raw = [status, gasUsed, logsBloom, logs];
    this.#contractAddress = contractAddress;
  }
  static fromValues(status: Buffer, gasUsed: Buffer, logsBloom: Buffer, logs: Buffer[], contractAddress: Buffer) {
    const receipt = new TransactionReceipt();
    receipt.#init(status, gasUsed, logsBloom, logs, contractAddress);
    return receipt;
  }
  public serialize(all: boolean) {
    return all ? rlpEncode([...this.#raw, this.#contractAddress]) : rlpEncode(this.#raw);
  }
  public toJSON(block: Block, transaction: Transaction) {
    const raw = this.#raw;
    return {
      transactionHash: Data.from(transaction.hash()),
      transactionIndex: Quantity.from((transaction as any)._index),
      blockNumber: Quantity.from(block.value.header.number),
      blockHash: Data.from(block.value.hash()),
      cumulativeGasUsed: Quantity.from(block.value.header.gasUsed),
      gasUsed: Quantity.from(raw[1]),
      contractAddress: Data.from(this.#contractAddress),
      logs: raw[3], // TODO: figure this out
      logsBloom: Data.from(raw[2], 256),
      status: Quantity.from(raw[0])
    };
  }
}