import { flatten } from 'ramda';
import { getNamedType, isLeafType, isOutputType, GraphQLObjectType, FieldNode } from 'graphql';
import { QueryResult } from 'jsforce';
import { isObject, unique } from './util';

export interface Query {
    root: string;
    sub: Query[];
}

export interface TypedQuery extends Query {
    sub: TypedQuery[];
    leaf: boolean;
    relationship: boolean;
    childRelationship: boolean;
    description: string;
}

const resolveQuery = (f: FieldNode): Query => {
    const rootObj = f.name.value;
    let subObjs: Query[] = [];
    if (f.selectionSet) {
        subObjs = f.selectionSet.selections
            .filter(s => s.kind === 'Field')
            .map(f => resolveQuery(f as FieldNode));
    }

    return {
        root: rootObj,
        sub: subObjs,
    };
};

const getTypeInfoForQuery = (q: Query, root: GraphQLObjectType): TypedQuery => {
    const queryRoot = root.getFields()[q.root];
    const queryType = getNamedType(queryRoot.type);
    if (isLeafType(queryType)) {
        return {
            ...q,
            leaf: true,
            relationship: false,
            childRelationship: false,
            description: queryType.description,
        } as TypedQuery;
    }
    if (isOutputType(queryType)) {
        return {
            ...q,
            relationship: !!(queryRoot as any).relationship,
            childRelationship: !!(queryRoot as any).childRelationship,
            leaf: false,
            sub: q.sub.map(s => getTypeInfoForQuery(s, queryType as GraphQLObjectType)),
            description: queryType.description,
        };
    }

    return {
        ...q,
        leaf: false,
        relationship: false,
        childRelationship: false,
        description: queryType.description,
    } as TypedQuery;
};

export const getTypedQuery = (f: FieldNode[], type: GraphQLObjectType) =>
  f.map(n => getTypeInfoForQuery(resolveQuery(n), type));

const getParentSubqueries = (q: TypedQuery) => q.sub.filter(q => !q.childRelationship && q.relationship);
const getLeafSubqueries = (q: TypedQuery) => q.sub.filter(q => q.leaf);
const getChildSubqueries = (q: TypedQuery) => q.sub.filter(q => q.childRelationship && q.relationship);

export const resolveParentQueries = (q: TypedQuery): string[] => {
  const recurse = (query: TypedQuery, depth: number): string[] => {
    if (depth > 5) return [];

    let scalars: string[] = [];
    if (query.leaf) {
      scalars.push(query.root, 'Id');
    }
    if (query.relationship && !query.childRelationship) {
      scalars = scalars.concat(
          flatten<string>(query.sub.map(s => recurse(s, depth + 1)
                               .map(v => query.root + '.' + v))));
    }
    return scalars;
  };

  return unique(flatten<string>(q.sub.filter(s => !s.leaf)
                                     .map(s => recurse(s, 0)
                                                  .map(s => q.root + '.' + s))));
};

export const resolveChildrenQueries = (q: TypedQuery): string[] =>
  getChildSubqueries(q).map(c => {
    const scalars = resolveLeafs(c);
    const parents = resolveParentQueries(c).map(r => {
      const idx = r.indexOf(c.root);
      if (idx < 0) return r;
      return r.substring(c.root.length + 1);
    });
    return `(SELECT ${scalars.concat(parents).join()} FROM ${c.root})`;
  });

export const resolveLeafs = (q: TypedQuery): string[] => {
  const leafs = getLeafSubqueries(q).map(s => s.root);

  if (!leafs.includes('Id')) {
      leafs.push('Id');
  }

  return leafs;
} ;

export const leafsFullyResolved = (obj: any, q: TypedQuery[]) => {
  const leafs = q.filter(f => f.leaf).map(f => f.root);
  const hasAllLeafs = leafs.every(l => !isObject(obj[l]));
  return hasAllLeafs;
};

const isQueryResult = (q: any): q is QueryResult => {
  return typeof q === 'object'
            && q !== null
            && typeof q.totalSize !== 'undefined'
            && typeof q.records !== 'undefined';
};

export const resolve = (q: QueryResult) => {
  if (!q.records) return null;

  return q.records.map(r => {
    const newRecord: any = {};
    for (const key in r) {
      if (r.hasOwnProperty(key)) {
        if (isQueryResult(r[key])) {
          newRecord[key] = resolve(r[key]);
        } else {
          newRecord[key] = r[key];
        }
      }
    }

    return newRecord;
  });
};
