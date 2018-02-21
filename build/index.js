"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
var SFGraphQL_1 = __importDefault(require("./SFGraphQL"));
__export(require("./SFGraphQL"));
// Some test code
if (process.env.SF_USER
    && process.env.SF_PASS
    && process.env.SF_URL
    && process.env.SF_ENV) {
    var sfg = new SFGraphQL_1.default(process.env.SF_USER, process.env.SF_PASS);
    var options = {
        loginUrl: process.env.SF_URL,
        instanceUrl: process.env.SF_ENV,
    };
    sfg.connect(options).then(console.log);
}
else {
    // tslint:disable-next-line:no-console
    console.log('ERROR, env vars not specified');
}
// const test = new ErrorTest();
// console.log(test.connect());
