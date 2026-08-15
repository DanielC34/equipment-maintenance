import 'dotenv/config';
import {
  PrismaClient,
  Role,
  EquipmentStatus,
  MaintenanceStatus,
  Priority,
  DowntimeReason,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const DEMO_PASSWORD = 'password123';

async function main() {
  console.log('Starting database seed...');

  await prisma.downtimeEvent.deleteMany();
  await prisma.partUsed.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.maintenanceTask.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.factory.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const factory = await prisma.factory.create({
    data: {
      name: 'Main Assembly Plant',
      location: 'Detroit, MI',
    },
  });
  console.log(`Created factory: ${factory.name}`);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@emms.dev',
      password: passwordHash,
      role: Role.ADMINISTRATOR,
    },
  });

  const supervisor = await prisma.user.create({
    data: {
      name: 'Supervisor User',
      email: 'supervisor@emms.dev',
      password: passwordHash,
      role: Role.SUPERVISOR,
    },
  });

  const technician = await prisma.user.create({
    data: {
      name: 'Technician User',
      email: 'technician@emms.dev',
      password: passwordHash,
      role: Role.TECHNICIAN,
    },
  });

  const operator = await prisma.user.create({
    data: {
      name: 'Operator User',
      email: 'operator@emms.dev',
      password: passwordHash,
      role: Role.OPERATOR,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Plant Manager User',
      email: 'manager@emms.dev',
      password: passwordHash,
      role: Role.PLANT_MANAGER,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Reliability Engineer User',
      email: 'reliability@emms.dev',
      password: passwordHash,
      role: Role.RELIABILITY_ENGINEER,
    },
  });
  console.log(
    'Created users: Admin, Supervisor, Technician, Operator, Plant Manager, Reliability Engineer'
  );

  const equipment1 = await prisma.equipment.create({
    data: {
      name: 'CNC Milling Machine',
      assetNumber: 'CNC-001',
      description: '5-axis CNC mill for precision parts',
      location: 'Section A',
      status: EquipmentStatus.OPERATIONAL,
      criticality: 'High',
      factoryId: factory.id,
    },
  });

  const equipment2 = await prisma.equipment.create({
    data: {
      name: 'Conveyor Belt System',
      assetNumber: 'CON-002',
      description: 'Main assembly line conveyor',
      location: 'Section B',
      status: EquipmentStatus.UNDER_MAINTENANCE,
      criticality: 'Medium',
      factoryId: factory.id,
    },
  });

  const equipment3 = await prisma.equipment.create({
    data: {
      name: 'Industrial Robot Arm',
      assetNumber: 'ROB-003',
      description: 'Welding robot',
      location: 'Section C',
      status: EquipmentStatus.OPERATIONAL,
      criticality: 'High',
      factoryId: factory.id,
    },
  });

  const equipment4 = await prisma.equipment.create({
    data: {
      name: 'Hydraulic Press',
      assetNumber: 'HPR-004',
      description: 'Stamp line hydraulic press',
      location: 'Section D',
      status: EquipmentStatus.OFFLINE,
      criticality: 'Medium',
      factoryId: factory.id,
    },
  });
  console.log('Created 4 equipment items.');

  await prisma.maintenanceTask.create({
    data: {
      title: 'Monthly Calibration',
      description: 'Calibrate the CNC machine to ensure precision',
      status: MaintenanceStatus.SCHEDULED,
      priority: Priority.MEDIUM,
      scheduledDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      equipmentId: equipment1.id,
      assignedUserId: technician.id,
    },
  });

  await prisma.maintenanceTask.create({
    data: {
      title: 'Replace Conveyor Motor',
      description: 'Motor is overheating and needs replacement',
      status: MaintenanceStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      scheduledDate: new Date(),
      equipmentId: equipment2.id,
      assignedUserId: technician.id,
    },
  });

  await prisma.maintenanceTask.create({
    data: {
      title: 'Robot Arm Lubrication',
      description: 'Routine lubrication for joints',
      status: MaintenanceStatus.SCHEDULED,
      priority: Priority.LOW,
      scheduledDate: new Date(new Date().setDate(new Date().getDate() + 14)),
      equipmentId: equipment3.id,
      assignedUserId: technician.id,
    },
  });
  console.log('Created 3 maintenance tasks.');

  await prisma.maintenanceRecord.create({
    data: {
      equipmentId: equipment1.id,
      technicianId: technician.id,
      description: 'Replaced coolant pump',
      completedDate: new Date(new Date().setDate(new Date().getDate() - 5)),
      notes: 'Pump was leaking, replaced with new model.',
      partsUsed: {
        create: [
          { name: 'Coolant Pump', quantity: 1 },
          { name: 'Seal Kit', quantity: 2 },
        ],
      },
    },
  });

  await prisma.maintenanceRecord.create({
    data: {
      equipmentId: equipment3.id,
      technicianId: technician.id,
      description: 'Software update',
      completedDate: new Date(new Date().setDate(new Date().getDate() - 2)),
      notes: 'Updated to v2.4.1',
    },
  });
  console.log('Created 2 maintenance records.');

  await prisma.downtimeEvent.create({
    data: {
      equipmentId: equipment4.id,
      reportedById: operator.id,
      reason: DowntimeReason.HYDRAULIC,
      startedAt: new Date(new Date().setDate(new Date().getDate() - 3)),
      endedAt: new Date(
        new Date(new Date().setDate(new Date().getDate() - 3)).getTime() +
          95 * 60 * 1000
      ),
      status: 'RESOLVED',
      notes: 'Hydraulic pressure loss on the stamp line; pump seals replaced.',
    },
  });

  await prisma.downtimeEvent.create({
    data: {
      equipmentId: equipment1.id,
      reportedById: operator.id,
      reason: DowntimeReason.QUALITY,
      startedAt: new Date(new Date().setDate(new Date().getDate() - 1)),
      endedAt: new Date(
        new Date(new Date().setDate(new Date().getDate() - 1)).getTime() +
          35 * 60 * 1000
      ),
      status: 'RESOLVED',
      notes: 'Out-of-tolerance parts; halted for recalibration.',
    },
  });

  await prisma.downtimeEvent.create({
    data: {
      equipmentId: equipment4.id,
      reportedById: operator.id,
      reason: DowntimeReason.HYDRAULIC,
      startedAt: new Date(Date.now() - 20 * 60 * 1000),
      notes: 'Pressure dropping again; press stopped pending inspection.',
    },
  });
  console.log('Created 3 downtime events.');

  console.log(
    'Created admin and supervisor with known roles:',
    admin.role,
    supervisor.role
  );
  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
