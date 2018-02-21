"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
}
Object.defineProperty(exports, "__esModule", { value: true });
var graphql_1 = require("graphql");
var jsforce_1 = require("jsforce");
var sanctuary_1 = require("sanctuary");
var fs = __importStar(require("fs"));
var SFGraphQL = /** @class */ (function () {
    function SFGraphQL(username, password) {
        this.username = username;
        this.password = password;
        this.objectTypes = {};
        this.addressType = new graphql_1.GraphQLObjectType({
            name: 'Address',
            fields: function () { return ({
                Accuracy: {
                    type: graphql_1.GraphQLString,
                    description: 'Accuracy level of the geocode for the address',
                },
                City: {
                    type: graphql_1.GraphQLString,
                    description: 'The city detail for the address',
                },
                Country: {
                    type: graphql_1.GraphQLString,
                    description: 'The country detail for the address',
                },
            }); },
        });
        this.locationType = new graphql_1.GraphQLObjectType({
            name: 'Location',
            fields: function () { return ({
                latitude: {
                    type: graphql_1.GraphQLString,
                },
                longitude: {
                    type: graphql_1.GraphQLString,
                },
            }); },
        });
    }
    SFGraphQL.prototype.connect = function (opts) {
        var conn = new jsforce_1.Connection(opts || {});
        this.connection = conn;
        return this.makeSchema();
    };
    /**
     * Makes a GraphQL schema from the Salesforce instance
     */
    SFGraphQL.prototype.makeSchema = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var sponsor, event, global, promises, fields, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.connection.login(this.username, this.password)];
                    case 1:
                        _b.sent();
                        sponsor = JSON.parse(fs.readFileSync('./sponsors.json', { encoding: 'utf8' }));
                        event = JSON.parse(fs.readFileSync('./events.json', { encoding: 'utf8' }));
                        return [4 /*yield*/, this.connection.describeGlobal()];
                    case 2:
                        global = _b.sent();
                        promises = 
                        // tslint:disable-next-line:comment-format
                        /*
                        [Promise.resolve(sponsor), Promise.resolve(event)]
                        /*/
                        global.sobjects
                            .map(function (o) { return _this.connection.sobject(o.name).describe(); })
                            .map(function (o) { return _this.makeObjectType(o); });
                        _a = sanctuary_1.justs;
                        return [4 /*yield*/, Promise.all(promises)];
                    case 3:
                        fields = _a.apply(void 0, [_b.sent()])
                            .map(function (o) {
                            return (_a = {}, _a[o.name] = { type: o, description: o.description }, _a);
                            var _a;
                        })
                            .reduce(function (p, c) { return (__assign({}, p, c)); }, {});
                        return [2 /*return*/, new graphql_1.GraphQLSchema({
                                query: new graphql_1.GraphQLObjectType({
                                    name: 'Salesforce',
                                    fields: function () { return fields; },
                                }),
                            })];
                }
            });
        });
    };
    /**
     * Gets the GraphQL type of a Salesforce reference - resolves the type of the referenced records
     * @param field A Salesforce record field
     */
    SFGraphQL.prototype.getReferenceType = function (field) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var referencesP, refs, _a, newType;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(field.referenceTo && field.referenceTo.length)) return [3 /*break*/, 2];
                        // if a single reference, it can refer to just one type
                        if (field.referenceTo.length === 1
                            && field.referenceTo[0] !== null
                            && typeof field.referenceTo[0] !== 'undefined') {
                            return [2 /*return*/, this.getObjectType(field.referenceTo[0])];
                        }
                        referencesP = field.referenceTo
                            .filter(Boolean)
                            .map(function (f) { return _this.getObjectType(f); });
                        _a = sanctuary_1.justs;
                        return [4 /*yield*/, Promise.all(referencesP)];
                    case 1:
                        refs = _a.apply(void 0, [_b.sent()]);
                        newType = new graphql_1.GraphQLUnionType({
                            // build the name from the names of the sub types
                            name: refs.map(function (r) { return r.name; }).reduce(function (p, c) {
                                // make sure the name is in camel case
                                return c.substr(0, 1).toUpperCase() + c.substring(1)
                                    + p.substr(0, 1).toUpperCase() + p.substring(1);
                            }, 'Union'),
                            types: refs,
                        });
                        this.objectTypes[newType.name] = newType;
                        return [2 /*return*/, sanctuary_1.Just(newType)];
                    case 2: return [2 /*return*/, sanctuary_1.Nothing];
                }
            });
        });
    };
    /**
     * Converts between Salesforce and GraphQL types
     * @param field A Salesforce record field
     */
    SFGraphQL.prototype.getFieldType = function (field) {
        /* Salesforce scalar types:
        calculated: string
        combobox: string
        currency: double
        email: string
        encryptedstring: string
        id: string
        junctionIdList: string[]
        multipicklist: string - with options separated by semicolon (perhaps split at semicolon and return as string[])
        percent: double
        phone: string
        picklist:
        reference: string - Expand to object type
        textarea: string
        url: string
        PRIMITIVES
        base64: base64 string => String
        boolean => Boolean
        byte => String
        date => String
        dateTime => String
        double => Float
        int => Int
        time => String
        */
        switch (field.type) {
            case 'calculated': return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLString));
            case 'combobox': return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLString));
            case 'currency': return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLFloat));
            case 'email': return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLString));
            case 'encryptedstring': return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLString));
            case 'id': return Promise.resolve(sanctuary_1.Just(new graphql_1.GraphQLNonNull(graphql_1.GraphQLID)));
            case 'multipicklist': return Promise.resolve(sanctuary_1.Just(new graphql_1.GraphQLList(graphql_1.GraphQLString)));
            case 'percent': return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLFloat));
            case 'phone': return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLString));
            case 'textarea': return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLString));
            case 'url': return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLString));
            case 'base64': return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLString));
            case 'boolean': return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLBoolean));
            case 'byte': return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLString));
            case 'date': return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLString));
            case 'datetime': return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLString));
            case 'double': return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLFloat));
            case 'int': return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLInt));
            case 'time': return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLString));
            // this recursive call is causing issues - Salesforce may be closing the connection prematurely
            // we get an ECONNRESET error
            // However, this may be the most important part of the conversion - otherwise we don't get a graph
            // TODO: Figure out how to resolve this
            // case 'reference':       return this.getReferenceType(field);
            case 'address': return Promise.resolve(sanctuary_1.Just(this.addressType));
            case 'location': return Promise.resolve(sanctuary_1.Just(this.locationType));
            default: return Promise.resolve(sanctuary_1.Just(graphql_1.GraphQLString));
        }
    };
    /**
     * Makes a GraphQL scalar type
     * @param field Salesforce record Field returned by describe call
     */
    SFGraphQL.prototype.makeScalarType = function (field) {
        return __awaiter(this, void 0, void 0, function () {
            var type;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getFieldType(field)];
                    case 1:
                        type = _a.sent();
                        return [2 /*return*/, sanctuary_1.map(function (t) {
                                return (_a = {},
                                    _a[field.name] = {
                                        type: t,
                                        description: field.label,
                                    },
                                    _a);
                                var _a;
                            })(type)]; // we really need some HKT in typescript
                }
            });
        });
    };
    /**
     * Creates a GraphQL type for a record
     * @param object Promise for record metadata returned by the Salesforce describe
     */
    SFGraphQL.prototype.makeObjectType = function (object) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var metadata, fieldsP, objFields, _a, fields, type;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, object];
                    case 1:
                        metadata = _b.sent();
                        if (!metadata.fields) {
                            return [2 /*return*/, sanctuary_1.Nothing];
                        }
                        fieldsP = metadata.fields.filter(Boolean).map(function (f) { return _this.makeScalarType(f); });
                        _a = sanctuary_1.justs;
                        return [4 /*yield*/, Promise.all(fieldsP)];
                    case 2:
                        objFields = _a.apply(void 0, [_b.sent()]);
                        fields = objFields.reduce(function (p, c) { return (__assign({}, p, c)); }, {});
                        type = new graphql_1.GraphQLObjectType({
                            name: metadata.name,
                            description: metadata.label,
                            fields: function () { return fields; },
                        });
                        // this is just a form of memoization, not really an impure function
                        this.objectTypes[metadata.name] = type;
                        return [2 /*return*/, sanctuary_1.Just(type)];
                }
            });
        });
    };
    /**
     * Gets the GraphQL type of a Salesforce record
     * @param name Name of the object record
     */
    SFGraphQL.prototype.getObjectType = function (name) {
        if (name in this.objectTypes) {
            // return the cached/memoized value if it exists
            return Promise.resolve(sanctuary_1.Just(this.objectTypes[name]));
        }
        else {
            return this.makeObjectType(this.connection.sobject(name).describe());
        }
    };
    return SFGraphQL;
}());
exports.SFGraphQL = SFGraphQL;
exports.default = SFGraphQL;
