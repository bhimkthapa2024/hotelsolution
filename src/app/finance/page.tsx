import { getAccounts, getConfig, getAccountCategories } from "@/actions/hotel";
import FinanceClient from "./FinanceClient";

export default async function FinanceEntryServer() {
  const [accounts, config, categories] = await Promise.all([
    getAccounts(),
    getConfig(),
    getAccountCategories()
  ]);

  return <FinanceClient accounts={accounts} config={config} categories={categories} />;
}
