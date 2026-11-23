# BẢNG KIỂM KÊ CALLSITE CHECKSUM-BEARING (R19-05)

| Table | Repository/Service | INSERT/UPDATE Callsite | Marker Column | Đã Kiểm Thử |
| :--- | :--- | :--- | :--- | :---: |
| `amendment_source_version` | `PostgresAmendmentRepository` | `registerSource`, `importStructured`, `verify` | `checksum_algorithm_code` | **PASS** |
| `draft_checkpoint` | `authoring-finalization`, `merge-completion`, `step4-change` | `createCheckpoint` | `snapshot_checksum_algorithm_code` | **PASS** |
| `draft_version` | `authoring-finalization`, `merge-completion`, `step4-change`, `project-admin` | `sealVersion`, `completeMerge` | `snapshot_checksum_algorithm_code` | **PASS** |
| `draft_merge_operation` | `PostgresMergeOperationRepository` | `create` | `input_checksum_algorithm_code`, `preview_checksum_algorithm_code` | **PASS** |
| `draft_merge_conflict` | `PostgresMergeOperationRepository` | `create` | `evidence_checksum_algorithm_code` | **PASS** |
| `publishing_job` | `PostgresPublishingJobRepository` | `create` | `input_fingerprint_algorithm_code` | **PASS** |
| `release_package` | `PostgresReleasePackageRepository` | `seal` | `manifest_checksum_algorithm_code` | **PASS** |