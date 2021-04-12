// use this to make Credentials.ts with your usernames and passwords for running N02
interface User {
    username: string;
    password: string;
}

// for N02.test.tsx
export const credentials: User[] = [
    {
        username: 'user1',
        password: 'p1',
    },
    {
        username: 'user2',
        password: 'p2',
    },
];
