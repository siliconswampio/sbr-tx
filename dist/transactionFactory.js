"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sbr_util_1 = require("sbr-util");
const common_1 = __importDefault(require("@sbr/common"));
const legacyTransaction_1 = __importDefault(require("./legacyTransaction"));
const eip2930Transaction_1 = __importDefault(require("./eip2930Transaction"));
const DEFAULT_COMMON = new common_1.default({ chain: 'mainnet' });
class TransactionFactory {
    // It is not possible to instantiate a TransactionFactory object.
    constructor() { }
    /**
     * Create a transaction from a `txData` object
     *
     * @param txData - The transaction data. The `type` field will determine which transaction type is returned (if undefined, creates a legacy transaction)
     * @param txOptions - Options to pass on to the constructor of the transaction
     */
    static fromTxData(txData, txOptions = {}) {
        var _a;
        const common = (_a = txOptions.common) !== null && _a !== void 0 ? _a : DEFAULT_COMMON;
        if (!('type' in txData) || txData.type === undefined) {
            // Assume legacy transaction
            return legacyTransaction_1.default.fromTxData(txData, txOptions);
        }
        else {
            const txType = new sbr_util_1.BN(sbr_util_1.toBuffer(txData.type)).toNumber();
            return TransactionFactory.getTransactionClass(txType, common).fromTxData(txData, txOptions);
        }
    }
    /**
     * This method tries to decode serialized data.
     *
     * @param data - The data Buffer
     * @param txOptions - The transaction options
     */
    static fromSerializedData(data, txOptions = {}) {
        var _a;
        const common = (_a = txOptions.common) !== null && _a !== void 0 ? _a : DEFAULT_COMMON;
        if (data[0] <= 0x7f) {
            // It is an EIP-2718 Typed Transaction
            if (!common.isActivatedEIP(2718)) {
                throw new Error('Common support for TypedTransactions (EIP-2718) not activated');
            }
            // Determine the type.
            let EIP;
            switch (data[0]) {
                case 1:
                    EIP = 2930;
                    break;
                default:
                    throw new Error(`TypedTransaction with ID ${data[0]} unknown`);
            }
            if (!common.isActivatedEIP(EIP)) {
                throw new Error(`Cannot create TypedTransaction with ID ${data[0]}: EIP ${EIP} not activated`);
            }
            return eip2930Transaction_1.default.fromSerializedTx(data, txOptions);
        }
        else {
            return legacyTransaction_1.default.fromSerializedTx(data, txOptions);
        }
    }
    /**
     * When decoding a BlockBody, in the transactions field, a field is either:
     * A Buffer (a TypedTransaction - encoded as TransactionType || rlp(TransactionPayload))
     * A Buffer[] (Legacy Transaction)
     * This method returns the right transaction.
     *
     * @param data - A Buffer or Buffer[]
     * @param txOptions - The transaction options
     */
    static fromBlockBodyData(data, txOptions = {}) {
        if (Buffer.isBuffer(data)) {
            return this.fromSerializedData(data, txOptions);
        }
        else if (Array.isArray(data)) {
            // It is a legacy transaction
            return legacyTransaction_1.default.fromValuesArray(data, txOptions);
        }
        else {
            throw new Error('Cannot decode transaction: unknown type input');
        }
    }
    /**
     * This helper method allows one to retrieve the class which matches the transactionID
     * If transactionID is undefined, returns the legacy transaction class.
     *
     * @param transactionID
     * @param common
     */
    static getTransactionClass(transactionID = 0, common) {
        const usedCommon = common !== null && common !== void 0 ? common : DEFAULT_COMMON;
        if (transactionID !== 0) {
            if (!usedCommon.isActivatedEIP(2718)) {
                throw new Error('Common support for TypedTransactions (EIP-2718) not activated');
            }
        }
        const legacyTxn = transactionID == 0 || (transactionID >= 0x80 && transactionID <= 0xff);
        if (legacyTxn) {
            return legacyTransaction_1.default;
        }
        switch (transactionID) {
            case 1:
                return eip2930Transaction_1.default;
            default:
                throw new Error(`TypedTransaction with ID ${transactionID} unknown`);
        }
    }
}
exports.default = TransactionFactory;
//# sourceMappingURL=transactionFactory.js.map