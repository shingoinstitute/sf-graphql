import {
    GraphQLObjectType,
    GraphQLInt,
    GraphQLFloat,
    GraphQLString,
    GraphQLBoolean,
    GraphQLID,
    GraphQLList,
    GraphQLNonNull,
    GraphQLScalarType,
    GraphQLSchema,
    GraphQLUnionType,
 } from 'graphql';
import { Connection, ConnectionOptions, SObjectField, SObjectMetadata } from 'jsforce';
import { Nothing, Just, Maybe, map, isJust, justs } from 'sanctuary';
import * as fs from 'fs';

interface ScalarType {
    [name: string]: {
        type: GraphQLObjectType;
        description: string;
    };
}

interface Maybe<A> {
    constructor: {
        '@@type': 'sanctuary/Maybe';
    };
}

export class SFGraphQL {
    private connection?: Connection;
    private objectTypes: {[name: string]: GraphQLObjectType | GraphQLUnionType} = {};
    private addressType = new GraphQLObjectType({
        name: 'Address',
        fields: () => ({
            Accuracy: {
                type: GraphQLString,
                description: 'Accuracy level of the geocode for the address',
            },
            City: {
                type: GraphQLString,
                description: 'The city detail for the address',
            },
            Country: {
                type: GraphQLString,
                description: 'The country detail for the address',
            },
        }),
    });

    private locationType = new GraphQLObjectType({
        name: 'Location',
        fields: () => ({
            latitude: {
                type: GraphQLString,
            },
            longitude: {
                type: GraphQLString,
            },
        }),
    });

    constructor(private username: string, private password: string) { }

    public connect(opts?: Partial<ConnectionOptions>) {
        const conn = new Connection(opts || {});
        this.connection = conn;
        return this.makeSchema();
    }

    /**
     * Makes a GraphQL schema from the Salesforce instance
     */
    private async makeSchema() {
        await this.connection!.login(this.username, this.password);

        const sponsor: SObjectMetadata = JSON.parse(fs.readFileSync('./sponsors.json', { encoding: 'utf8'}));
        const event: SObjectMetadata = JSON.parse(fs.readFileSync('./events.json', { encoding: 'utf8'}));

        const global = await this.connection!.describeGlobal();
        const promises =
        // tslint:disable-next-line:comment-format
        /*
        [Promise.resolve(sponsor), Promise.resolve(event)]
        /*/
                        global.sobjects
                            .map(o => this.connection!.sobject(o.name).describe())
        // tslint:disable-next-line:comment-format
        //*/
                            // remember, we have to use the arrow function because 'this'
                            // doesn't get bound properly in makeObjectType otherwise
                            .map(o => this.makeObjectType(o));
        const fields = (justs(await Promise.all(promises)) as GraphQLObjectType[])
                            // maps into the format that graphql expects for a field
                            .map(o => ({ [o.name]: { type: o, description: o.description } }))
                            // combine all the objects into one
                            .reduce((p, c) => ({...p, ...c}), {});

        return new GraphQLSchema({
            query: new GraphQLObjectType({
                name: 'Salesforce',
                fields: () => fields,
            }),
        });
    }

    /**
     * Gets the GraphQL type of a Salesforce reference - resolves the type of the referenced records
     * @param field A Salesforce record field
     */
    private async getReferenceType(field: SObjectField): Promise<Maybe<GraphQLObjectType>> {
        if (field.referenceTo && field.referenceTo.length) {
            // if a single reference, it can refer to just one type
            if (field.referenceTo.length === 1
                && field.referenceTo[0] !== null
                && typeof field.referenceTo[0] !== 'undefined') {
                return this.getObjectType(field.referenceTo[0]!);
            }
            // if multiple reference types, create a union
            const referencesP = field.referenceTo
                                .filter(Boolean)
                                .map(f => this.getObjectType(f as string));
            const refs = justs(await Promise.all(referencesP)) as GraphQLObjectType[];
            const newType = new GraphQLUnionType({
                // build the name from the names of the sub types
                name: refs.map(r => r.name).reduce((p, c) =>
                    // make sure the name is in camel case
                    c.substr(0, 1).toUpperCase() + c.substring(1)
                    + p.substr(0, 1).toUpperCase() + p.substring(1)
                    , 'Union'),
                    types: refs,
            });
            this.objectTypes[newType.name] = newType;
            return Just(newType);
        }
        return Nothing;
    }

    /**
     * Converts between Salesforce and GraphQL types
     * @param field A Salesforce record field
     */
    private getFieldType(field: SObjectField): Promise<Maybe<GraphQLScalarType | GraphQLObjectType>> {
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
            case 'calculated':      return Promise.resolve(Just(GraphQLString));
            case 'combobox':        return Promise.resolve(Just(GraphQLString));
            case 'currency':        return Promise.resolve(Just(GraphQLFloat));
            case 'email':           return Promise.resolve(Just(GraphQLString));
            case 'encryptedstring': return Promise.resolve(Just(GraphQLString));
            case 'id':              return Promise.resolve(Just(new GraphQLNonNull(GraphQLID)));
            case 'multipicklist':   return Promise.resolve(Just(new GraphQLList(GraphQLString)));
            case 'percent':         return Promise.resolve(Just(GraphQLFloat));
            case 'phone':           return Promise.resolve(Just(GraphQLString));
            case 'textarea':        return Promise.resolve(Just(GraphQLString));
            case 'url':             return Promise.resolve(Just(GraphQLString));
            case 'base64':          return Promise.resolve(Just(GraphQLString));
            case 'boolean':         return Promise.resolve(Just(GraphQLBoolean));
            case 'byte':            return Promise.resolve(Just(GraphQLString));
            case 'date':            return Promise.resolve(Just(GraphQLString));
            case 'datetime':        return Promise.resolve(Just(GraphQLString));
            case 'double':          return Promise.resolve(Just(GraphQLFloat));
            case 'int':             return Promise.resolve(Just(GraphQLInt));
            case 'time':            return Promise.resolve(Just(GraphQLString));
            // this recursive call is causing issues - Salesforce may be closing the connection prematurely
            // we get an ECONNRESET error
            // However, this may be the most important part of the conversion - otherwise we don't get a graph
            // TODO: Figure out how to resolve this
            // case 'reference':       return this.getReferenceType(field);
            case 'address':         return Promise.resolve(Just(this.addressType));
            case 'location':        return Promise.resolve(Just(this.locationType));
            default:                return Promise.resolve(Just(GraphQLString));
        }
    }

    /**
     * Makes a GraphQL scalar type
     * @param field Salesforce record Field returned by describe call
     */
    private async makeScalarType(field: SObjectField): Promise<Maybe<ScalarType>> {
        const type = await this.getFieldType(field);
        return map((t: GraphQLObjectType) => ({
            [field.name]: {
                type: t,
                description: field.label,
            },
        }))(type) as any; // we really need some HKT in typescript
    }

    /**
     * Creates a GraphQL type for a record
     * @param object Promise for record metadata returned by the Salesforce describe
     */
    private async makeObjectType(object: Promise<SObjectMetadata>): Promise<Maybe<GraphQLObjectType>> {
        const metadata = await object;
        if (!metadata.fields) {
            return Nothing;
        }

        const fieldsP = metadata.fields.filter(Boolean).map(f => this.makeScalarType(f));
        // discard the Nothing fields
        const objFields = (justs(await Promise.all(fieldsP)) as ScalarType[]);
        // if (objFields.length === 0) return Nothing;
        // combine the individual scalar field objects
        const fields = objFields.reduce((p, c) => ({...p, ...c}), {});

        const type: GraphQLObjectType = new GraphQLObjectType({
            name: metadata.name,
            description: metadata.label,
            fields: () => fields,
        });

        // this is just a form of memoization, not really an impure function
        this.objectTypes[metadata.name] = type;
        return Just(type);
    }

    /**
     * Gets the GraphQL type of a Salesforce record
     * @param name Name of the object record
     */
    private getObjectType(name: string) {
        if (name in this.objectTypes) {
            // return the cached/memoized value if it exists
            return Promise.resolve(Just(this.objectTypes[name]));
        } else {
            return this.makeObjectType(this.connection!.sobject(name).describe());
        }
    }
}

export default SFGraphQL;
