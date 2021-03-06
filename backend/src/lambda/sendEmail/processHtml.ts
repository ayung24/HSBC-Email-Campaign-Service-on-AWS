import { ISendEmailFields, IImageContent } from '../lambdaInterfaces';

/**
 * @param srcHTML HTML with dynamic fields
 * @param fields dynamic field values
 * @param fieldNames required dynamic fields
 * @returns HTML with dynamic fields replaced with their values, or null if missing required fields
 */
export const replaceFields = function(srcHTML: string, fields: ISendEmailFields, fieldNames: string[]): string | null {
    const keys = Object.keys(fields);
    const isValid = fieldNames.every((field) => keys.includes(field));
    if (!isValid) {
        return null;
    } else {
        const regex = new RegExp('\\${(' + fieldNames.join('|') + ')}', 'g')
        const html = srcHTML.replace(regex, (_, field) => {
            return fields[field];
        })
        return html;
    }
}

/**
 * Converts source HTML with inline images into cid links, and creates image attachment with corresponding cid
 * @param srcHTML HTML with inline embedded image
 * @returns HTML with cid embedded image
 */
export const processImages = function(srcHTML: string): { html: string, attachments: IImageContent[] } {
    // data uri syntax is data:[<mimetype>][;base64],<data>
    let regex = new RegExp(/\s*data:(?<mime>[a-z\-]+\/[a-z\-\+]+);(?<encoding>base64)?,(?<data>[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*)/, 'gi');
    let images: IImageContent[] = [];
    let imageId = 0;
    const html = srcHTML.replace(regex, (_, mime: string, encoding: string, data: string) => {
        const cid = 'image' + imageId++;
        images.push({
            contentType: mime,
            content: Buffer.from(data, encoding),
            cid: cid
        })
        return `cid:${cid}`;
    });
    return {
        html: html,
        attachments: images
    }
}