import { prisma } from "../database/prisma.js";

function utcTime(hours: number, minutes: number): Date {
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
}

/** Default Mon–Fri 09:00–17:00 for the primary clinic doctor when a tenant is created. */
export async function seedDefaultWorkHours(tenantId: string, clinicDoctorId: string): Promise<void> {
  const days = ["mon", "tue", "wed", "thu", "fri"];
  await prisma.workHour.createMany({
    data: days.map((dayOfWeek) => ({
      tenantId,
      doctorId: clinicDoctorId,
      dayOfWeek,
      startTime: utcTime(9, 0),
      endTime: utcTime(17, 0),
      isActive: true,
    })),
  });
}
