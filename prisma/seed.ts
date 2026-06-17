import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 0. Create Admin user (password-based login)
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@kostfind.com' },
    update: { role: 'admin', isVerified: true, isActive: true, password_hash: adminPasswordHash },
    create: {
      id: 'user-admin-1',
      name: 'Administrator',
      email: 'admin@kostfind.com',
      password_hash: adminPasswordHash,
      role: 'admin',
      isVerified: true,
      isActive: true,
      avatar_url: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=100&q=80',
    },
  });

  // 0b. Seed default SiteConfig (global website settings editable by admin)
  const defaultConfig: { key: string; value: string; type: string; isPublic: boolean }[] = [
    { key: 'site_name', value: 'KostFind', type: 'string', isPublic: true },
    { key: 'tagline', value: 'Platform Kos Digital Mahasiswa & Pekerja Muda', type: 'string', isPublic: true },
    { key: 'hero_title', value: 'Cari kost nyaman tanpa cemas foto menipu.', type: 'string', isPublic: true },
    { key: 'support_email', value: 'support@kostfind.com', type: 'string', isPublic: true },
    { key: 'support_phone', value: '+62812345678', type: 'string', isPublic: true },
    { key: 'social_instagram', value: '', type: 'string', isPublic: true },
    { key: 'social_twitter', value: '', type: 'string', isPublic: true },
    { key: 'cities', value: JSON.stringify(['Palopo', 'Jakarta', 'Bandung', 'Surabaya']), type: 'json', isPublic: true },
    { key: 'primary_color', value: 'emerald', type: 'string', isPublic: true },
    { key: 'feature_smart_alerts', value: 'true', type: 'boolean', isPublic: true },
    { key: 'feature_estimator', value: 'true', type: 'boolean', isPublic: true },
  ];
  for (const cfg of defaultConfig) {
    await prisma.siteConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: cfg,
    });
  }

  // 1. Create Users
  const seeker = await prisma.user.upsert({
    where: { email: 'ahmad.faisal@example.com' },
    update: {},
    create: {
      id: 'user-seeker-1',
      name: 'Ahmad Faisal',
      email: 'ahmad.faisal@example.com',
      role: 'seeker',
      isVerified: true,
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: 'budi.santoso@example.com' },
    update: {},
    create: {
      id: 'user-owner-1',
      name: 'Budi Santoso',
      email: 'budi.santoso@example.com',
      role: 'owner',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80',
    },
  });

  // 2. Create Properties
  const prop1 = await prisma.property.upsert({
    where: { id: 'prop-1' },
    update: {},
    create: {
      id: 'prop-1',
      ownerId: owner.id,
      name: 'Kost Menteng Suite',
      city: 'Jakarta',
      address: 'Jl. Menteng Raya No. 12, Jakarta Pusat',
      lat: -6.1847,
      lng: 106.8302,
      facilities: {
        connectOrCreate: [
          { where: { name: 'WiFi' }, create: { name: 'WiFi' } },
          { where: { name: 'AC' }, create: { name: 'AC' } },
          { where: { name: 'Parking' }, create: { name: 'Parking' } },
          { where: { name: 'Bathroom' }, create: { name: 'Bathroom' } },
          { where: { name: 'Security' }, create: { name: 'Security' } },
        ],
      },
      status: 'active',
      isVerified: true,
    },
  });

  const prop2 = await prisma.property.upsert({
    where: { id: 'prop-2' },
    update: {},
    create: {
      id: 'prop-2',
      ownerId: owner.id,
      name: 'Dago Asri Residence',
      city: 'Bandung',
      address: 'Jl. Dago Asri No. 45, Bandung Utara',
      lat: -6.8872,
      lng: 107.6153,
      facilities: {
        connectOrCreate: [
          { where: { name: 'WiFi' }, create: { name: 'WiFi' } },
          { where: { name: 'AC' }, create: { name: 'AC' } },
          { where: { name: 'Bathroom' }, create: { name: 'Bathroom' } },
          { where: { name: 'Laundry' }, create: { name: 'Laundry' } },
        ],
      },
      status: 'inactive',
    },
  });

  const prop3 = await prisma.property.upsert({
    where: { id: 'prop-3' },
    update: {},
    create: {
      id: 'prop-3',
      ownerId: owner.id,
      name: 'Tunjungan Luxury Kost',
      city: 'Surabaya',
      address: 'Jl. Tunjungan Gg. 3 No. 5, Surabaya',
      lat: -7.2619,
      lng: 112.7411,
      facilities: {
        connectOrCreate: [
          { where: { name: 'WiFi' }, create: { name: 'WiFi' } },
          { where: { name: 'AC' }, create: { name: 'AC' } },
          { where: { name: 'Parking' }, create: { name: 'Parking' } },
          { where: { name: 'Bathroom' }, create: { name: 'Bathroom' } },
          { where: { name: 'Security' }, create: { name: 'Security' } },
        ],
      },
      status: 'active',
      isVerified: true,
    },
  });

  const prop4 = await prisma.property.upsert({
    where: { id: 'prop-4' },
    update: {},
    create: {
      id: 'prop-4',
      ownerId: owner.id,
      name: 'Kost Cokroaminoto Palopo',
      city: 'Palopo',
      address: 'Jl. Andi Djemma No. 12, Wara, Kota Palopo',
      lat: -2.9926,
      lng: 120.1923,
      facilities: {
        connectOrCreate: [
          { where: { name: 'WiFi' }, create: { name: 'WiFi' } },
          { where: { name: 'AC' }, create: { name: 'AC' } },
          { where: { name: 'Bathroom' }, create: { name: 'Bathroom' } },
          { where: { name: 'Parking' }, create: { name: 'Parking' } },
        ],
      },
      status: 'inactive',
    },
  });

  // 3. Create Rooms
  await prisma.room.upsert({
    where: { id: 'room-1-1' },
    update: {},
    create: { id: 'room-1-1', propertyId: prop1.id, roomNumber: '101', priceMonthly: 2500000, status: 'available' },
  });
  await prisma.room.upsert({
    where: { id: 'room-1-2' },
    update: {},
    create: { id: 'room-1-2', propertyId: prop1.id, roomNumber: '102', priceMonthly: 2500000, status: 'available' },
  });
  await prisma.room.upsert({
    where: { id: 'room-1-3' },
    update: {},
    create: { id: 'room-1-3', propertyId: prop1.id, roomNumber: '103', priceMonthly: 2700000, status: 'occupied' },
  });

  await prisma.room.upsert({
    where: { id: 'room-2-1' },
    update: {},
    create: { id: 'room-2-1', propertyId: prop2.id, roomNumber: 'A', priceMonthly: 1850000, status: 'available' },
  });
  await prisma.room.upsert({
    where: { id: 'room-2-2' },
    update: {},
    create: { id: 'room-2-2', propertyId: prop2.id, roomNumber: 'B', priceMonthly: 1850000, status: 'occupied' },
  });

  await prisma.room.upsert({
    where: { id: 'room-3-1' },
    update: {},
    create: { id: 'room-3-1', propertyId: prop3.id, roomNumber: 'Suite 1', priceMonthly: 3200000, status: 'available' },
  });
  await prisma.room.upsert({
    where: { id: 'room-3-2' },
    update: {},
    create: { id: 'room-3-2', propertyId: prop3.id, roomNumber: 'Suite 2', priceMonthly: 3200000, status: 'renovation' },
  });

  await prisma.room.upsert({
    where: { id: 'room-4-1' },
    update: {},
    create: { id: 'room-4-1', propertyId: prop4.id, roomNumber: 'A-01', priceMonthly: 1200000, status: 'available' },
  });
  await prisma.room.upsert({
    where: { id: 'room-4-2' },
    update: {},
    create: { id: 'room-4-2', propertyId: prop4.id, roomNumber: 'A-02', priceMonthly: 1300000, status: 'available' },
  });

  // 4. Create Watchlist
  await prisma.watchlist.upsert({
    where: { seekerId_propertyId: { seekerId: seeker.id, propertyId: prop1.id } },
    update: {},
    create: {
      id: 'wl-1',
      seekerId: seeker.id,
      propertyId: prop1.id,
    },
  });

  // 5. Create SmartAlert
  await prisma.smartAlert.upsert({
    where: { id: 'a-1' },
    update: {},
    create: {
      id: 'a-1',
      seekerId: seeker.id,
      city: 'Jakarta',
      maxPrice: 3000000,
      keywords: {
        connectOrCreate: [
          { where: { word: 'wifi' }, create: { word: 'wifi' } },
        ],
      },
    },
  });

  // 6. Create Conversation & Messages
  const conv = await prisma.conversation.upsert({
    where: { id: 'conv-1' },
    update: {},
    create: {
      id: 'conv-1',
      seekerId: seeker.id,
      ownerId: owner.id,
      propertyId: prop1.id,
      lastMessage: 'Halo! Kamar masih tersedia, silakan tanyakan detailnya.',
      unreadCount: 0,
    },
  });

  await prisma.message.upsert({
    where: { id: 'msg-1' },
    update: {},
    create: {
      id: 'msg-1',
      conversationId: conv.id,
      senderId: owner.id,
      content: 'Halo! Kamar masih tersedia, silakan tanyakan detailnya.',
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
