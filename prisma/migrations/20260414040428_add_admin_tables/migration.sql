-- AlterTable
ALTER TABLE "ibuy_category" ADD COLUMN     "goods_num" INTEGER,
ADD COLUMN     "template_id" INTEGER;

-- CreateTable
CREATE TABLE "ibuy_admin" (
    "id" SERIAL NOT NULL,
    "login_name" TEXT,
    "password" TEXT,
    "status" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ibuy_admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_role" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "code" VARCHAR(50),
    "description" VARCHAR(200),
    "status" VARCHAR(10) NOT NULL DEFAULT '1',
    "is_system" SMALLINT NOT NULL DEFAULT 0,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ibuy_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_admin_role" (
    "admin_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "ibuy_admin_role_pkey" PRIMARY KEY ("admin_id","role_id")
);

-- CreateTable
CREATE TABLE "ibuy_permission" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(50) NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'api',
    "description" VARCHAR(200),
    "status" VARCHAR(10) NOT NULL DEFAULT '1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ibuy_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_role_permission" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ibuy_role_permission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "ibuy_menu" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "title" VARCHAR(50),
    "type" VARCHAR(10) NOT NULL DEFAULT 'menu',
    "path" VARCHAR(100),
    "component" VARCHAR(100),
    "icon" TEXT,
    "url" TEXT,
    "permission_code" VARCHAR(100),
    "parent_id" TEXT,
    "is_hidden" SMALLINT NOT NULL DEFAULT 0,
    "is_cache" SMALLINT NOT NULL DEFAULT 1,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(10) NOT NULL DEFAULT '1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ibuy_menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_album" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "image_items" TEXT,
    "desc" TEXT,

    CONSTRAINT "ibuy_album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ibuy_provinces" (
    "province_id" TEXT NOT NULL,
    "province" TEXT NOT NULL,

    CONSTRAINT "ibuy_provinces_pkey" PRIMARY KEY ("province_id")
);

-- CreateTable
CREATE TABLE "ibuy_cities" (
    "city_id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province_id" TEXT NOT NULL,

    CONSTRAINT "ibuy_cities_pkey" PRIMARY KEY ("city_id")
);

-- CreateTable
CREATE TABLE "ibuy_areas" (
    "area_id" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,

    CONSTRAINT "ibuy_areas_pkey" PRIMARY KEY ("area_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ibuy_admin_login_name_key" ON "ibuy_admin"("login_name");

-- CreateIndex
CREATE UNIQUE INDEX "ibuy_role_name_key" ON "ibuy_role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ibuy_role_code_key" ON "ibuy_role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ibuy_permission_code_key" ON "ibuy_permission"("code");

-- CreateIndex
CREATE INDEX "ibuy_role_permission_role_id_permission_id_idx" ON "ibuy_role_permission"("role_id", "permission_id");
