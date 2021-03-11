import * as AWS from 'aws-sdk';
import { S3CreateEvent} from 'aws-lambda'
import { nonEmptyArray } from '../../commonFunctions';
import * as db from '../../database/dbOperations'
import cheerio from 'cheerio'
import { ITemplateImage } from '../../database/dbInterfaces';
import { ErrorCode } from '../../errorCode'
import * as Logger from '../../../logger';

const IMAGE_BUCKET_NAME = process.env.IMAGE_BUCKET_NAME;
const HTML_BUCKET_NAME = process.env.HTML_BUCKET_NAME;
const SRC_HTML_PATH = process.env.SRC_HTML_PATH;
const PROCESSED_HTML_PATH = process.env.PROCESSED_HTML_PATH;

const dataURIRegex = /\s*data:(?<mime>[a-z-]+\/[a-z\-+]+);(?<encoding>base64)?,(?<data>[a-z0-9!$&',()*+;=\-._~:@/?%\s]*\s*)/i

/**
 * Validates lambda's runtime env variables
 */
 const validateEnv = function (): boolean {
    return !!HTML_BUCKET_NAME && !!IMAGE_BUCKET_NAME && !!SRC_HTML_PATH && !!PROCESSED_HTML_PATH;
};

export const handler = async function (event: S3CreateEvent) {
    if (!validateEnv()) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error',
                code: ErrorCode.TS10,
            }),
        };
    } else if (nonEmptyArray(event.Records)) {
        const uploadEvent = event.Records[0];
        const templateId = decodeURIComponent(uploadEvent.s3.object.key
            .replace(/\+/g, ' '))
            .replace(SRC_HTML_PATH, "");
        Logger.info({
            message: `Post-processing HTML for template with id ${templateId}`,
            additionalInfo: uploadEvent
        })

        return db.GetHTMLById(templateId, SRC_HTML_PATH).then((html: string) => {
            const images: ITemplateImage[] = [];
            const $ = cheerio.load(html)
            $('img').each((index, element) => {
                const dataURI = $(element).attr('src')
                const groups = dataURIRegex.exec(dataURI).groups
                const image: ITemplateImage = {
                    contentType: groups.mime,
                    content: Buffer.from(groups.data, groups.encoding),
                    key: `image${index}`
                }
                $(element).attr('src', image.key);
                images.push(image);
            })
            return Promise.all([
                Promise.resolve($.html()),
                db.UploadImages(templateId, images)
            ])
        }).then(([tmpHTML, imageLocs] : [string, {key: string, location: string}[]]) => {
            Logger.info({message: `Uploaded ${imageLocs.length} images for template ${templateId}`});
            const $ = cheerio.load(tmpHTML)
            imageLocs.forEach((image: {key: string, location: string}) => {
                $(`img[src=${image.key}]`).attr('src', image.location);
            });
            return db.UploadProcessedHTML(templateId, $.html())
        }).then(() => {
            Logger.info({message: `Updated html for template ${templateId}`});
            return {
                statusCode: 400,
            }
        }).catch(err => {
            Logger.logError(err);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: err.message,
                    code: ErrorCode.TS8,
                }),
            };
        })
    } else {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'No S3 create event',
                code: ErrorCode.TS9,
            })
        }
    }
}