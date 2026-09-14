// Customer-facing label for an inquiry. Internal id (doc.id UUID) is unchanged.
// Format: `{Company} × Barsys Happy Hour — {Event date}`
// Fallback when company missing: first name from email localpart.
// Fallback when date missing: label omits the date suffix.
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const titlecase=s=>s.replace(/\S+/g,w=>w.length<=2&&w===w.toUpperCase()?w:w.charAt(0).toUpperCase()+w.slice(1).toLowerCase());
const nameFromEmail=email=>{
 const local=String(email||'').split('@')[0]||'';
 const first=local.split(/[.\-_+]/)[0]||'';
 return first?titlecase(first):'';
};
const nameFromCompany=company=>{const s=String(company||'').trim();return s?titlecase(s):'';};
const formatDate=iso=>{
 if(typeof iso!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(iso))return '';
 const [y,m,d]=iso.split('-').map(Number);
 if(m<1||m>12||d<1||d>31)return '';
 return `${MONTHS[m-1]} ${d}, ${y}`;
};
export function customerInquiryLabel(doc){
 const details=doc?.payload?.details||{};
 const who=nameFromCompany(details.company)||nameFromEmail(details.email)||'Guest';
 const when=formatDate(details.date);
 const base=`${who} × Barsys Happy Hour`;
 return when?`${base} — ${when}`:base;
}
// URL/filename-safe slug of the same label, for downloads.
export function customerInquirySlug(doc){
 return customerInquiryLabel(doc)
  .replace(/×/g,'x')
  .replace(/[^A-Za-z0-9]+/g,'-')
  .replace(/^-+|-+$/g,'')
  .slice(0,80)||'proposal';
}
