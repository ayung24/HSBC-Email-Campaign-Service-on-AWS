import { APIGatewayProxyEvent } from 'aws-lambda';
import * as db from '../../database/dbOperations';
import cheerio from 'cheerio';
import { ITemplateImage } from '../../database/dbInterfaces';
import { ErrorCode, ErrorMessages, ESCError } from '../../ESCError';
import * as Logger from '../../logger';
import { brotliDecompress } from 'zlib';

const IMAGE_BUCKET_NAME = process.env.IMAGE_BUCKET_NAME;
const HTML_BUCKET_NAME = process.env.HTML_BUCKET_NAME;
const SRC_HTML_PATH = process.env.SRC_HTML_PATH;
const PROCESSED_HTML_PATH = process.env.PROCESSED_HTML_PATH;

const headers = {
    'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    'Content-Type': 'application/json',
};

const dataURIRegex = /\s*data:(?<mime>[a-z-]+\/[a-z\-+]+);(?<encoding>base64)?,(?<data>[a-z0-9!$&',()*+;=\-._~:@/?%\s]*\s*)/i;

/**
 * Validates lambda's runtime env variables
 */
const validateEnv = function (): boolean {
    return !!HTML_BUCKET_NAME && !!IMAGE_BUCKET_NAME && !!SRC_HTML_PATH && !!PROCESSED_HTML_PATH;
};

export const handler = async function (event: APIGatewayProxyEvent) {
    Logger.logRequestInfo(event);
    if (!validateEnv()) {
        return {
            headers: headers,
            statusCode: 500,
            body: JSON.stringify({
                message: ErrorMessages.INTERNAL_SERVER_ERROR,
                code: ErrorCode.TS10,
            }),
        };
    } else if (!event.pathParameters || !event.pathParameters.id || !event.body) {
        return {
            headers: headers,
            statusCode: 400,
            body: JSON.stringify({
                message: ErrorMessages.INVALID_REQUEST_FORMAT,
                code: ErrorCode.TS9,
            }),
        };
    }
    const body = JSON.parse(event.body);
    if (!body.uploadTime) {
        return {
            headers: headers,
            statusCode: 400,
            body: JSON.stringify({
                message: 'body missing field "uploadTime"',
                code: ErrorCode.TS9,
            }),
        };
    }

    const templateId = event.pathParameters.id;
    const timeCreated = body.uploadTime;
    return db
        .GetHTMLById(templateId, SRC_HTML_PATH!)
        .then((html: string) => {
            const images: ITemplateImage[] = [];
            const $ = cheerio.load(html);
            $('img').each((index, element) => {
                const dataURI = $(element).attr('src');
                const groups = dataURI ? dataURIRegex.exec(dataURI)?.groups : undefined;
                if (groups) {
                    const image: ITemplateImage = {
                        contentType: groups.mime,
                        content: Buffer.from(groups.data, groups.encoding),
                        key: `image${index}`,
                    };
                    $(element).attr('src', image.key);
                    images.push(image);
                }
            });
            return Promise.all([Promise.resolve($.html()), db.UploadImages(templateId, images)]);
        })
        .then(([tmpHTML, imageLocs]: [string, { key: string; location: string }[]]) => {
            Logger.info({ message: `Uploaded ${imageLocs.length} images for template ${templateId}` });
            const $ = cheerio.load(tmpHTML);
            imageLocs.forEach((image: { key: string; location: string }) => {
                $(`img[src=${image.key}]`).attr('src', image.location);
            });
            return db.UploadProcessedHTML(templateId, $.html());
        })
        .then(() => {
            Logger.info({ message: `Updated html for template ${templateId}` });
            return db.EnableTemplate(templateId, timeCreated);
        })
        .then((template) => {
            Logger.info({ message: `Template marked as in service ${template.templateId}`, additionalInfo: template });
            return {
                headers: headers,
                statusCode: 200,
            };
        })
        .catch(err => {
            let statusCode: number;
            let message: string;
            let code: string;
            if (err instanceof ESCError) {
                statusCode = err.getStatusCode();
                message = err.isUserError ? err.message : ErrorMessages.INTERNAL_SERVER_ERROR;
                code = err.code;
            } else {
                statusCode = 500;
                message = ErrorMessages.INTERNAL_SERVER_ERROR;
                code = ErrorCode.TS30;
            }
            return db
                .DisableTemplate(templateId, timeCreated)
                .finally(() => {
                    return {
                        headers: headers,
                        statusCode: statusCode,
                        body: JSON.stringify({
                            message: message,
                            code: code,
                        }),
                    };
                });
        });
}
