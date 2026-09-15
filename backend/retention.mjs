import {retirementBlock} from './event-retirement.mjs';
import {HttpError} from './model.mjs';
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
function afterMonths(value,months){const d=new Date(value);if(!Number.isFinite(+d))return null;const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));return d.toISOString().slice(0,10);}
export function retentionView(doc,kind,meta={},operations={},now=Date.now()){
 const core=kind==='event'&&(!!operations.events?.[doc.id]||!!doc.acceptances?.length||!!doc.booking?.confirmed||['confirmed','completed'].includes(doc.status));
 let reviewAt=null,reason;
 if(kind==='mail'){const date=new Date(doc.receivedAt);if(Number.isFinite(+date))reviewAt=new Date(+date+90*86400000).toISOString().slice(0,10);reason='90-day email copy; check active-event links before removal';}
 else if(core){if(operations.events?.[doc.id]?.stage===8&&meta.closedOn&&meta.taxDate)reviewAt=afterMonths([meta.closedOn,meta.taxDate].sort().at(-1),84);reason=reviewAt?'Seven-year core record review':'Keep: confirm financial closeout and relevant tax filing/due date';}
 else{reviewAt=afterMonths(doc.createdAt,12);reason='12-month inquiry review; confirm it was not converted';}
 return {retirementBlock:core?retirementBlock(doc,meta,operations,now):'Not a completed event.',id:kind==='mail'?doc.messageId:doc.id,recordVersion:doc.version||null,removalBlock:kind==='event'?disposalEligibilityForView(doc,meta,operations,now):mailDisposalEligibility(doc,meta,now),kind,hidden:!!doc.deleted,version:meta.version||0,hold:meta.hold||false,holdReason:meta.holdReason||'',closedOn:meta.closedOn||'',taxDate:meta.taxDate||'',reviewedAt:meta.reviewedAt||null,reviewAt,reason,status:meta.hold?'On hold':!reviewAt?'Needs dates':reviewAt<=new Date(now).toISOString().slice(0,10)?'Review due':'Keep',core};
}
export function retentionChange(input,old,actor){
 if(!input||!Number.isInteger(input.version)||input.version!==(old?.version||0))throw new HttpError(409,'Retention record changed. Reload before saving.');
 if(typeof input.hold!=='boolean'||typeof input.holdReason!=='string'||input.holdReason.length>500||input.hold&&!input.holdReason.trim())throw new HttpError(422,'Add a brief reason for the hold.');
 for(const key of ['closedOn','taxDate'])if(input[key]!==''&&!validDate(input[key]))throw new HttpError(422,'Use valid dates, or leave unknown dates blank.');
 return {version:input.version+1,hold:input.hold,holdReason:input.holdReason.trim(),closedOn:input.closedOn,taxDate:input.taxDate,reviewedAt:new Date().toISOString(),reviewedBy:actor};
}

export function disposalEligibility(doc,meta,ops,now=Date.now()){
 if(!doc||doc.disposedAt)return 'Record unavailable.';
 return disposalEligibilityForView(doc,meta||{},ops,now);
}

function disposalEligibilityForView(doc,meta,ops,now){if(meta.hold)return 'A hold prevents removal.';if(!meta.version)return 'Save a review first.';if(ops.events?.[doc.id]||ops.reservations?.some(r=>r.eventId===doc.id)||ops.audit?.some(r=>r.eventId===doc.id)||doc.source||doc.proposal||doc.preparation||doc.acceptances?.length||doc.booking?.confirmed||!['received','contacted','cancelled'].includes(doc.status))return 'Linked or progressed event: separate review required.';const due=afterMonths(doc.createdAt,12);return !due||due>new Date(now).toISOString().slice(0,10)?'Retention period has not expired.':null;}

export function mailDisposalEligibility(doc,meta={},now=Date.now()){
 if(!doc||doc.disposedAt)return 'Email copy unavailable.';
 if(meta.hold)return 'A hold prevents removal.';
 if(!meta.version)return 'Save a review first.';
 const received=Date.parse(doc.receivedAt);
 if(!Number.isFinite(received)||received+90*86400000>now)return 'Retention period has not expired.';
 return null;
}
