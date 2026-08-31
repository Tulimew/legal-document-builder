import{AppError}from"./errors";import{FilesystemStorageAdapter}from"./filesystem-storage-adapter";
export function publishingStorage(){const root=process.env.PUBLISHING_STORAGE_ROOT;if(!root)throw new AppError("DATABASE_UNAVAILABLE","PUBLISHING_STORAGE_ROOT chưa được cấu hình.");return new FilesystemStorageAdapter(root)}
