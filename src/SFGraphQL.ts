import { Connection, ConnectionOptions, SObjectField, SObjectMetadata, SObjectRelationship } from 'jsforce';
import { Nothing, Just, Maybe, map, isJust, justs } from 'sanctuary';
import { GraphQLString, GraphQLFloat, GraphQLNonNull,
    GraphQLID, GraphQLList, GraphQLBoolean, GraphQLInt, GraphQLScalarType,
    GraphQLUnionType, GraphQLObjectType,
    GraphQLSchema, GraphQLFieldConfig, GraphQLResolveInfo, isLeafType} from 'graphql';
import { filter, pick } from 'ramda';

interface Maybe<A> {
    constructor: {
        '@@type': 'sanctuary/Maybe';
    };
}

interface ScalarType {
    [name: string]: {
        type: GraphQLScalarType | string[];
        description: string;
    };
}

interface ObjectType {
    name: string;
    description: string;
    fields: ScalarType;
}

const addressType = new GraphQLObjectType({
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

const locationType = new GraphQLObjectType({
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



export class SFGraphQL {
    private options: ConnectionOptions | {};
    private objects: ObjectType[] = [];

    constructor(private username: string, private password: string, opts?: Partial<ConnectionOptions>) {
        this.options = opts || {};
    }

    public buildSchema(opts?: Partial<ConnectionOptions>) {
        if (opts) {
            this.options = opts || {};
        }
        const conn = new Connection(this.options);
        return this.makeSchema(conn);
    }

    /**
     * Makes a GraphQL schema from the Salesforce instance
     */
    private async makeSchema(conn: Connection) {
        await conn.login(this.username, this.password);
        const global = await conn.describeGlobal();
        const promises = global.sobjects
                            .map(o => conn.sobject(o.name).describe())
                            .map(o => this.makeObject(o));

        const objects = justs<ObjectType>(await Promise.all(promises));
        this.objects = objects;
        const fields = this.resolveReferences(objects)
                            .map(o => ({
                                [o.name]: {
                                    type: new GraphQLList(o),
                                    description: o.description,
                                    resolve: (root: any, args: any, context: any, info: GraphQLResolveInfo) => {
                                        // resolver
                                        const obj = this.objects.filter(o => o.name === info.fieldName);
                                        if (obj.length) {
                                            const leafs = filter(f => !Array.isArray(f.type) && isLeafType(f.type),
                                                                obj[0].fields);
                                            const node = info.fieldNodes.filter(n => n.name.value === info.fieldName);
                                            if (!node.length) return;
                                            const selections =
                                                node[0].selectionSet && node[0].selectionSet!.selections
                                                    .filter(s => s.kind === 'Field')
                                                    .filter(s => typeof (s as any).selectionSet === 'undefined')
                                                    .map(s => (s as any).name.value as string);
                                            if (!selections) return;
                                            const conn = new Connection(this.options);
                                            return conn.login(this.username, this.password).then(() => {
                                                // tslint:disable-next-line:max-line-length
                                                return conn.query(`SELECT ${selections.join(', ')} FROM ${info.fieldName}`);
                                            }).then(a => {
                                                if (!a.records) return;
                                                return (a.records.map(r => pick(selections, r)));
                                            });
                                        }
                                    },
                            }}))
                            .reduce((p, c) => ({...p, ...c}), {});

        return new GraphQLSchema({
            query: new GraphQLObjectType({
                name: 'Query',
                description: 'Salesforce',
                fields: () => fields,
            }),
        });
    }

    /**
     * Makes an intermediate ObjectType object from an SObject
     * @param object promies for the Salesforce object
     */
    private async makeObject(object: Promise<SObjectMetadata>): Promise<Maybe<ObjectType>> {
        const metadata = await object;
        if ((!metadata.fields || metadata.fields.length === 0)
        && (!metadata.childRelationships || metadata.childRelationships.length === 0)) {
            return Nothing;
        }

        const fieldsA = justs<ScalarType>((metadata.fields || [])
                                            .filter(Boolean)
                                            .map(f => this.makeField(f)));


        const relationsA = justs<ScalarType>((metadata.childRelationships || [])
                                                .filter(Boolean)
                                                .map(f => this.makeRelationship(f)));

        if (!fieldsA.length && !relationsA.length) {
            return Nothing;
        }
        // Flatten the array into a single object
        const fields = [...fieldsA, ...relationsA].reduce((p, c) => ({...p, ...c}), {});

        return Just<ObjectType>({
            name: metadata.name,
            description: metadata.label,
            fields,
        });
    }

    private makeRelationship(rel: SObjectRelationship) {
        const type = [rel.childSObject];
        // if relationshipName is null, it is a child to parent
        // how do we indicate this for queries?
        return Just({
            [rel.relationshipName || rel.childSObject]: {
                type,
                description: (!rel.relationshipName ? 'Parent' : 'Child')
                    + ' relationship to ' + rel.childSObject,
                childRelationship: true,
                toParent: !rel.relationshipName,
            },
        });
    }

    /**
     * Makes a GraphQL field from a SObject Field
     * @param field the salesforce object field
     */
    private makeField(field: SObjectField) {
        const type = this.getFieldType(field);
        return map<GraphQLScalarType | string[], ScalarType>(t => ({
            [field.name]: {
                type: t,
                description: field.label,
            },
        }))(type) as Maybe<ScalarType>;
    }

    /**
     * Resolves inter-object references and converts to GraphQLObjects
     * @param objects list of ObjectTypes
     */
    private resolveReferences(objects: ObjectType[]) {
        const newObjects: {[name: string]: GraphQLObjectType} = {};
        const unions: {[name: string]: GraphQLUnionType} = {};
        // go through each object's fields
        // when reference is encountered (a string[] instead of GraphQLScalar)
        // create a function that references newObjects[name]

        interface Input {
            type: GraphQLScalarType | string[];
            description: string;
        }

        interface Output {
            type: GraphQLScalarType | GraphQLUnionType | GraphQLObjectType;
            description: string;
        }

        const newObjList = objects.map(obj => {
            const newFields = (fields: ScalarType) => map<Input, Output>(i => {
                if (Array.isArray(i.type)) {
                    if (i.type.length === 1) {
                        return {
                            ...i,
                            type: newObjects[i.type[0]],
                        };
                    }

                    const name = i.type.reduce((p, c) =>
                            c.substr(0, 1).toUpperCase() + c.substring(1)
                            + p.substr(0, 1).toUpperCase() + p.substring(1), 'Union');
                    const types = i.type.map(t => newObjects[t]);

                    const union = unions[name] || new GraphQLUnionType({
                        name,
                        types,
                    });

                    if (!(name in Object.keys(unions))) {
                        unions[name] = union;
                    }

                    return {
                        ...i,
                        type: union,
                    };
                } else {
                    return i as Output;
                }
            })(fields);

            return new GraphQLObjectType({
                ...obj,
                fields: () => newFields(obj.fields),
            });
        });

        newObjList.forEach(o => newObjects[o.name] = o);

        return newObjList;
    }

    /**
     * Converts between Salesforce and GraphQL types
     * @param field A Salesforce record field
     */
    private getFieldType(field: SObjectField): Maybe<GraphQLScalarType | string[]> {
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
            case 'calculated':      return (Just(GraphQLString));
            case 'combobox':        return (Just(GraphQLString));
            case 'currency':        return (Just(GraphQLFloat));
            case 'email':           return (Just(GraphQLString));
            case 'encryptedstring': return (Just(GraphQLString));
            case 'id':              return (Just(new GraphQLNonNull(GraphQLID)));
            case 'multipicklist':   return (Just(new GraphQLList(GraphQLString)));
            case 'percent':         return (Just(GraphQLFloat));
            case 'phone':           return (Just(GraphQLString));
            case 'textarea':        return (Just(GraphQLString));
            case 'url':             return (Just(GraphQLString));
            case 'base64':          return (Just(GraphQLString));
            case 'boolean':         return (Just(GraphQLBoolean));
            case 'byte':            return (Just(GraphQLString));
            case 'date':            return (Just(GraphQLString));
            case 'datetime':        return (Just(GraphQLString));
            case 'double':          return (Just(GraphQLFloat));
            case 'int':             return (Just(GraphQLInt));
            case 'time':            return (Just(GraphQLString));
            case 'reference':       return Just(GraphQLID);
            // case 'reference':       return field.referenceTo && field.referenceTo.length
            //                                 ? Just(field.referenceTo) : Nothing;
            case 'address':         return (Just(addressType));
            case 'location':        return (Just(locationType));
            default:                return (Just(GraphQLString));
        }
    }
}

export default SFGraphQL;
