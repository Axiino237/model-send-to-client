--
-- PostgreSQL database dump
--

\restrict Lfs4cPW0QN1XJVczk5cBIrsLXDxSuqrjQz2eSiWfEbGigfVQyeiftmvKnjhoDEf

-- Dumped from database version 17.10
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: analytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analytics (
    id text NOT NULL,
    share_id text NOT NULL,
    ip text,
    country text,
    device text,
    browser text,
    viewed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.analytics OWNER TO postgres;

--
-- Name: attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attachments (
    id text NOT NULL,
    model_id text NOT NULL,
    file_url text NOT NULL,
    name text NOT NULL,
    size integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.attachments OWNER TO postgres;

--
-- Name: models; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.models (
    id text NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    file_url text,
    thumbnail text,
    size integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text
);


ALTER TABLE public.models OWNER TO postgres;

--
-- Name: photos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.photos (
    id text NOT NULL,
    model_id text NOT NULL,
    file_url text NOT NULL,
    name text NOT NULL,
    size integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.photos OWNER TO postgres;

--
-- Name: shares; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shares (
    id text NOT NULL,
    model_id text NOT NULL,
    share_token text NOT NULL,
    password text,
    expires_at timestamp(3) without time zone,
    max_views integer,
    views integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    password_plain text
);


ALTER TABLE public.shares OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.analytics (id, share_id, ip, country, device, browser, viewed_at) FROM stdin;
d616189a-dda7-4739-acb1-c48cf52fe751	3fe84056-a4f2-499a-8b96-f6f40fa05b8b	::1	Unknown	Desktop	Chrome	2026-06-05 10:40:50.14
87562b46-8157-42d8-b66e-269717ebbf58	3fe84056-a4f2-499a-8b96-f6f40fa05b8b	::1	Unknown	Desktop	Chrome	2026-06-05 10:41:01.106
3c62930c-b25b-42d2-a63d-b29a6b243d90	3fe84056-a4f2-499a-8b96-f6f40fa05b8b	::1	Unknown	Desktop	Chrome	2026-06-05 10:46:13.761
1df7a14c-14ea-41cc-a605-c3e9b98b6e1e	3fe84056-a4f2-499a-8b96-f6f40fa05b8b	::1	Unknown	Desktop	Chrome	2026-06-05 10:46:26.423
61c0fa9c-a636-47e6-8ce2-9fe87138e049	3fe84056-a4f2-499a-8b96-f6f40fa05b8b	::1	Unknown	Desktop	Chrome	2026-06-05 10:46:41.937
80d93581-1e23-4f49-857b-487577220dd8	38f52ca4-397c-4c7a-af20-d03cb0da7374	::1	Unknown	Desktop	Chrome	2026-06-05 10:47:45.258
b397240e-f65c-4846-83c4-b2b49a85fd6b	38f52ca4-397c-4c7a-af20-d03cb0da7374	::1	Unknown	Desktop	Chrome	2026-06-05 10:47:58.886
a393038b-2043-4f6a-87b0-f042744f505c	09cc8ec3-2ccf-46d8-a1b2-3623d61436e5	::1	Unknown	Desktop	Chrome	2026-06-05 10:49:04.169
f5b11d1b-3cf3-470a-8c07-1b6a9f169581	8ba440e5-061d-4420-9f91-5f5d9ef5c4a8	::1	Unknown	Desktop	Chrome	2026-06-05 10:49:59.297
27999959-a78c-4fac-96cc-974c0760d748	33e601c6-023b-4afe-8ac7-08e19c146ce4	::1	Unknown	Desktop	Chrome	2026-06-05 10:51:00.573
a5bb3d1d-85f1-493b-ac14-042b39dcad2d	33e601c6-023b-4afe-8ac7-08e19c146ce4	::1	Unknown	Desktop	Chrome	2026-06-05 10:51:28.391
01cd68d9-9a49-43d4-b9df-f6c967acd296	33e601c6-023b-4afe-8ac7-08e19c146ce4	::1	Unknown	Desktop	Chrome	2026-06-05 10:51:48.397
8c4bfb54-7b14-4cb5-bd36-10f69d9742dd	38f52ca4-397c-4c7a-af20-d03cb0da7374	::1	Unknown	Desktop	Chrome	2026-06-05 10:59:26.875
fece36a2-76a2-4379-8e88-673a59ac0a52	38f52ca4-397c-4c7a-af20-d03cb0da7374	::1	Unknown	Desktop	Chrome	2026-06-05 11:01:47.582
ae1e1a81-473f-470f-899b-0ffafd4511da	38f52ca4-397c-4c7a-af20-d03cb0da7374	::1	Unknown	Desktop	Chrome	2026-06-05 11:02:45.601
34a4cf04-373d-41f7-bff1-ce5b6d87a93f	33e601c6-023b-4afe-8ac7-08e19c146ce4	::1	Unknown	Desktop	Chrome	2026-06-05 11:20:12.468
bfee9127-e51e-4bef-8b47-085291aa8e32	33e601c6-023b-4afe-8ac7-08e19c146ce4	::1	Unknown	Desktop	Chrome	2026-06-05 11:21:15.869
43741756-6f71-4d8a-adb5-2024efea7f3c	38f52ca4-397c-4c7a-af20-d03cb0da7374	::1	Unknown	Desktop	Chrome	2026-06-05 11:22:18.848
760d3370-e00e-4d53-bd3c-a473980d5562	38f52ca4-397c-4c7a-af20-d03cb0da7374	::1	Unknown	Desktop	Chrome	2026-06-05 11:23:12.619
a7513ea7-00d1-43f7-a67b-9fdef2f9aa0e	38f52ca4-397c-4c7a-af20-d03cb0da7374	::1	Unknown	Desktop	Chrome	2026-06-05 11:27:24.164
1c1cb873-77b3-42e3-8cad-0c4309b3e57a	38f52ca4-397c-4c7a-af20-d03cb0da7374	::1	Unknown	Desktop	Chrome	2026-06-05 11:27:56.342
d2f53aa6-b305-45ea-8020-eb2ae7455e72	38f52ca4-397c-4c7a-af20-d03cb0da7374	::1	Unknown	Desktop	Chrome	2026-06-05 11:28:43.717
fac7c07b-feb0-4ba5-bb35-decc2835a2fc	23926e2e-0c1c-4a79-82b6-2386b46efe71	::1	Unknown	Desktop	Chrome	2026-06-05 11:33:46.682
0e5a9a09-27fc-478e-9fb2-72300f65d1b7	23926e2e-0c1c-4a79-82b6-2386b46efe71	::1	Unknown	Desktop	Chrome	2026-06-05 11:35:00.883
1f94725d-06f4-42d5-9e52-88770e8eb9fe	23926e2e-0c1c-4a79-82b6-2386b46efe71	::1	Unknown	Desktop	Chrome	2026-06-05 11:35:17.614
2b562e56-4fd7-450f-a280-9c5ed2b66f86	d64b3897-f7f4-49e3-909f-2b04d24bc182	::1	Unknown	Desktop	Chrome	2026-06-05 11:36:36.899
079f6591-56fd-44cc-9475-acdcc2a3de32	23926e2e-0c1c-4a79-82b6-2386b46efe71	::1	Unknown	Desktop	Chrome	2026-06-05 11:36:52.565
c9213921-0215-46e3-8f5f-66a7c1032067	d64b3897-f7f4-49e3-909f-2b04d24bc182	::1	Unknown	Desktop	Chrome	2026-06-05 11:37:40.55
25bec723-f1fe-4faf-9d88-cf818fb5aa31	23926e2e-0c1c-4a79-82b6-2386b46efe71	::1	Unknown	Desktop	Chrome	2026-06-05 11:39:01.41
3c4169c6-99fe-417f-9d50-6a2ca1d6ecb8	d64b3897-f7f4-49e3-909f-2b04d24bc182	::1	Unknown	Desktop	Chrome	2026-06-05 11:40:21.859
2f14e11a-09d0-4fb7-a402-26d8f62ac88b	d64b3897-f7f4-49e3-909f-2b04d24bc182	::1	Unknown	Desktop	Chrome	2026-06-05 11:45:20.023
fbee6ca0-f381-4067-8666-1a8195a672e2	d64b3897-f7f4-49e3-909f-2b04d24bc182	::1	Unknown	Desktop	Chrome	2026-06-05 11:46:56.568
2e708f14-92f2-40cb-82e2-2cf68646f16e	23926e2e-0c1c-4a79-82b6-2386b46efe71	::1	Unknown	Desktop	Chrome	2026-06-05 11:53:02.55
51d85caa-d57f-4451-8035-b5853d8588a2	d64b3897-f7f4-49e3-909f-2b04d24bc182	::1	Unknown	Desktop	Chrome	2026-06-05 11:54:05.811
32321e53-3910-49cb-a797-5c7daa35209d	d64b3897-f7f4-49e3-909f-2b04d24bc182	::1	Unknown	Desktop	Chrome	2026-06-05 11:55:39.377
18fd6dca-3492-42f3-8979-e70500485d94	d64b3897-f7f4-49e3-909f-2b04d24bc182	::1	Unknown	Desktop	Chrome	2026-06-05 11:56:24.763
c0793513-5f50-428e-a92a-64a6c61be46d	d64b3897-f7f4-49e3-909f-2b04d24bc182	::1	Unknown	Desktop	Chrome	2026-06-05 11:57:54.134
e8c37b8a-6af9-44e4-a085-8f9a8d6c72eb	d64b3897-f7f4-49e3-909f-2b04d24bc182	::1	Unknown	Desktop	Chrome	2026-06-05 11:58:13.254
d6c9d68a-41bf-4259-a2a6-82b55a924714	23926e2e-0c1c-4a79-82b6-2386b46efe71	::1	Unknown	Desktop	Chrome	2026-06-05 12:06:47.736
09da89b7-f916-43ae-84cb-03dfa8dfd4d8	23926e2e-0c1c-4a79-82b6-2386b46efe71	::1	Unknown	Desktop	Chrome	2026-06-05 12:13:29.34
2573f5fc-7c61-4a00-ba08-163a671796ae	5504a77d-db3f-40b6-b285-5fc94f0870e5	::1	Unknown	Desktop	Chrome	2026-06-05 12:18:22.948
f8fa3b59-5cb8-416a-b6b9-b644d6c7252b	86f2fd78-c734-4d58-a93f-16f5a708d816	::1	Unknown	Desktop	Chrome	2026-06-05 12:30:56.266
\.


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attachments (id, model_id, file_url, name, size, created_at) FROM stdin;
3ef19b89-65ca-414a-b9f4-71883514cf9b	3ac6a6e7-20d1-4f52-a9c6-ac8d48143fe2	local://attachments/8c7934e6-b311-40be-b96f-898350327acb/1780655716081-B.pdf	B.pdf	18131908	2026-06-05 10:35:16.09
5b21b565-c3d2-4a4e-bdde-04ac9e8b3a63	a4fc5999-86e3-415c-b239-83bcb1b32605	local://attachments/8c7934e6-b311-40be-b96f-898350327acb/1780659197954-B.pdf	B.pdf	18131908	2026-06-05 11:33:17.963
ad2f2546-f7b6-4bb4-880c-17a8bb05c908	131b1179-c59a-4461-abec-f5dd0d39ea02	local://attachments/8c7934e6-b311-40be-b96f-898350327acb/1780661875548-B.pdf	B.pdf	18131908	2026-06-05 12:17:55.557
a2d7ddfa-b8a1-4b1a-a331-7028f6102f5b	fb474afe-d136-491b-8446-d77aa74d08e1	local://attachments/8c7934e6-b311-40be-b96f-898350327acb/1780662474817-B.pdf	B.pdf	18131908	2026-06-05 12:27:54.827
\.


--
-- Data for Name: models; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.models (id, user_id, name, file_url, thumbnail, size, created_at, description) FROM stdin;
b71e701a-6638-4246-ba07-42c2655bdc77	8c7934e6-b311-40be-b96f-898350327acb	Premium Exhibition Stall	\N	\N	\N	2026-06-05 10:26:37.052	<h1>Project <b>Overview</b>:</h1><div>This is a high-end luxury stall design for national exhibition.</div><div>Key Features:</div><div>- Sleek metallic styling</div><div>- Modular layout</div><div>- Embedded media panels</div>
3ac6a6e7-20d1-4f52-a9c6-ac8d48143fe2	8c7934e6-b311-40be-b96f-898350327acb	uploads_files_7003813_chemical_stall_	local://models/8c7934e6-b311-40be-b96f-898350327acb/1780655716030-uploads_files_7003813_chemical_stall_.glb	\N	57025936	2026-06-05 10:35:16.069	<h1 style="text-align: center;">hi <u><font color="#d9823a">hellow</font></u></h1>
a4fc5999-86e3-415c-b239-83bcb1b32605	8c7934e6-b311-40be-b96f-898350327acb	POLYSTONE COMPOUNDS	local://models/8c7934e6-b311-40be-b96f-898350327acb/1780659197912-POLYSTONE COMPOUNDS.glb	\N	68251780	2026-06-05 11:33:17.95	<h2><ol><li style="text-align: left;"><i style="font-size: 1.35rem;"><u><font color="#ff1a1a">hello bro how</font> <font color="#2eba2c">are</font> <font color="#126de2">you</font></u></i></li></ol></h2>
131b1179-c59a-4461-abec-f5dd0d39ea02	8c7934e6-b311-40be-b96f-898350327acb	uploads_files_7003813_chemical_stall_	local://models/8c7934e6-b311-40be-b96f-898350327acb/1780661875448-uploads_files_7003813_chemical_stall_.glb	\N	57025936	2026-06-05 12:17:55.477	hihihihihihihihhihihihihiiihhihihihi
fb474afe-d136-491b-8446-d77aa74d08e1	8c7934e6-b311-40be-b96f-898350327acb	uploads_files_7003813_chemical_stall_	local://models/8c7934e6-b311-40be-b96f-898350327acb/1780662474716-uploads_files_7003813_chemical_stall_.glb	\N	57025936	2026-06-05 12:27:54.744	qwsadffgfdg
\.


--
-- Data for Name: photos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.photos (id, model_id, file_url, name, size, created_at) FROM stdin;
4ff18d02-df87-4aa6-bf61-1a37152a2601	3ac6a6e7-20d1-4f52-a9c6-ac8d48143fe2	local://photos/8c7934e6-b311-40be-b96f-898350327acb/1780655716073-Axiino VisitingCard Backside.jpg	Axiino VisitingCard Backside.jpg	681015	2026-06-05 10:35:16.077
d1040c8f-244e-4c2b-bd47-4b1d37180ac6	3ac6a6e7-20d1-4f52-a9c6-ac8d48143fe2	local://photos/8c7934e6-b311-40be-b96f-898350327acb/1780655716079-Axiino VisitingCard FrontSide.jpg	Axiino VisitingCard FrontSide.jpg	786009	2026-06-05 10:35:16.081
8bcaa2ae-63e7-47b2-aad7-f5c3334d3ff1	a4fc5999-86e3-415c-b239-83bcb1b32605	local://photos/8c7934e6-b311-40be-b96f-898350327acb/1780659197951-ChatGPT Image Jun 2, 2026, 12_15_01 AM.png	ChatGPT Image Jun 2, 2026, 12_15_01 AM.png	1674035	2026-06-05 11:33:17.954
986bff9e-a022-413e-a2fc-dcbda02e5195	131b1179-c59a-4461-abec-f5dd0d39ea02	local://photos/8c7934e6-b311-40be-b96f-898350327acb/1780661875481-Gemini_Generated_Image_ny3u1zny3u1zny3u.png	Gemini_Generated_Image_ny3u1zny3u1zny3u.png	9561243	2026-06-05 12:17:55.487
0e86db8c-80a3-4edf-a110-0fdc2e876fe9	131b1179-c59a-4461-abec-f5dd0d39ea02	local://photos/8c7934e6-b311-40be-b96f-898350327acb/1780661875487-Gemini_Generated_Image_ny3u1zny3u1zny3u.png	Gemini_Generated_Image_ny3u1zny3u1zny3u.png	9561243	2026-06-05 12:17:55.544
a6e90f62-d54d-47cf-a767-bc5243910cd3	131b1179-c59a-4461-abec-f5dd0d39ea02	local://photos/8c7934e6-b311-40be-b96f-898350327acb/1780661875544-Gemini_Generated_Image_v5uy72v5uy72v5uy.png	Gemini_Generated_Image_v5uy72v5uy72v5uy.png	7745266	2026-06-05 12:17:55.549
c3867d68-3135-4cf5-9015-4f5951e669ff	fb474afe-d136-491b-8446-d77aa74d08e1	local://photos/8c7934e6-b311-40be-b96f-898350327acb/1780662474745-Gemini_Generated_Image_v5uy72v5uy72v5uy.png	Gemini_Generated_Image_v5uy72v5uy72v5uy.png	7745266	2026-06-05 12:27:54.75
f2e286a2-7f48-41fa-a939-38d245ea5044	fb474afe-d136-491b-8446-d77aa74d08e1	local://photos/8c7934e6-b311-40be-b96f-898350327acb/1780662474750-IMG20260605104309.jpg.jpeg	IMG20260605104309.jpg.jpeg	7834093	2026-06-05 12:27:54.806
6248b3fe-5ee3-48d0-8191-b4a29ae74a9a	fb474afe-d136-491b-8446-d77aa74d08e1	local://photos/8c7934e6-b311-40be-b96f-898350327acb/1780662474806-Gemini_Generated_Image_9053r29053r29053.png	Gemini_Generated_Image_9053r29053r29053.png	9447149	2026-06-05 12:27:54.812
bd87eaf1-bf5b-4d34-88f0-c0459a4b8e9c	fb474afe-d136-491b-8446-d77aa74d08e1	local://photos/8c7934e6-b311-40be-b96f-898350327acb/1780662474811-Gemini_Generated_Image_ny3u1zny3u1zny3u.png	Gemini_Generated_Image_ny3u1zny3u1zny3u.png	9561243	2026-06-05 12:27:54.817
15e03388-bb11-4d96-ab6b-2da67a03c54b	fb474afe-d136-491b-8446-d77aa74d08e1	local://photos/8c7934e6-b311-40be-b96f-898350327acb/1780662474816-WhatsApp Image 2026-06-04 at 23.24.04.png	WhatsApp Image 2026-06-04 at 23.24.04.png	363119	2026-06-05 12:27:54.818
\.


--
-- Data for Name: shares; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shares (id, model_id, share_token, password, expires_at, max_views, views, created_at, password_plain) FROM stdin;
3fe84056-a4f2-499a-8b96-f6f40fa05b8b	3ac6a6e7-20d1-4f52-a9c6-ac8d48143fe2	abdc67d602a2	$2b$10$Z4.qSoNgEk4LYN7laQ2mq.CUqUIiWg0AZXBLDyc1Z3BF4e7rhCARu	\N	\N	5	2026-06-05 10:40:29.935	0000
09cc8ec3-2ccf-46d8-a1b2-3623d61436e5	3ac6a6e7-20d1-4f52-a9c6-ac8d48143fe2	e7598738cf02	\N	\N	2	2	2026-06-05 10:48:50.798	\N
8ba440e5-061d-4420-9f91-5f5d9ef5c4a8	3ac6a6e7-20d1-4f52-a9c6-ac8d48143fe2	986039eacf11	\N	\N	2	2	2026-06-05 10:49:48.181	\N
d64b3897-f7f4-49e3-909f-2b04d24bc182	3ac6a6e7-20d1-4f52-a9c6-ac8d48143fe2	864383d4963d	$2b$10$xINeruIprCMA2R00uQtBHuMsfn1.vzPdBaWr8XMMeFnoA6QagSJN6	\N	100	12	2026-06-05 11:36:10.279	0000
23926e2e-0c1c-4a79-82b6-2386b46efe71	a4fc5999-86e3-415c-b239-83bcb1b32605	8098077bc437	$2b$10$W.cizjx2Ue9DkLCPlGhwVuu6h1StABV6AwwmDo1eEgcCmZXSdsd..	2026-06-10 11:33:36.345	500	8	2026-06-05 11:33:36.346	0000
5504a77d-db3f-40b6-b285-5fc94f0870e5	131b1179-c59a-4461-abec-f5dd0d39ea02	8f1e991ecbed	$2b$10$OXETXadXYvhEsIdVT/KF/uTvsyfpFuYLsz7A7IlDWURFDxWLRXitC	2026-06-08 12:18:09.231	2	1	2026-06-05 12:18:09.233	00000
86f2fd78-c734-4d58-a93f-16f5a708d816	fb474afe-d136-491b-8446-d77aa74d08e1	cdd72979f1ab	$2b$10$5Z/Qg6PMcif9X3OMqYwAReedTGOsSR3pkCqxWAeltbHhK.sTLxi8C	2026-06-10 12:30:29.056	30	1	2026-06-05 12:30:29.057	789
33e601c6-023b-4afe-8ac7-08e19c146ce4	3ac6a6e7-20d1-4f52-a9c6-ac8d48143fe2	463b97599e83	\N	\N	10	10	2026-06-05 10:50:51.433	\N
4cf0640c-e6ae-4419-be66-1069b4782207	b71e701a-6638-4246-ba07-42c2655bdc77	06f4cfacf2d3	$2b$10$1tPAqVsIniibFaFfRONuJe4VwtDfoQFFZpzGYnlmGLmyZvR3/OAyq	\N	\N	5	2026-06-05 10:27:08.266	654321
38f52ca4-397c-4c7a-af20-d03cb0da7374	3ac6a6e7-20d1-4f52-a9c6-ac8d48143fe2	16aa75c04d16	$2b$10$iakKHfaahNEQxMo.n2L42eLozihybjArl4YOP0OCLXAL/v553a6XK	2026-06-10 10:45:58.152	10	10	2026-06-05 10:45:58.154	0000
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, role, created_at) FROM stdin;
8c7934e6-b311-40be-b96f-898350327acb	Admin User	admin@example.com	$2b$10$Zoc8SUqGlsTDSoUaPPbsPuje40nlDmywL.r7CzlRl/lrzKBTrg1iG	ADMIN	2026-06-04 10:55:00.825
d3a695ce-ae44-4800-a69f-19422be49e9b	Creator User	creator@example.com	$2b$10$Zoc8SUqGlsTDSoUaPPbsPuje40nlDmywL.r7CzlRl/lrzKBTrg1iG	CREATOR	2026-06-04 10:55:01.043
\.


--
-- Name: analytics analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics
    ADD CONSTRAINT analytics_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: models models_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.models
    ADD CONSTRAINT models_pkey PRIMARY KEY (id);


--
-- Name: photos photos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_pkey PRIMARY KEY (id);


--
-- Name: shares shares_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT shares_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: shares_share_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX shares_share_token_key ON public.shares USING btree (share_token);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: analytics analytics_share_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics
    ADD CONSTRAINT analytics_share_id_fkey FOREIGN KEY (share_id) REFERENCES public.shares(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: attachments attachments_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: models models_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.models
    ADD CONSTRAINT models_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: photos photos_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shares shares_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT shares_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Lfs4cPW0QN1XJVczk5cBIrsLXDxSuqrjQz2eSiWfEbGigfVQyeiftmvKnjhoDEf

