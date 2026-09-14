// Review-only drafts. No transport, credentials, tracking pixels or automatic sending.
import {customerInquiryLabel} from '../admin/inquiry-label.js';
export function inquiryNotifications(doc){
 const d=doc.payload.details;const label=customerInquiryLabel(doc);
 const customer={to:d.email,replyTo:'fareed@barsys.com',subject:`Barsys inquiry received — ${label}`,text:`Hi ${d.name},\n\nWe received your Barsys event inquiry.\nReference: ${label}\n\nOur team will review your requested event and follow up about availability, scope and pricing. This inquiry does not hold a date or create a booking, agreement or payment.\n\nQuestions? Reply to fareed@barsys.com.\n\nBarsys Events`};
 const internal={to:'fareed@barsys.com',subject:`New Barsys inquiry — ${doc.id}`,text:`New event inquiry received.\nInquiry ID: ${doc.id}\nLabel: ${label}\n\nReview the event in the authenticated dashboard. Contact details and event requirements are kept there.\n\nNo date is held and no payment has been taken.`};
 return {deliveryEnabled:false,status:'draft_only',inquiryId:doc.id,customer,internal};
}
