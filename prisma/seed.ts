import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { parseCopySection, readBackupFile } from './parse-backup';
import * as path from 'path';

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Helper functions
function toInt(val: string | null): number | null {
  if (val === null) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function toIntRequired(val: string | null): number {
  return parseInt(val!, 10);
}

function toDate(val: string | null): Date | null {
  if (val === null) return null;
  return new Date(val);
}

function toDateRequired(val: string | null): Date {
  return new Date(val!);
}

function toJson(val: string | null): any {
  if (val === null) return null;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

async function resetSequence(tableName: string, column: string = 'id') {
  const seqName = `${tableName}_${column}_seq`;
  await prisma.$executeRawUnsafe(
    `SELECT setval('${seqName}', COALESCE((SELECT MAX(${column}) FROM ${tableName}), 0) + 1, false)`,
  );
}

async function main() {
  const sqlContent = readBackupFile(path.join(__dirname, 'mall_backup.sql'));
  console.log('Backup file loaded');

  // ===== CLEAR ALL TABLES (reverse dependency order) =====
  console.log('Clearing tables...');
  await prisma.ibuyOrderItem.deleteMany();
  await prisma.ibuyOrder.deleteMany();
  await prisma.ibuyAdminRole.deleteMany();
  await prisma.ibuyRolePermission.deleteMany();
  await prisma.ibuyPermission.deleteMany();
  await prisma.ibuyMenu.deleteMany();
  await prisma.ibuyRole.deleteMany();
  await prisma.ibuyAdmin.deleteMany();
  await prisma.ibuySku.deleteMany();
  await prisma.ibuySpu.deleteMany();
  await prisma.ibuyCategoryBrand.deleteMany();
  await prisma.ibuyBrand.deleteMany();
  await prisma.ibuySpec.deleteMany();
  await prisma.ibuyPara.deleteMany();
  await prisma.ibuyTemplate.deleteMany();
  await prisma.ibuyCategory.deleteMany();
  await prisma.ibuyAlbum.deleteMany();
  await prisma.ibuyAddress.deleteMany();
  await prisma.ibuyMember.deleteMany();
  await prisma.ibuyArea.deleteMany();
  await prisma.ibuyCity.deleteMany();
  await prisma.ibuyProvince.deleteMany();

  // ===== SEED PROVINCES =====
  console.log('Seeding provinces...');
  const provincesRaw = parseCopySection(sqlContent, 'ibuy_provinces', [
    'province_id',
    'province',
  ]);
  await prisma.ibuyProvince.createMany({
    data: provincesRaw.map((r) => ({
      provinceId: r.province_id!,
      province: r.province!,
    })),
  });
  console.log(`  → ${provincesRaw.length} provinces`);

  // ===== SEED CITIES =====
  console.log('Seeding cities...');
  const citiesRaw = parseCopySection(sqlContent, 'ibuy_cities', [
    'city_id',
    'city',
    'province_id',
  ]);
  await prisma.ibuyCity.createMany({
    data: citiesRaw.map((r) => ({
      cityId: r.city_id!,
      city: r.city!,
      provinceId: r.province_id!,
    })),
  });
  console.log(`  → ${citiesRaw.length} cities`);

  // ===== SEED AREAS =====
  console.log('Seeding areas...');
  const areasRaw = parseCopySection(sqlContent, 'ibuy_areas', [
    'area_id',
    'area',
    'city_id',
  ]);
  await prisma.ibuyArea.createMany({
    data: areasRaw.map((r) => ({
      areaId: r.area_id!,
      area: r.area!,
      cityId: r.city_id!,
    })),
  });
  console.log(`  → ${areasRaw.length} areas`);

  // ===== SEED MEMBERS =====
  console.log('Seeding members...');
  const membersRaw = parseCopySection(sqlContent, 'ibuy_member', [
    'id',
    'login_name',
    'password',
    'status',
    'phone',
    'email',
    'source_type',
    'nick_name',
    'head_pic',
    'is_mobile_check',
    'is_email_check',
    'sex',
    'member_level',
    'experience_value',
    'birthday',
    'last_login_time',
    'points',
    'create_time',
    'update_time',
  ]);
  await prisma.ibuyMember.createMany({
    data: membersRaw.map((r) => ({
      id: toIntRequired(r.id),
      loginName: r.login_name!,
      password: r.password!,
      status: r.status,
      phone: r.phone,
      email: r.email,
      sourceType: r.source_type,
      nickName: r.nick_name,
      headPic: r.head_pic,
      isMobileCheck: r.is_mobile_check,
      isEmailCheck: r.is_email_check,
      sex: r.sex,
      memberLevel: toInt(r.member_level),
      experienceValue: toInt(r.experience_value),
      birthday: toDate(r.birthday),
      lastLoginTime: toDate(r.last_login_time),
      points: toInt(r.points),
      createTime: toDate(r.create_time),
      updateTime: toDate(r.update_time),
    })),
  });
  await resetSequence('ibuy_member');
  console.log(`  → ${membersRaw.length} members`);

  // ===== SEED ADDRESS =====
  console.log('Seeding addresses...');
  const addressRaw = parseCopySection(sqlContent, 'ibuy_address', [
    'id',
    'username',
    'province_id',
    'city_id',
    'area_id',
    'phone',
    'address',
    'contact',
    'is_default',
    'alias',
  ]);
  await prisma.ibuyAddress.createMany({
    data: addressRaw.map((r) => ({
      id: toIntRequired(r.id),
      username: r.username,
      provinceId: r.province_id,
      cityId: r.city_id,
      areaId: r.area_id,
      phone: r.phone!,
      address: r.address!,
      contact: r.contact!,
      isDefault: toIntRequired(r.is_default),
      alias: r.alias,
    })),
  });
  await resetSequence('ibuy_address');
  console.log(`  → ${addressRaw.length} addresses`);

  // ===== SEED BRANDS =====
  console.log('Seeding brands...');
  const brandsRaw = parseCopySection(sqlContent, 'ibuy_brand', [
    'id',
    'name',
    'image',
    'letter',
    'seq',
  ]);
  await prisma.ibuyBrand.createMany({
    data: brandsRaw.map((r) => ({
      id: toIntRequired(r.id),
      name: r.name!,
      image: r.image,
      letter: r.letter!,
      seq: toInt(r.seq),
    })),
  });
  await resetSequence('ibuy_brand');
  console.log(`  → ${brandsRaw.length} brands`);

  // ===== SEED TEMPLATES =====
  console.log('Seeding templates...');
  const templatesRaw = parseCopySection(sqlContent, 'ibuy_template', [
    'id',
    'name',
    'spec_num',
    'para_num',
  ]);
  await prisma.ibuyTemplate.createMany({
    data: templatesRaw.map((r) => ({
      id: toIntRequired(r.id),
      name: r.name!,
      specNum: toInt(r.spec_num),
      paraNum: toInt(r.para_num),
    })),
  });
  await resetSequence('ibuy_template');
  console.log(`  → ${templatesRaw.length} templates`);

  // ===== SEED CATEGORIES =====
  console.log('Seeding categories...');
  const categoriesRaw = parseCopySection(sqlContent, 'ibuy_category', [
    'id',
    'name',
    'goods_num',
    'is_show',
    'is_menu',
    'parent_id',
    'template_id',
    'seq',
  ]);
  await prisma.ibuyCategory.createMany({
    data: categoriesRaw.map((r) => ({
      id: toIntRequired(r.id),
      name: r.name!,
      goodsNum: toInt(r.goods_num),
      isShow: r.is_show,
      isMenu: r.is_menu,
      parentId: toInt(r.parent_id),
      templateId: toInt(r.template_id),
      seq: toInt(r.seq),
    })),
  });
  await resetSequence('ibuy_category');
  console.log(`  → ${categoriesRaw.length} categories`);

  // ===== SEED CATEGORY-BRAND =====
  console.log('Seeding category-brand...');
  const catBrandRaw = parseCopySection(sqlContent, 'ibuy_category_brand', [
    'id',
    'category_id',
    'brand_id',
  ]);
  await prisma.ibuyCategoryBrand.createMany({
    data: catBrandRaw.map((r) => ({
      id: toIntRequired(r.id),
      categoryId: toIntRequired(r.category_id),
      brandId: toIntRequired(r.brand_id),
    })),
  });
  await resetSequence('ibuy_category_brand');
  console.log(`  → ${catBrandRaw.length} category-brand links`);

  // ===== SEED SPECS =====
  console.log('Seeding specs...');
  const specsRaw = parseCopySection(sqlContent, 'ibuy_spec', [
    'id',
    'name',
    'options',
    'seq',
    'template_id',
  ]);
  await prisma.ibuySpec.createMany({
    data: specsRaw.map((r) => ({
      id: toIntRequired(r.id),
      name: r.name!,
      options: r.options!,
      seq: toInt(r.seq),
      templateId: toIntRequired(r.template_id),
    })),
  });
  await resetSequence('ibuy_spec');
  console.log(`  → ${specsRaw.length} specs`);

  // ===== SEED PARAS =====
  console.log('Seeding paras...');
  const parasRaw = parseCopySection(sqlContent, 'ibuy_para', [
    'id',
    'name',
    'options',
    'seq',
    'template_id',
  ]);
  await prisma.ibuyPara.createMany({
    data: parasRaw.map((r) => ({
      id: toIntRequired(r.id),
      name: r.name!,
      options: r.options!,
      seq: toInt(r.seq),
      templateId: toIntRequired(r.template_id),
    })),
  });
  await resetSequence('ibuy_para');
  console.log(`  → ${parasRaw.length} paras`);

  // ===== SEED ALBUMS =====
  console.log('Seeding albums...');
  const albumsRaw = parseCopySection(sqlContent, 'ibuy_album', [
    'id',
    'name',
    'image',
    'image_items',
    'desc',
  ]);
  await prisma.ibuyAlbum.createMany({
    data: albumsRaw.map((r) => ({
      id: toIntRequired(r.id),
      name: r.name!,
      image: r.image,
      imageItems: r.image_items,
      desc: r.desc,
    })),
  });
  await resetSequence('ibuy_album');
  console.log(`  → ${albumsRaw.length} albums`);

  // ===== SEED SPU =====
  console.log('Seeding SPU...');
  const spuRaw = parseCopySection(sqlContent, 'ibuy_spu', [
    'id',
    'sn',
    'name',
    'caption',
    'brand_id',
    'category1_id',
    'category2_id',
    'category3_id',
    'template_id',
    'freight_id',
    'image',
    'images',
    'sale_service',
    'introduction',
    'spec_items',
    'para_items',
    'sale_num',
    'comment_num',
    'is_marketable',
    'is_enable_spec',
    'is_delete',
    'status',
  ]);
  await prisma.ibuySpu.createMany({
    data: spuRaw.map((r) => ({
      id: r.id!,
      sn: r.sn!,
      name: r.name!,
      caption: r.caption!,
      brandId: toIntRequired(r.brand_id),
      category1Id: toIntRequired(r.category1_id),
      category2Id: toInt(r.category2_id),
      category3Id: toInt(r.category3_id),
      templateId: toInt(r.template_id),
      freightId: toInt(r.freight_id),
      image: r.image,
      images: r.images,
      saleService: r.sale_service,
      introduction: r.introduction,
      specItems: toJson(r.spec_items),
      paraItems: toJson(r.para_items),
      saleNum: toInt(r.sale_num),
      commentNum: toInt(r.comment_num),
      isMarketable: r.is_marketable,
      isEnableSpec: r.is_enable_spec,
      isDelete: r.is_delete,
      status: r.status,
    })),
  });
  console.log(`  → ${spuRaw.length} SPUs`);

  // ===== SEED SKU =====
  console.log('Seeding SKU...');
  const skuRaw = parseCopySection(sqlContent, 'ibuy_sku', [
    'id',
    'sn',
    'name',
    'price',
    'num',
    'alert_num',
    'image',
    'images',
    'weight',
    'create_time',
    'update_time',
    'spu_id',
    'category_id',
    'category_name',
    'brand_name',
    'spec',
    'sale_num',
    'comment_num',
    'status',
  ]);

  // Insert SKUs in chunks to avoid batch size issues
  const CHUNK_SIZE = 1000;
  for (let i = 0; i < skuRaw.length; i += CHUNK_SIZE) {
    const chunk = skuRaw.slice(i, i + CHUNK_SIZE);
    await prisma.ibuySku.createMany({
      data: chunk.map((r) => ({
        id: r.id!,
        sn: r.sn!,
        name: r.name!,
        price: toIntRequired(r.price),
        num: toIntRequired(r.num),
        alertNum: toIntRequired(r.alert_num),
        image: r.image,
        images: r.images,
        weight: toInt(r.weight),
        createTime: toDateRequired(r.create_time),
        updateTime: toDateRequired(r.update_time),
        spuId: r.spu_id!,
        categoryId: toIntRequired(r.category_id),
        categoryName: r.category_name!,
        brandName: r.brand_name!,
        spec: toJson(r.spec),
        saleNum: toInt(r.sale_num),
        commentNum: toInt(r.comment_num),
        status: r.status,
      })),
    });
  }
  console.log(`  → ${skuRaw.length} SKUs`);

  // ===== SEED ADMIN =====
  console.log('Seeding admins...');
  const adminRaw = parseCopySection(sqlContent, 'ibuy_admin', [
    'id',
    'login_name',
    'password',
    'status',
  ]);
  await prisma.ibuyAdmin.createMany({
    data: adminRaw.map((r) => ({
      id: toIntRequired(r.id),
      loginName: r.login_name,
      password: r.password,
      status: r.status,
    })),
  });
  await resetSequence('ibuy_admin');
  console.log(`  → ${adminRaw.length} admins`);

  // ===== SEED ROLES =====
  console.log('Seeding roles...');
  const rolesRaw = parseCopySection(sqlContent, 'ibuy_role', ['id', 'name']);
  await prisma.ibuyRole.createMany({
    data: rolesRaw.map((r) => ({
      id: toIntRequired(r.id),
      name: r.name,
      code: r.name?.toLowerCase().replace(/\s+/g, '_') || `role_${r.id}`,
      description: `Role: ${r.name}`,
      status: '1',
    })),
  });
  await resetSequence('ibuy_role');
  console.log(`  → ${rolesRaw.length} roles`);

  // ===== SEED ADMIN-ROLE =====
  console.log('Seeding admin-role...');
  const adminRoleRaw = parseCopySection(sqlContent, 'ibuy_admin_role', [
    'admin_id',
    'role_id',
  ]);
  await prisma.ibuyAdminRole.createMany({
    data: adminRoleRaw.map((r) => ({
      adminId: toIntRequired(r.admin_id),
      roleId: toIntRequired(r.role_id),
    })),
  });
  console.log(`  → ${adminRoleRaw.length} admin-role links`);

  // ===== SEED ORDERS =====
  console.log('Seeding orders...');
  const ordersRaw = parseCopySection(sqlContent, 'ibuy_order', [
    'id',
    'total_num',
    'total_money',
    'pre_money',
    'post_fee',
    'pay_money',
    'pay_type',
    'create_time',
    'update_time',
    'pay_time',
    'consign_time',
    'end_time',
    'close_time',
    'shipping_name',
    'shipping_code',
    'shipping_task_id',
    'shipping_status',
    'username',
    'buyer_message',
    'buyer_rate',
    'receiver_contact',
    'receiver_mobile',
    'receiver_address',
    'source_type',
    'transaction_id',
    'order_status',
    'pay_status',
    'is_delete',
  ]);
  await prisma.ibuyOrder.createMany({
    data: ordersRaw.map((r) => ({
      id: r.id!,
      totalNum: toIntRequired(r.total_num),
      totalMoney: toIntRequired(r.total_money),
      preMoney: toIntRequired(r.pre_money),
      postFee: toInt(r.post_fee),
      payMoney: toIntRequired(r.pay_money),
      payType: r.pay_type!,
      createTime: toDateRequired(r.create_time),
      updateTime: toDateRequired(r.update_time),
      payTime: toDate(r.pay_time),
      consignTime: toDate(r.consign_time),
      endTime: toDate(r.end_time),
      closeTime: toDate(r.close_time),
      shippingName: r.shipping_name,
      shippingCode: r.shipping_code,
      shippingTaskId: r.shipping_task_id,
      shippingStatus: r.shipping_status!,
      username: r.username!,
      buyerMessage: r.buyer_message,
      buyerRate: r.buyer_rate,
      receiverContact: r.receiver_contact!,
      receiverMobile: r.receiver_mobile!,
      receiverAddress: r.receiver_address,
      sourceType: r.source_type,
      transactionId: r.transaction_id,
      orderStatus: r.order_status!,
      payStatus: r.pay_status!,
      isDelete: r.is_delete,
    })),
  });
  console.log(`  → ${ordersRaw.length} orders`);

  // ===== SEED ORDER ITEMS =====
  console.log('Seeding order items...');
  const orderItemsRaw = parseCopySection(sqlContent, 'ibuy_order_item', [
    'id',
    'category_id1',
    'category_id2',
    'category_id3',
    'spu_id',
    'sku_id',
    'order_id',
    'name',
    'price',
    'num',
    'money',
    'pay_money',
    'image',
    'weight',
    'post_fee',
    'is_return',
  ]);
  await prisma.ibuyOrderItem.createMany({
    data: orderItemsRaw.map((r) => ({
      id: r.id!,
      categoryId1: toIntRequired(r.category_id1),
      categoryId2: toIntRequired(r.category_id2),
      categoryId3: toIntRequired(r.category_id3),
      spuId: r.spu_id!,
      skuId: r.sku_id!,
      orderId: r.order_id!,
      name: r.name!,
      price: toIntRequired(r.price),
      num: toIntRequired(r.num),
      money: toIntRequired(r.money),
      payMoney: toIntRequired(r.pay_money),
      image: r.image!,
      weight: toInt(r.weight),
      postFee: toInt(r.post_fee),
      isReturn: r.is_return,
    })),
  });
  console.log(`  → ${orderItemsRaw.length} order items`);

  // ===== SEED PERMISSIONS (manual) =====
  console.log('Seeding permissions...');
  const permissions = [
    { name: '查看用户', code: 'user:view', resource: 'user', action: 'view' },
    {
      name: '创建用户',
      code: 'user:create',
      resource: 'user',
      action: 'create',
    },
    { name: '编辑用户', code: 'user:edit', resource: 'user', action: 'edit' },
    {
      name: '删除用户',
      code: 'user:delete',
      resource: 'user',
      action: 'delete',
    },
    { name: '查看商品', code: 'spu:view', resource: 'spu', action: 'view' },
    {
      name: '创建商品',
      code: 'spu:create',
      resource: 'spu',
      action: 'create',
    },
    { name: '编辑商品', code: 'spu:edit', resource: 'spu', action: 'edit' },
    {
      name: '删除商品',
      code: 'spu:delete',
      resource: 'spu',
      action: 'delete',
    },
    { name: '审核商品', code: 'spu:audit', resource: 'spu', action: 'audit' },
    {
      name: '查看订单',
      code: 'order:view',
      resource: 'order',
      action: 'view',
    },
    {
      name: '编辑订单',
      code: 'order:edit',
      resource: 'order',
      action: 'edit',
    },
    { name: '查看角色', code: 'role:view', resource: 'role', action: 'view' },
    {
      name: '创建角色',
      code: 'role:create',
      resource: 'role',
      action: 'create',
    },
    { name: '编辑角色', code: 'role:edit', resource: 'role', action: 'edit' },
    {
      name: '删除角色',
      code: 'role:delete',
      resource: 'role',
      action: 'delete',
    },
    {
      name: '查看权限',
      code: 'permission:view',
      resource: 'permission',
      action: 'view',
    },
    { name: '查看菜单', code: 'menu:view', resource: 'menu', action: 'view' },
    {
      name: '创建菜单',
      code: 'menu:create',
      resource: 'menu',
      action: 'create',
    },
    { name: '编辑菜单', code: 'menu:edit', resource: 'menu', action: 'edit' },
    {
      name: '删除菜单',
      code: 'menu:delete',
      resource: 'menu',
      action: 'delete',
    },
  ];
  await prisma.ibuyPermission.createMany({ data: permissions });
  console.log(`  → ${permissions.length} permissions`);

  // ===== SEED ROLE-PERMISSIONS (assign all permissions to first role) =====
  console.log('Seeding role-permissions...');
  const allPermissions = await prisma.ibuyPermission.findMany();
  const firstRole = await prisma.ibuyRole.findFirst();
  if (firstRole) {
    await prisma.ibuyRolePermission.createMany({
      data: allPermissions.map((p) => ({
        roleId: firstRole.id,
        permissionId: p.id,
      })),
    });
    console.log(
      `  → ${allPermissions.length} role-permission links (role: ${firstRole.name})`,
    );
  }

  // ===== SEED MENUS (basic admin menu structure) =====
  console.log('Seeding menus...');
  const menus = [
    {
      name: 'Dashboard',
      title: '仪表盘',
      type: 'menu',
      path: '/dashboard',
      component: 'Dashboard',
      icon: 'dashboard',
      sort: 0,
    },
    {
      name: 'System',
      title: '系统管理',
      type: 'menu',
      path: '/system',
      icon: 'setting',
      sort: 1,
    },
    {
      name: 'UserManage',
      title: '用户管理',
      type: 'menu',
      path: '/system/user',
      component: 'system/User',
      parentId: '2',
      permissionCode: 'user:view',
      sort: 0,
    },
    {
      name: 'RoleManage',
      title: '角色管理',
      type: 'menu',
      path: '/system/role',
      component: 'system/Role',
      parentId: '2',
      permissionCode: 'role:view',
      sort: 1,
    },
    {
      name: 'MenuManage',
      title: '菜单管理',
      type: 'menu',
      path: '/system/menu',
      component: 'system/Menu',
      parentId: '2',
      permissionCode: 'menu:view',
      sort: 2,
    },
    {
      name: 'Goods',
      title: '商品管理',
      type: 'menu',
      path: '/goods',
      icon: 'shop',
      sort: 2,
    },
    {
      name: 'SpuList',
      title: '商品列表',
      type: 'menu',
      path: '/goods/spu',
      component: 'goods/Spu',
      parentId: '6',
      permissionCode: 'spu:view',
      sort: 0,
    },
    {
      name: 'Orders',
      title: '订单管理',
      type: 'menu',
      path: '/orders',
      icon: 'order',
      sort: 3,
    },
    {
      name: 'OrderList',
      title: '订单列表',
      type: 'menu',
      path: '/orders/list',
      component: 'order/OrderList',
      parentId: '8',
      permissionCode: 'order:view',
      sort: 0,
    },
  ];
  for (const menu of menus) {
    await prisma.ibuyMenu.create({ data: menu as any });
  }
  console.log(`  → ${menus.length} menus`);

  console.log('\nSeed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
