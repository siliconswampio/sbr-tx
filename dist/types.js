"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.N_DIV_2 = exports.isAccessList = exports.isAccessListBuffer = void 0;
const sbr_util_1 = require("sbr-util");
function isAccessListBuffer(input) {
    if (input.length === 0) {
        return true;
    }
    const firstItem = input[0];
    if (Array.isArray(firstItem)) {
        return true;
    }
    return false;
}
exports.isAccessListBuffer = isAccessListBuffer;
function isAccessList(input) {
    return !isAccessListBuffer(input); // This is exactly the same method, except the output is negated.
}
exports.isAccessList = isAccessList;
/**
 * A const defining secp256k1n/2
 */
exports.N_DIV_2 = new sbr_util_1.BN('7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0', 16);
//# sourceMappingURL=types.js.map