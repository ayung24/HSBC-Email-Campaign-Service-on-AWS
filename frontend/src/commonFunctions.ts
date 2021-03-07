export function isEmpty(str: string): boolean {
    return !str || str.trim().length === 0;
}

export function nonEmpty(str: string): boolean {
    return !isEmpty(str);
}

export function isEmptyArray(obj: any): boolean {
    return Array.isArray(obj) && obj.length === 0;
}
