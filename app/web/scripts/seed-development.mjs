import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
if (process.env.ALLOW_DEVELOPMENT_SEED !== "true") throw new Error("Chỉ chạy seed khi ALLOW_DEVELOPMENT_SEED=true.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL chưa được cấu hình.");

const ids = {
  person: "10000000-0000-4000-8000-000000000101",
  user: "10000000-0000-4000-8000-000000000102",
  organization: "10000000-0000-4000-8000-000000000103",
  project: "10000000-0000-4000-8000-000000000104",
  membership: "10000000-0000-4000-8000-000000000105",
  role: "10000000-0000-4000-8000-000000000106",
  workflowDefinition: "10000000-0000-4000-8000-000000000107",
  workflowVersion: "10000000-0000-4000-8000-000000000108",
};

const client = new Client({ connectionString: process.env.DATABASE_URL, application_name: "legal-builder-development-seed" });
await client.connect();
try {
  const database = (await client.query("SELECT current_database() AS name")).rows[0].name;
  if (!database.endsWith("_dev")) throw new Error(`Từ chối seed database không có hậu tố _dev: ${database}`);
  const migration = await client.query("SELECT 1 FROM public.legal_builder_schema_migration WHERE name='0008_workflow_foundation.sql'");
  if (!migration.rowCount) throw new Error("Phải áp dụng migration 0008 trước khi seed.");
  await client.query("BEGIN");
  await client.query("INSERT INTO legal_builder.person(id,display_name,status_code,created_at) VALUES($1,'Chuyên viên phát triển mẫu','ACTIVE',clock_timestamp()) ON CONFLICT(id) DO NOTHING",[ids.person]);
  await client.query("INSERT INTO legal_builder.organization(id,code,name,status_code,created_at) VALUES($1,'DEV-ORG','Đơn vị phát triển giả định','ACTIVE',clock_timestamp()) ON CONFLICT(id) DO NOTHING",[ids.organization]);
  await client.query("INSERT INTO legal_builder.user_account(id,person_id,external_provider_code,external_subject,status_code,created_at) VALUES($1,$2,'development','developer-sample','ACTIVE',clock_timestamp()) ON CONFLICT(id) DO NOTHING",[ids.user,ids.person]);
  await client.query("INSERT INTO legal_builder.legal_document_project(id,code,name,document_type_code,status_code,metadata,created_at,created_by_user_id) VALUES($1,'HS-DEV-001','Hồ sơ văn bản giả định dùng kiểm thử M2','CIRCULAR','ACTIVE','{\"sample\":true}'::jsonb,clock_timestamp(),$2) ON CONFLICT(id) DO NOTHING",[ids.project,ids.user]);
  await client.query("INSERT INTO legal_builder.project_membership(id,project_id,user_id,person_id,organization_id,status_code,valid_from,created_at,created_by_user_id) VALUES($1,$2,$3,$4,$5,'ACTIVE',clock_timestamp(),clock_timestamp(),$3) ON CONFLICT(id) DO NOTHING",[ids.membership,ids.project,ids.user,ids.person,ids.organization]);
  await client.query("INSERT INTO legal_builder.role_definition(id,code,version_code,name,status_code,effective_from,created_at,created_by_user_id) VALUES($1,'DEV_WORKFLOW_MANAGER','1.0','Quản lý workflow phát triển','ACTIVE',clock_timestamp(),clock_timestamp(),$2) ON CONFLICT(id) DO NOTHING",[ids.role,ids.user]);
  await client.query("INSERT INTO legal_builder.role_permission(role_definition_id,permission_code) SELECT $1,code FROM legal_builder.permission_definition WHERE code IN('WORKFLOW_READ','WORKFLOW_MANAGE','WORKFLOW_GATE_DECIDE') ON CONFLICT DO NOTHING",[ids.role]);
  await client.query("INSERT INTO legal_builder.membership_role(membership_id,role_definition_id,assigned_at,assigned_by_user_id) VALUES($1,$2,clock_timestamp(),$3) ON CONFLICT DO NOTHING",[ids.membership,ids.role,ids.user]);
  await client.query("INSERT INTO legal_builder.workflow_definition(id,code,name,created_at,created_by_user_id) VALUES($1,'WF-DEV-CIRCULAR','Quy trình phát triển giả định',clock_timestamp(),$2) ON CONFLICT(id) DO NOTHING",[ids.workflowDefinition,ids.user]);
  await client.query("INSERT INTO legal_builder.workflow_version(id,definition_id,version_code,status_code,effective_from,approval_basis,configuration,created_at,created_by_user_id,approved_at,approved_by_user_id) VALUES($1,$2,'1.0.0-development','APPROVED',clock_timestamp(),'Phê duyệt dữ liệu giả định chỉ để kiểm thử development','{\"sample\":true}'::jsonb,clock_timestamp(),$3,clock_timestamp(),$3) ON CONFLICT(id) DO NOTHING",[ids.workflowVersion,ids.workflowDefinition,ids.user]);
  const stages=[["DRAFT","Soạn thảo và chỉnh lý",1],["CONSULT","Lấy và xử lý ý kiến",2],["APPRAISE","Thẩm định",3],["SUBMIT","Hoàn thiện hồ sơ trình",4]];
  for(const [code,name,order] of stages) await client.query("INSERT INTO legal_builder.workflow_stage_definition(workflow_version_id,stage_code,name,stage_order,repeatable,parallel_allowed,gate_configuration) VALUES($1,$2,$3,$4,true,false,'{}'::jsonb) ON CONFLICT DO NOTHING",[ids.workflowVersion,code,name,order]);
  await client.query("INSERT INTO legal_builder.project_workflow(project_id,workflow_version_id,assigned_at,assigned_by_user_id,migration_decision) VALUES($1,$2,clock_timestamp(),$3,'Gán workflow development ban đầu') ON CONFLICT(project_id) DO NOTHING",[ids.project,ids.workflowVersion,ids.user]);
  await client.query("COMMIT");
} catch(error) {
  await client.query("ROLLBACK").catch(()=>undefined);
  throw error;
} finally {
  await client.end();
}

const envPath=path.resolve(process.cwd(),".env.local");
let envText="";
try{envText=await readFile(envPath,"utf8")}catch{}
function setEnv(text,key,value){const line=`${key}=${value}`;const pattern=new RegExp(`^${key}=.*$`,"m");return pattern.test(text)?text.replace(pattern,line):`${text.trimEnd()}\n${line}\n`}
envText=setEnv(envText,"NEXT_PUBLIC_SAMPLE_PROJECT_ID",ids.project);
envText=setEnv(envText,"NEXT_PUBLIC_DEVELOPMENT_USER_ID",ids.user);
await writeFile(envPath,envText,"utf8");
console.log("Development seed đã sẵn sàng.");
console.log(`NEXT_PUBLIC_SAMPLE_PROJECT_ID=${ids.project}`);
console.log(`NEXT_PUBLIC_DEVELOPMENT_USER_ID=${ids.user}`);
