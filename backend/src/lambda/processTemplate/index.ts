import * as AWS from 'aws-sdk';
import { S3CreateEvent} from 'aws-lambda'
import { nonEmptyArray } from '../../commonFunctions';
import * as db from '../../database/dbOperations'
import * as cheerio from 'cheerio';
import { ITemplateImage } from '../../database/dbInterfaces';
import { ErrorCode } from '../../errorCode'

const dataURIRegex = /\s*data:(?<mime>[a-z-]+\/[a-z\-+]+);(?<encoding>base64)?,(?<data>[a-z0-9!$&',()*+;=\-._~:@/?%\s]*\s*)/gi
const imageBucketUrl = `https://s3.amazonaws.com/images/`

export const handler = async function (event: S3CreateEvent) {
    if (nonEmptyArray(event.Records)) {
        const uploadEvent = event.Records[0];
        const templateId = decodeURIComponent(uploadEvent.s3.object.key.replace(/\+/g, ' '));
        console.info(`Received S3 creat event: ${JSON.stringify(uploadEvent)}`)

        return db.GetHTMLById(templateId).then((html: string) => {
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
                const newSrc = `${imageBucketUrl}/${templateId}/${image.key}`
                $(element).attr('src', newSrc);
                images.push(image);
            })
            const processedHtml = $.html();
            return Promise.all([db.UploadHTML(templateId, processedHtml), db.UploadImages(images)])
        }).then(([htmlUrl, imageUrls] : [string, string[]]) => {
            console.info(`Updated html for template ${templateId}`)
            console.info(`Uploaded ${imageUrls.length} images for template ${templateId}`);
            return {
                statusCode: 400,
            }
        }).catch(err => {
            console.log(`Error: ${err.message}`);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: err.message,
                    code: ErrorCode.TS8,
                }),
            };
        })
    } else {
        return Promise.resolve({
            statusCode: 500,
            body: JSON.stringify({
                message: 'No S3 create event',
                code: ErrorCode.TS9,
            })
        })
    }
}