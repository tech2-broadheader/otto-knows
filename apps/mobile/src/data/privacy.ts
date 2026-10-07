// Export-my-data (story 1.4 AC4 / 13.6 AC2): every record Otto keeps for the
// user, in one bundle. Sensitive entities go through their repositories so they
// are decrypted and each read is audited. Erasure is lib/account.ts
// (wipeLocalData), which clears every table and the encryption key.
import type {
  Account,
  Appointment,
  AuditEntry,
  Bill,
  BudgetCategory,
  Consent,
  Income,
  Medication,
  Note,
  Reminder,
  Routine,
  Transaction,
  UserSettings,
} from "@otto/schemas";
import {
  appointmentRepository,
  auditRepository,
  budgetCategoryRepository,
  consentRepository,
  makeAccountRepository,
  makeBillRepository,
  makeIncomeRepository,
  makeMedicationRepository,
  makeTransactionRepository,
  noteRepository,
  reminderRepository,
  routineRepository,
  settingsRepository,
  type RepositoryDeps,
} from "./repositories";
import { newUuid } from "../lib/id";

export interface ExportBundle {
  settings: UserSettings | null;
  routine: Routine | null;
  accounts: Account[];
  transactions: Transaction[];
  budgetCategories: BudgetCategory[];
  bills: Bill[];
  income: Income[];
  reminders: Reminder[];
  notes: Note[];
  appointments: Appointment[];
  medications: Medication[];
  consents: Consent[];
  auditLog: AuditEntry[];
}

/** Gather all of a user's data into one bundle (decrypted; the export is audited). */
export async function exportMyData(userId: string, deps: RepositoryDeps): Promise<ExportBundle> {
  const bundle: Omit<ExportBundle, "auditLog"> = {
    settings: (await settingsRepository.get(userId)) ?? null,
    routine: (await routineRepository.getForUser(userId)) ?? null,
    accounts: await makeAccountRepository(deps).list(userId),
    transactions: await makeTransactionRepository(deps).list(userId),
    budgetCategories: await budgetCategoryRepository.list(userId),
    bills: await makeBillRepository(deps).list(userId),
    income: await makeIncomeRepository(deps).list(userId),
    reminders: await reminderRepository.list(userId),
    notes: await noteRepository.list(userId),
    appointments: await appointmentRepository.list(userId),
    medications: await makeMedicationRepository(deps).list(userId),
    consents: await consentRepository.list(userId),
  };
  await deps.writeAudit({
    id: newUuid(),
    userId,
    entity: "all",
    action: "export",
    actor: "user",
    at: new Date().toISOString(),
    note: "Export my data",
  });
  // Read last so the log in the file includes this export.
  return { ...bundle, auditLog: await auditRepository.list(userId) };
}
