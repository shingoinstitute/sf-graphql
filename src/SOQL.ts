import { flatten } from 'ramda';
import { getNamedType, isLeafType, isOutputType, GraphQLObjectType, FieldNode, GraphQLResolveInfo } from 'graphql';
import { QueryResult, Connection, ConnectionOptions } from 'jsforce';
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
      scalars.push(query.root);
    }
    if (query.relationship && !query.childRelationship) {
      scalars.push(`${query.root}.Id`);
      scalars = scalars.concat(
          flatten<string>(query.sub.map(s => recurse(s, depth + 1)
                               .map(v => query.root + '.' + v))));
    }
    return scalars;
  };

  const res = flatten<string>(getParentSubqueries(q)
                                     .map(s => recurse(s, 0)));
  return unique(res);
};
export const resolveChildrenQueries = (q: TypedQuery): string[] =>
  getChildSubqueries(q).map(c => {
    const scalars = resolveLeafs(c);
    const parents = resolveParentQueries(c);
    return `(SELECT ${scalars.concat(parents).join()} FROM ${c.root})`;
  });

export const resolveLeafs = (q: TypedQuery): string[] => {
  const leafs = getLeafSubqueries(q).map(s => s.root);

  if (!leafs.includes('Id')) {
      leafs.push('Id');
  }

  return leafs;
} ;

export const findUnresolvedLeafs = (obj: any, q: TypedQuery) => {
  const leafs = resolveLeafs(q);
  const unresolved: { [idx: number]: string[] } = {};
  // TODO: Optimize this somehow
  for (const l of leafs) {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (!(l in obj[i])) {
          if (typeof unresolved[i] === 'undefined')
            unresolved[i] = [l];
          else
            unresolved[i].push(l);
        }
      }
    } else {
      if (!(l in obj)) {
        if (typeof unresolved[0] === 'undefined')
          unresolved[0] = [l];
        else
          unresolved[0].push(l);
      }
    }
  }

  return unresolved;
};
export interface UnresolvedLeafs { [idx: number]: string[]; }
export interface UnresolvedChildren { [idx: number]: { [child: string]: string[] }; }

export const findUnresolvedChildren = (obj: any, q: TypedQuery): UnresolvedChildren => {
  // TODO: Optimize this
  const children = getChildSubqueries(q);

  const unresolved: { [idx: number]: { [child: string]: string[] }} = {};
  const addUnresolved = (idx: number, add: { [child: string]: string[] }) => {
    if (typeof unresolved[idx] === 'undefined')
      unresolved[idx] = { ...add };
    else
      unresolved[idx] = { ...add, ...unresolved[idx] };
  };

  for (const c of children) {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (Array.isArray(obj[i][c.root])) return {};

        const unresolvedLeafs = findUnresolvedLeafs(obj[i][c.root] || {}, c);
        if (Object.keys(unresolvedLeafs).length > 0) {
          addUnresolved(i, { [c.root]: unresolvedLeafs[0] });
        }
      }
    } else {
      if (Array.isArray(obj[c.root])) return {};

      const unresolvedLeafs = findUnresolvedLeafs(obj[c.root] || {}, c);
      if (Object.keys(unresolvedLeafs).length > 0) {
        addUnresolved(0, { [c.root]: unresolvedLeafs[0] });
      }
    }
  }

  return unresolved;
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

export const createSOQL = (info: GraphQLResolveInfo): string => {
    const typed = getTypedQuery(info.fieldNodes, info.parentType as GraphQLObjectType);
    const parents = resolveParentQueries(typed[0]);
    const children = resolveChildrenQueries(typed[0]);
    const leafs = resolveLeafs(typed[0]);

    const soql = `SELECT ${unique(leafs.concat(parents).concat(children)).join()} FROM ${info.fieldName}`;
    return soql;
};

export const getConnection = (context: any,
                              username: string,
                              password: string,
                              options: Partial<ConnectionOptions>): Connection => {
  if (!context.sf_username) {
    context.sf_username = username;
  }

  if (!context.sf_password) {
    context.sf_password = password;
  }

  if (context.sf_connection) {
    return context.sf_connection;
  } else {
    context.sf_connection = new Connection(options);
    return context.sf_connection;
  }
};

export const querySOQL = async (soql: string,
                                context: { sf_connection: Connection, sf_password: string, sf_username: string}) => {
    let res = null;
    console.log(soql);

    try {
      res = await context.sf_connection.query(soql);
    } catch {
      await context.sf_connection.login(context.sf_username, context.sf_password);
      res = await context.sf_connection.query(soql);
    }

    return resolve(res);
};
