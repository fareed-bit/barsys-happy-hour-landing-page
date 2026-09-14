import {HttpError} from './model.mjs';
import {defaultPreparation, validatePreparation, preparationSummary} from './preparation.mjs';
import {defaultEvent} from './operations.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fail = message => { throw new HttpError(422, message); };
const recipeContent = r => ({id:r.id, name:r.name, share:r.share, ingredients:r.ingredients});

// Pure change planning. The API must atomically save both returned documents.
export function applyPreparationChange(original, input, previous, actor, now = new Date().toISOString()) {
  const before = original.preparation || defaultPreparation(original.payload);
  const plan = validatePreparation(input, original.payload);
  const event = previous.events[original.id] || defaultEvent();
  const changed = ['drinksPerGuest','bufferPercent','machines','menuConfirmed','costOverrides']
    .filter(key => !same(before[key], plan[key]));
  const recipeChanged = plan.recipes.filter((r,i) => !same(recipeContent(before.recipes[i]), recipeContent(r)));
  const measurementsChanged = plan.recipes.filter((r,i) => !same(before.recipes[i].ingredients,r.ingredients) || before.recipes[i].name !== r.name);
  if (!same(before.recipes, plan.recipes)) changed.push('recipes');
  const quantityChanged = Object.keys(plan.equipment).filter(id => before.equipment[id].quantity !== plan.equipment[id].quantity);
  if (!same(before.equipment, plan.equipment)) changed.push('equipment');
  const material = recipeChanged.length > 0 || quantityChanged.length > 0 ||
    ['drinksPerGuest','bufferPercent','machines'].some(key => changed.includes(key));
  if (changed.length && event.stage >= 8) fail('This event is closed. Reopen it through operations before editing preparation.');
  if (material && event.stage >= 3) fail('Preparation quantities are locked at packing or later. Resolve the event workflow before changing the plan.');
  if (material && previous.reservations.some(r => r.eventId === original.id && ['reserved','dispatched'].includes(r.status)))
    fail('Release reserved stock or receive dispatched stock before changing preparation quantities. Nothing was saved.');
  const accepted = original.acceptances?.at(-1);
  if (changed.includes('machines') && (accepted || event.acceptedProposalRevision)) {
    const agreedMachines = accepted?.plan?.machines ?? before.machines;
    if (plan.machines !== agreedMachines) fail('Machine allocation is part of the accepted proposal. Accept a revised proposal to change it.');
  }
  if (event.stage >= 4 && changed.some(key => key !== 'costOverrides'))
    fail('Preparation is read-only after dispatch. Record returns and service notes in operations; cost references may still be reviewed.');
  const impact = {changed, material, warnings:[]};
  if (!changed.length) return {doc:original, state:previous, impact, unchanged:true};
  const doc = structuredClone(original), state = structuredClone(previous);
  const next = state.events[doc.id] ||= defaultEvent();
  if (material) {
    plan.menuConfirmed = false;
    measurementsChanged.forEach(r => { r.confirmed = false; });
    Object.values(plan.equipment).forEach(item => { item.packed = false; });
    next.stage = Math.min(next.stage, 1);
    const reset = defaultEvent().tasks;
    for (const step of [1,2,3]) next.tasks[step] = reset[step];
    next.preparationNeedsReview = true;
    impact.warnings.push('Planning, purchasing and packing checks were reset. Review and confirm the saved preparation before advancing.');
    if (changed.includes('machines') && doc.proposal && !accepted) {
      doc.proposal.sourceStale = true;
      Object.keys(doc.proposal.plan.confirmed).forEach(key => { doc.proposal.plan.confirmed[key] = false; });
      impact.warnings.push('The draft proposal must be reviewed against the new machine allocation.');
    }
  } else if ((before.menuConfirmed && !plan.menuConfirmed) || plan.recipes.some((r,i) => before.recipes[i].confirmed && !r.confirmed)) {
    next.preparationNeedsReview = true;
    next.stage = Math.min(next.stage, 1);
    const reset = defaultEvent().tasks;
    for (const step of [1,2,3]) next.tasks[step] = reset[step];
    impact.warnings.push('Preparation approval was withdrawn. Review the saved menu before advancing.');
  } else if (next.preparationNeedsReview && preparationSummary(doc.payload, plan).complete) {
    next.preparationNeedsReview = false;
  }
  doc.preparation = plan;
  doc.version++;
  doc.updatedAt = now;
  doc.history.push({at:now, actor, action:'Preparation updated', changed, material});
  state.version++;
  state.audit.push({at:now, actor, action:'preparation-update', eventId:doc.id, changed, material});
  // Never replace reservations, receipts, payments, accepted snapshots or agreed figures.
  return {doc, state, impact, unchanged:false};
}
