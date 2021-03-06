"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sbr_util_1 = require("sbr-util");
const types_1 = require("./types");
const baseTransaction_1 = require("./baseTransaction");
/**
 * An Ethereum non-typed (legacy) transaction
 */
class Transaction extends baseTransaction_1.BaseTransaction {
    /**
     * Instantiate a transaction from a data dictionary
     */
    static fromTxData(txData, opts = {}) {
        return new Transaction(txData, opts);
    }
    /**
     * Instantiate a transaction from the serialized tx.
     */
    static fromSerializedTx(serialized, opts = {}) {
        const values = sbr_util_1.rlp.decode(serialized);
        if (!Array.isArray(values)) {
            throw new Error('Invalid serialized tx input. Must be array');
        }
        return this.fromValuesArray(values, opts);
    }
    /**
     * Instantiate a transaction from the serialized tx.
     * (alias of `fromSerializedTx()`)
     *
     * @deprecated this constructor alias is deprecated and will be removed
     * in favor of the `fromSerializedTx()` constructor
     */
    static fromRlpSerializedTx(serialized, opts = {}) {
        return Transaction.fromSerializedTx(serialized, opts);
    }
    /**
     * Create a transaction from a values array.
     *
     * The format is:
     * nonce, gasPrice, gasLimit, to, value, data, v, r, s
     */
    static fromValuesArray(values, opts = {}) {
        // If length is not 6, it has length 9. If v/r/s are empty Buffers, it is still an unsigned transaction
        // This happens if you get the RLP data from `raw()`
        if (values.length !== 6 && values.length !== 9) {
            throw new Error('Invalid transaction. Only expecting 6 values (for unsigned tx) or 9 values (for signed tx).');
        }
        const [nonce, gasPrice, gasLimit, to, value, data, v, r, s] = values;
        return new Transaction({
            nonce,
            gasPrice,
            gasLimit,
            to,
            value,
            data,
            v,
            r,
            s,
        }, opts);
    }
    /**
     * This constructor takes the values, validates them, assigns them and freezes the object.
     *
     * It is not recommended to use this constructor directly. Instead use
     * the static factory methods to assist in creating a Transaction object from
     * varying data types.
     */
    constructor(txData, opts = {}) {
        var _a;
        super(txData, opts);
        this._validateCannotExceedMaxInteger({ r: this.r, s: this.s });
        this._validateTxV(this.v);
        const freeze = (_a = opts === null || opts === void 0 ? void 0 : opts.freeze) !== null && _a !== void 0 ? _a : true;
        if (freeze) {
            Object.freeze(this);
        }
    }
    /**
     * Returns a Buffer Array of the raw Buffers of this transaction, in order.
     */
    raw() {
        return [
            sbr_util_1.bnToRlp(this.nonce),
            sbr_util_1.bnToRlp(this.gasPrice),
            sbr_util_1.bnToRlp(this.gasLimit),
            this.to !== undefined ? this.to.buf : Buffer.from([]),
            sbr_util_1.bnToRlp(this.value),
            this.data,
            this.v !== undefined ? sbr_util_1.bnToRlp(this.v) : Buffer.from([]),
            this.r !== undefined ? sbr_util_1.bnToRlp(this.r) : Buffer.from([]),
            this.s !== undefined ? sbr_util_1.bnToRlp(this.s) : Buffer.from([]),
        ];
    }
    /**
     * Returns the rlp encoding of the transaction.
     */
    serialize() {
        return sbr_util_1.rlp.encode(this.raw());
    }
    _unsignedTxImplementsEIP155() {
        return this.common.gteHardfork('spuriousDragon');
    }
    _getMessageToSign(withEIP155) {
        const values = [
            sbr_util_1.bnToRlp(this.nonce),
            sbr_util_1.bnToRlp(this.gasPrice),
            sbr_util_1.bnToRlp(this.gasLimit),
            this.to !== undefined ? this.to.buf : Buffer.from([]),
            sbr_util_1.bnToRlp(this.value),
            this.data,
        ];
        if (withEIP155) {
            values.push(sbr_util_1.toBuffer(this.common.chainIdBN()));
            values.push(sbr_util_1.unpadBuffer(sbr_util_1.toBuffer(0)));
            values.push(sbr_util_1.unpadBuffer(sbr_util_1.toBuffer(0)));
        }
        return sbr_util_1.rlphash(values);
    }
    /**
     * Computes a sha3-256 hash of the serialized unsigned tx, which is used to sign the transaction.
     */
    getMessageToSign() {
        return this._getMessageToSign(this._unsignedTxImplementsEIP155());
    }
    /**
     * Computes a sha3-256 hash of the serialized tx
     */
    hash() {
        return sbr_util_1.rlphash(this.raw());
    }
    /**
     * Computes a sha3-256 hash which can be used to verify the signature
     */
    getMessageToVerifySignature() {
        const withEIP155 = this._signedTxImplementsEIP155();
        return this._getMessageToSign(withEIP155);
    }
    /**
     * Returns the public key of the sender
     */
    getSenderPublicKey() {
        var _a;
        const msgHash = this.getMessageToVerifySignature();
        // All transaction signatures whose s-value is greater than secp256k1n/2 are considered invalid.
        if (this.common.gteHardfork('homestead') && ((_a = this.s) === null || _a === void 0 ? void 0 : _a.gt(types_1.N_DIV_2))) {
            throw new Error('Invalid Signature: s-values greater than secp256k1n/2 are considered invalid');
        }
        const { v, r, s } = this;
        if (!v || !r || !s) {
            throw new Error('Missing values to derive sender public key from signed tx');
        }
        try {
            return sbr_util_1.ecrecover(msgHash, v, sbr_util_1.bnToRlp(r), sbr_util_1.bnToRlp(s), this._signedTxImplementsEIP155() ? this.common.chainIdBN() : undefined);
        }
        catch (e) {
            throw new Error('Invalid Signature');
        }
    }
    /**
     * Process the v, r, s values from the `sign` method of the base transaction.
     */
    _processSignature(v, r, s) {
        const vBN = new sbr_util_1.BN(v);
        if (this._unsignedTxImplementsEIP155()) {
            vBN.iadd(this.common.chainIdBN().muln(2).addn(8));
        }
        const opts = {
            common: this.common,
        };
        return Transaction.fromTxData({
            nonce: this.nonce,
            gasPrice: this.gasPrice,
            gasLimit: this.gasLimit,
            to: this.to,
            value: this.value,
            data: this.data,
            v: vBN,
            r: new sbr_util_1.BN(r),
            s: new sbr_util_1.BN(s),
        }, opts);
    }
    /**
     * Returns an object with the JSON representation of the transaction
     */
    toJSON() {
        return {
            nonce: sbr_util_1.bnToHex(this.nonce),
            gasPrice: sbr_util_1.bnToHex(this.gasPrice),
            gasLimit: sbr_util_1.bnToHex(this.gasLimit),
            to: this.to !== undefined ? this.to.toString() : undefined,
            value: sbr_util_1.bnToHex(this.value),
            data: '0x' + this.data.toString('hex'),
            v: this.v !== undefined ? sbr_util_1.bnToHex(this.v) : undefined,
            r: this.r !== undefined ? sbr_util_1.bnToHex(this.r) : undefined,
            s: this.s !== undefined ? sbr_util_1.bnToHex(this.s) : undefined,
        };
    }
    /**
     * Validates tx's `v` value
     */
    _validateTxV(v) {
        if (v === undefined || v.eqn(0)) {
            return;
        }
        if (!this.common.gteHardfork('spuriousDragon')) {
            return;
        }
        if (v.eqn(27) || v.eqn(28)) {
            return;
        }
        const chainIdDoubled = this.common.chainIdBN().muln(2);
        const isValidEIP155V = v.eq(chainIdDoubled.addn(35)) || v.eq(chainIdDoubled.addn(36));
        if (!isValidEIP155V) {
            throw new Error(`Incompatible EIP155-based V ${v.toString()} and chain id ${this.common
                .chainIdBN()
                .toString()}. See the Common parameter of the Transaction constructor to set the chain id.`);
        }
    }
    _signedTxImplementsEIP155() {
        if (!this.isSigned()) {
            throw Error('This transaction is not signed');
        }
        const onEIP155BlockOrLater = this.common.gteHardfork('spuriousDragon');
        // EIP155 spec:
        // If block.number >= 2,675,000 and v = CHAIN_ID * 2 + 35 or v = CHAIN_ID * 2 + 36, then when computing the hash of a transaction for purposes of signing or recovering, instead of hashing only the first six elements (i.e. nonce, gasprice, startgas, to, value, data), hash nine elements, with v replaced by CHAIN_ID, r = 0 and s = 0.
        const v = this.v;
        const chainIdDoubled = this.common.chainIdBN().muln(2);
        const vAndChainIdMeetEIP155Conditions = v.eq(chainIdDoubled.addn(35)) || v.eq(chainIdDoubled.addn(36));
        return vAndChainIdMeetEIP155Conditions && onEIP155BlockOrLater;
    }
}
exports.default = Transaction;
//# sourceMappingURL=legacyTransaction.js.map