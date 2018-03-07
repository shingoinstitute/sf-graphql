import { CallbackFunc, DescribeSObjectResult } from "./global";

export class SObject {
    describe(callback?: CallbackFunc<DescribeSObjectResult>): Promise<DescribeSObjectResult>
}