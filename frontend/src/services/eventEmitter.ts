export class EventEmitter {
    private static instance: EventEmitter;
    private _events: Map<string, Array<() => void>> = new Map();

    public static getInstance(): EventEmitter {
        if (!EventEmitter.instance) {
            EventEmitter.instance = new EventEmitter();
        }
        return EventEmitter.instance;
    }

    public dispatch(event: string): void {
        let callbacks = this._events.get(event);
        if (!callbacks) {
            callbacks = [];
        }
        callbacks.forEach(callback => callback());
    }

    public subscribe(event: string, callback: () => void): void {
        let callbacks = this._events.get(event);
        if (!callbacks) {
            callbacks = [];
        }
        callbacks.push(callback);
        this._events.set(event, callbacks);
    }
}
