import test from 'node:test';import assert from 'node:assert/strict';
import {customerInquiryLabel,customerInquirySlug} from '../admin/inquiry-label.js';
const doc=(overrides={})=>({id:'ffffffff-ffff-ffff-ffff-ffffffffffff',payload:{details:{company:'DataDome',email:'jane@datadome.co',date:'2026-09-19',...overrides}}});
test('label uses titlecased company and formatted date',()=>{
 assert.equal(customerInquiryLabel(doc()),'Datadome × Barsys Happy Hour — Sep 19, 2026');
});
test('label falls back to email localpart first name when company empty',()=>{
 assert.equal(customerInquiryLabel(doc({company:''})),'Jane × Barsys Happy Hour — Sep 19, 2026');
 assert.equal(customerInquiryLabel(doc({company:'',email:'fareed@barsys.com'})),'Fareed × Barsys Happy Hour — Sep 19, 2026');
 assert.equal(customerInquiryLabel(doc({company:'',email:'jane.smith@acme.com'})),'Jane × Barsys Happy Hour — Sep 19, 2026');
 assert.equal(customerInquiryLabel(doc({company:'',email:'mary_ann+events@example.io'})),'Mary × Barsys Happy Hour — Sep 19, 2026');
});
test('label preserves ALL-CAPS acronyms of length <=2',()=>{
 assert.equal(customerInquiryLabel(doc({company:'AT Consulting'})),'AT Consulting × Barsys Happy Hour — Sep 19, 2026');
});
test('label omits date when missing or malformed',()=>{
 assert.equal(customerInquiryLabel(doc({date:''})),'Datadome × Barsys Happy Hour');
 assert.equal(customerInquiryLabel(doc({date:'not-a-date'})),'Datadome × Barsys Happy Hour');
 assert.equal(customerInquiryLabel(doc({date:'2026-13-40'})),'Datadome × Barsys Happy Hour');
});
test('label falls back to Guest when company and email both empty',()=>{
 assert.equal(customerInquiryLabel(doc({company:'',email:''})),'Guest × Barsys Happy Hour — Sep 19, 2026');
});
test('label is safe when payload or details missing',()=>{
 assert.equal(customerInquiryLabel({}),'Guest × Barsys Happy Hour');
 assert.equal(customerInquiryLabel({payload:{}}),'Guest × Barsys Happy Hour');
 assert.equal(customerInquiryLabel(null),'Guest × Barsys Happy Hour');
});
test('slug is URL-safe and matches label semantics',()=>{
 assert.equal(customerInquirySlug(doc()),'Datadome-x-Barsys-Happy-Hour-Sep-19-2026');
 assert.equal(customerInquirySlug(doc({company:'',email:'jane.smith@acme.com'})),'Jane-x-Barsys-Happy-Hour-Sep-19-2026');
 assert.equal(customerInquirySlug(doc({date:''})),'Datadome-x-Barsys-Happy-Hour');
});
test('slug caps length at 80 chars',()=>{
 const long='A'.repeat(200);
 assert.ok(customerInquirySlug(doc({company:long})).length<=80);
});
test('notification subject and body carry the friendly label, staff email keeps UUID',async()=>{
 const {inquiryNotifications}=await import('../backend/notifications.mjs');
 const n=inquiryNotifications(doc());
 assert.equal(n.customer.subject,'Barsys inquiry received — Datadome × Barsys Happy Hour — Sep 19, 2026');
 assert.match(n.customer.text,/Reference: Datadome × Barsys Happy Hour — Sep 19, 2026/);
 assert.doesNotMatch(n.customer.text,/ffffffff-/);
 assert.doesNotMatch(n.customer.subject,/ffffffff-/);
 assert.equal(n.internal.subject,'New Barsys inquiry — ffffffff-ffff-ffff-ffff-ffffffffffff');
 assert.match(n.internal.text,/Inquiry ID: ffffffff-/);
 assert.match(n.internal.text,/Label: Datadome × Barsys Happy Hour/);
 assert.equal(n.inquiryId,'ffffffff-ffff-ffff-ffff-ffffffffffff');
});
