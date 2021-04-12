interface User {
    username: string;
    password: string;
}

// for concurrency tests
export const credentials: User[] = [
    {
        username: 'tester05',
        password: 'tester1234',
    },
    {
        username: 'tester06',
        password: 'tester1234',
    },
    {
        username: 'tester07',
        password: 'tester1234',
    },
    {
        username: 'tester08',
        password: 'tester1234',
    },
    {
        username: 'tester09',
        password: 'tester1234',
    },
    {
        username: 'tester10',
        password: 'tester1234',
    },
];
