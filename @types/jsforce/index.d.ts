declare module 'jsforce' {
    export type SObjectURL = {
        rowTemplate: string,
        defaultValues: string,
        describe: string,
        sobject: string
    }

   export type SObjectRelationship = {
     cascadeDelete: boolean,
     childSObject: string,
     deprecatedAndHidden: boolean,
     field: string,
     junctionIdListNames: any,
     junctionReferenceTo: any,
     relationshipName?: string,
     restrictedDelete?: boolean
   }

   export type SObjectPicklistValues = {
     active: boolean,
     defaultValue: boolean,
     label: string,
     validFor?: string,
     value: string
   }

   export type SObjectField = {
     aggregatable: boolean,
     autoNumber: boolean,
     byteLength: number,
     calculated: boolean,
     calculatedFormula?: string,
     cascadeDelete: boolean,
     caseSensitive: boolean,
     compoundFieldName?: string,
     controllerName?: string,
     createable: boolean,
     custom: boolean,
     defaultValue?: (boolean | string),
     defaultValueFormula: any,
     defaultedOnCreate: boolean,
     dependentPicklist: boolean,
     deprecatedAndHidden: boolean,
     digits: number,
     displayLocationInDecimal: boolean,
     encrypted: boolean,
     externalId: boolean,
     extraTypeInfo?: string,
     filterable: boolean,
     filteredLookupInfo: any,
     groupable: boolean,
     highScaleNumber: boolean,
     htmlFormatted: boolean,
     idLookup: boolean,
     inlineHelpText?: string,
     label: string,
     length: number,
     mask: any,
     maskType: any,
     name: string,
     nameField: boolean,
     namePointing: boolean,
     nillable: boolean,
     permissionable: boolean,
     picklistValues?: (SObjectPicklistValues | null)[],
     precision: number,
     queryByDistance: boolean,
     referenceTargetField: any,
     referenceTo?: (string | null)[],
     relationshipName?: string,
     relationshipOrder: any,
     restrictedDelete: boolean,
     restrictedPicklist: boolean,
     scale: number,
     soapType: string,
     sortable: boolean,
     type: string,
     unique: boolean,
     updateable: boolean,
     writeRequiresMasterRead: boolean
   }

   export type SObjectRecordTypeInfo = {
     available: boolean,
     defaultRecordTypeMapping: boolean,
     master: boolean,
     name: string,
     recordTypeId: string,
     urls: Partial<SObjectURL> & { layout: string }
   }

   export type SObjectSupportedScope = {
     label: string,
     name: string,
   }

   export type SObjectMetadata = {
     actionOverrides: any,
     activateable: boolean,
     childRelationships?: SObjectRelationship[],
     compactLayoutable: boolean,
     createable: boolean,
     custom: boolean,
     customSetting: boolean,
     deletable: boolean,
     deprecatedAndHidden: boolean,
     fields?: SObjectField[],
     hasSubtypes: boolean,
     isSubtype: boolean,
     keyPrefix: string,
     label: string,
     labelPlural: string,
     layoutable: string,
     listviewable: any,
     lookupLayoutable: any,
     mergeable: boolean,
     mruEnabled: boolean,
     name: string,
     namedLayoutInfos: any[],
     networkScopeFieldName: any,
     queryable: boolean,
     recordTypeInfos?: SObjectRecordTypeInfo[],
     replicateable: boolean,
     retrieveable: boolean,
     searchLayoutable: boolean,
     searchable: boolean,
     supportedScopes?: SObjectSupportedScope[],
     triggerable: boolean,
     undeleteable: boolean,
     updateable: boolean,
     urls: SObjectURL
   }

   type CallbackFunc<T> = (err: Error, response: T) => void;
   export type OAuth2Options = {
     clientId: string,
     clientSecret: string,
     loginUrl: string,
     redirectUri: string
   };

   export type ConnectionOptions = {
     accessToken: string,
     callOptions: Object,
     instanceUrl: string,
     loginUrl: string,
     logLevel: string,
     maxRequest: number,
     oauth2: Partial<OAuth2Options>,
     proxyUrl: string,
     redirectUri: string,
     refreshToken: string,
     serverUrl: string,
     sessionId: string,
     signedRequest: string | Object,
     version: string
   };

   export type UserInfo = {
     id: string,
     organizationId: string,
     url: string
   };

   export class SObject {
     describe(callback?: CallbackFunc<SObjectMetadata>): Promise<SObjectMetadata>
   }

   export type DescribeGlobalResult = {
     encoding: string,
     maxBatchSize: number,
     sobjects: SObjectMetadata[]
   }

   export class Connection {
     constructor(options: Partial<ConnectionOptions>);
     login(username: string, password: string, callback?: CallbackFunc<UserInfo>): Promise<UserInfo>;
     describeGlobal(callback?: CallbackFunc<DescribeGlobalResult>): Promise<DescribeGlobalResult>;
     sobject(resource: string): SObject
   }

}