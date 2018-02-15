import { Connection } from 'jsforce';
import { ConnectionOptions } from 'jsforce/connection';
import { GraphqlQLSchema,
    GraphQLObjectType,
    GraphQLInt,
    GraphQLFloat,
    GraphQLString,
    GraphQLBoolean,
    GraphQLID,
    GraphQLList,
    GraphQLNonNull,
    GraphQLScalarType,
 } from 'graphql';
import { SObject } from 'jsforce/salesforce-object';
import { DescribeGlobalResult, SObjectMetadata, SObjectField } from './types';

class SFGraphQL {
    private connection: Connection;
    private username: string;
    private password: string;
    private objectTypes: {[name: string]: GraphQLObjectType} = {};
    private addressType = GraphQLObjectType({ })
    private locationType = GraphQLObjectType({ })

    public connect(opts: ConnectionOptions) {
        const conn = new Connection(opts);
        this.connection = conn;
    }

    private async makeSchema() {
        await this.connection.login(this.username, this.password);

        const global = await ((this.connection as any).describeGlobal() as Promise<DescribeGlobalResult>)
        const promises = global.sobjects.map(o => (this.connection.sobject<any>(o.name).describe() as any) as Promise<SObjectMetadata>)

        return new GraphqlQLSchema({
            query: new GraphQLObjectType({
                name: 'Salesforce',
                fields: await Promise.all(this.makeObjectTypes(promises))
            })
        })
    }

    private getReferenceType(field: SObjectField) {
        if (field.referenceTo && field.referenceTo.length) {
            if (field.referenceTo[0] !== null) {
                return this.getObjectType(field.referenceTo[0]!);
            }
        }
        return GraphQLString;
    }

    private getFieldType(field: SObjectField) {
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
            case 'calculated': return GraphQLString
            case 'combobox': return GraphQLString
            case 'currency': return GraphQLFloat
            case 'email': return GraphQLString
            case 'encryptedstring': GraphQLString
            case 'id': return new GraphQLNonNull(GraphQLString)
            case 'multipicklist': return new GraphQLList(GraphQLString)
            case 'percent': return GraphQLFloat
            case 'phone': return GraphQLString
            case 'textarea': return GraphQLString
            case 'url': return GraphQLString
            case 'base64': return GraphQLString
            case 'boolean': return GraphQLBoolean
            case 'byte': return GraphQLString
            case 'date': return GraphQLString
            case 'datetime': return GraphQLString
            case 'double': return GraphQLFloat
            case 'int': return GraphQLInt
            case 'time': return GraphQLString
            case 'reference': return this.getReferenceType(field)
            case 'address': return this.addressType
            case 'location': return this.locationType
            default: return GraphQLString
        }
    }

    private makeScalarType(field: SObjectField) {
        return {
            [field.name]: {
                type: this.getFieldType(field),
                description: field.label,
            }
        }
    }

    private async makeObjectType(object: Promise<SObjectMetadata>) {
        const metadata = await object;
        const type = new GraphQLObjectType({
            name: metadata.name,
            description: metadata.label,
            fields: () => metadata.fields
                && metadata.fields.map(this.makeScalarType).reduce((p,c) => ({...p, ...c}), {})
                || {}
        })

        this.objectTypes[metadata.name] = type;
        return type;
    }

    private async getObjectType(name: string) {
        if (name in this.objectTypes) {
            return this.objectTypes[name];
        } else {
            return await this.makeObjectType((this.connection.sobject<any>(name).describe() as any) as Promise<SObjectMetadata>)
        }
    }

    private makeObjectTypes(promises: Array<Promise<SObjectMetadata>>) {
        /* Salesforce object types:
        address: 
        location: 
        */
        return promises.map(this.makeObjectType)
    }

}