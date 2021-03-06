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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var baseTransaction_1 = require("./baseTransaction");
var types_1 = require("./types");
var emptyAccessList = [];
/**
 * Typed transaction with optional access lists
 *
 * - TransactionType: 1
 * - EIP: [EIP-2930](https://eips.ethereum.org/EIPS/eip-2930)
 */
var AccessListEIP2930Transaction = /** @class */ (function (_super) {
    __extends(AccessListEIP2930Transaction, _super);
    /**
     * This constructor takes the values, validates them, assigns them and freezes the object.
     *
     * It is not recommended to use this constructor directly. Instead use
     * the static factory methods to assist in creating a Transaction object from
     * varying data types.
     */
    function AccessListEIP2930Transaction(txData, opts) {
        if (opts === void 0) { opts = {}; }
        var _a, _b;
        var _this = this;
        var chainId = txData.chainId, accessList = txData.accessList;
        _this = _super.call(this, __assign(__assign({}, txData), { type: 1 }), opts) || this;
        // EIP-2718 check is done in Common
        if (!_this.common.isActivatedEIP(2930)) {
            throw new Error('EIP-2930 not enabled on Common');
        }
        // check the type of AccessList. If it's a JSON-type, we have to convert it to a Buffer.
        var usedAccessList;
        if (accessList && types_1.isAccessList(accessList)) {
            _this.AccessListJSON = accessList;
            var newAccessList = [];
            for (var i = 0; i < accessList.length; i++) {
                var item = accessList[i];
                var addressBuffer = sbr_util_1.toBuffer(item.address);
                var storageItems = [];
                for (var index = 0; index < item.storageKeys.length; index++) {
                    storageItems.push(sbr_util_1.toBuffer(item.storageKeys[index]));
                }
                newAccessList.push([addressBuffer, storageItems]);
            }
            usedAccessList = newAccessList;
        }
        else {
            usedAccessList = accessList !== null && accessList !== void 0 ? accessList : [];
            // build the JSON
            var json = [];
            for (var i = 0; i < usedAccessList.length; i++) {
                var data = usedAccessList[i];
                var address = sbr_util_1.bufferToHex(data[0]);
                var storageKeys = [];
                for (var item = 0; item < data[1].length; item++) {
                    storageKeys.push(sbr_util_1.bufferToHex(data[1][item]));
                }
                var jsonItem = {
                    address: address,
                    storageKeys: storageKeys,
                };
                json.push(jsonItem);
            }
            _this.AccessListJSON = json;
        }
        _this.chainId = chainId ? new sbr_util_1.BN(sbr_util_1.toBuffer(chainId)) : _this.common.chainIdBN();
        _this.accessList = usedAccessList;
        if (!_this.chainId.eq(_this.common.chainIdBN())) {
            throw new Error('The chain ID does not match the chain ID of Common');
        }
        if (_this.v && !_this.v.eqn(0) && !_this.v.eqn(1)) {
            throw new Error('The y-parity of the transaction should either be 0 or 1');
        }
        if (_this.common.gteHardfork('homestead') && ((_a = _this.s) === null || _a === void 0 ? void 0 : _a.gt(types_1.N_DIV_2))) {
            throw new Error('Invalid Signature: s-values greater than secp256k1n/2 are considered invalid');
        }
        // Verify the access list format.
        for (var key = 0; key < _this.accessList.length; key++) {
            var accessListItem = _this.accessList[key];
            var address = accessListItem[0];
            var storageSlots = accessListItem[1];
            if (accessListItem[2] !== undefined) {
                throw new Error('Access list item cannot have 3 elements. It can only have an address, and an array of storage slots.');
            }
            if (address.length != 20) {
                throw new Error('Invalid EIP-2930 transaction: address length should be 20 bytes');
            }
            for (var storageSlot = 0; storageSlot < storageSlots.length; storageSlot++) {
                if (storageSlots[storageSlot].length != 32) {
                    throw new Error('Invalid EIP-2930 transaction: storage slot length should be 32 bytes');
                }
            }
        }
        var freeze = (_b = opts === null || opts === void 0 ? void 0 : opts.freeze) !== null && _b !== void 0 ? _b : true;
        if (freeze) {
            Object.freeze(_this);
        }
        return _this;
    }
    Object.defineProperty(AccessListEIP2930Transaction.prototype, "senderR", {
        /**
         * EIP-2930 alias for `r`
         */
        get: function () {
            return this.r;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AccessListEIP2930Transaction.prototype, "senderS", {
        /**
         * EIP-2930 alias for `s`
         */
        get: function () {
            return this.s;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AccessListEIP2930Transaction.prototype, "yParity", {
        /**
         * EIP-2930 alias for `v`
         */
        get: function () {
            return this.v;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Instantiate a transaction from a data dictionary
     */
    AccessListEIP2930Transaction.fromTxData = function (txData, opts) {
        if (opts === void 0) { opts = {}; }
        return new AccessListEIP2930Transaction(txData, opts);
    };
    /**
     * Instantiate a transaction from the serialized tx.
     *
     * Note: this means that the Buffer should start with 0x01.
     */
    AccessListEIP2930Transaction.fromSerializedTx = function (serialized, opts) {
        if (opts === void 0) { opts = {}; }
        if (serialized[0] !== 1) {
            throw new Error("Invalid serialized tx input: not an EIP-2930 transaction (wrong tx type, expected: 1, received: " + serialized[0]);
        }
        var values = sbr_util_1.rlp.decode(serialized.slice(1));
        if (!Array.isArray(values)) {
            throw new Error('Invalid serialized tx input: must be array');
        }
        return AccessListEIP2930Transaction.fromValuesArray(values, opts);
    };
    /**
     * Instantiate a transaction from the serialized tx.
     * (alias of `fromSerializedTx()`)
     *
     * Note: This means that the Buffer should start with 0x01.
     *
     * @deprecated this constructor alias is deprecated and will be removed
     * in favor of the `fromSerializedTx()` constructor
     */
    AccessListEIP2930Transaction.fromRlpSerializedTx = function (serialized, opts) {
        if (opts === void 0) { opts = {}; }
        return AccessListEIP2930Transaction.fromSerializedTx(serialized, opts);
    };
    /**
     * Create a transaction from a values array.
     *
     * The format is:
     * chainId, nonce, gasPrice, gasLimit, to, value, data, access_list, yParity (v), senderR (r), senderS (s)
     */
    AccessListEIP2930Transaction.fromValuesArray = function (values, opts) {
        if (opts === void 0) { opts = {}; }
        if (values.length !== 8 && values.length !== 11) {
            throw new Error('Invalid EIP-2930 transaction. Only expecting 8 values (for unsigned tx) or 11 values (for signed tx).');
        }
        var _a = __read(values, 11), chainId = _a[0], nonce = _a[1], gasPrice = _a[2], gasLimit = _a[3], to = _a[4], value = _a[5], data = _a[6], accessList = _a[7], v = _a[8], r = _a[9], s = _a[10];
        return new AccessListEIP2930Transaction({
            chainId: new sbr_util_1.BN(chainId),
            nonce: nonce,
            gasPrice: gasPrice,
            gasLimit: gasLimit,
            to: to,
            value: value,
            data: data,
            accessList: accessList !== null && accessList !== void 0 ? accessList : emptyAccessList,
            v: v !== undefined ? new sbr_util_1.BN(v) : undefined,
            r: r,
            s: s,
        }, opts);
    };
    /**
     * The amount of gas paid for the data in this tx
     */
    AccessListEIP2930Transaction.prototype.getDataFee = function () {
        var cost = _super.prototype.getDataFee.call(this);
        var accessListStorageKeyCost = this.common.param('gasPrices', 'accessListStorageKeyCost');
        var accessListAddressCost = this.common.param('gasPrices', 'accessListAddressCost');
        var slots = 0;
        for (var index = 0; index < this.accessList.length; index++) {
            var item = this.accessList[index];
            var storageSlots = item[1];
            slots += storageSlots.length;
        }
        var addresses = this.accessList.length;
        cost.iaddn(addresses * accessListAddressCost + slots * accessListStorageKeyCost);
        return cost;
    };
    /**
     * Returns a Buffer Array of the raw Buffers of this transaction, in order.
     *
     * Use `serialize()` to add to block data for `Block.fromValuesArray()`.
     */
    AccessListEIP2930Transaction.prototype.raw = function () {
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
    };
    /**
     * Returns the serialized encoding of the transaction.
     */
    AccessListEIP2930Transaction.prototype.serialize = function () {
        var base = this.raw();
        return Buffer.concat([Buffer.from('01', 'hex'), sbr_util_1.rlp.encode(base)]);
    };
    /**
     * Computes a sha3-256 hash of the serialized unsigned tx, which is used to sign the transaction.
     */
    AccessListEIP2930Transaction.prototype.getMessageToSign = function () {
        var base = this.raw().slice(0, 8);
        return sbr_util_1.keccak256(Buffer.concat([Buffer.from('01', 'hex'), sbr_util_1.rlp.encode(base)]));
    };
    /**
     * Computes a sha3-256 hash of the serialized tx
     */
    AccessListEIP2930Transaction.prototype.hash = function () {
        if (!this.isSigned()) {
            throw new Error('Cannot call hash method if transaction is not signed');
        }
        return sbr_util_1.keccak256(this.serialize());
    };
    /**
     * Computes a sha3-256 hash which can be used to verify the signature
     */
    AccessListEIP2930Transaction.prototype.getMessageToVerifySignature = function () {
        return this.getMessageToSign();
    };
    /**
     * Returns the public key of the sender
     */
    AccessListEIP2930Transaction.prototype.getSenderPublicKey = function () {
        var _a;
        if (!this.isSigned()) {
            throw new Error('Cannot call this method if transaction is not signed');
        }
        var msgHash = this.getMessageToVerifySignature();
        // All transaction signatures whose s-value is greater than secp256k1n/2 are considered invalid.
        // TODO: verify if this is the case for EIP-2930
        if (this.common.gteHardfork('homestead') && ((_a = this.s) === null || _a === void 0 ? void 0 : _a.gt(types_1.N_DIV_2))) {
            throw new Error('Invalid Signature: s-values greater than secp256k1n/2 are considered invalid');
        }
        var _b = this, yParity = _b.yParity, r = _b.r, s = _b.s;
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
    };
    AccessListEIP2930Transaction.prototype._processSignature = function (v, r, s) {
        var opts = {
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
    };
    /**
     * Returns an object with the JSON representation of the transaction
     */
    AccessListEIP2930Transaction.prototype.toJSON = function () {
        var accessListJSON = [];
        for (var index = 0; index < this.accessList.length; index++) {
            var item = this.accessList[index];
            var JSONItem = {
                address: '0x' + sbr_util_1.setLengthLeft(item[0], 20).toString('hex'),
                storageKeys: [],
            };
            var storageSlots = item[1];
            for (var slot = 0; slot < storageSlots.length; slot++) {
                var storageSlot = storageSlots[slot];
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
    };
    return AccessListEIP2930Transaction;
}(baseTransaction_1.BaseTransaction));
exports.default = AccessListEIP2930Transaction;
//# sourceMappingURL=eip2930Transaction.js.map