import {createHash} from 'node:crypto';
export const receiptKey=r=>createHash('sha256').update(JSON.stringify([r.itemId,r.supplier.toLowerCase(),r.reference.toLowerCase()])).digest('hex');
