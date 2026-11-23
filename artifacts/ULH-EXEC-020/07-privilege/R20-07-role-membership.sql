-- R20-07 Role Membership & Attributes Inspection

SELECT 
  rolname, 
  rolsuper, 
  rolinherit, 
  rolcreaterole, 
  rolcreatedb, 
  rolcanlogin, 
  rolreplication, 
  rolbypassrls
FROM pg_roles
WHERE rolname IN ('ulh_app_runtime', 'ulh_reconciler', 'ulh_governance_approver', 'ulh_migrator', 'postgres', 'legal_builder')
ORDER BY rolname;

SELECT 
  r.rolname as role_name,
  m.rolname as member_of,
  a.admin_option
FROM pg_auth_members a
JOIN pg_roles r ON r.oid = a.member
JOIN pg_roles m ON m.oid = a.roleid
WHERE r.rolname IN ('ulh_app_runtime', 'ulh_reconciler', 'ulh_governance_approver', 'ulh_migrator')
ORDER BY r.rolname;
