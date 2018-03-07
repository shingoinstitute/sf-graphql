import { Connection } from "./Connection";
import { CallbackFunc, Record, RecordResult } from "./global";
import { Parsable } from "./RecordStream";

export type BatchInfo = {
    id: string,
    jobId: string,
    state: string,
    stateMessage: string
};

export type BatchResultInfo = {
    id: string,
    batchId: string,
    jobId: string
};

export type JobInfo = {
    id: string,
    object: string,
    operation: string,
    state: string
};

export class Bulk {
    constructor(conn: Connection);
    pollInterval: number
    pollTimeout: number;
    createJob(type: string, operation: string, options?: Object): Job
    job(jobId: string): Job
    load(type: string, operation: string, options?: {
        extIdField?: string,
        concurrencyMode?: string
    }, input?: Array<Record> | string, callback?: CallbackFunc<Array<RecordResult> | Array<BatchResultInfo>>): Batch
    query(soql: string): Parsable
}

export class Batch implements Promise<Array<RecordResult>> {
    protected constructor(job: Job, batchId?: string);
    then<TResult1 = RecordResult[], TResult2 = never>(onfulfilled?: (value: RecordResult[]) => TResult1 | PromiseLike<TResult1>, onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>): Promise<TResult1 | TResult2>
    catch<TResult = never>(onrejected?: (reason: any) => TResult | PromiseLike<TResult>): Promise<RecordResult[] | TResult>
    [Symbol.toStringTag]: "Promise";

    check(callback?: CallbackFunc<BatchInfo>): Promise<BatchInfo>
    execute(input?: Array<Record> | string, callback?: CallbackFunc<Array<RecordResult> | Array<BatchResultInfo>>): Batch
    poll(interval: number, timeout: number): void
    retrieve(callback?: CallbackFunc<Array<RecordResult> | Array<BatchResultInfo>>): Promise<Array<RecordResult> | Array<BatchResultInfo>>
}

export class Job {
    protected constructor(buld: Bulk, type?: string, operation?: string, options?: {
        extIdField?: string,
        concurrencyMode?: string
    }, jobId?: string)
    abort(callback?: CallbackFunc<JobInfo>): Promise<JobInfo>
    batch(batchId: string): Batch
    check(callback?: CallbackFunc<JobInfo>): Promise<JobInfo>
    close(callback?: CallbackFunc<JobInfo>): Promise<JobInfo>
    createBatch(): Batch
    info(callback?: CallbackFunc<JobInfo>): Promise<JobInfo>
    list(callback?: CallbackFunc<Array<BatchInfo>>): Promise<Array<BatchInfo>>
    open(callback?: CallbackFunc<JobInfo>): Promise<JobInfo>
}