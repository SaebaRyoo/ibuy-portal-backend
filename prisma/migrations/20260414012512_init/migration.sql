-- CreateTable
CREATE TABLE "ibuy_brand" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "letter" TEXT NOT NULL,
    "seq" INTEGER,

    CONSTRAINT "ibuy_brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_category_brand" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "brand_id" INTEGER NOT NULL,

    CONSTRAINT "ibuy_category_brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" INTEGER,
    "is_show" TEXT,
    "is_menu" TEXT,
    "seq" INTEGER,

    CONSTRAINT "ibuy_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_template" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "spec_num" INTEGER,
    "para_num" INTEGER,

    CONSTRAINT "ibuy_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_spec" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "seq" INTEGER,
    "template_id" INTEGER NOT NULL,

    CONSTRAINT "ibuy_spec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_para" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "seq" INTEGER,
    "template_id" INTEGER NOT NULL,

    CONSTRAINT "ibuy_para_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_spu" (
    "id" TEXT NOT NULL,
    "sn" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "category1_id" INTEGER NOT NULL,
    "category2_id" INTEGER,
    "category3_id" INTEGER,
    "template_id" INTEGER,
    "freight_id" INTEGER,
    "image" TEXT,
    "images" TEXT,
    "sale_service" TEXT,
    "introduction" TEXT,
    "spec_items" JSONB,
    "para_items" JSONB,
    "sale_num" INTEGER,
    "comment_num" INTEGER,
    "is_marketable" TEXT,
    "is_enable_spec" TEXT,
    "is_delete" TEXT,
    "status" TEXT,

    CONSTRAINT "ibuy_spu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_sku" (
    "id" TEXT NOT NULL,
    "sn" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "num" INTEGER NOT NULL,
    "alert_num" INTEGER NOT NULL,
    "image" TEXT,
    "images" TEXT,
    "weight" INTEGER,
    "create_time" TIMESTAMP(3) NOT NULL,
    "update_time" TIMESTAMP(3) NOT NULL,
    "spu_id" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "category_name" TEXT NOT NULL,
    "brand_name" TEXT NOT NULL,
    "spec" JSONB NOT NULL,
    "sale_num" INTEGER,
    "comment_num" INTEGER,
    "status" TEXT,

    CONSTRAINT "ibuy_sku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_order" (
    "id" TEXT NOT NULL,
    "total_num" INTEGER NOT NULL,
    "total_money" INTEGER NOT NULL,
    "pre_money" INTEGER NOT NULL,
    "post_fee" INTEGER,
    "pay_money" INTEGER NOT NULL,
    "pay_type" TEXT NOT NULL,
    "create_time" TIMESTAMP(3) NOT NULL,
    "update_time" TIMESTAMP(3) NOT NULL,
    "pay_time" TIMESTAMP(3),
    "consign_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "close_time" TIMESTAMP(3),
    "shipping_name" TEXT,
    "shipping_code" TEXT,
    "shipping_task_id" TEXT,
    "shipping_status" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "buyer_message" TEXT,
    "buyer_rate" TEXT,
    "receiver_contact" TEXT NOT NULL,
    "receiver_mobile" TEXT NOT NULL,
    "receiver_address" TEXT,
    "source_type" TEXT,
    "transaction_id" TEXT,
    "order_status" TEXT NOT NULL,
    "pay_status" TEXT NOT NULL,
    "is_delete" TEXT,

    CONSTRAINT "ibuy_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_order_item" (
    "id" TEXT NOT NULL,
    "category_id1" INTEGER NOT NULL,
    "category_id2" INTEGER NOT NULL,
    "category_id3" INTEGER NOT NULL,
    "spu_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "num" INTEGER NOT NULL,
    "money" INTEGER NOT NULL,
    "pay_money" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "weight" INTEGER,
    "post_fee" INTEGER,
    "is_return" TEXT,

    CONSTRAINT "ibuy_order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_member" (
    "id" SERIAL NOT NULL,
    "login_name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "source_type" TEXT,
    "nick_name" TEXT,
    "status" TEXT,
    "head_pic" TEXT,
    "is_mobile_check" TEXT,
    "is_email_check" TEXT,
    "sex" TEXT,
    "member_level" INTEGER,
    "experience_value" INTEGER,
    "birthday" TIMESTAMP(3),
    "last_login_time" TIMESTAMP(3),
    "points" INTEGER,
    "create_time" TIMESTAMP(3),
    "update_time" TIMESTAMP(3),
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ibuy_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_address" (
    "id" SERIAL NOT NULL,
    "username" TEXT,
    "province_id" TEXT,
    "city_id" TEXT,
    "area_id" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "is_default" INTEGER NOT NULL,
    "alias" TEXT,

    CONSTRAINT "ibuy_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_seckill_activity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "intro" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ibuy_seckill_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_seckill_goods" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "sku_name" TEXT NOT NULL,
    "sku_image" TEXT,
    "sku_price" INTEGER NOT NULL,
    "seckill_price" INTEGER NOT NULL,
    "stock_count" INTEGER NOT NULL,
    "total_stock" INTEGER NOT NULL,
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ibuy_seckill_goods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_seckill_order" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "seckill_goods_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "seckill_price" INTEGER NOT NULL,
    "money" INTEGER NOT NULL,
    "order_status" TEXT NOT NULL DEFAULT '0',
    "pay_status" TEXT NOT NULL DEFAULT '0',
    "pay_time" TIMESTAMP(3),
    "transaction_id" TEXT,
    "receiver_address" TEXT,
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ibuy_seckill_order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ibuy_member_login_name_key" ON "ibuy_member"("login_name");

-- CreateIndex
CREATE UNIQUE INDEX "ibuy_member_phone_key" ON "ibuy_member"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "ibuy_member_email_key" ON "ibuy_member"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ibuy_seckill_goods_activity_id_sku_id_key" ON "ibuy_seckill_goods"("activity_id", "sku_id");
