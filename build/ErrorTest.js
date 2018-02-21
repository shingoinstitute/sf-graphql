"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var ErrorTest = /** @class */ (function () {
    function ErrorTest() {
    }
    ErrorTest.prototype.connect = function () {
        // tslint:disable-next-line:no-console
        console.log('IN connect');
        return this.makeSchema();
    };
    ErrorTest.prototype.makeSchema = function () {
        return __awaiter(this, void 0, void 0, function () {
            var promises;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // tslint:disable-next-line:no-console
                        console.log('IN makeSchema');
                        promises = [this.makeObjectType(Promise.resolve({ fields: ['c'] }))];
                        return [4 /*yield*/, Promise.all(promises)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ErrorTest.prototype.getReferenceType = function (field) {
        // tslint:disable-next-line:no-console
        console.log('IN getReferenceType');
        return this.getObjectType(field);
    };
    ErrorTest.prototype.getFieldType = function (field) {
        // tslint:disable-next-line:no-console
        console.log('IN getFieldType');
        return this.getReferenceType(field);
    };
    ErrorTest.prototype.makeScalarType = function (field) {
        return __awaiter(this, void 0, void 0, function () {
            var type;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // tslint:disable-next-line:no-console
                        console.log('IN makeScalarType');
                        return [4 /*yield*/, this.getFieldType(field)];
                    case 1:
                        type = _a.sent();
                        return [2 /*return*/, field + field];
                }
            });
        });
    };
    ErrorTest.prototype.makeObjectType = function (object) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var metadata, fieldsP, objFields;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // tslint:disable-next-line:no-console
                        console.log('IN makeObjectType');
                        return [4 /*yield*/, object];
                    case 1:
                        metadata = _a.sent();
                        fieldsP = metadata.fields.map(function (f) { return _this.makeScalarType(f); });
                        return [4 /*yield*/, Promise.all(fieldsP)];
                    case 2:
                        objFields = _a.sent();
                        return [2 /*return*/, objFields];
                }
            });
        });
    };
    ErrorTest.prototype.getObjectType = function (name) {
        // tslint:disable-next-line:no-console
        console.log('IN getObjectType');
        return this.makeObjectType(Promise.resolve({ fields: [name] }));
    };
    return ErrorTest;
}());
exports.ErrorTest = ErrorTest;
