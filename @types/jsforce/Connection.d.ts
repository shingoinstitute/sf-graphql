import { OAuth2, OAuth2Options } from "./OAuth2";
import { Bulk } from "./Bulk";
import { Query } from "./Query";
import { SObject } from "./SObject";
import { DeletedRecordsInfo, CallbackFunc, DescribeGlobalResult,
    DescribeSObjectResult, QueryResult, Record, RecordResult, UserInfo } from "./global";

export type ConnectionOptions = {
  oauth2: OAuth2 | OAuth2Options,
  logLevel: string,
  version: string
  maxRequest: number,
  loginUrl: string,
  instanceUrl: string,
  serverUrl: string,
  accessToken: string,
  sessionId: string,
  refreshToken: string,
  signedRequest: string | Object,
  proxyUrl: string,
  callOptions: Object,
  redirectUri: string,
};


export type IdentityInfo = any;

export class Connection {
  constructor(options: Partial<ConnectionOptions>);
  bulk: Bulk
  oauth2: OAuth2
  authorize(code: string, callback?: CallbackFunc<UserInfo>): Promise<UserInfo>
  create(type: string, records: Record | Array<Record>, options?: Object, callback?: CallbackFunc<RecordResult | Array<RecordResult>>): Promise<RecordResult | Array<RecordResult>>

  destroy(type: string, ids: string | string[], options?: Object, callback?: CallbackFunc<RecordResult | RecordResult[]>): Promise<RecordResult | RecordResult[]>
  del(type: string, ids: string | string[], options?: Object, callback?: CallbackFunc<RecordResult | RecordResult[]>): Promise<RecordResult | RecordResult[]>
  delete(type: string, ids: string | string[], options?: Object, callback?: CallbackFunc<RecordResult | RecordResult[]>): Promise<RecordResult | RecordResult[]>

  deleted(type: string, start: string | Date, end: string | Date, callback?: CallbackFunc<DeletedRecordsInfo>): Promise<DeletedRecordsInfo>

  describe(type: string, callback?: CallbackFunc<DescribeSObjectResult>): Promise<DescribeSObjectResult>
  describeSObject(type: string, callback?: CallbackFunc<DescribeSObjectResult>): Promise<DescribeSObjectResult>

  describeGlobal(callback?: CallbackFunc<DescribeGlobalResult>): Promise<DescribeGlobalResult>;

  identity(callback?: CallbackFunc<IdentityInfo>): Promise<IdentityInfo>;

  login(username: string, password: string, callback?: CallbackFunc<UserInfo>): Promise<UserInfo>;
  sobject(resource: string): SObject
  query(soql: string, callback?: CallbackFunc<QueryResult>): Query<QueryResult>
}