import{FilesystemStorageAdapter}from"./filesystem-storage-adapter";import{readStorageRuntimeConfig}from"./runtime-config";
export function publishingStorage(){return new FilesystemStorageAdapter(readStorageRuntimeConfig().root)}
