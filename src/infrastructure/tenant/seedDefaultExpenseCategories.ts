import { prisma } from "../database/prisma.js";

const DEFAULT_GROUPS: { name: string; subs: string[] }[] = [
  { name: "Operations", subs: ["General"] },
  { name: "Medical Supplies", subs: ["Consumables"] },
  { name: "Administrative", subs: ["Office"] },
];

export async function seedDefaultExpenseCategories(tenantId: string): Promise<void> {
  for (const g of DEFAULT_GROUPS) {
    const cat = await prisma.expenseCategory.create({
      data: { tenantId, name: g.name },
    });
    await prisma.expenseSubcategory.createMany({
      data: g.subs.map((name) => ({ tenantId, categoryId: cat.id, name })),
    });
  }
}
