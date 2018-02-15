export interface SObjectURL {
    rowTemplate: string;
    defaultValues: string;
    describe: string;
    sobject: string;
}

export interface SObjectRelationship {
    cascadeDelete: boolean;
    childSObject: string;
    depreciatedAndHidden: boolean;
    field: string;
    junctionIdListNames?: any[] | null;
    junctionReferenceTo?: any[] | null;
    relationshipName?: string | null;
    restrictedDelete: boolean;
}

export interface SObjectPicklistValues {
    active: boolean;
    defaultValue: boolean;
    label: string;
    validFor?: string | null;
    value: string;
}

export interface SObjectField {
    aggregatable: boolean;
    autoNumber: boolean;
    byteLength: number;
    calculated: boolean;
    calculatedFormula?: string;
    cascadeDelete: boolean;
    caseSensitive: boolean;
    compoundFieldName?: string | null;
    controllerName?: string;
    createable: boolean;
    custom: boolean;
    defaultValue?: boolean | string | null;
    defaultValueFormula?: null;
    defaultedOnCreate: boolean;
    dependentPicklist: boolean;
    deprecatedAndHidden: boolean;
    digits: number;
    displayLocationInDecimal: boolean;
    encrypted: boolean;
    externalId: boolean;
    extraTypeInfo?: string | null;
    filterable: boolean;
    filteredLookupInfo?: null;
    groupable: boolean;
    highScaleNumber: boolean;
    htmlFormatted: boolean;
    idLookup: boolean;
    inlineHelpText?: string | null;
    label: string;
    length: number;
    mask?: null;
    maskType?: null;
    name: string;
    nameField: boolean;
    namePointing: boolean;
    nillable: boolean;
    permissionable: boolean;
    picklistValues?: (SObjectPicklistValues | null)[] | null;
    precision: number;
    queryByDistance: boolean;
    referenceTargetField?: null;
    referenceTo?: (string | null)[] | null;
    relationshipName?: string | null;
    relationshipOrder?: null;
    restrictedDelete: boolean;
    restrictedPicklist: boolean;
    scale: number;
    soapType: string;
    sortable: boolean;
    type: string;
    unique: boolean;
    updateable: boolean;
    writeRequiresMasterRead: boolean;
}

export interface SObjectRecordTypeInfo {
    available: boolean;
    defaultRecordTypeMapping: boolean;
    master: boolean;
    name: string;
    recordTypeId: string;
    urls: Partial<SObjectURL> & { layout: string };
}

export interface SObjectSupportedScope {
    label: string;
    name: string;
}

export interface SObjectMetadata {
    actionOverrides?: any[] | null;
    activateable: boolean;
    childRelationships?: Array<SObjectRelationship> | null;
    compactLayoutable: boolean;
    createable: boolean;
    custom: boolean;
    customSetting: boolean;
    deletable: boolean;
    deprecatedAndHidden: boolean;
    feedEnabled: boolean;
    fields?: Array<SObjectField> | null;
    hasSubtypes: boolean;
    isSubtype: boolean;
    keyPrefix: string;
    label: string;
    labelPlural: string;
    layoutable: boolean;
    listviewable?: null;
    lookupLayoutable?: null;
    mergeable: boolean;
    mruEnabled: boolean;
    name: string;
    namedLayoutInfos?: (null)[] | null;
    networkScopeFieldName?: null;
    queryable: boolean;
    recordTypeInfos?: Array<SObjectRecordTypeInfo> | null;
    replicateable: boolean;
    retrieveable: boolean;
    searchLayoutable: boolean;
    searchable: boolean;
    supportedScopes?: Array<SObjectSupportedScope> | null;
    triggerable: boolean;
    undeletable: boolean;
    updateable: boolean;
    urls: SObjectURL;
}

export interface DescribeGlobalResult {
    encoding: string;
    maxBatchSize: number;
    sobjects: Array<SObjectMetadata>;
}