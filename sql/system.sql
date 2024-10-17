-- Table: public.ibuy_admin
-- DROP TABLE IF EXISTS public.ibuy_admin;
CREATE TABLE IF NOT EXISTS public.ibuy_admin
(
    id integer NOT NULL DEFAULT nextval('ibuy_admin_id_seq'::regclass),
    login_name character varying,
    password character varying,
    status character varying,
    PRIMARY KEY (id),
    UNIQUE (login_name)
)


-- Table: public.ibuy_admin_role
-- DROP TABLE IF EXISTS public.ibuy_admin_role;
CREATE TABLE IF NOT EXISTS public.ibuy_admin_role
(
    admin_id integer NOT NULL,
    role_id integer NOT NULL,
    PRIMARY KEY (admin_id, role_id)
)

-- Table: public.ibuy_role
-- DROP TABLE IF EXISTS public.ibuy_role;
CREATE TABLE IF NOT EXISTS public.ibuy_role
(
    id integer NOT NULL DEFAULT nextval('ibuy_role_id_seq'::regclass),
    name character varying,
    RIMARY KEY (id),
    UNIQUE (name)
)
