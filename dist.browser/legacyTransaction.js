"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var sbr_util_1 = require("sbr-util");
var types_1 = require("./types");
var baseTransaction_1 = require("./baseTransaction");
/**
 * An Ethereum non-typed (legacy) transaction
 */
var Transaction = /** @class */ (function (_super) {
    __extends(Transaction, _super);
    /**
     * This constructor takes the values, validates them, assigns them and freezes the object.
     *
     * It is not recommended to use this constructor directly. Instead use
     * the static factory methods to assist in creating a Transaction object from
     * varying data types.
     */
    function Transaction(txData, opts) {
        if (opts === void 0) { opts = {}; }
        var _a;
        var _this = _super.call(this, txData, opts) || this;
        _this._validateCannotExceedMaxInteger({ r: _this.r, s: _this.s });
        _this._validateTxV(_this.v);
        var freeze = (_a = opts === null || opts === void 0 ? void 0 : opts.freeze) !== null && _a !== void 0 ? _a : true;
        if (freeze) {
            Object.freeze(_this);
        }
        return _this;
    }
    /**
     * Instantiate a transaction from a data dictionary
     */
    Transaction.fromTxData = function (txData, opts) {
        if (opts === void 0) { opts = {}; }
        return new Transaction(txData, opts);
    };
    /**
     * Instantiate a transaction from the serialized tx.
     */
    Transaction.fromSerializedTx = function (serialized, opts) {
        if (opts === void 0) { opts = {}; }
        var values = sbr_util_1.rlp.decode(serialized);
        if (!Array.isArray(values)) {
            throw new Error('Invalid serialized tx input. Must be array');
        }
        return this.fromValuesArray(values, opts);
    };
    /**
     * Instantiate a transaction from the serialized tx.
     * (alias of `fromSerializedTx()`)
     *
     * @deprecated this constructor alias is deprecated and will be removed
     * in favor of the `fromSerializedTx()` constructor
     */
    Transaction.fromRlpSerializedTx = function (serialized, opts) {
        if (opts === void 0) { opts = {}; }
        return Transaction.fromSerializedTx(serialized, opts);
    };
    /**
     * Create a transaction from a values array.
     *
     * The format is:
     * nonce, gasPrice, gasLimit, to, value, data, v, r, s
     */
    Transaction.fromValuesArray = function (values, opts) {
        if (opts === void 0) { opts = {}; }
        // If length is not 6, it has length 9. If v/r/s are empty Buffers, it is still an unsigned transaction
        // This happens if you get the RLP data from `raw()`
        if (values.length !== 6 && values.length !== 9) {
            throw new Error('Invalid transaction. Only expecting 6 values (for unsigned tx) or 9 values (for signed tx).');
        }
        var _a = __read(values, 9), nonce = _a[0], gasPrice = _a[1], gasLimit = _a[2], to = _a[3], value = _a[4], data = _a[5], v = _a[6], r = _a[7], s = _a[8];
        return new Transaction({
            nonce: nonce,
            gasPrice: gasPrice,
            gasLimit: gasLimit,
            to: to,
            value: value,
            data: data,
            v: v,
            r: r,
            s: s,
        }, opts);
    };
    /**
     * Returns a Buffer Array of the raw Buffers of this transaction, in order.
     */
    Transaction.prototype.raw = function () {
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
    };
    /**
     * Returns the rlp encoding of the transaction.
     */
    Transaction.prototype.serialize = function () {
        return sbr_util_1.rlp.encode(this.raw());
    };
    Transaction.prototype._unsignedTxImplementsEIP155 = function () {
        return this.common.gteHardfork('spuriousDragon');
    };
    Transaction.prototype._getMessageToSign = function (withEIP155) {
        var values = [
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
    };
    /**
     * Computes a sha3-256 hash of the serialized unsigned tx, which is used to sign the transaction.
     */
    Transaction.prototype.getMessageToSign = function () {
        return this._getMessageToSign(this._unsignedTxImplementsEIP155());
    };
    /**
     * Computes a sha3-256 hash of the serialized tx
     */
    Transaction.prototype.hash = function () {
        return sbr_util_1.rlphash(this.raw());
    };
    /**
     * Computes a sha3-256 hash which can be used to verify the signature
     */
    Transaction.prototype.getMessageToVerifySignature = function () {
        var withEIP155 = this._signedTxImplementsEIP155();
        return this._getMessageToSign(withEIP155);
    };
    /**
     * Returns the public key of the sender
     */
    Transaction.prototype.getSenderPublicKey = function () {
        var _a;
        var msgHash = this.getMessageToVerifySignature();
        // All transaction signatures whose s-value is greater than secp256k1n/2 are considered invalid.
        if (this.common.gteHardfork('homestead') && ((_a = this.s) === null || _a === void 0 ? void 0 : _a.gt(types_1.N_DIV_2))) {
            throw new Error('Invalid Signature: s-values greater than secp256k1n/2 are considered invalid');
        }
        var _b = this, v = _b.v, r = _b.r, s = _b.s;
        if (!v || !r || !s) {
            throw new Error('Missing values to derive sender public key from signed tx');
        }
        try {
            return sbr_util_1.ecrecover(msgHash, v, sbr_util_1.bnToRlp(r), sbr_util_1.bnToRlp(s), this._signedTxImplementsEIP155() ? this.common.chainIdBN() : undefined);
        }
        catch (e) {
            throw new Error('Invalid Signature');
        }
    };
    /**
     * Process the v, r, s values from the `sign` method of the base transaction.
     */
    Transaction.prototype._processSignature = function (v, r, s) {
        var vBN = new sbr_util_1.BN(v);
        if (this._unsignedTxImplementsEIP155()) {
            vBN.iadd(this.common.chainIdBN().muln(2).addn(8));
        }
        var opts = {
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
    };
    /**
     * Returns an object with the JSON representation of the transaction
     */
    Transaction.prototype.toJSON = function () {
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
    };
    /**
     * Validates tx's `v` value
     */
    Transaction.prototype._validateTxV = function (v) {
        if (v === undefined || v.eqn(0)) {
            return;
        }
        if (!this.common.gteHardfork('spuriousDragon')) {
            return;
        }
        if (v.eqn(27) || v.eqn(28)) {
            return;
        }
        var chainIdDoubled = this.common.chainIdBN().muln(2);
        var isValidEIP155V = v.eq(chainIdDoubled.addn(35)) || v.eq(chainIdDoubled.addn(36));
        if (!isValidEIP155V) {
            throw new Error("Incompatible EIP155-based V " + v.toString() + " and chain id " + this.common
                .chainIdBN()
                .toString() + ". See the Common parameter of the Transaction constructor to set the chain id.");
        }
    };
    Transaction.prototype._signedTxImplementsEIP155 = function () {
        if (!this.isSigned()) {
            throw Error('This transaction is not signed');
        }
        var onEIP155BlockOrLater = this.common.gteHardfork('spuriousDragon');
        // EIP155 spec:
        // If block.number >= 2,675,000 and v = CHAIN_ID * 2 + 35 or v = CHAIN_ID * 2 + 36, then when computing the hash of a transaction for purposes of signing or recovering, instead of hashing only the first six elements (i.e. nonce, gasprice, startgas, to, value, data), hash nine elements, with v replaced by CHAIN_ID, r = 0 and s = 0.
        var v = this.v;
        var chainIdDoubled = this.common.chainIdBN().muln(2);
        var vAndChainIdMeetEIP155Conditions = v.eq(chainIdDoubled.addn(35)) || v.eq(chainIdDoubled.addn(36));
        return vAndChainIdMeetEIP155Conditions && onEIP155BlockOrLater;
    };
    return Transaction;
}(baseTransaction_1.BaseTransaction));
exports.default = Transaction;
//# sourceMappingURL=legacyTransaction.js.map