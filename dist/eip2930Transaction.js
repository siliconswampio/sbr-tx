"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sbr_util_1 = require("sbr-util");
const baseTransaction_1 = require("./baseTransaction");
const types_1 = require("./types");
const emptyAccessList = [];
/**
 * Typed transaction with optional access lists
 *
 * - TransactionType: 1
 * - EIP: [EIP-2930](https://eips.ethereum.org/EIPS/eip-2930)
 */
class AccessListEIP2930Transaction extends baseTransaction_1.BaseTransaction {
    /**
     * This constructor takes the values, validates them, assigns them and freezes the object.
     *
     * It is not recommended to use this constructor directly. Instead use
     * the static factory methods to assist in creating a Transaction object from
     * varying data types.
     */
    constructor(txData, opts = {}) {
        var _a, _b;
        const { chainId, accessList } = txData;
        super(Object.assign(Object.assign({}, txData), { type: 1 }), opts);
        // EIP-2718 check is done in Common
        if (!this.common.isActivatedEIP(2930)) {
            throw new Error('EIP-2930 not enabled on Common');
        }
        // check the type of AccessList. If it's a JSON-type, we have to convert it to a Buffer.
        let usedAccessList;
        if (accessList && types_1.isAccessList(accessList)) {
            this.AccessListJSON = accessList;
            const newAccessList = [];
            for (let i = 0; i < accessList.length; i++) {
                const item = accessList[i];
                const addressBuffer = sbr_util_1.toBuffer(item.address);
                const storageItems = [];
                for (let index = 0; index < item.storageKeys.length; index++) {
                    storageItems.push(sbr_util_1.toBuffer(item.storageKeys[index]));
                }
                newAccessList.push([addressBuffer, storageItems]);
            }
            usedAccessList = newAccessList;
        }
        else {
            usedAccessList = accessList !== null && accessList !== void 0 ? accessList : [];
            // build the JSON
            const json = [];
            for (let i = 0; i < usedAccessList.length; i++) {
                const data = usedAccessList[i];
                const address = sbr_util_1.bufferToHex(data[0]);
                const storageKeys = [];
                for (let item = 0; item < data[1].length; item++) {
                    storageKeys.push(sbr_util_1.bufferToHex(data[1][item]));
                }
                const jsonItem = {
                    address,
                    storageKeys,
                };
                json.push(jsonItem);
            }
            this.AccessListJSON = json;
        }
        this.chainId = chainId ? new sbr_util_1.BN(sbr_util_1.toBuffer(chainId)) : this.common.chainIdBN();
        this.accessList = usedAccessList;
        if (!this.chainId.eq(this.common.chainIdBN())) {
            throw new Error('The chain ID does not match the chain ID of Common');
        }
        if (this.v && !this.v.eqn(0) && !this.v.eqn(1)) {
            throw new Error('The y-parity of the transaction should either be 0 or 1');
        }
        if (this.common.gteHardfork('homestead') && ((_a = this.s) === null || _a === void 0 ? void 0 : _a.gt(types_1.N_DIV_2))) {
            throw new Error('Invalid Signature: s-values greater than secp256k1n/2 are considered invalid');
        }
        // Verify the access list format.
        for (let key = 0; key < this.accessList.length; key++) {
            const accessListItem = this.accessList[key];
            const address = accessListItem[0];
            const storageSlots = accessListItem[1];
            if (accessListItem[2] !== undefined) {
                throw new Error('Access list item cannot have 3 elements. It can only have an address, and an array of storage slots.');
            }
            if (address.length != 20) {
                throw new Error('Invalid EIP-2930 transaction: address length should be 20 bytes');
            }
            for (let storageSlot = 0; storageSlot < storageSlots.length; storageSlot++) {
                if (storageSlots[storageSlot].length != 32) {
                    throw new Error('Invalid EIP-2930 transaction: storage slot length should be 32 bytes');
                }
            }
        }
        const freeze = (_b = opts === null || opts === void 0 ? void 0 : opts.freeze) !== null && _b !== void 0 ? _b : true;
        if (freeze) {
            Object.freeze(this);
        }
    }
    /**
     * EIP-2930 alias for `r`
     */
    get senderR() {
        return this.r;
    }
    /**
     * EIP-2930 alias for `s`
     */
    get senderS() {
        return this.s;
    }
    /**
     * EIP-2930 alias for `v`
     */
    get yParity() {
        return this.v;
    }
    /**
     * Instantiate a transaction from a data dictionary
     */
    static fromTxData(txData, opts = {}) {
        return new AccessListEIP2930Transaction(txData, opts);
    }
    /**
     * Instantiate a transaction from the serialized tx.
     *
     * Note: this means that the Buffer should start with 0x01.
     */
    static fromSerializedTx(serialized, opts = {}) {
        if (serialized[0] !== 1) {
            throw new Error(`Invalid serialized tx input: not an EIP-2930 transaction (wrong tx type, expected: 1, received: ${serialized[0]}`);
        }
        const values = sbr_util_1.rlp.decode(serialized.slice(1));
        if (!Array.isArray(values)) {
            throw new Error('Invalid serialized tx input: must be array');
        }
        return AccessListEIP2930Transaction.fromValuesArray(values, opts);
    }
    /**
     * Instantiate a transaction from the serialized tx.
     * (alias of `fromSerializedTx()`)
     *
     * Note: This means that the Buffer should start with 0x01.
     *
     * @deprecated this constructor alias is deprecated and will be removed
     * in favor of the `fromSerializedTx()` constructor
     */
    static fromRlpSerializedTx(serialized, opts = {}) {
        return AccessListEIP2930Transaction.fromSerializedTx(serialized, opts);
    }
    /**
     * Create a transaction from a values array.
     *
     * The format is:
     * chainId, nonce, gasPrice, gasLimit, to, value, data, access_list, yParity (v), senderR (r), senderS (s)
     */
    static fromValuesArray(values, opts = {}) {
        if (values.length !== 8 && values.length !== 11) {
            throw new Error('Invalid EIP-2930 transaction. Only expecting 8 values (for unsigned tx) or 11 values (for signed tx).');
        }
        const [chainId, nonce, gasPrice, gasLimit, to, value, data, accessList, v, r, s] = values;
        return new AccessListEIP2930Transaction({
            chainId: new sbr_util_1.BN(chainId),
            nonce,
            gasPrice,
            gasLimit,
            to,
            value,
            data,
            accessList: accessList !== null && accessList !== void 0 ? accessList : emptyAccessList,
            v: v !== undefined ? new sbr_util_1.BN(v) : undefined,
            r,
            s,
        }, opts);
    }
    /**
     * The amount of gas paid for the data in this tx
     */
    getDataFee() {
        const cost = super.getDataFee();
        const accessListStorageKeyCost = this.common.param('gasPrices', 'accessListStorageKeyCost');
        const accessListAddressCost = this.common.param('gasPrices', 'accessListAddressCost');
        let slots = 0;
        for (let index = 0; index < this.accessList.length; index++) {
            const item = this.accessList[index];
            const storageSlots = item[1];
            slots += storageSlots.length;
        }
        const addresses = this.accessList.length;
        cost.iaddn(addresses * accessListAddressCost + slots * accessListStorageKeyCost);
        return cost;
    }
    /**
     * Returns a Buffer Array of the raw Buffers of this transaction, in order.
     *
     * Use `serialize()` to add to block data for `Block.fromValuesArray()`.
     */
    raw() {
        return [
            sbr_util_1.bnToRlp(this.chainId),
            sbr_util_1.bnToRlp(this.nonce),
            sbr_util_1.bnToRlp(this.gasPrice),
            sbr_util_1.bnToRlp(this.gasLimit),
            this.to !== undefined ? this.to.buf : Buffer.from([]),
            sbr_util_1.bnToRlp(this.value),
            this.data,
            this.accessList,
            this.v !== undefined ? sbr_util_1.bnToRlp(this.v) : Buffer.from([]),
            this.r !== undefined ? sbr_util_1.bnToRlp(this.r) : Buffer.from([]),
            this.s !== undefined ? sbr_util_1.bnToRlp(this.s) : Buffer.from([]),
        ];
    }
    /**
     * Returns the serialized encoding of the transaction.
     */
    serialize() {
        const base = this.raw();
        return Buffer.concat([Buffer.from('01', 'hex'), sbr_util_1.rlp.encode(base)]);
    }
    /**
     * Computes a sha3-256 hash of the serialized unsigned tx, which is used to sign the transaction.
     */
    getMessageToSign() {
        const base = this.raw().slice(0, 8);
        return sbr_util_1.keccak256(Buffer.concat([Buffer.from('01', 'hex'), sbr_util_1.rlp.encode(base)]));
    }
    /**
     * Computes a sha3-256 hash of the serialized tx
     */
    hash() {
        if (!this.isSigned()) {
            throw new Error('Cannot call hash method if transaction is not signed');
        }
        return sbr_util_1.keccak256(this.serialize());
    }
    /**
     * Computes a sha3-256 hash which can be used to verify the signature
     */
    getMessageToVerifySignature() {
        return this.getMessageToSign();
    }
    /**
     * Returns the public key of the sender
     */
    getSenderPublicKey() {
        var _a;
        if (!this.isSigned()) {
            throw new Error('Cannot call this method if transaction is not signed');
        }
        const msgHash = this.getMessageToVerifySignature();
        // All transaction signatures whose s-value is greater than secp256k1n/2 are considered invalid.
        // TODO: verify if this is the case for EIP-2930
        if (this.common.gteHardfork('homestead') && ((_a = this.s) === null || _a === void 0 ? void 0 : _a.gt(types_1.N_DIV_2))) {
            throw new Error('Invalid Signature: s-values greater than secp256k1n/2 are considered invalid');
        }
        const { yParity, r, s } = this;
        if (yParity === undefined || !r || !s) {
            throw new Error('Missing values to derive sender public key from signed tx');
        }
        try {
            return sbr_util_1.ecrecover(msgHash, yParity.addn(27), // Recover the 27 which was stripped from ecsign
            sbr_util_1.bnToRlp(r), sbr_util_1.bnToRlp(s));
        }
        catch (e) {
            throw new Error('Invalid Signature');
        }
    }
    _processSignature(v, r, s) {
        const opts = {
            common: this.common,
        };
        return AccessListEIP2930Transaction.fromTxData({
            chainId: this.chainId,
            nonce: this.nonce,
            gasPrice: this.gasPrice,
            gasLimit: this.gasLimit,
            to: this.to,
            value: this.value,
            data: this.data,
            accessList: this.accessList,
            v: new sbr_util_1.BN(v - 27),
            r: new sbr_util_1.BN(r),
            s: new sbr_util_1.BN(s),
        }, opts);
    }
    /**
     * Returns an object with the JSON representation of the transaction
     */
    toJSON() {
        const accessListJSON = [];
        for (let index = 0; index < this.accessList.length; index++) {
            const item = this.accessList[index];
            const JSONItem = {
                address: '0x' + sbr_util_1.setLengthLeft(item[0], 20).toString('hex'),
                storageKeys: [],
            };
            const storageSlots = item[1];
            for (let slot = 0; slot < storageSlots.length; slot++) {
                const storageSlot = storageSlots[slot];
                JSONItem.storageKeys.push('0x' + sbr_util_1.setLengthLeft(storageSlot, 32).toString('hex'));
            }
            accessListJSON.push(JSONItem);
        }
        return {
            chainId: sbr_util_1.bnToHex(this.chainId),
            nonce: sbr_util_1.bnToHex(this.nonce),
            gasPrice: sbr_util_1.bnToHex(this.gasPrice),
            gasLimit: sbr_util_1.bnToHex(this.gasLimit),
            to: this.to !== undefined ? this.to.toString() : undefined,
            value: sbr_util_1.bnToHex(this.value),
            data: '0x' + this.data.toString('hex'),
            accessList: accessListJSON,
        };
    }
}
exports.default = AccessListEIP2930Transaction;
//# sourceMappingURL=eip2930Transaction.js.map