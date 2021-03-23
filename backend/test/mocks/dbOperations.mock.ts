import * as db from '../../src/database/dbOperations'

/**
 * DB operation function mocks
 */
export const AddTemplate = jest.fn();
export const ListMetadataByDate = jest.fn();
export const GetMetadataByID = jest.fn(db.GetTemplateById);
export const GetHTMLByID = jest.fn();
export const DeleteTemplateById = jest.fn();
