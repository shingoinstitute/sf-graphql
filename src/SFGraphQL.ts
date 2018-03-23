import { Connection, ConnectionOptions, SObjectField, SObjectMetadata, SObjectRelationship } from 'jsforce';
import { Nothing, Just, Maybe, map, isJust, justs, fromMaybe } from 'sanctuary';
import {
  GraphQLString, GraphQLFloat, GraphQLNonNull,
  GraphQLID, GraphQLList, GraphQLBoolean, GraphQLInt, GraphQLScalarType,
  GraphQLUnionType, GraphQLObjectType, GraphQLSchema, GraphQLFieldConfig,
  GraphQLResolveInfo, isLeafType, GraphQLType, GraphQLOutputType, FieldNode, getNamedType,
  isCompositeType, isOutputType, GraphQLFieldResolver } from 'graphql';
import { filter, pick, flatten } from 'ramda';
import { writeFileSync } from 'fs';
import {
  resolveParentQueries, resolveLeafs,
  TypedQuery, getTypedQuery, resolveChildrenQueries, resolve,
  findUnresolvedLeafs, createSOQL, getConnection, querySOQL, findUnresolvedChildren } from './SOQL';
import { isNumber } from 'util';
import { unique } from './util';

interface Maybe<A> {
  constructor: {
    '@@type': 'sanctuary/Maybe';
  };
}

interface ScalarType {
  [name: string]: {
    type: GraphQLScalarType | string[];
    description: string;
    relationship?: boolean;
    childRelationship?: boolean;
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

  private async writeSObject(o: Promise<SObjectMetadata>) {
    const obj = await o;
    writeFileSync(`./describe/${obj.name}.json`, JSON.stringify(obj));
  }

  /**
   * Makes a GraphQL schema from the Salesforce instance
   */

  private createResolver(childRel: boolean): GraphQLFieldResolver<any, any, any> {
    return (async (obj, args, context, info) => {
      // tslint:disable:no-console

      const typed = getTypedQuery(info.fieldNodes, info.parentType as GraphQLObjectType);
      if (typeof obj !== 'undefined' && info.path && typeof info.path.prev !== 'undefined') {
        console.log('\n\n=====START=====');
        console.log('obj', obj);
        console.log('info', info);
        console.log('typed', typed);
        // this is not a root resolver
        const current = obj[info.path.key];

        // we didn't get data for our previous query, don't continue
        if (current === null) return current;
        console.log('current', current);

        if (typeof current === 'undefined') {
          console.log('----No Previous----');
          // we have no previous, resolve normally
          if (childRel) {
            console.log('Child Relationship');
            const parentObj = obj.attributes.type;
            const parentId = obj.Id;
            const parents = resolveParentQueries(typed[0]);
            const leafs = resolveLeafs(typed[0]);
            // tslint:disable-next-line:max-line-length
            const soql = `SELECT Id, (SELECT ${leafs.concat(parents).join()} FROM ${info.fieldName}) FROM ${parentObj} WHERE Id = '${parentId}'`;
            console.log(soql);

            const conn = getConnection(context, this.username, this.password, this.options);

            return querySOQL(soql, context).then(q => {
              if (!q) return null;

              return q[0][info.fieldName];
            });
          } else {
            console.log('Parent Relationship');
            const leafs = resolveLeafs(typed[0]);
            const parents = resolveParentQueries(typed[0]);
            const children = resolveChildrenQueries(typed[0]);
            const soql = `SELECT ${leafs.concat(parents).concat(children)}`;

          }

          return null;
        }

        return current;
      }

      return null;
    }) as GraphQLFieldResolver<{ Id: string, attributes: { } } & any, any, any>;
  }

  private async makeSchema(conn: Connection) {
    await conn.login(this.username, this.password);
    const global = await conn.describeGlobal();
    const describes = global.sobjects.map(o => conn.sobject(o.name).describe());

    // describes.forEach(o => this.writeSObject(o));

    const promises = describes.map(o => this.makeObject(o));

    const objects = justs<ObjectType>(await Promise.all(promises));
    this.objects = objects;
    const fields = this.resolveReferences(objects)
      .map(o => ({
        [o.name]: {
          type: new GraphQLList(o),
          description: o.description,
          resolve: (async (obj, args, context, info) => {
            const connection = getConnection(context, this.username, this.password, this.options);
            const final = await querySOQL(createSOQL(info), context);

            if (info.returnType instanceof GraphQLList) {
              return final;
            }

            return final && final[0];

          }) as GraphQLFieldResolver<any, any, any>,
        },
      }))
      .reduce((p, c) => ({ ...p, ...c }), {});

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
      .map(f => this.makeChildRelationship(f)));

    if (!fieldsA.length && !relationsA.length) {
      return Nothing;
    }
    // Flatten the array into a single object
    const fields = [...fieldsA, ...relationsA].reduce((p, c) => ({ ...p, ...c }), {});

    return Just<ObjectType>({
      name: metadata.name,
      description: metadata.label,
      fields,
    });
  }

  private makeChildRelationship(rel: SObjectRelationship) {
    const type = [rel.childSObject];
    if (rel.relationshipName) {
      return Just({
        [rel.relationshipName]: {
          type,
          description: 'Child relationship to ' + rel.childSObject,
          relationship: true,
          childRelationship: true,
          childObject: rel.childSObject,
        },
      });
    }
    return Nothing;
  }

  private joinNames(n: string[], start = ''): string {
    return n.reduce((p, c) =>
      c.substr(0, 1).toUpperCase() + c.substring(1)
      + p.substr(0, 1).toUpperCase() + p.substring(1), start);
  }

  private makeParentRelationship(field: SObjectField) {
    const type = field.referenceTo && field.referenceTo.length
      && field.relationshipName ? Just(field.referenceTo.filter(Boolean)) : Nothing;
    return map<GraphQLScalarType | string[], ScalarType>(t => ({
      [field.relationshipName!]: {
        type: t,
        relationship: true,
        childRelationship: false,
        description: 'Parent relationship to ' +
          this.joinNames(field.referenceTo!.filter(Boolean) as string[]),
      },
    }))(type) as Maybe<ScalarType>;
  }

  /**
   * Makes a GraphQL field from a SObject Field
   * @param field the salesforce object field
   */
  private makeField(field: SObjectField) {
    const ref: Maybe<ScalarType> = field.type === 'reference' ? this.makeParentRelationship(field) : Nothing;
    const type = this.getFieldType(field);
    const refSpread = fromMaybe({})(ref);
    return map<GraphQLScalarType | string[], ScalarType>(t => ({
      ...refSpread,
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
    const newObjects: { [name: string]: GraphQLObjectType } = {};
    const unions: { [name: string]: GraphQLUnionType } = {};
    // go through each object's fields
    // when reference is encountered (a string[] instead of GraphQLScalar)
    // create a function that references newObjects[name]

    interface Input {
      type: GraphQLScalarType | string[];
      description: string;
      relationship?: boolean;
      childRelationship?: boolean;
    }

    type Output = GraphQLFieldConfig<any, any, any> & {
      relationship?: boolean;
      childRelationship?: boolean;
    };

    const newObjList = objects.map(obj => {
      const newFields = (fields: ScalarType) => map<Input, Output>(i => {
        if (Array.isArray(i.type)) {
          if (i.type.length === 1) {
            return {
              ...i,
              type: i.relationship && !i.childRelationship
                ? newObjects[i.type[0]] : new GraphQLList(newObjects[i.type[0]]),
              resolve: this.createResolver(!!i.childRelationship),
            };
          }

          const name = this.joinNames(i.type, 'Union');
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
            type: i.relationship && !i.childRelationship ? union : new GraphQLList(union),
            resolve: this.createResolver(!!i.childRelationship),
          };
        } else {
          return {
            type: i.type,
            description: i.description,
          };
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
      case 'calculated': return (Just(GraphQLString));
      case 'combobox': return (Just(GraphQLString));
      case 'currency': return (Just(GraphQLFloat));
      case 'email': return (Just(GraphQLString));
      case 'encryptedstring': return (Just(GraphQLString));
      case 'id': return (Just(new GraphQLNonNull(GraphQLID)));
      case 'multipicklist': return (Just(new GraphQLList(GraphQLString)));
      case 'percent': return (Just(GraphQLFloat));
      case 'phone': return (Just(GraphQLString));
      case 'textarea': return (Just(GraphQLString));
      case 'url': return (Just(GraphQLString));
      case 'base64': return (Just(GraphQLString));
      case 'boolean': return (Just(GraphQLBoolean));
      case 'byte': return (Just(GraphQLString));
      case 'date': return (Just(GraphQLString));
      case 'datetime': return (Just(GraphQLString));
      case 'double': return (Just(GraphQLFloat));
      case 'int': return (Just(GraphQLInt));
      case 'time': return (Just(GraphQLString));
      case 'reference': return Just(GraphQLID);
      // case 'reference':       return field.referenceTo && field.referenceTo.length
      //                                 ? Just(field.referenceTo) : Nothing;
      case 'address': return (Just(addressType));
      case 'location': return (Just(locationType));
      default: return (Just(GraphQLString));
    }
  }
}

export default SFGraphQL;
