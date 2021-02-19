// const SORT_KEY_SEP = '--'
// function generateTimeAndStatus(time: Date = new Date(), status: db.EntryStatus = db.EntryStatus.IN_SERVICE): { S: string } {
//     return {
//         S: db.EntryStatus[(status as unknown) as keyof typeof db.EntryStatus] +
//             SORT_KEY_SEP +
//             time.getTime()
//     };
// }

// function getTimeFromSortKey(key: string): number {
//     return parseInt(key.split(SORT_KEY_SEP)[1]);
// }

// function getStatusFromSortKey(key: string): db.EntryStatus {
//     return db.EntryStatus[key.split(SORT_KEY_SEP)[0] as keyof typeof db.EntryStatus];
// }