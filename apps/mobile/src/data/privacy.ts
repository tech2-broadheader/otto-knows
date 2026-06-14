// Export-my-data / delete-my-data stubs wired to the store (story 1.4 AC4).
// These are intentionally thin: they enumerate the user's rows across tables.
// Sensitive entities go through their repositories so decryption + audit apply.
import type { Consent } from "@otto/schemas";
import {
  budgetCategoryRepository,
  consentRepository,
  makeBillRepository,
  makeIncomeRepository,
  makeMedicationRepository,
  makeTransactionRepository,
  reminderRepository,
  type RepositoryDeps,
} from "./repositories";

export interface ExportBundle {
  reminders: unknown[];
  budgetCategories: unknown[];
  bills: unknown[];
  income: unknown[];
  transactions: unknown[];
  medications: unknown[];
  consents: Consent[];
}

/** Gather all of a user's data into a single bundle (decrypted, audited). */
export async function exportMyData(userId: string, deps: RepositoryDeps): Promise<ExportBundle> {
  return {
    reminders: await reminderRepository.list(userId),
    budgetCategories: await budgetCategoryRepository.list(userId),
    bills: await makeBillRepository(deps).list(userId),
    income: await makeIncomeRepository(deps).list(userId),
    transactions: await makeTransactionRepository(deps).list(userId),
    medications: await makeMedicationRepository(deps).list(userId),
    consents: await consentRepository.list(userId),
  };
}

/**
 * Delete all of a user's data. Sensitive deletes are audited per-entity via the
 * repositories. This is a stub: it deletes what the current repositories expose
 * and is the hook for the full "right to erasure" flow (DPA).
 */
export async function deleteMyData(userId: string, deps: RepositoryDeps): Promise<void> {
  const billRepo = makeBillRepository(deps);
  const incomeRepo = makeIncomeRepository(deps);
  const txRepo = makeTransactionRepository(deps);
  const medRepo = makeMedicationRepository(deps);

  for (const bill of await billRepo.list(userId)) await billRepo.delete(userId, bill.id);
  for (const inc of await incomeRepo.list(userId)) await incomeRepo.delete(userId, inc.id);
  for (const tx of await txRepo.list(userId)) await txRepo.delete(userId, tx.id);
  for (const med of await medRepo.list(userId)) await medRepo.delete(userId, med.id);
  for (const rem of await reminderRepository.list(userId)) await reminderRepository.delete(rem.id);
  for (const cat of await budgetCategoryRepository.list(userId))
    await budgetCategoryRepository.delete(cat.id);
  for (const con of await consentRepository.list(userId)) await consentRepository.delete(con.id);
}
