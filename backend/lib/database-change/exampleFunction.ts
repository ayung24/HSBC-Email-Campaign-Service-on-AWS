import * as db from "./dbOperations";
import { IDBResponse, RecordStatus } from "./interfaces";

export const handler = async (event: any = {}) : Promise <any> => {

    // body of some lambda handler
    let operationResponse: IDBResponse = db.AddMetadataEntry({
        TemplateID: "test12345",
        Name: "test",
        TimeCreated: new Date(),
        // Status: RecordStatus.IN_SERVICE // default
    })

    console.log(`add succeeded?: ${operationResponse.Succeeded},
        info: ${operationResponse.Info}`)
  };