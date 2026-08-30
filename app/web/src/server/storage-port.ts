export interface StoredObjectStat{byteSize:number;checksumSha256:string}
export interface StoragePort{
  putOnce(key:string,content:Uint8Array):Promise<StoredObjectStat>;
  read(key:string):Promise<Uint8Array>;
  stat(key:string):Promise<StoredObjectStat|null>;
  verify(key:string,expected:StoredObjectStat):Promise<boolean>;
}
