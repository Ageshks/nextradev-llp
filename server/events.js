import { EventEmitter } from 'node:events';

export const workforceEvents = new EventEmitter();
workforceEvents.setMaxListeners(0);

