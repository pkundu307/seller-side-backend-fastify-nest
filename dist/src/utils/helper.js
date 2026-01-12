"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidDate = void 0;
const isValidDate = (d) => {
    const date = new Date(d);
    return !isNaN(date.getTime());
};
exports.isValidDate = isValidDate;
//# sourceMappingURL=helper.js.map