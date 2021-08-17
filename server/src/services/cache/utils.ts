
export class CacheUtils {
    static parseJSONRobust(input: any, strict: boolean): any {
        let output: any = null;
        if (input != null) {
            try {
                output = JSON.parse(input);
            } catch (err) {
                console.error(err);
                if (!strict) {
                    output = input;
                }
            }
        }
        return output;
    }

    static stringifyJSONRobust(input: any, strict: boolean): string {
        let sdata: string = null;
        try {
            sdata = JSON.stringify(input);
        } catch (err) {
            if (strict) {
                // skip if there were any serialization errors
                console.error(err);
                sdata = null;
            } else {
                // allow non-json data
                sdata = input;
            }
        }
        return sdata;
    }
}