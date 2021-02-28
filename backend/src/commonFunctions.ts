export class CommonFunctions {
    public static isEmpty(str: string): boolean {
        return !str || str.trim().length === 0;
    }

    public static nonEmpty(str: string): boolean {
        return !CommonFunctions.isEmpty(str);
    }
}
