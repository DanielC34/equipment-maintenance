import { PrismaClient, Role, EquipmentStatus, MaintenanceStatus, Priority } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create Factory
  const factory = await prisma.factory.create({
    data: {
      name: 'Main Assembly Plant',
      location: 'Detroit, MI',
    },
  });
  console.log(`Created factory: ${factory.name}`);

  // Create Users
  await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'hashed_password_placeholder',
      role: Role.ADMINISTRATOR,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Supervisor User',
      email: 'supervisor@example.com',
      password: 'hashed_password_placeholder',
      role: Role.SUPERVISOR,
    },
  });

  const technician = await prisma.user.create({
    data: {
      name: 'Technician User',
      email: 'technician@example.com',
      password: 'hashed_password_placeholder',
      role: Role.TECHNICIAN,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Operator User',
      email: 'operator@example.com',
      password: 'hashed_password_placeholder',
      role: Role.OPERATOR,
    },
  });
  console.log(`Created users: Admin, Supervisor, Technician, Operator`);

  // Create Equipment
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
  console.log(`Created 3 equipment items.`);

  // Create Maintenance Tasks
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
  console.log(`Created 3 maintenance tasks.`);

  // Create Maintenance Records
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
  console.log(`Created 2 maintenance records.`);

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
